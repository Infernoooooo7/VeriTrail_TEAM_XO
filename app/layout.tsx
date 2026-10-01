import type { Metadata } from 'next';
import { Navbar } from '@/components/Navbar';
import './globals.css';
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = { title: 'VeriTrail · Proof for every document', description: 'A cryptographic chain of custody for PDFs.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en" className={cn('font-sans', inter.variable)} suppressHydrationWarning><body className="noise" suppressHydrationWarning><Navbar />{children}</body></html>; }
