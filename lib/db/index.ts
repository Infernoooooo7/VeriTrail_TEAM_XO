import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';
import { eq } from 'drizzle-orm';

export function getDb() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return null;
  }
  const sql = neon(databaseUrl);
  return drizzle(sql, { schema });
}

export async function findIssuedDocumentByDigest(digest: string) {
  const db = getDb();
  if (!db) return null;
  try {
    const results = await db
      .select()
      .from(schema.issuedDocuments)
      .where(eq(schema.issuedDocuments.contentDigest, digest))
      .limit(1);
    return results[0] || null;
  } catch (error) {
    console.error('Error fetching document from Neon DB:', error);
    return null;
  }
}

export async function recordIssuedDocument(params: {
  contentDigest: string;
  documentName: string;
  issuer: string;
  version: string;
  manifest: {
    version: string;
    documentName: string;
    contentDigest: string;
    issuedAt: string;
    issuer: string;
  };
}) {
  const db = getDb();
  if (!db) return null;
  try {
    const inserted = await db
      .insert(schema.issuedDocuments)
      .values({
        contentDigest: params.contentDigest,
        documentName: params.documentName,
        issuer: params.issuer,
        version: params.version,
        manifest: params.manifest,
        issuedAt: new Date(params.manifest.issuedAt),
      })
      .onConflictDoUpdate({
        target: schema.issuedDocuments.contentDigest,
        set: {
          manifest: params.manifest,
          documentName: params.documentName,
          issuer: params.issuer,
          issuedAt: new Date(params.manifest.issuedAt),
        },
      })
      .returning();
    return inserted[0] || null;
  } catch (error) {
    console.error('Error recording issued document to Neon DB:', error);
    return null;
  }
}
