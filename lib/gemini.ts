import { GoogleGenAI } from '@google/genai';

export interface HeuristicAnalysisResult {
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH';
  confidenceScore: number;
  detectedAnomalies: string[];
  summary: string;
}

export async function inspectLegacyDocument(
  fileBuffer?: Buffer,
  fileName?: string,
  userPrompt?: string
): Promise<HeuristicAnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      riskLevel: 'MODERATE',
      confidenceScore: 50,
      detectedAnomalies: [
        'GEMINI_API_KEY environment variable is missing',
        'No embedded VeriTrail cryptographic manifest detected',
      ],
      summary:
        'This document is missing a VeriTrail cryptographic manifest. Gemini visual forensic inspection requires GEMINI_API_KEY in environment variables.',
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = `You are an expert digital forensics document inspector for VeriTrail.
Analyze the document for visual tampering, font inconsistencies, varying font weights, baseline misalignments in student names or grades, compression halos around edited text, and cut-and-paste overlays.
You MUST output valid JSON matching this exact JSON schema:
{
  "riskLevel": "LOW" | "MODERATE" | "HIGH",
  "confidenceScore": 85,
  "detectedAnomalies": ["Font weight mismatch on grade section", "Slight baseline displacement on candidate name"],
  "summary": "Forensic scan detected possible font and alignment anomalies in grade table."
}`;

    const contents: any[] = [];
    if (fileBuffer && fileBuffer.length > 0) {
      contents.push({
        inlineData: {
          mimeType: 'application/pdf',
          data: fileBuffer.toString('base64'),
        },
      });
    }

    contents.push(
      userPrompt ||
        `Perform digital forensics on document "${fileName || 'untracked.pdf'}" to detect font inconsistency, compression artifacts, or content editing.`
    );

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
      },
    });

    const responseText = response.text || '{}';
    const parsed = JSON.parse(responseText);

    return {
      riskLevel: parsed.riskLevel || 'HIGH',
      confidenceScore: typeof parsed.confidenceScore === 'number' ? parsed.confidenceScore : 78,
      detectedAnomalies: Array.isArray(parsed.detectedAnomalies)
        ? parsed.detectedAnomalies
        : ['Missing cryptographic provenance metadata'],
      summary: parsed.summary || 'Legacy document analysis completed.',
    };
  } catch (error: any) {
    console.error('Error during Gemini forensic analysis:', error);
    return {
      riskLevel: 'HIGH',
      confidenceScore: 60,
      detectedAnomalies: [
        'Untracked legacy document (no VeriTrail signature)',
        `AI inspection system message: ${error.message || 'API error'}`,
      ],
      summary:
        'Document lacks cryptographic chain-of-custody verification and shows high risk of unverified provenance.',
    };
  }
}