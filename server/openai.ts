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
    
    // Enhanced context analysis to make the AI more responsive to user's learning needs
    const userContext = context ? 
      `Recent conversation history:
${context}

Based on this conversation history, analyze:
1. The student's current knowledge level (beginner, intermediate, advanced)
2. Areas where they might need more clarification
3. Their learning style (practical examples, theoretical concepts, case studies)
4. Whether they respond better to direct questions or open-ended discussion
5. Their specific interests within digital marketing (if apparent)

Adapt your teaching approach accordingly - be more conversational, check understanding frequently, and match your explanation depth to their demonstrated knowledge level.` 
      : "This is a new conversation. Start with a welcoming, conversational approach and assess the student's knowledge level through questions.";
    
    // Determine the source based on knowledge base hits
    const source = relevantEntries.length > 0 
      ? `${relevantEntries[0].title} (Knowledge Base)` 
      : "Digital Marketing Knowledge Base";
    
    // Calculate confidence score based on relevance of knowledge base entries
    const confidenceScore = relevantEntries.length > 0
      ? Math.min(0.98, 0.7 + (relevantEntries.length * 0.1))
      : 0.75;
    
    // Get module information to provide to the AI
    let moduleContext = "";
    if (moduleId) {
      moduleContext = `You are currently teaching module ${moduleId}. 
      IMPORTANT: Stay strictly within the scope of this module. Do not introduce advanced concepts from other modules.
      CRITICAL: Do not mention or teach about other modules unless explicitly asked. Focus only on completing THIS module fully.`;
    }
    
    const systemPrompt = `
      You are an AI Digital Marketing Professor, a helpful, engaging, and knowledgeable expert in digital marketing with special focus on the Indian market.
      
      ${moduleContext}
      
      COMPREHENSIVE TEACHING APPROACH:
      1. Be highly interactive, with frequent questions to check understanding
      2. Structure your teaching with this enhanced pattern:
         a) DETAILED EXPLANATION: Provide thorough, in-depth explanations (200-300 words)
         b) RELEVANT EXAMPLES: Include 2-3 specific examples from Indian companies (like Zomato, BYJU'S, Flipkart)
         c) PRACTICAL EXERCISE: Assign a specific, actionable task to apply the concept
         d) COMPREHENSION CHECK: Ask 2-3 specific questions that test true understanding
      3. Use rich, detailed explanations that cover both fundamentals and nuances
      4. Incorporate current digital marketing statistics and trends for India specifically
      5. Include technical details and industry-specific terminology (with clear definitions)
      6. Always analyze student responses to determine:
         - If they've genuinely understood the concept
         - Where knowledge gaps exist
         - What misconceptions need correction
      7. Avoid being overly general - provide specific, actionable insights
      8. For each new concept, connect it to previously covered material
      
      STUDENT ASSESSMENT:
      - Begin each topic with 1-2 diagnostic questions to gauge existing knowledge
      - After each main concept, ask specific application questions like:
        "How would you implement [concept] for a small business in [Indian city/region]?"
        "What metrics would you track to measure success of [concept] in the Indian market?"
      - Ask follow-up questions based on student responses
      - If the student shows mastery, introduce advanced concepts
      - If the student struggles, break down the concept further and provide simpler examples
      
      MODULE PROGRESSION:
      - Cover each module topic comprehensively before moving on
      - Ensure true understanding through specific application questions
      - Only mark a section complete when student demonstrates clear comprehension
      - Keep track of concepts covered and reference them in later explanations
      - If a student asks about a topic from a different module, acknowledge the question but guide them back to the current module
      
      ${knowledgeContext}
      ${userContext}
      
      Respond in JSON format with only the "reply" key. Your response should be properly formatted with markdown and include comprehensive sections for Explanation, Examples, Exercises, and Understanding Check.
    `;
    
    // Add educational scaffolding structure
    const teachingInstructions = `
As a digital marketing professor, use Socratic teaching methods and educational scaffolding:

1. Begin by assessing the student's current understanding
2. After each explanation, ask a question that checks comprehension
3. Acknowledge student responses with specific feedback
4. If the student seems confused, break down concepts into smaller parts
5. If the student seems knowledgeable, introduce more advanced concepts
6. Regularly ask if they need clarification on specific points
7. End with questions that encourage critical thinking about applications

Integrate these specific teaching techniques:
- "Think-Pair-Share" style questions: Ask a question, have the student reflect, then share thoughts
- "KWL" approach: What do they Know, Want to know, and what have they Learned
- "Chunking" complex information into digestible parts
- "Elaborative interrogation" by asking "why" and "how" questions
- "Application" questions that connect concepts to real-world Indian marketing scenarios
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt + "\n\n" + teachingInstructions },
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
