import { createHash, generateKeyPairSync, sign, verify } from 'crypto';

export function sha256(data: Buffer | string) { return createHash('sha256').update(data).digest('hex'); }
export function createSigningKeyPair() { return generateKeyPairSync('ed25519'); }
export function signDigest(digest: string, privateKey: string | Buffer) { return sign(null, Buffer.from(digest), privateKey).toString('base64'); }
export function verifyDigest(digest: string, signature: string, publicKey: string | Buffer) { return verify(null, Buffer.from(digest), publicKey, Buffer.from(signature, 'base64')); }