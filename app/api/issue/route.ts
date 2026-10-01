import { NextResponse } from 'next/server';
import { sha256 } from '@/lib/crypto';
import { recordIssuedDocument } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'A PDF is required.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const digest = sha256(Buffer.from(arrayBuffer));
    const issuedAt = new Date().toISOString();

    const manifest = {
      version: '1.0',
      documentName: file.name,
      contentDigest: digest,
      issuedAt,
      issuer: 'VeriTrail',
    };

    // Save manifest to Neon DB if configured
    const dbRecord = await recordIssuedDocument({
      contentDigest: digest,
      documentName: file.name,
      issuer: 'VeriTrail',
      version: '1.0',
      manifest,
    });

    return NextResponse.json({
      manifest,
      digest,
      dbSaved: Boolean(dbRecord),
    });
  } catch (error: any) {
    console.error('Error issuing document:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to issue document' },
      { status: 500 }
    );
  }
}