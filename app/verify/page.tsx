'use client';

import { useState } from 'react';
import {
  ArrowLeft,
  CalendarDays,
  Copy,
  FileCheck2,
  Fingerprint,
  Loader2,
  ShieldCheck,
  User,
  AlertTriangle,
  KeyRound,
  FileSearch,
  Database,
} from 'lucide-react';
import Link from 'next/link';
import { Dropzone } from '@/components/Dropzone';
import { HeuristicReport } from '@/components/HeuristicReport';
import { ServiceUnavailableBanner } from '@/components/ServiceUnavailableBanner';
import { StatusBanner } from '@/components/StatusBanner';
import { TrustTimeline } from '@/components/TrustTimeline';
import type { VerificationState, DocumentManifest, HeuristicReportData } from '@/types';

export default function VerifyPage() {
  const [state, setState] = useState<VerificationState>('pending');
  const [file, setFile] = useState<File>();
  const [loading, setLoading] = useState(false);
  const [verifyingText, setVerifyingText] = useState('Verifying document...');
  const [manifest, setManifest] = useState<DocumentManifest | null>(null);
  const [dbRecord, setDbRecord] = useState<any>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [expectedHash, setExpectedHash] = useState<string | null>(null);
  const [computedHash, setComputedHash] = useState<string | null>(null);
  const [heuristicReport, setHeuristicReport] = useState<HeuristicReportData | null>(null);
  const [error, setError] = useState<string | null>(null);
  // System-level AI service availability — kept strictly separate from forensic state
  const [geminiUnavailable, setGeminiUnavailable] = useState(false);
  const [geminiUnavailableMsg, setGeminiUnavailableMsg] = useState<string | undefined>();
  const [retrying, setRetrying] = useState(false);

  /**
   * Runs the full inspection pipeline for `selected`.
   * Infrastructure 503 errors are routed to `geminiUnavailable` state and
   * never stored in `heuristicReport` or any forensic field.
   */
  const runHeuristic = async (selected: File) => {
    setGeminiUnavailable(false);
    setGeminiUnavailableMsg(undefined);
    setVerifyingText('No manifest detected. Running Gemini AI visual forensics…');

    const heuristicFormData = new FormData();
    heuristicFormData.append('file', selected);

    const hResponse = await fetch('/api/heuristic', {
      method: 'POST',
      body: heuristicFormData,
    });

    // -----------------------------------------------------------------------
    // 503 → system-level banner, not a forensic result
    // -----------------------------------------------------------------------
    if (hResponse.status === 503) {
      const body = await hResponse.json().catch(() => ({}));
      if (body.serviceUnavailable) {
        setGeminiUnavailable(true);
        setGeminiUnavailableMsg(body.message);
        return; // do NOT touch heuristicReport
      }
    }

    if (hResponse.ok) {
      const hData: HeuristicReportData = await hResponse.json();
      setHeuristicReport(hData);
    } else {
      // Unexpected non-503 failure — show generic error, still not a forensic score
      setGeminiUnavailable(true);
      setGeminiUnavailableMsg(
        'Forensic inspection encountered an unexpected error. No risk score was recorded.'
      );
    }
  };

  const inspect = async (selected: File) => {
    setFile(selected);
    setLoading(true);
    setVerifyingText('Checking cryptographic manifest & Ed25519 signature...');
    setError(null);
    setManifest(null);
    setDbRecord(null);
    setReason(null);
    setExpectedHash(null);
    setComputedHash(null);
    setHeuristicReport(null);
    setGeminiUnavailable(false);
    setGeminiUnavailableMsg(undefined);

    try {
      const formData = new FormData();
      formData.append('file', selected);

      // 1. Call verification endpoint
      const response = await fetch('/api/verify', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Verification request failed');
      }

      const result = await response.json();

      if (result.status === 'VERIFIED') {
        setState('verified');
        setManifest(result.manifest);
        setDbRecord(result.dbRecord || null);
        setComputedHash(result.computedHash || result.manifest?.vtr_content_hash);
      } else if (result.status === 'TAMPERED') {
        setState('tampered');
        setManifest(result.manifest || null);
        setDbRecord(result.dbRecord || null);
        setReason(result.reason || result.message || 'Tampering detected');
        setExpectedHash(result.expectedHash || result.manifest?.vtr_content_hash || null);
        setComputedHash(result.computedHash || null);
      } else if (result.status === 'UNTRACKED' || result.state === 'heuristic') {
        setState('heuristic');
        setComputedHash(result.computedHash || null);
        await runHeuristic(selected);
      }
    } catch (err: any) {
      console.error('Verification error:', err);
      setError(err.message || 'Failed to complete document verification.');
      setState('pending');
    } finally {
      setLoading(false);
    }
  };

  /** Manual retry after a 503 — only re-runs the heuristic call, not the full pipeline. */
  const retryHeuristic = async () => {
    if (!file) return;
    setRetrying(true);
    await runHeuristic(file);
    setRetrying(false);
  };

  const reset = () => {
    setState('pending');
    setFile(undefined);
    setManifest(null);
    setDbRecord(null);
    setReason(null);
    setExpectedHash(null);
    setComputedHash(null);
    setHeuristicReport(null);
    setError(null);
    setGeminiUnavailable(false);
    setGeminiUnavailableMsg(undefined);
    setRetrying(false);
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
            Verifier workspace
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-.05em] sm:text-5xl">
            Does it hold up?
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-ink/50">
            Drop in any PDF to inspect its embedded manifest, verify its Ed25519 digital signature against the content digest, and check chain of custody in Neon DB.
          </p>
        </div>

        <div className="rounded-3xl border border-ink/10 bg-white/55 p-6 sm:p-8 backdrop-blur-xs shadow-xs">
          <StatusBanner state={state} />

          {error && (
            <div className="mt-4 rounded-xl border border-coral/20 bg-coral/10 p-3.5 text-xs text-coral-ink">
              <strong>Error:</strong> {error}
            </div>
          )}

          {loading ? (
            <div className="my-12 flex flex-col items-center justify-center text-center">
              <Loader2 size={32} className="animate-spin text-coral mb-3" />
              <p className="text-sm font-semibold text-ink">{verifyingText}</p>
              <p className="mt-1 font-mono text-[11px] text-ink/40">
                VeriTrail cryptographic validation engine
              </p>
            </div>
          ) : state === 'pending' ? (
            <div className="mt-6">
              <Dropzone onFile={inspect} />
            </div>
          ) : (
            <>
              <div className="mt-8">
                <TrustTimeline />
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-ink/10 bg-white/60 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wider text-ink/40 font-mono">
                      Document
                    </span>
                    <FileCheck2 size={15} className="text-mint" />
                  </div>
                  <p className="mt-3 truncate text-xs font-semibold">{file?.name}</p>
                  <p className="mt-1 text-[10px] text-ink/40">
                    PDF · {((file?.size ?? 0) / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>

                <div className="rounded-xl border border-ink/10 bg-white/60 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wider text-ink/40 font-mono">
                      {manifest ? 'Issuer Details' : 'Status'}
                    </span>
                    <CalendarDays size={15} className="text-coral" />
                  </div>
                  <p className="mt-3 text-xs font-semibold truncate">
                    {manifest ? manifest.vtr_issuer_id || manifest.issuer : 'Untracked PDF'}
                  </p>
                  <p className="mt-1 text-[10px] text-ink/40 truncate">
                    {manifest
                      ? `Candidate: ${manifest.vtr_candidate || 'N/A'} (${manifest.vtr_candidate_id || ''})`
                      : 'No metadata embedded'}
                  </p>
                </div>
              </div>

              {/* Tampered Details Card */}
              {state === 'tampered' && (
                <div className="mt-4 rounded-xl border border-coral/20 bg-coral/5 p-4">
                  <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-coral-ink">
                    <Fingerprint size={14} /> Verification Failure: {reason}
                  </p>
                  {expectedHash && computedHash && (
                    <div className="mt-3 space-y-1 font-mono text-[10px] text-ink/60">
                      <p className="break-all">
                        <span className="font-semibold text-ink/40">EXPECTED DIGEST:</span> {expectedHash}
                      </p>
                      <p className="break-all text-coral-ink">
                        <span className="font-semibold text-ink/40">COMPUTED DIGEST:</span> {computedHash}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* System-level 503 banner — rendered INSTEAD of any forensic report */}
              {state === 'heuristic' && geminiUnavailable && (
                <ServiceUnavailableBanner
                  onRetry={retryHeuristic}
                  retrying={retrying}
                  message={geminiUnavailableMsg}
                />
              )}

              {/* Heuristic Gemini AI Fallback Report — only shown on successful AI response */}
              {state === 'heuristic' && !geminiUnavailable && heuristicReport && (
                <HeuristicReport report={heuristicReport} />
              )}

              {/* Verified Certificate Fingerprint Card */}
              {state === 'verified' && manifest && (
                <div className="mt-4 rounded-3xl border border-ink/10 bg-ink p-6 text-black shadow-md">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
                    <p className="font-mono text-[10px] uppercase tracking-[.2em] text-mint">
                      Cryptographic Chain of Custody
                    </p>
                    <span className="flex items-center gap-1 text-[10px] font-mono text-black/50">
                      <KeyRound size={12} className="text-mint" /> Ed25519 Valid
                    </span>
                  </div>

                  <div className="space-y-3 font-mono text-xs">
                    <div>
                      <span className="block text-[10px] text-black/40 uppercase">Content SHA-256 Digest</span>
                      <p className="break-all font-mono text-xs text-mint mt-0.5">
                        {manifest.vtr_content_hash || manifest.contentDigest}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-white/10 text-[11px]">
                      <div>
                        <span className="block text-[10px] text-black/40 uppercase">Document ID</span>
                        <span className="text-black/80">{manifest.vtr_doc_id}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-black/40 uppercase">Issuance Timestamp</span>
                        <span className="text-black/80">
                          {manifest.vtr_timestamp ? new Date(manifest.vtr_timestamp).toLocaleString() : 'N/A'}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px]">
                      <span className="text-white/40 uppercase text-[10px]">Neon DB Ledger:</span>
                      <span className="flex items-center gap-1.5 text-mint font-semibold">
                        <Database size={13} />
                        {dbRecord ? 'Record Verified & Matched in Neon DB' : 'Embedded Signature Verified'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={reset}
                className="mt-6 flex items-center gap-2 text-xs font-semibold text-ink/55 hover:text-ink transition cursor-pointer"
              >
                <Copy size={14} /> Inspect another file
              </button>
            </>
          )}
        </div>
      </div>
    </main>
  );
}