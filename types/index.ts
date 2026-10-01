export type VerificationState = 'verified' | 'tampered' | 'heuristic' | 'pending';
export interface DocumentManifest { version: string; documentName: string; contentDigest: string; issuedAt: string; issuer: string; }
export interface SignatureEnvelope { algorithm: 'Ed25519'; signature: string; publicKey: string; }
export interface VerificationResult { state: VerificationState; manifest?: DocumentManifest; signature?: SignatureEnvelope; reason?: string; }
export interface HeuristicReportData { confidence: number; summary: string; signals: string[]; }