import { NextResponse } from 'next/server';
import { computeSHA256, verifySignature } from '@/lib/crypto';
import { extractManifestFromPdf } from '@/lib/pdf-metadata';
import { findIssuedDocumentByDigest, findIssuedDocumentById } from '@/lib/db';
import { validateUpload } from '@/lib/file-policy';
import { inspectC2pa } from '@/lib/c2pa';

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
    const rejection = validateUpload(file.name, pdfBuffer);
    if (rejection) return NextResponse.json({ error: rejection }, { status: 415 });
    const computedFileHash = computeSHA256(pdfBuffer);
    const c2pa = await inspectC2pa(pdfBuffer, file.type || 'application/octet-stream');
    const requestedDocId = String(formData.get('docId') || '').trim();

    // 1. Attempt extraction of embedded VeriTrail manifest
    const manifest = await extractManifestFromPdf(pdfBuffer);

    // 2. If NO manifest is found in metadata
    if (!manifest) {
      const registryRecord = requestedDocId ? await findIssuedDocumentById(requestedDocId) : await findIssuedDocumentByDigest(computedFileHash);
      if (requestedDocId && registryRecord && registryRecord.contentDigest !== computedFileHash) {
        return NextResponse.json({ status: 'TAMPERED', state: 'tampered', reason: 'CONTENT_HASH_MISMATCH', message: 'The file bytes do not match the issued file fingerprint.', expectedHash: registryRecord.contentDigest, computedHash: computedFileHash, dbRecord: registryRecord });
      }
      return NextResponse.json({
        status: 'UNTRACKED',
        state: 'heuristic',
        message: requestedDocId ? 'No matching issued file was found.' : 'No cryptographic manifest detected. A document ID is required to compare a detached file.',
        computedHash: computedFileHash,
        c2pa,
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
        c2pa,
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
        c2pa,
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
      c2pa,
    });
  } catch (error: any) {
    console.error('Error verifying document:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to verify document' },
      { status: 500 }
    );
  }
}