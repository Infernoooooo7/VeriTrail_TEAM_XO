import { AlertTriangle, CheckCircle2, Search } from 'lucide-react';
import type { VerificationState } from '@/types';

export function StatusBanner({ state }: { state: VerificationState }) {
  const content = { verified: { icon: CheckCircle2, title: 'Document verified', text: 'The file matches its signed chain of custody.', style: 'border-mint/30 bg-mint/10 text-mint-ink' }, tampered: { icon: AlertTriangle, title: 'Integrity check failed', text: 'The file has changed since it was issued.', style: 'border-coral/30 bg-coral/10 text-coral-ink' }, heuristic: { icon: Search, title: 'Legacy document detected', text: 'No signature found. Review the visual inspection below.', style: 'border-amber/30 bg-amber/10 text-amber-ink' }, pending: { icon: Search, title: 'Ready to inspect', text: 'Upload a document to begin verification.', style: 'border-ink/10 bg-white text-ink' } }[state];
  const Icon = content.icon;
  return <div className={`animate-rise flex items-start gap-3 rounded-2xl border p-4 ${content.style}`}><Icon className="mt-0.5 shrink-0" size={19} /><div><strong className="block text-sm">{content.title}</strong><span className="mt-1 block text-xs opacity-75">{content.text}</span></div></div>;
}