import Link from 'next/link';
import { ArrowLeft, FileQuestion } from 'lucide-react';

export default function NotFound() {
  return <main className="grid-paper flex min-h-[calc(100vh-89px)] items-center justify-center px-6 py-20"><div className="max-w-md text-center"><span className="mx-auto grid size-16 place-items-center rounded-2xl bg-ink text-coral shadow-xl shadow-ink/10"><FileQuestion size={28} /></span><p className="mt-8 font-mono text-[10px] uppercase tracking-[.24em] text-coral">404 · Missing trail</p><h1 className="mt-4 text-4xl font-semibold tracking-[-.06em]">This page wasn’t issued.</h1><p className="mt-4 text-sm leading-6 text-ink/55">The address does not point to a VeriTrail record. Return to the trailhead and choose a workspace.</p><Link href="/" className="mt-8 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-xs font-semibold text-white transition hover:bg-ink/90"><ArrowLeft size={15} /> Back to home</Link></div></main>;
}