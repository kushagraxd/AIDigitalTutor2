import OpenAI from "openai";
import { KnowledgeBaseEntry } from "@shared/schema";
import { findRelevantEntries } from "./knowledgeBase";

// The newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Define response structure
interface AIResponse {
  reply: string;
  speak: string;
  confidence: number;
  source: string;
}

/**
 * Generates AI professor response based on user input
 */
export async function generateAIResponse(
  userId: string,
  question: string,
  moduleId?: number,
  context?: string
): Promise<AIResponse> {
  try {
    // First check knowledge base for relevant information
    const relevantEntries = await findRelevantEntries(question, moduleId);
    
    // Build prompt with context and knowledge base information
    const knowledgeContext = relevantEntries.length > 0 
      ? "Information from knowledge base:\n" + relevantEntries.map((e, index) => `Entry ${index + 1}:\n${e.content}`).join('\n\n')
      : "No specific information found in knowledge base. Focus on general digital marketing principles with specific examples relevant to the Indian market.";
    
    const userContext = context ? `Recent conversation:\n${context}` : "";
    
    // Determine the source based on knowledge base hits
    const source = relevantEntries.length > 0 
      ? `${relevantEntries[0].title} (Knowledge Base)` 
      : "Digital Marketing Knowledge Base";
    
    // Calculate confidence score based on relevance of knowledge base entries
    const confidenceScore = relevantEntries.length > 0
      ? Math.min(0.98, 0.7 + (relevantEntries.length * 0.1))
      : 0.75;
    
    const systemPrompt = `
      You are an AI Digital Marketing Professor, a helpful, engaging, and knowledgeable expert in digital marketing with special focus on the Indian market.
      
      Follow these guidelines:
      1. Use a professional academic tone but be conversational and engaging
      2. Structure your teaching with this pattern: Explanation → Example → Exercise
      3. Keep explanations concise (≤120 words)
      4. Use Markdown formatting for headings, lists, and emphasis
      5. Always include examples relevant to Indian businesses and consumers
      6. For exercises, ask thought-provoking questions that encourage application of concepts to the Indian context
      7. Reference specific Indian companies, platforms, and marketing trends when applicable
      8. Be confident but acknowledge limitations if you're uncertain
      
      ${knowledgeContext}
      ${userContext}
      
      Respond in JSON format with two keys:
      - "reply": Your full, properly formatted response with markdown. Include proper structure with Explanation, Example, and Exercise sections when appropriate.
      - "speak": A concise, conversational version of your response suitable for text-to-speech (no markdown, shorter)
    `;
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question }
      ],
      response_format: { type: "json_object" }
    });
    
    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    return {
      reply: result.reply || "I apologize, but I couldn't process that request.",
      speak: result.speak || "I apologize, but I couldn't process that request.",
      confidence: confidenceScore,
      source
    };
  } catch (error) {
    console.error("Error generating AI response:", error);
    return {
      reply: "I apologize, but I'm having trouble processing your request right now. Please try again later.",
      speak: "I apologize, but I'm having trouble processing your request right now. Please try again later.",
      confidence: 0,
      source: "Error"
    };
  }
}

/**
 * Generate embeddings for text to be used in vector similarity search
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: text,
    });
    
    return response.data[0].embedding;
  } catch (error) {
    console.error("Error generating embedding:", error);
    throw error;
  }
}
