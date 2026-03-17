import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function getUnitInsights(unitData: any) {
  const prompt = `As a high-end real estate expert, provide a compelling 2-sentence investment summary for this property:
  Name: ${unitData.name}
  Price: $${unitData.price}
  Area: ${unitData.area}sqm
  Features: ${unitData.bedrooms} BR, ${unitData.bathrooms} BA
  Description: ${unitData.description}
  
  Focus on ROI and luxury appeal.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("AI Insight Error:", error);
    return "Experience unparalleled luxury and a prime investment opportunity in this meticulously designed residence.";
  }
}
