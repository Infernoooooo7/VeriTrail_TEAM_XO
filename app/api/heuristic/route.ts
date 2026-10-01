import { NextResponse } from 'next/server';
import { inspectLegacyDocument, GeminiServiceError } from '@/lib/gemini';

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
  } catch (error: unknown) {
    // -----------------------------------------------------------------------
    // Infrastructure / service-availability error — must NOT be saved or
    // displayed as a forensic risk score.  Return a distinct 503 payload so
    // the frontend can show a retry banner instead.
    // -----------------------------------------------------------------------
    if (error instanceof GeminiServiceError) {
      console.warn('[Heuristic API] Gemini service unavailable:', error.message);
      return NextResponse.json(
        {
          serviceUnavailable: true,
          retryable: error.isTransient,
          message:
            'The AI forensic inspection service is temporarily under high demand. Please try again in a moment.',
        },
        { status: 503 }
      );
    }

    // Application-level error (unexpected)
    const err = error as Error;
    console.error('[Heuristic API] Unexpected error:', err);
    return NextResponse.json(
      {
        serviceUnavailable: false,
        message: err.message || 'Inspection failed due to an internal error.',
      },
      { status: 500 }
    );
  }
}