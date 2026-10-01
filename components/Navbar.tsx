'use client';
import Link from 'next/link';
import { ArrowUpRight, ShieldCheck } from 'lucide-react';
import { usePathname } from 'next/navigation';

export function Navbar() {
  const pathname = usePathname();
  return <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
    <Link href="/" className="flex items-center gap-3 font-semibold tracking-tight"><span className="grid size-9 place-items-center rounded-xl bg-ink text-white shadow-lg shadow-ink/10"><ShieldCheck size={19} strokeWidth={2.4} /></span><span className="text-[15px]">veritrail<span className="text-coral">.</span></span></Link>
    <nav className="hidden items-center gap-8 text-[13px] text-ink/55 md:flex"><Link className={pathname === '/issue' ? 'text-ink' : 'hover:text-ink'} href="/issue">Issue document</Link><Link className={pathname === '/verify' ? 'text-ink' : 'hover:text-ink'} href="/verify">Verify a document</Link><a href="https://github.com" className="flex items-center gap-1.5 hover:text-ink">Docs <ArrowUpRight size={14} /></a></nav>
    <Link href="/verify" className="rounded-full border border-ink/10 bg-white px-4 py-2 text-[12px] font-semibold shadow-sm transition hover:border-ink/25">Open verifier</Link>
  </header>;
}