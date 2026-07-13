import "./globals.css";
import type { Metadata } from "next";
import { JetBrains_Mono, Oxanium } from "next/font/google";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { Toaster } from "@/components/ui/sonner";

const oxanium = Oxanium({ subsets: ["latin"], variable: "--font-heading" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "MG7 — AI-assisted code review",
  description:
    "MG7 connects to your GitHub, reviews every pull request in real time, and helps your team merge with confidence.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(jetbrainsMono.variable, oxanium.variable)}
      suppressHydrationWarning
    >
      <body className="flex min-h-screen flex-col">
        <QueryProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
          </ThemeProvider>
          
          <Toaster position="top-center" richColors closeButton />
        </QueryProvider>
      </body>
    </html>
  );
}
