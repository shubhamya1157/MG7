/**
 * Pinecone client — vector store for RAG codebase context.
 *
 * The index uses *integrated embedding* (configured at index creation in the
 * Pinecone console): upserts and searches pass raw text and Pinecone embeds
 * it server-side, so no separate embeddings model is needed here.
 *
 * SERVER-ONLY.
 */

import { Pinecone } from "@pinecone-database/pinecone";

let pinecone: Pinecone | null = null;

/** Whether Pinecone is configured — RAG features are skipped when it isn't. */
export function isPineconeConfigured(): boolean {
  return Boolean(process.env.PINECONE_API_KEY && process.env.PINECONE_INDEX);
}

export function getPineconeIndex() {
  const apiKey = process.env.PINECONE_API_KEY;
  const indexName = process.env.PINECONE_INDEX;
  if (!apiKey) throw new Error("Missing PINECONE_API_KEY");
  if (!indexName) throw new Error("Missing PINECONE_INDEX");

  if (!pinecone) {
    pinecone = new Pinecone({ apiKey });
  }
  return pinecone.index({ name: indexName });
}
