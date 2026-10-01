'use client';

import { AlertTriangle, RefreshCw, WifiOff } from 'lucide-react';

interface ServiceUnavailableBannerProps {
  /** Called when the user clicks "Try again". */
  onRetry: () => void;
  /** Whether a retry is currently in progress. */
  retrying?: boolean;
  message?: string;
}

/**
 * Shown when the Gemini API returns a 503 / high-demand error.
 * This is a SYSTEM-LEVEL banner — it must never display forensic risk scores
 * or anomaly data. Its sole purpose is to tell the user the service is busy
 * and offer a retry action.
 */
export function ServiceUnavailableBanner({
  onRetry,
  retrying = false,
  message,
}: ServiceUnavailableBannerProps) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="mt-5 flex flex-col gap-3 rounded-2xl border border-amber-500/25 bg-amber-50/80 p-4 shadow-sm backdrop-blur-sm sm:flex-row sm:items-start sm:gap-4 sm:p-5"
    >
      {/* Icon */}
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
        <WifiOff size={18} />
      </div>

      {/* Body */}
      <div className="flex-1">
        <p className="text-sm font-semibold text-amber-900">
          AI Forensic Engine Temporarily Unavailable
        </p>
        <p className="mt-1 text-xs leading-5 text-amber-800/70">
          {message ||
            'The Gemini forensic inspection service is currently experiencing high demand. Your document has not been scored — this is a system status issue, not a finding.'}
        </p>

        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={onRetry}
            disabled={retrying}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw size={13} className={retrying ? 'animate-spin' : ''} />
            {retrying ? 'Retrying…' : 'Try again'}
          </button>
          <span className="text-[10px] font-mono text-amber-700/60">
            No risk score has been recorded
          </span>
        </div>
      </div>

      {/* Warning icon */}
      <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-400 sm:mt-1" />
    </div>
  );
}
