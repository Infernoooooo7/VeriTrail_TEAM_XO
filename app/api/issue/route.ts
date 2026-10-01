import { NextResponse } from 'next/server';
import { computeSHA256, getIssuerKeyPair, signDigest } from '@/lib/crypto';
import { injectManifestIntoPdf } from '@/lib/pdf-metadata';
import { recordIssuedDocument } from '@/lib/db';
import { validateUpload } from '@/lib/file-policy';
import type { DocumentManifest } from '@/types';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const candidateName = (formData.get('candidateName') as string) || 'Jane Doe';
    const candidateId = (formData.get('candidateId') as string) || 'CAND-88421';
    const issuerId = (formData.get('issuerId') as string) || 'VeriTrail Authority';

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: 'A valid PDF document file is required.' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const originalBuffer = Buffer.from(arrayBuffer);

    const rejection = validateUpload(file.name, originalBuffer);
    if (rejection) return NextResponse.json({ error: rejection }, { status: 415 });

    const isPdf = file.type === 'application/pdf' || originalBuffer.subarray(0, 5).toString() === '%PDF-';

    // 1. Compute canonical SHA-256 hash of original document
    const contentHash = computeSHA256(originalBuffer);

    // 2. Obtain Issuer KeyPair & Sign Hash
    const keyPair = getIssuerKeyPair();
    const signature = signDigest(contentHash, keyPair.privateKeyHex);

    // 3. Generate Unique Document ID & Timestamp
    const docId = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    // 4. Construct Document Manifest
    const manifest: DocumentManifest = {
      vtr_doc_id: docId,
      vtr_issuer_id: issuerId,
      vtr_candidate: candidateName,
      vtr_candidate_id: candidateId,
      vtr_content_hash: contentHash,
      vtr_signature: signature,
      vtr_public_key: keyPair.publicKeyHex,
      vtr_timestamp: timestamp,
      // Compatibility fields
      version: '1.0',
      documentName: file.name,
      contentDigest: contentHash,
      issuedAt: timestamp,
      issuer: issuerId,
    };

    // 5. Embed the manifest when possible. Other safe file types use a detached manifest.
    const sealedFileBuffer = isPdf ? await injectManifestIntoPdf(originalBuffer, manifest) : originalBuffer;

    // 6. Record in Neon DB (if connected)
    const dbRecord = await recordIssuedDocument({
      docId,
      contentDigest: contentHash,
      signature,
      candidateName,
      candidateId,
      issuerId,
      documentName: file.name,
      issuer: issuerId,
      version: '1.0',
      manifest,
    });

    // Check if caller explicitly requested JSON
    const url = new URL(request.url);
    const wantsJson = url.searchParams.get('json') === 'true' || request.headers.get('accept')?.includes('application/json');

    if (wantsJson) {
      return NextResponse.json({
        success: true,
        docId,
        contentHash,
        signature,
        manifest,
        dbSaved: Boolean(dbRecord),
        sealedPdfBase64: isPdf ? sealedFileBuffer.toString('base64') : undefined,
        sealedFileBase64: sealedFileBuffer.toString('base64'),
        fileType: file.type || 'application/octet-stream',
        manifestDetached: !isPdf,
      });
    }

    // Default: Return downloadable sealed PDF binary
    const headers = new Headers();
    headers.set('Content-Type', file.type || 'application/octet-stream');
    headers.set(
      'Content-Disposition',
      `attachment; filename="sealed_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}"`
    );
    headers.set('x-veritrail-doc-id', docId);
    headers.set('x-veritrail-hash', contentHash);
    headers.set('Access-Control-Expose-Headers', 'x-veritrail-doc-id, x-veritrail-hash');

    return new NextResponse(new Uint8Array(sealedFileBuffer), {
      status: 200,
      headers,
    });
  } catch (error: any) {
    console.error('Error issuing document:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to issue document' },
      { status: 500 }
    );
  }
}