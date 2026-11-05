import { GoogleGenAI } from "@google/genai/web";
import type { GenerateContentParameters } from "@google/genai/web";

/** The caller reads credentials inside its authenticated server handler. */
export async function generateGemini(apiKey: string | undefined, request: Omit<GenerateContentParameters, "model">) {
  if (!apiKey) throw new Error("Gemini is not configured. Ask the administrator to add the Google API key.");
  const ai = new GoogleGenAI({ apiKey });
  try {
    const response = await ai.models.generateContent({ model: "gemini-3.8-flash", ...request });
    const text = response.text;
    if (!text?.trim()) throw new Error("Empty response");
    return text;
  } catch {
    // Never expose provider errors, which can contain credential-bearing URLs.
    throw new Error("Gemini could not complete this request. Your input is preserved; please try again later.");
  }
}