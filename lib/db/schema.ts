import { pgTable, uuid, varchar, text, jsonb, timestamp, index } from 'drizzle-orm/pg-core';

export const issuedDocuments = pgTable(
  'issued_documents',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    contentDigest: varchar('content_digest', { length: 64 }).notNull().unique(),
    documentName: text('document_name').notNull(),
    issuer: text('issuer').notNull(),
    version: text('version').notNull().default('1.0'),
    manifest: jsonb('manifest').$type<{
      version: string;
      documentName: string;
      contentDigest: string;
      issuedAt: string;
      issuer: string;
    }>().notNull(),
    issuedAt: timestamp('issued_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('content_digest_idx').on(table.contentDigest),
  ]
);

export type IssuedDocumentSelect = typeof issuedDocuments.$inferSelect;
export type IssuedDocumentInsert = typeof issuedDocuments.$inferInsert;
