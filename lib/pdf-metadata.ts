import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { DocumentManifest, SignatureEnvelope } from '@/types';

export const MANIFEST_SUBJECT_PREFIX = 'veritrail.manifest:';
export const SIGNATURE_KEYWORD_PREFIX = 'veritrail.signature:';

/**
 * Injects non-destructive metadata manifest & visual footer ribbon into PDF.
 */
export async function injectManifestIntoPdf(
  originalBuffer: Buffer,
  manifest: DocumentManifest
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(originalBuffer);

  const serializedManifest = JSON.stringify(manifest);

  // Set Document Metadata
  pdfDoc.setSubject(`${MANIFEST_SUBJECT_PREFIX}${serializedManifest}`);
  pdfDoc.setAuthor(`${manifest.vtr_issuer_id} (VeriTrail Authority)`);
  pdfDoc.setCreator(
    `VeriTrail Cryptographic Provenance Engine (Ed25519: ${manifest.vtr_signature.slice(
      0,
      16
    )}...)`
  );
  pdfDoc.setProducer('VeriTrail Provenance Engine v1.0');
  pdfDoc.setTitle(
    manifest.documentName || `VeriTrail Stamped Document ${manifest.vtr_doc_id}`
  );

  // Store signature envelope keyword for secondary validation
  const signatureEnvelope: SignatureEnvelope = {
    algorithm: 'Ed25519',
    signature: manifest.vtr_signature,
    publicKey: manifest.vtr_public_key,
  };
  pdfDoc.setKeywords([
    `${SIGNATURE_KEYWORD_PREFIX}${JSON.stringify(signatureEnvelope)}`,
    `VeriTrail`,
    `Ed25519`,
    `Verified`,
    manifest.vtr_doc_id,
  ]);

  // Add visual footer ribbon on Page 1
  const pages = pdfDoc.getPages();
  if (pages.length > 0) {
    const firstPage = pages[0];
    const { width } = firstPage.getSize();
    const font = await pdfDoc.embedStandardFont(StandardFonts.Helvetica);

    // Subtle dark footer ribbon background
    firstPage.drawRectangle({
      x: 0,
      y: 0,
      width: width,
      height: 20,
      color: rgb(0.08, 0.1, 0.16),
      opacity: 0.85,
    });

    const ribbonText = `SECURED BY VERITRAIL | DOC-ID: ${manifest.vtr_doc_id.slice(
      0,
      8
    )} | ISSUER: ${manifest.vtr_issuer_id} | INTEGRITY VERIFIABLE`;

    firstPage.drawText(ribbonText, {
      x: 12,
      y: 6,
      size: 7.5,
      font: font,
      color: rgb(0.35, 0.85, 0.7),
    });
  }

  const savedBytes = await pdfDoc.save();
  return Buffer.from(savedBytes);
}

/**
 * Extracts DocumentManifest embedded in PDF metadata.
 */
export async function extractManifestFromPdf(
  pdfBuffer: Buffer
): Promise<DocumentManifest | null> {
  try {
    const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
    const rawSubject = pdfDoc.getSubject() || '';

    let jsonStr = '';
    if (rawSubject.startsWith(MANIFEST_SUBJECT_PREFIX)) {
      jsonStr = rawSubject.slice(MANIFEST_SUBJECT_PREFIX.length);
    } else if (rawSubject.startsWith('{') && rawSubject.endsWith('}')) {
      jsonStr = rawSubject;
    } else {
      // Check keywords as fallback
      const keywords = pdfDoc.getKeywords() || '';
      const manifestKw = keywords
        .split(',')
        .map((k) => k.trim())
        .find((k) => k.startsWith(MANIFEST_SUBJECT_PREFIX));
      if (manifestKw) {
        jsonStr = manifestKw.slice(MANIFEST_SUBJECT_PREFIX.length);
      }
    }

    if (!jsonStr) {
      return null;
    }

    const manifest: DocumentManifest = JSON.parse(jsonStr);

    // Validate minimum required fields
    if (manifest && (manifest.vtr_signature || manifest.vtr_content_hash)) {
      return manifest;
    }

    return null;
  } catch (error) {
    console.error('Failed to extract manifest from PDF:', error);
    return null;
  }
}

// Backwards compatibility functions
export async function injectMetadata(
  pdf: Buffer,
  manifest: DocumentManifest,
  signature: SignatureEnvelope
) {
  return injectManifestIntoPdf(pdf, manifest);
}

export async function extractMetadata(pdf: Buffer) {
  const manifest = await extractManifestFromPdf(pdf);
  if (!manifest) return { manifest: undefined, signature: undefined };
  return {
    manifest,
    signature: {
      algorithm: 'Ed25519' as const,
      signature: manifest.vtr_signature,
      publicKey: manifest.vtr_public_key,
    },
  };
}