import { createHash, generateKeyPairSync, createPrivateKey, createPublicKey, sign, verify } from 'crypto';

export interface KeyPairHex {
  privateKeyHex: string;
  publicKeyHex: string;
}

/**
 * Generate an Ed25519 keypair encoded as hex strings (PKCS8 DER for private key, SPKI DER for public key).
 */
export function generateEd25519KeyPair(): KeyPairHex {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519', {
    privateKeyEncoding: { type: 'pkcs8', format: 'der' },
    publicKeyEncoding: { type: 'spki', format: 'der' },
  });
  return {
    privateKeyHex: privateKey.toString('hex'),
    publicKeyHex: publicKey.toString('hex'),
  };
}

let singletonKeyPair: KeyPairHex | null = null;

/**
 * Returns the active issuer keypair from environment variables or a stable singleton keypair.
 */
export function getIssuerKeyPair(): KeyPairHex {
  if (process.env.ISSUER_PRIVATE_KEY_HEX && process.env.ISSUER_PUBLIC_KEY_HEX) {
    return {
      privateKeyHex: process.env.ISSUER_PRIVATE_KEY_HEX.trim(),
      publicKeyHex: process.env.ISSUER_PUBLIC_KEY_HEX.trim(),
    };
  }
  if (!singletonKeyPair) {
    singletonKeyPair = generateEd25519KeyPair();
  }
  return singletonKeyPair;
}

/**
 * Computes canonical SHA-256 hash digest (lowercase hex string) of raw buffer or string.
 */
export function computeSHA256(buffer: Buffer | string): string {
  const input = typeof buffer === 'string' ? Buffer.from(buffer) : buffer;
  return createHash('sha256').update(input).digest('hex').toLowerCase();
}

// Backwards compatibility alias
export const sha256 = computeSHA256;

/**
 * Signs a SHA-256 content digest using Ed25519 private key (DER hex string).
 */
export function signDigest(contentHashHex: string, privateKeyHex: string): string {
  try {
    const privateKey = createPrivateKey({
      key: Buffer.from(privateKeyHex, 'hex'),
      format: 'der',
      type: 'pkcs8',
    });
    const signatureBuffer = sign(null, Buffer.from(contentHashHex, 'utf8'), privateKey);
    return signatureBuffer.toString('hex');
  } catch (error) {
    console.error('Failed to sign digest with Ed25519 private key:', error);
    throw error;
  }
}

/**
 * Verifies an Ed25519 digital signature against a SHA-256 content digest and public key (DER hex string).
 */
export function verifySignature(contentHashHex: string, signatureHexOrBase64: string, publicKeyHex: string): boolean {
  try {
    const publicKey = createPublicKey({
      key: Buffer.from(publicKeyHex, 'hex'),
      format: 'der',
      type: 'spki',
    });

    const isHex = /^[0-9a-fA-F]+$/.test(signatureHexOrBase64);
    const signatureBuffer = isHex
      ? Buffer.from(signatureHexOrBase64, 'hex')
      : Buffer.from(signatureHexOrBase64, 'base64');

    return verify(null, Buffer.from(contentHashHex, 'utf8'), publicKey, signatureBuffer);
  } catch (error) {
    console.error('Failed to verify Ed25519 signature:', error);
    return false;
  }
}

// Additional helper aliases
export function createSigningKeyPair() {
  return generateEd25519KeyPair();
}

export function verifyDigest(digest: string, signature: string, publicKey: string | Buffer): boolean {
  const pubHex = typeof publicKey === 'string' ? publicKey : publicKey.toString('hex');
  return verifySignature(digest, signature, pubHex);
}