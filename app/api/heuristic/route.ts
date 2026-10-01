import { NextResponse } from 'next/server';
import { inspectLegacyDocument } from '@/lib/gemini';
export async function POST(request: Request) { const body = await request.json().catch(() => ({})); return NextResponse.json(await inspectLegacyDocument(body.prompt ?? 'Inspect this legacy document for signs of visual alteration.')); }