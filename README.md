# VeriTrail

VeriTrail is a Next.js prototype for giving PDF documents a cryptographic chain of custody. It separates issuing from verification and keeps a heuristic Gemini inspection path for unsigned or legacy files.

## Database Integration (Neon DB)

VeriTrail integrates with **Neon DB** (Serverless PostgreSQL) via **Drizzle ORM**.

### 1. Environment Configuration

Add your Neon DB connection string to `.env.local`:

```env
DATABASE_URL=postgresql://neondb_owner:your-password@ep-example-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
```

### 2. Database Commands

```bash
# Push schema changes directly to Neon DB
npm run db:push

# Generate Drizzle migrations
npm run db:generate
```

## Run locally

```bash
npm install
copy .env.example .env.local
npm run dev
```

Open `http://localhost:3000` and use the issuer or verifier workspace.

## Architecture

- `lib/db/schema.ts` defines the `issued_documents` table in Neon DB (storing SHA-256 content digest, document name, issuer, version, and manifest JSON).
- `lib/db/index.ts` exports Neon HTTP database client and query helpers (`findIssuedDocumentByDigest`, `recordIssuedDocument`).
- `app/issue` & `/api/issue` compute SHA-256 digest and persist issued manifest into Neon DB.
- `app/verify` & `/api/verify` verify documents against Neon DB registry records.
- `lib/crypto.ts` owns digest and cryptographic primitives.
- `lib/pdf-metadata.ts` owns structured manifest and signature envelope.
- `lib/gemini.ts` provides fallback AI heuristic inspection.
- `components/` contains UI components.