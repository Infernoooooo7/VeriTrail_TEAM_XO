import { pgTable, uuid, varchar, text, jsonb, timestamp, boolean, index } from 'drizzle-orm/pg-core';

export const issuedDocuments = pgTable(
  'issued_documents',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    contentDigest: varchar('content_digest', { length: 64 }).notNull().unique(),
    signature: text('signature'),
    candidateName: text('candidate_name'),
    candidateId: text('candidate_id'),
    issuerId: text('issuer_id').default('VeriTrail Authority'),
    documentName: text('document_name').notNull(),
    issuer: text('issuer').notNull(),
    version: text('version').notNull().default('1.0'),
    isRevoked: boolean('is_revoked').notNull().default(false),
    manifest: jsonb('manifest').$type<Record<string, any>>().notNull(),
    metadata: jsonb('metadata').$type<Record<string, any>>(),
    issuedAt: timestamp('issued_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('content_digest_idx').on(table.contentDigest),
  ]
);

export type IssuedDocumentSelect = typeof issuedDocuments.$inferSelect;
export type IssuedDocumentInsert = typeof issuedDocuments.$inferInsert;
