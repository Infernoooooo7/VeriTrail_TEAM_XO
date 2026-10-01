'use client';

import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Check,
  Download,
  FileText,
  LockKeyhole,
  Loader2,
  User,
  CreditCard,
  Building2,
  Database,
  ShieldCheck,
  Fingerprint,
  FileCode,
  Layers,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';
import { Dropzone } from '@/components/Dropzone';
import { TrustTimeline } from '@/components/TrustTimeline';

export default function IssuePage() {
  const [file, setFile] = useState<File>();
  const [candidateName, setCandidateName] = useState('Jane Doe');
  const [candidateId, setCandidateId] = useState('CAND-88421');
  const [issuerId, setIssuerId] = useState('VeriTrail Authority');
  const [loading, setLoading] = useState(false);
  const [issuedResult, setIssuedResult] = useState<{
    docId: string;
    hash: string;
    blobUrl: string;
    fileName: string;
    signature?: string;
    dbSaved?: boolean;
    mimeType?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Clean up object URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      if (issuedResult?.blobUrl) {
        URL.revokeObjectURL(issuedResult.blobUrl);
      }
    };
  }, [issuedResult]);

  const handleIssue = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!file) return;
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('candidateName', candidateName);
      formData.append('candidateId', candidateId);
      formData.append('issuerId', issuerId || 'VeriTrail Authority');

      const response = await fetch('/api/issue?json=true', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
        },
        body: formData,
      });

      if (!response.ok) {
        let errorMessage = 'Failed to issue cryptographic document.';
        try {
          const errJson = await response.json();
          if (errJson.error) errorMessage = errJson.error;
        } catch {
          // parse fallback
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();

      if (!data.success || !data.sealedFileBase64) {
        throw new Error(data.error || 'Failed to generate the issued file.');
      }

      // Convert base64 to Blob URL safely
      const binaryStr = window.atob(data.sealedFileBase64);
      const len = binaryStr.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: data.fileType || file.type || 'application/octet-stream' });
      const blobUrl = URL.createObjectURL(blob);
      const outputFileName = `sealed_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

      setIssuedResult({
        docId: data.docId,
        hash: data.contentHash,
        blobUrl,
        fileName: outputFileName,
        signature: data.signature,
        dbSaved: data.dbSaved,
        mimeType: data.fileType,
      });
    } catch (err: any) {
      console.error('Issuance error:', err);
      setError(err.message || 'An unexpected error occurred during document signing.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    if (issuedResult?.blobUrl) {
      URL.revokeObjectURL(issuedResult.blobUrl);
    }
    setIssuedResult(null);
    setFile(undefined);
    setError(null);
  };

  return (
    <main className="mx-auto max-w-6xl px-6 pb-20 pt-10 lg:px-10">
      <Link
        href="/"
        className="mb-12 flex items-center gap-2 text-xs text-ink/45 hover:text-ink transition"
      >
        <ArrowLeft size={14} /> Back home
      </Link>
      <div className="mx-auto max-w-3xl">
        <div className="mb-10">
          <p className="font-mono text-[10px] uppercase tracking-[.2em] text-coral">
            Issuer workspace
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-.05em] sm:text-5xl">
            Make it verifiable.
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-ink/50">
            Create a tamper-evident cryptographic record for any safe file. VeriTrail hashes the original bytes, signs the digest with Ed25519, stores the ledger entry in Neon DB, and embeds the proof when the format supports metadata.
          </p>
        </div>

        <div className="mb-10 rounded-3xl border border-ink/10 bg-white/55 p-6 sm:p-8 backdrop-blur-xs shadow-xs">
          <TrustTimeline />

          {error && (
            <div className="mt-6 rounded-2xl border border-coral/30 bg-coral/10 p-4 text-xs text-coral-ink">
              <strong>Error:</strong> {error}
            </div>
          )}

          <div className="mt-8">
            {issuedResult ? (
              <div className="flex flex-col items-center rounded-2xl border border-mint/30 bg-mint/10 p-6 sm:p-10 text-center">
                <span className="grid size-14 place-items-center rounded-full bg-mint text-white shadow-md">
                  <Check size={28} />
                </span>
                <h2 className="mt-5 text-xl font-semibold text-ink">
                  Your document is signed & sealed.
                </h2>
                <p className="mt-2 max-w-sm text-xs leading-5 text-ink/65">
                  The VeriTrail cryptographic manifest has been injected into{' '}
                  <strong>{file?.name}</strong> and registered to the ledger.
                </p>

                {/* Document Metadata Card */}
                <div className="mt-6 w-full max-w-lg rounded-xl border border-mint/20 bg-white/80 p-4 text-left font-mono text-[11px] space-y-2 shadow-xs">
                  <div className="flex justify-between border-b border-ink/5 pb-1.5">
                    <span className="text-ink/40">DOC ID:</span>
                    <span className="font-semibold text-ink truncate max-w-[240px]" title={issuedResult.docId}>
                      {issuedResult.docId}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-ink/5 pb-1.5">
                    <span className="text-ink/40">ISSUER:</span>
                    <span className="font-semibold text-ink">{issuerId}</span>
                  </div>
                  <div className="flex justify-between border-b border-ink/5 pb-1.5">
                    <span className="text-ink/40">CANDIDATE:</span>
                    <span className="font-semibold text-ink">
                      {candidateName} ({candidateId})
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-ink/5 pb-1.5">
                    <span className="text-ink/40">DIGEST (SHA-256):</span>
                    <span
                      className="truncate text-mint font-semibold max-w-[220px]"
                      title={issuedResult.hash}
                    >
                      {issuedResult.hash}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-0.5">
                    <span className="text-ink/40">NEON DB LEDGER:</span>
                    <span className="flex items-center gap-1.5 font-semibold text-[10px] text-mint">
                      <Database size={13} />
                      {issuedResult.dbSaved !== false ? 'Saved & Indexed in Neon DB' : 'Stored Locally (Offline)'}
                    </span>
                  </div>
                </div>

                {/* Download Button */}
                <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                  <a
                    href={issuedResult.blobUrl}
                    download={issuedResult.fileName}
                    className="flex items-center gap-2 rounded-full bg-ink px-6 py-3.5 text-xs font-semibold text-black shadow-md hover:bg-ink/90 transition"
                  >
                    <Download size={16} /> Download Issued File
                  </a>
                  <Link
                    href="/verify"
                    className="flex items-center gap-2 rounded-full border border-ink/15 bg-white px-5 py-3.5 text-xs font-semibold text-black shadow-xs hover:bg-ink/5 transition"
                  >
                    <ShieldCheck size={16} className="text-mint" /> Test in Verifier
                  </Link>
                </div>

                {/* Changes Applied Section */}
                <div className="mt-8 w-full max-w-lg rounded-2xl border border-ink/10 bg-white/90 p-5 text-left shadow-xs">
                  <div className="flex items-center gap-2 border-b border-ink/10 pb-3">
                    <Sparkles size={16} className="text-coral" />
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-ink">
                      Changes Applied to Document
                    </h3>
                  </div>

                  <div className="mt-4 space-y-3.5">
                    <div className="flex items-start gap-3">
                      <div className="grid size-6 shrink-0 place-items-center rounded-full bg-mint/15 text-mint mt-0.5">
                        <Fingerprint size={13} />
                      </div>
                      <div className="text-xs">
                        <p className="font-semibold text-ink">1. Computed Original SHA-256 Hash</p>
                        <p className="text-ink/60 text-[11px] leading-relaxed">
                          Calculated a cryptographic checksum over the unaltered original bytes to establish an immutable base fingerprint.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="grid size-6 shrink-0 place-items-center rounded-full bg-mint/15 text-mint mt-0.5">
                        <ShieldCheck size={13} />
                      </div>
                      <div className="text-xs">
                        <p className="font-semibold text-ink">2. Ed25519 Asymmetric Digital Signature</p>
                        <p className="text-ink/60 text-[11px] leading-relaxed">
                          Signed the document hash using the Issuer&apos;s private key to provide cryptographic non-repudiation and proof of authorship.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="grid size-6 shrink-0 place-items-center rounded-full bg-mint/15 text-mint mt-0.5">
                        <FileCode size={13} />
                      </div>
                      <div className="text-xs">
                        <p className="font-semibold text-ink">3. Non-Destructive Manifest Injection</p>
                        <p className="text-ink/60 text-[11px] leading-relaxed">
                          Embedded the signed manifest when the file format supports metadata; otherwise the manifest is kept as a detached registry record.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="grid size-6 shrink-0 place-items-center rounded-full bg-mint/15 text-mint mt-0.5">
                        <Layers size={13} />
                      </div>
                      <div className="text-xs">
                        <p className="font-semibold text-ink">4. Visual Security Footer Ribbon</p>
                        <p className="text-ink/60 text-[11px] leading-relaxed">
                          Rendered a tamper-evident visual verification footer and cryptographic stamp on the document pages for human inspection.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="grid size-6 shrink-0 place-items-center rounded-full bg-mint/15 text-mint mt-0.5">
                        <Database size={13} />
                      </div>
                      <div className="text-xs">
                        <p className="font-semibold text-ink">5. Neon DB Cloud Ledger Persistence</p>
                        <p className="text-ink/60 text-[11px] leading-relaxed">
                          Registered the document hash, signature, and candidate metadata in Neon PostgreSQL so it can be verified and audited anytime.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleReset}
                  className="mt-6 text-xs font-medium text-ink/50 hover:text-ink underline cursor-pointer"
                >
                  Encrypt / Issue another document
                </button>
              </div>
            ) : (
              <form onSubmit={handleIssue}>
                <Dropzone onFile={setFile} onError={(message) => setError(message)} />

                {file && (
                  <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 rounded-xl border border-ink/10 bg-white/70 p-4">
                    <div>
                      <label className="block text-[10px] font-mono uppercase tracking-wider text-ink/40 mb-1">
                        Candidate Name
                      </label>
                      <div className="flex items-center gap-2 rounded-lg border border-ink/10 bg-white px-3 py-2 text-xs">
                        <User size={14} className="text-ink/40" />
                        <input
                          type="text"
                          value={candidateName}
                          onChange={(e) => setCandidateName(e.target.value)}
                          className="w-full bg-transparent outline-hidden font-medium"
                          placeholder="e.g. Jane Doe"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono uppercase tracking-wider text-ink/40 mb-1">
                        Candidate / Student ID
                      </label>
                      <div className="flex items-center gap-2 rounded-lg border border-ink/10 bg-white px-3 py-2 text-xs">
                        <CreditCard size={14} className="text-ink/40" />
                        <input
                          type="text"
                          value={candidateId}
                          onChange={(e) => setCandidateId(e.target.value)}
                          className="w-full bg-transparent outline-hidden font-medium"
                          placeholder="e.g. CAND-88421"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono uppercase tracking-wider text-ink/40 mb-1">
                        Issuer Authority
                      </label>
                      <div className="flex items-center gap-2 rounded-lg border border-ink/10 bg-white px-3 py-2 text-xs">
                        <Building2 size={14} className="text-ink/40" />
                        <input
                          type="text"
                          value={issuerId}
                          onChange={(e) => setIssuerId(e.target.value)}
                          className="w-full bg-transparent outline-hidden font-medium"
                          placeholder="e.g. VeriTrail Authority"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-6 flex items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    {file && (
                      <>
                        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-coral/10 text-coral">
                          <FileText size={17} />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold">{file.name}</p>
                          <p className="font-mono text-[10px] text-ink/40">
                            {(file.size / 1024 / 1024).toFixed(2)} MB · ready to encrypt & sign
                          </p>
                        </div>
                      </>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={!file || loading}
                    className="flex shrink-0 items-center gap-2 rounded-full bg-coral px-6 py-3.5 text-xs font-semibold text-black transition hover:bg-coral/90 disabled:cursor-not-allowed disabled:opacity-40 shadow-sm cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={15} className="animate-spin" /> Encrypting & Signing...
                      </>
                    ) : (
                      <>
                        <LockKeyhole size={15} /> Encrypt & Issue Document
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        <p className="text-center font-mono text-[10px] text-ink/35">
          VeriTrail Zero-Trust Engine · Ed25519 Cryptographic Signatures & Non-Destructive PDF Manifest Injection
        </p>
      </div>
    </main>
  );
}