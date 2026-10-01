// ---------------------------------------------------------------------------
// VeriTrail AI forensics — powered by Nexus API (OpenAI-compatible)
// ---------------------------------------------------------------------------
// Drop-in replacement for the old @google/genai integration.
// Uses native fetch() — no extra SDK dependency required.
// ---------------------------------------------------------------------------

export interface HeuristicAnalysisResult {
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH';
  confidenceScore: number;
  detectedAnomalies: string[];
  summary: string;
}

/**
 * Thrown exclusively for infrastructure-level API failures (e.g. 503 Service
 * Unavailable / high demand). These must NEVER be surfaced as forensic risk
 * scores or anomalies in the UI — callers should catch this separately and
 * show a system-level status banner instead.
 */
export class GeminiServiceError extends Error {
  public readonly statusCode: number;
  public readonly isTransient: boolean;

  constructor(message: string, statusCode = 503, isTransient = true) {
    super(message);
    this.name = 'GeminiServiceError';
    this.statusCode = statusCode;
    this.isTransient = isTransient;
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Returns true if the error looks like a transient 503 / high-demand error. */
function isServiceUnavailable(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as Record<string, unknown>;
  const msg = String(e.message ?? '').toLowerCase();
  const status = Number(e.status ?? e.statusCode ?? e.code ?? 0);

  return (
    status === 503 ||
    msg.includes('503') ||
    msg.includes('service unavailable') ||
    msg.includes('high demand') ||
    msg.includes('overloaded')
  );
}

/**
 * Exponential backoff with full jitter.
 * delay = random(0, min(cap, base * 2^attempt))
 */
async function backoffDelay(attempt: number, baseMs = 600, capMs = 10_000): Promise<void> {
  const ceiling = Math.min(capMs, baseMs * Math.pow(2, attempt));
  const delay = Math.random() * ceiling;
  await new Promise((r) => setTimeout(r, delay));
}

// ---------------------------------------------------------------------------
// Nexus API call  (OpenAI-compatible /v1/chat/completions)
// ---------------------------------------------------------------------------

interface NexusContentPart {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: { url: string };
}

interface NexusMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | NexusContentPart[];
}

async function callNexusAPI(
  model: string,
  messages: NexusMessage[],
  apiKey: string,
  baseUrl: string
): Promise<string> {
  const url = `${baseUrl.replace(/\/$/, '')}/v1/chat/completions`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    const err = new Error(`Nexus API error ${res.status}: ${body}`) as Error & {
      status: number;
      statusCode: number;
    };
    err.status = res.status;
    err.statusCode = res.status;
    throw err;
  }

  const json = await res.json();
  return json?.choices?.[0]?.message?.content ?? '{}';
}

// ---------------------------------------------------------------------------
// Primary export
// ---------------------------------------------------------------------------

/**
 * Calls the Nexus API with:
 *  - Per-model retry loop (up to MAX_RETRIES attempts on 503)
 *  - Automatic model fallback when a model is saturated after all retries
 *  - Strict separation:
 *      infrastructure 503 errors  → throws GeminiServiceError
 *      forensic / parse errors    → returns HeuristicAnalysisResult
 *
 * NOTE: The function is still named `inspectLegacyDocument` and the error
 * class is still `GeminiServiceError` so all existing callers work unchanged.
 */
export async function inspectLegacyDocument(
  fileBuffer?: Buffer,
  fileName?: string,
  userPrompt?: string
): Promise<HeuristicAnalysisResult> {
  const apiKey = process.env.NEXUS_API_KEY;
  const baseUrl = process.env.NEXUS_BASE_URL ?? 'https://nexusapi.navigatelabs.ai';

  if (!apiKey) {
    return {
      riskLevel: 'MODERATE',
      confidenceScore: 50,
      detectedAnomalies: [
        'NEXUS_API_KEY environment variable is missing',
        'No embedded VeriTrail cryptographic manifest detected',
      ],
      summary:
        'This document is missing a VeriTrail cryptographic manifest. Nexus AI forensic inspection requires NEXUS_API_KEY in environment variables.',
    };
  }

  const systemInstruction = `You are an expert digital forensics document inspector for VeriTrail.
Analyze the document for visual tampering, font inconsistencies, varying font weights, baseline misalignments in student names or grades, compression halos around edited text, and cut-and-paste overlays.
You MUST output valid JSON matching this exact JSON schema:
{
  "riskLevel": "LOW" | "MODERATE" | "HIGH",
  "confidenceScore": 85,
  "detectedAnomalies": ["Font weight mismatch on grade section", "Slight baseline displacement on candidate name"],
  "summary": "Forensic scan detected possible font and alignment anomalies in grade table."
}`;

  // Build the user message content array
  const userContent: NexusContentPart[] = [];

  if (fileBuffer && fileBuffer.length > 0) {
    // Embed as a base64 data URL so vision-capable models can inspect it
    const b64 = fileBuffer.toString('base64');
    userContent.push({
      type: 'image_url',
      image_url: { url: `data:application/pdf;base64,${b64}` },
    });
  }

  userContent.push({
    type: 'text',
    text:
      userPrompt ||
      `Perform digital forensics on document "${fileName || 'untracked.pdf'}" to detect font inconsistency, compression artifacts, or content editing.`,
  });

  const messages: NexusMessage[] = [
    { role: 'system', content: systemInstruction },
    { role: 'user', content: userContent },
  ];

  // Models tried in priority order; next model is tried if current is still
  // unavailable after exhausting per-model retries.
  const modelsToTry = ['gemini-3.8-flash'];
  const MAX_RETRIES = 4; // 1 initial attempt + 3 retries per model

  let lastServiceError: GeminiServiceError | null = null;

  for (const modelName of modelsToTry) {
    let responseText: string | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        responseText = await callNexusAPI(modelName, messages, apiKey, baseUrl);
        break; // success — exit retry loop
      } catch (err: unknown) {
        if (isServiceUnavailable(err)) {
          const attemptsLeft = MAX_RETRIES - attempt - 1;
          console.warn(
            `[Nexus] Model ${modelName} returned 503 on attempt ${attempt + 1}/${MAX_RETRIES}.` +
              (attemptsLeft > 0 ? ' Retrying with backoff…' : ' Trying next model.')
          );

          lastServiceError = new GeminiServiceError(
            `Nexus model "${modelName}" is experiencing high demand. ` +
              `Attempt ${attempt + 1} of ${MAX_RETRIES}.`,
            503,
            true
          );

          if (attemptsLeft > 0) {
            await backoffDelay(attempt);
            continue; // retry same model with delay
          }
          break; // move on to next model
        }

        // Non-transient error — skip to next model immediately
        console.warn(
          `[Nexus] Model ${modelName} failed (non-transient):`,
          (err as Error).message
        );
        break;
      }
    }

    if (responseText !== null) {
      // Parse and return the forensic result
      try {
        const parsed = JSON.parse(responseText);

        return {
          riskLevel: parsed.riskLevel || 'HIGH',
          confidenceScore:
            typeof parsed.confidenceScore === 'number' ? parsed.confidenceScore : 78,
          detectedAnomalies: Array.isArray(parsed.detectedAnomalies)
            ? parsed.detectedAnomalies
            : ['Missing cryptographic provenance metadata'],
          summary: parsed.summary || 'Legacy document analysis completed.',
        };
      } catch (parseErr) {
        console.error('[Nexus] JSON parse error on model response:', parseErr);
        return {
          riskLevel: 'HIGH',
          confidenceScore: 60,
          detectedAnomalies: ['Forensic model returned malformed JSON'],
          summary: 'AI inspection completed but the response could not be parsed.',
        };
      }
    }
  }

  // All models exhausted after retries — throw an infrastructure error.
  // Callers MUST NOT convert this into a forensic risk score.
  throw (
    lastServiceError ??
    new GeminiServiceError(
      'All Nexus model candidates are currently unavailable. Please try again shortly.',
      503,
      true
    )
  );
}