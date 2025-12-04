
import { GoogleGenAI, Type } from "@google/genai";
import { AIConfigResponse, ShapeType } from "../types";

const SYSTEM_INSTRUCTION = `
You are a visual design assistant for a 3D particle system. 
The user will provide a concept, word, or description.
Your job is to map this concept to the most appropriate visual settings for the particle engine.

Available Shapes: Sphere, Flower, Heart, Tree, Snowman, Galaxy.
- 'Heart' fits love, emotion, biology.
- 'Tree' fits nature, growth, christmas, forest.
- 'Snowman' fits winter, ice, fun.
- 'Galaxy' fits space, science, chaos, spiral.
- 'Flower' fits garden, nature, beauty, bloom, rose, tulip, daisy.
- 'Sphere' is the default for generic objects.

Return parameters:
- colorHex: A primary hex color string (e.g., "#FF0000").
- colorPalette: An array of exactly 5 hex color strings forming a vertical gradient (bottom to top). 
   - For 'Tree', this might be brown (trunk) to green (leaves) to gold (star). 
   - For 'Heart', dark red to bright pink.
   - For 'Galaxy', deep purple to bright blue/white.
   - For 'Flower', green (stem) to bright colors (petals) to yellow (center).
- speed: 0.1 (slow/calm) to 2.0 (fast/chaotic).
- noiseStrength: 0.1 (static) to 1.5 (turbulent).
- shapeMatch: One of the available enum values.
- reasoning: A very short sentence explaining the choice.
`;

export const analyzeConcept = async (concept: string): Promise<AIConfigResponse> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `User concept: "${concept}"`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            colorHex: { type: Type.STRING },
            colorPalette: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              minItems: 5,
              maxItems: 5
            },
            speed: { type: Type.NUMBER },
            noiseStrength: { type: Type.NUMBER },
            shapeMatch: { 
              type: Type.STRING, 
              enum: [
                ShapeType.SPHERE, 
                ShapeType.FLOWER, 
                ShapeType.HEART, 
                ShapeType.TREE, 
                ShapeType.SNOWMAN, 
                ShapeType.GALAXY
              ] 
            },
            reasoning: { type: Type.STRING },
          },
          required: ["colorHex", "colorPalette", "speed", "noiseStrength", "shapeMatch", "reasoning"],
        },
      },
    });

    if (response.text) {
      return JSON.parse(response.text) as AIConfigResponse;
    }
    throw new Error("No response from AI");
  } catch (error) {
    console.error("Gemini Error:", error);
    // Fallback if AI fails
    return {
      colorHex: "#ffffff",
      colorPalette: ["#ffffff", "#cccccc", "#999999", "#666666", "#333333"],
      speed: 0.5,
      noiseStrength: 0.2,
      shapeMatch: ShapeType.SPHERE,
      reasoning: "AI service unavailable, reverting to default.",
    };
  }
};
