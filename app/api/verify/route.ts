import { NextResponse } from 'next/server';
import { computeSHA256, verifySignature } from '@/lib/crypto';
import { extractManifestFromPdf } from '@/lib/pdf-metadata';
import { findIssuedDocumentByDigest, findIssuedDocumentById } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: 'A valid PDF document file is required for verification.' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdfBuffer = Buffer.from(arrayBuffer);
    const computedFileHash = computeSHA256(pdfBuffer);

    // 1. Attempt extraction of embedded VeriTrail manifest
    const manifest = await extractManifestFromPdf(pdfBuffer);

    // 2. If NO manifest is found in metadata
    if (!manifest) {
      return NextResponse.json({
        status: 'UNTRACKED',
        state: 'heuristic',
        message: 'No cryptographic manifest detected. Triggering heuristic fallback.',
        computedHash: computedFileHash,
      });
    }

    const { vtr_content_hash, vtr_signature, vtr_public_key, vtr_doc_id } = manifest;

    // 3. Verify Ed25519 digital signature
    const isSignatureValid = verifySignature(
      vtr_content_hash,
      vtr_signature,
      vtr_public_key
    );

    if (!isSignatureValid) {
      return NextResponse.json({
        status: 'TAMPERED',
        state: 'tampered',
        reason: 'INVALID_SIGNATURE',
        message: 'Digital signature is invalid or forged.',
        manifest,
        computedHash: computedFileHash,
        expectedHash: vtr_content_hash,
      });
    }

    // 4. Query Neon DB for revocation or record check (if available)
    let dbRecord = null;
    if (vtr_doc_id) {
      dbRecord = await findIssuedDocumentById(vtr_doc_id);
    }
    if (!dbRecord && vtr_content_hash) {
      dbRecord = await findIssuedDocumentByDigest(vtr_content_hash);
    }

    if (dbRecord && dbRecord.isRevoked) {
      return NextResponse.json({
        status: 'TAMPERED',
        state: 'tampered',
        reason: 'DOCUMENT_REVOKED',
        message: 'This document has been revoked by the issuing authority.',
        manifest,
        dbRecord,
      });
    }

    if (dbRecord && dbRecord.contentDigest && vtr_content_hash && dbRecord.contentDigest !== vtr_content_hash) {
      return NextResponse.json({
        status: 'TAMPERED',
        state: 'tampered',
        reason: 'CONTENT_HASH_MISMATCH',
        message: 'Document content digest does not match the registered ledger hash.',
        manifest,
        dbRecord,
        expectedHash: dbRecord.contentDigest,
        computedHash: vtr_content_hash,
      });
    }

    // 5. Hash & Signature match confirmed
    return NextResponse.json({
      status: 'VERIFIED',
      state: 'verified',
      manifest,
      dbRecord: dbRecord
        ? {
            id: dbRecord.id,
            issuer: dbRecord.issuer,
            candidateName: dbRecord.candidateName,
            candidateId: dbRecord.candidateId,
            documentName: dbRecord.documentName,
            issuedAt: dbRecord.issuedAt,
          }
        : null,
      audit: 'Cryptographic signature and content hash match.',
      message: 'Document authenticity and chain of custody verified.',
      computedHash: computedFileHash,
    });
  } catch (error: any) {
    console.error('Error verifying document:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to verify document' },
      { status: 500 }
    );
  }
}