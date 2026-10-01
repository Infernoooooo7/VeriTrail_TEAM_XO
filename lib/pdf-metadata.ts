import { PDFDocument } from 'pdf-lib';
import type { DocumentManifest, SignatureEnvelope } from '@/types';

const META_KEY = 'veritrail.manifest';
const SIG_KEY = 'veritrail.signature';

export async function injectMetadata(pdf: Buffer, manifest: DocumentManifest, signature: SignatureEnvelope) {
    const document = await PDFDocument.load(pdf);
    document.setSubject(`${META_KEY}:${JSON.stringify(manifest)}`);
    document.setKeywords([`${SIG_KEY}:${JSON.stringify(signature)}`]);
    return Buffer.from(await document.save());
}

export async function extractMetadata(pdf: Buffer) {
    const document = await PDFDocument.load(pdf);
    const subject = document.getSubject() ?? '';
    const keywords = document.getKeywords() ?? '';
    const keyword = keywords.split(',').map((item) => item.trim()).find((item) => item.startsWith(`${SIG_KEY}:`));
    return {
        manifest: subject.startsWith(`${META_KEY}:`) ? JSON.parse(subject.slice(META_KEY.length + 1)) as DocumentManifest : undefined,
        signature: keyword ? JSON.parse(keyword.slice(SIG_KEY.length + 1)) as SignatureEnvelope : undefined,
    };
}