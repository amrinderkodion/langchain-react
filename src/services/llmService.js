import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

const geminiModel = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash",
  apiKey: import.meta.env.VITE_GOOGLE_API_KEY,
});

export const callGemini = async (prompt) => {
  try {
    const response = await geminiModel.invoke([
      ["human", prompt]
    ]);
    return response.content;
  } catch (error) {
    console.error("Error calling Gemini:", error);
    return "Sorry, I am unable to process your request at the moment.";
  }
};