export type VerificationState = 'verified' | 'tampered' | 'heuristic' | 'pending';

export interface DocumentManifest {
  vtr_doc_id: string;
  vtr_issuer_id: string;
  vtr_candidate: string;
  vtr_candidate_id?: string;
  vtr_content_hash: string;
  vtr_signature: string;
  vtr_public_key: string;
  vtr_timestamp: string;
  // Backward compatibility / optional properties
  version?: string;
  documentName?: string;
  contentDigest?: string;
  issuedAt?: string;
  issuer?: string;
}

export interface SignatureEnvelope {
  algorithm: 'Ed25519';
  signature: string;
  publicKey: string;
}

export interface VerificationResult {
  status: 'VERIFIED' | 'TAMPERED' | 'UNTRACKED';
  state: VerificationState;
  manifest?: DocumentManifest;
  signature?: SignatureEnvelope;
  reason?: string;
  message?: string;
  audit?: string;
  expectedHash?: string;
  computedHash?: string;
}

export interface HeuristicReportData {
  riskLevel?: 'LOW' | 'MODERATE' | 'HIGH';
  confidenceScore?: number;
  confidence: number;
  detectedAnomalies?: string[];
  signals: string[];
  summary: string;
}