import type { Metadata } from 'next';
import { Navbar } from '@/components/Navbar';
import './globals.css';
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
	metadataBase: new URL('https://veritrail.example.com'),
	title: {
		default: 'VeriTrail · Proof for every document',
		template: '%s · VeriTrail',
	},
	description: 'Cryptographic provenance and tamper detection for every safe document.',
	applicationName: 'VeriTrail',
	keywords: ['document verification', 'cryptographic provenance', 'tamper detection'],
	icons: { icon: '/icon.svg', shortcut: '/icon.svg', apple: '/icon.svg' },
	openGraph: {
		title: 'VeriTrail · Proof for every document',
		description: 'Issue once, verify anywhere, and know when a document has changed.',
		type: 'website',
		siteName: 'VeriTrail',
	},
	twitter: {
		card: 'summary',
		title: 'VeriTrail · Proof for every document',
		description: 'Cryptographic provenance for your documents.',
	},
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en" className={cn('font-sans', inter.variable)} suppressHydrationWarning><body className="noise" suppressHydrationWarning><Navbar />{children}</body></html>; }
