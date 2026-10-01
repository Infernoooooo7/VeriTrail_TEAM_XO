# VeriTrail

VeriTrail is a Next.js prototype for giving PDF documents a cryptographic chain of custody. It separates issuing from verification and keeps a heuristic Gemini inspection path for unsigned or legacy files.

## Run locally

```bash
npm install
copy .env.example .env.local
npm run dev
```

Open `http://localhost:3000` and use the issuer or verifier workspace. The demo verifier recognizes files containing `tampered` in their filename as an intentionally failed state so mentor reviews can exercise both paths without keys.

## Architecture

- `app/issue` handles the issuer flow and `/api/issue` computes a SHA-256 digest.
- `app/verify` handles the verifier flow and `/api/verify` is the extraction/verification boundary.
- `lib/crypto.ts` owns digest and Ed25519 primitives.
- `lib/pdf-metadata.ts` owns the structured manifest and signature envelope stored in PDF metadata.
- `lib/gemini.ts` is an optional fallback for legacy documents without a VeriTrail manifest.
- `components/` contains the shared upload, status, trust timeline, and navigation surfaces.

The current UI is demo-ready. Before production use, connect the issue route to a protected key store, inject the returned signature with `injectMetadata`, and make verification compare the extracted digest against the PDF bytes before returning `verified`.