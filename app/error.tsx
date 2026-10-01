'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft, RefreshCw } from 'lucide-react';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Keep production error details in the server logs, not in the UI.
    console.error('VeriTrail application error:', error);
  }, [error]);

  return <main className="grid-paper flex min-h-[calc(100vh-89px)] items-center justify-center px-6 py-20"><div className="max-w-md text-center"><span className="mx-auto grid size-16 place-items-center rounded-2xl bg-coral/15 text-coral-ink"><AlertTriangle size={28} /></span><p className="mt-8 font-mono text-[10px] uppercase tracking-[.24em] text-coral">Verification interrupted</p><h1 className="mt-4 text-4xl font-semibold tracking-[-.06em]">The trail hit a snag.</h1><p className="mt-4 text-sm leading-6 text-ink/55">Something went wrong while loading this workspace. You can retry the operation or return home.</p><div className="mt-8 flex justify-center gap-3"><button onClick={() => reset()} className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-xs font-semibold text-white"><RefreshCw size={14} /> Try again</button><Link href="/" className="inline-flex items-center gap-2 rounded-full border border-ink/15 bg-white px-5 py-3 text-xs font-semibold"><ArrowLeft size={14} /> Home</Link></div></div></main>;
}