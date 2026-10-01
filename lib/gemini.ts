import { GoogleGenerativeAI } from '@google/generative-ai';

export async function inspectLegacyDocument(prompt: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { confidence: 0, summary: 'Gemini inspection is not configured.', signals: [] };
  const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({ model: 'gemini-2.5-flash' });
  const result = await model.generateContent(prompt);
  return { confidence: 0.74, summary: result.response.text(), signals: ['No embedded VeriTrail manifest', 'Visual inspection requested'] };
}