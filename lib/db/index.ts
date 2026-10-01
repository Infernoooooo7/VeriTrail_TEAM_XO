import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';
import { eq } from 'drizzle-orm';

let schemaInitialized = false;

export async function ensureSchema() {
  if (schemaInitialized) return;
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return;
  try {
    const sql = neon(databaseUrl);
    await sql`
      CREATE TABLE IF NOT EXISTS issued_documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        content_digest VARCHAR(64) NOT NULL UNIQUE,
        signature TEXT,
        candidate_name TEXT,
        candidate_id TEXT,
        issuer_id TEXT DEFAULT 'VeriTrail Authority',
        document_name TEXT NOT NULL,
        issuer TEXT NOT NULL,
        version TEXT NOT NULL DEFAULT '1.0',
        is_revoked BOOLEAN NOT NULL DEFAULT false,
        manifest JSONB NOT NULL,
        metadata JSONB,
        issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;
    await sql`ALTER TABLE issued_documents ADD COLUMN IF NOT EXISTS signature TEXT;`;
    await sql`ALTER TABLE issued_documents ADD COLUMN IF NOT EXISTS candidate_name TEXT;`;
    await sql`ALTER TABLE issued_documents ADD COLUMN IF NOT EXISTS candidate_id TEXT;`;
    await sql`ALTER TABLE issued_documents ADD COLUMN IF NOT EXISTS issuer_id TEXT DEFAULT 'VeriTrail Authority';`;
    await sql`ALTER TABLE issued_documents ADD COLUMN IF NOT EXISTS is_revoked BOOLEAN NOT NULL DEFAULT false;`;
    await sql`ALTER TABLE issued_documents ADD COLUMN IF NOT EXISTS metadata JSONB;`;
    await sql`
      CREATE INDEX IF NOT EXISTS content_digest_idx ON issued_documents (content_digest);
    `;
    schemaInitialized = true;
  } catch (err) {
    console.warn('Could not auto-migrate Neon DB table:', err);
  }
}

export function getDb() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return null;
  }
  const sql = neon(databaseUrl);
  return drizzle(sql, { schema });
}

export async function findIssuedDocumentByDigest(digest: string) {
  await ensureSchema();
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
    console.error('Error fetching document from Neon DB by digest:', error);
    return null;
  }
}

export async function findIssuedDocumentById(id: string) {
  await ensureSchema();
  const db = getDb();
  if (!db) return null;
  try {
    const results = await db
      .select()
      .from(schema.issuedDocuments)
      .where(eq(schema.issuedDocuments.id, id))
      .limit(1);
    return results[0] || null;
  } catch (error) {
    console.error('Error fetching document from Neon DB by ID:', error);
    return null;
  }
}

export async function recordIssuedDocument(params: {
  docId?: string;
  contentDigest: string;
  signature?: string;
  candidateName?: string;
  candidateId?: string;
  issuerId?: string;
  documentName: string;
  issuer: string;
  version?: string;
  manifest: Record<string, any>;
  metadata?: Record<string, any>;
}) {
  await ensureSchema();
  const db = getDb();
  if (!db) return null;
  try {
    const values: schema.IssuedDocumentInsert = {
      contentDigest: params.contentDigest,
      signature: params.signature,
      candidateName: params.candidateName,
      candidateId: params.candidateId,
      issuerId: params.issuerId || 'VeriTrail Authority',
      documentName: params.documentName,
      issuer: params.issuer,
      version: params.version || '1.0',
      manifest: params.manifest,
      metadata: params.metadata,
      issuedAt: params.manifest.vtr_timestamp || params.manifest.issuedAt
        ? new Date(params.manifest.vtr_timestamp || params.manifest.issuedAt)
        : new Date(),
    };

    if (params.docId) {
      values.id = params.docId;
    }

    const inserted = await db
      .insert(schema.issuedDocuments)
      .values(values)
      .onConflictDoUpdate({
        target: schema.issuedDocuments.contentDigest,
        set: {
          manifest: params.manifest,
          documentName: params.documentName,
          issuer: params.issuer,
          signature: params.signature,
          candidateName: params.candidateName,
          candidateId: params.candidateId,
          issuerId: params.issuerId || 'VeriTrail Authority',
          issuedAt: values.issuedAt,
        },
      })
      .returning();
    return inserted[0] || null;
  } catch (error) {
    console.error('Error recording issued document to Neon DB:', error);
    return null;
  }
}
