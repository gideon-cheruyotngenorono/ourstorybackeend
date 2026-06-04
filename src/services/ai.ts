import { GoogleGenAI } from '@google/genai';

// Assume GEMINI_API_KEY is defined in .env
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || 'mock_api_key' });

export async function generateContent(prompt: string): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || '';
  } catch (error) {
    console.error('[AI_SERVICE]', error);
    return 'Could not generate content at this time.';
  }
}
