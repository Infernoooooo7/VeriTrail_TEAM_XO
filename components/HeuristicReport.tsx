import { Sparkles, AlertTriangle, ShieldAlert, CheckCircle2 } from 'lucide-react';
import type { HeuristicReportData } from '@/types';

export function HeuristicReport({ report }: { report: HeuristicReportData }) {
  const confidence = typeof report.confidenceScore === 'number'
    ? report.confidenceScore
    : Math.round((report.confidence || 0.75) * 100);

  const signals = report.detectedAnomalies || report.signals || [];
  const risk = report.riskLevel || (confidence < 60 ? 'HIGH' : confidence < 80 ? 'MODERATE' : 'LOW');

  const riskBadge = {
    LOW: { label: 'Low Risk', bg: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' },
    MODERATE: { label: 'Moderate Risk', bg: 'bg-amber-500/10 text-amber-600 border-amber-500/30' },
    HIGH: { label: 'High Risk', bg: 'bg-red-500/10 text-red-600 border-red-500/30' },
  }[risk];

  return (
    <div className="mt-6 rounded-2xl border border-amber/20 bg-amber/5 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-amber-900">
          <Sparkles size={18} className="text-amber-600" /> Gemini 2.5 Flash Forensic Inspection
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${riskBadge.bg}`}>
            {riskBadge.label}
          </span>
          <span className="rounded-full bg-amber/15 px-2.5 py-1 font-mono text-[10px] font-semibold text-amber-800">
            {confidence}% confidence
          </span>
        </div>
      </div>

      <p className="mt-4 text-xs leading-5 text-ink/70 sm:text-sm">{report.summary}</p>

      {signals.length > 0 && (
        <div className="mt-4">
          <p className="text-[10px] font-mono uppercase tracking-wider text-ink/40">
            Detected Forensic Signals & Anomalies
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {signals.map((signal, idx) => (
              <span
                key={idx}
                className="flex items-center gap-1.5 rounded-lg border border-amber/10 bg-white/80 px-3 py-1.5 text-[11px] text-ink/70 shadow-xs"
              >
                <AlertTriangle size={12} className="text-amber-500" />
                {signal}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}