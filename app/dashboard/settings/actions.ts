"use server";

/**
 * Server actions for /dashboard/settings.
 *
 * Both actions re-check the session inside the action — server actions are
 * network endpoints, so the page's gate doesn't protect them. The raw key
 * only ever exists here transiently: validated, encrypted, stored; only the
 * last 4 characters are kept in the clear for display.
 */

import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/get-session";
import { prisma } from "@/lib/db";
import { encryptSecret } from "@/lib/crypto";
import { ROUTES } from "@/lib/routes";

export type SettingsActionResult = {
  ok: boolean;
  message: string;
};

export async function saveOpenrouterKey(
  formData: FormData,
): Promise<SettingsActionResult> {
  const session = await getSession();
  if (!session) {
    return { ok: false, message: "Not signed in." };
  }

  const key = String(formData.get("apiKey") ?? "").trim();

  // OpenRouter keys start with "sk-or-"; reject anything else early so a
  // pasted OpenAI/Anthropic key doesn't silently break reviews later.
  if (!key.startsWith("sk-or-") || key.length < 20) {
    return {
      ok: false,
      message: "That doesn't look like an OpenRouter key (expected sk-or-…).",
    };
  }

  const ciphertext = encryptSecret(key);
  const last4 = key.slice(-4);

  await prisma.userSettings.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      openrouterKeyCiphertext: ciphertext,
      openrouterKeyLast4: last4,
    },
    update: {
      openrouterKeyCiphertext: ciphertext,
      openrouterKeyLast4: last4,
    },
  });

  revalidatePath(ROUTES.dashboardSettings);
  return { ok: true, message: "API key saved. Reviews now use your key." };
}

export async function removeOpenrouterKey(): Promise<SettingsActionResult> {
  const session = await getSession();
  if (!session) {
    return { ok: false, message: "Not signed in." };
  }

  await prisma.userSettings.updateMany({
    where: { userId: session.user.id },
    data: { openrouterKeyCiphertext: null, openrouterKeyLast4: null },
  });

  revalidatePath(ROUTES.dashboardSettings);
  return { ok: true, message: "API key removed. Reviews use the free tier." };
}
