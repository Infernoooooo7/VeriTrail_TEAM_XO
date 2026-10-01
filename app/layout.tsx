import type { Metadata } from 'next';
import { Navbar } from '@/components/Navbar';
import './globals.css';

export const metadata: Metadata = { title: 'VeriTrail · Proof for every document', description: 'A cryptographic chain of custody for PDFs.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body className="noise"><Navbar />{children}</body></html>; }