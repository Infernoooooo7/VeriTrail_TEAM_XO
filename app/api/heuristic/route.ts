import { NextResponse } from 'next/server';
import { inspectLegacyDocument } from '@/lib/gemini';

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') || '';

    let buffer: Buffer | undefined;
    let fileName: string | undefined;
    let userPrompt: string | undefined;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file');
      userPrompt = (formData.get('prompt') as string) || undefined;

      if (file instanceof File) {
        fileName = file.name;
        const arrayBuffer = await file.arrayBuffer();
        buffer = Buffer.from(arrayBuffer);
      }
    } else if (contentType.includes('application/json')) {
      const body = await request.json().catch(() => ({}));
      userPrompt = body.prompt;
    }

    const report = await inspectLegacyDocument(buffer, fileName, userPrompt);

    return NextResponse.json(report);
  } catch (error: any) {
    console.error('Heuristic route error:', error);
    return NextResponse.json(
      {
        riskLevel: 'HIGH',
        confidenceScore: 50,
        detectedAnomalies: ['Failed to execute heuristic inspection pipeline'],
        summary: error.message || 'Inspection failed.',
      },
      { status: 500 }
    );
  }
}