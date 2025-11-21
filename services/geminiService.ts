import { GoogleGenAI, Type } from "@google/genai";
import { Language } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const getSystemInstruction = (lang: Language) => `
You are the narrator and voice of a "Kawai Space Opera" game. 
The world is a pastel-colored alien planet filled with cute dinosaurs and space creatures.
The protagonist is a "Kawai Girl" space explorer.
Tone: Whimsical, cute, slightly epic but lighthearted. Anime style.
IMPORTANT: You MUST output your response in the following language: ${lang === 'uk' ? 'Ukrainian (Українська)' : 'English'}.
`;

export const generateIntro = async (lang: Language): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Generate a short, cute opening narration for the player arriving on Planet Pastel-Prime. Language: ${lang}`,
      config: {
        systemInstruction: getSystemInstruction(lang),
      }
    });
    return response.text || (lang === 'uk' ? "Ласкаво просимо на Планету Пастель-Прайм!" : "Welcome to Planet Pastel-Prime!");
  } catch (error) {
    console.error("Gemini Error:", error);
    return lang === 'uk' ? "Система офлайн." : "System Offline.";
  }
};

export const interactWithCreature = async (creatureType: string, creatureName: string, lang: Language): Promise<string> => {
  try {
    const prompt = `The player says hello to a ${creatureType} named ${creatureName}. What does the creature say or do? Keep it under 30 words. Language: ${lang}`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: getSystemInstruction(lang),
      }
    });
    return response.text || `${creatureName} looks at you curiously.`;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "*...*";
  }
};

export const generateLore = async (subject: string, type: 'HISTORY' | 'BIOLOGY', lang: Language): Promise<{ title: string; content: string }> => {
  const prompt = type === 'HISTORY' 
    ? `Generate a short ancient lore entry about a mysterious monolith discovery regarding: ${subject}. Language: ${lang}`
    : `Generate a cute field researcher log entry about a creature named ${subject}. Language: ${lang}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: getSystemInstruction(lang),
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "A short, catchy title" },
            content: { type: Type.STRING, description: "The lore content (max 50 words)" }
          },
          required: ["title", "content"]
        }
      }
    });
    
    const text = response.text;
    if (!text) throw new Error("No text response");
    return JSON.parse(text);
  } catch (error) {
    console.error("Lore Gen Error:", error);
    return { 
      title: "Corrupted Data", 
      content: "Signal weak." 
    };
  }
};