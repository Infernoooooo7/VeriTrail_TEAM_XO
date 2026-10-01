import { Reader } from '@contentauth/c2pa-node';

export interface C2paVerification {
  status: 'verified' | 'invalid' | 'not-found' | 'unsupported';
  embedded: boolean;
  activeManifest?: unknown;
  manifestStore?: unknown;
  error?: string;
}

export async function inspectC2pa(buffer: Buffer, mimeType: string): Promise<C2paVerification> {
  try {
    const reader = await Reader.fromAsset({ buffer, mimeType });
    if (!reader || !reader.isEmbedded()) return { status: 'not-found', embedded: false };
    return { status: reader.getActive() ? 'verified' : 'invalid', embedded: true, activeManifest: reader.getActive(), manifestStore: reader.json() };
  } catch (error) {
    return { status: 'unsupported', embedded: false, error: error instanceof Error ? error.message : 'C2PA reader could not process this file.' };
  }
}