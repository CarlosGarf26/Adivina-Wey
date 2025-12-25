import { GoogleGenAI, Type, Schema } from "@google/genai";

// Define the response schema for strict JSON output
const wordsSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    words: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "A list of 20-30 words or short phrases for the game."
    }
  },
  required: ["words"]
};

export const generateDeck = async (topic: string): Promise<string[]> => {
  // API Key must be obtained exclusively from process.env.API_KEY
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const prompt = `
      Genera una lista de 25 palabras o frases cortas para un juego de "Charadas" (Heads Up) basado en el tema: "${topic}".
      
      Reglas:
      1. El contexto es MÉXICO, específicamente CIUDAD DE MÉXICO (CDMX/Chilangos).
      2. Usa jerga, slang, lugares icónicos o referencias culturales si el tema lo permite.
      3. Las frases deben ser cortas (máximo 4 palabras).
      4. Deben ser divertidas y reconocibles.
      5. Evita palabras ofensivas extremas, pero el "picante" mexicano está bien.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: wordsSchema,
        systemInstruction: "Eres un chilango experto en cultura pop mexicana creando contenido para un juego de fiesta.",
      }
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("No response from AI");

    const parsed = JSON.parse(jsonText);
    
    // Shuffle the array to ensure randomness
    const shuffled = parsed.words.sort(() => 0.5 - Math.random());
    return shuffled;

  } catch (error) {
    console.error("Error generating deck:", error);
    return [
      "Error de conexión",
      "Intenta de nuevo",
      "La IA se fue por tacos",
      "Checa tu internet"
    ];
  }
};