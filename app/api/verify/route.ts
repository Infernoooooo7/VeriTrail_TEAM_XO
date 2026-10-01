import { NextResponse } from 'next/server';
import { sha256 } from '@/lib/crypto';
import { findIssuedDocumentByDigest } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'A PDF is required.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const digest = sha256(Buffer.from(arrayBuffer));

    // Lookup in Neon DB
    const dbRecord = await findIssuedDocumentByDigest(digest);

    if (dbRecord) {
      return NextResponse.json({
        state: 'verified',
        digest,
        manifest: dbRecord.manifest,
        source: 'neondb',
        reason: 'Document hash verified against Neon DB registry.',
      });
    }

    return NextResponse.json({
      state: 'heuristic',
      digest,
      source: 'neondb',
      reason: 'No matching record found in Neon DB registry.',
    });
  } catch (error: any) {
    console.error('Error verifying document:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to verify document' },
      { status: 500 }
    );
  }
}