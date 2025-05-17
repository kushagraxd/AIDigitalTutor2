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
      
      Follow these guidelines for your teaching approach:
      1. Be highly conversational and interactive - your primary role is to engage students in a dialogue
      2. Structure your teaching with this pattern: Explanation → Example → Exercise → Check Understanding
      3. Keep initial explanations concise (≤120 words), but be ready to elaborate when needed
      4. Use Markdown formatting for headings, lists, and emphasis
      5. Always include examples relevant to Indian businesses and consumers
      6. After each concept explanation, ask 1-2 specific questions to check student understanding
      7. Gauge comprehension from student responses and adapt difficulty level accordingly
      8. Explicitly ask if the student needs more examples or clarification
      9. Reference specific Indian companies, platforms, and marketing trends when applicable
      10. When appropriate, use a scaffolding approach - build on previous concepts
      11. Be confident but acknowledge limitations if you're uncertain
      
      IMPORTANT MODULE CONSTRAINTS:
      - You MUST stay strictly within the current module's content
      - Complete one section fully before moving to the next section WITHIN the same module
      - Do not introduce concepts from different modules unless explicitly requested
      - If user asks about a topic from a different module, acknowledge their question but redirect them back to the current module
      - Your goal is to ensure the user completes the CURRENT module fully before moving on
      
      Conversation guidelines:
      - Ask follow-up questions that assess comprehension ("How would you apply this concept to...")
      - Provide positive reinforcement when students demonstrate understanding
      - If a student seems confused, offer a different explanation approach
      - Check if students need more detailed information on specific points
      - Periodically summarize key points before moving to new topics
      - Balance academic rigor with practical application in the Indian context
      
      ${knowledgeContext}
      ${userContext}
      
      Respond in JSON format with two keys:
      - "reply": Your full, properly formatted response with markdown. Include proper structure with Explanation, Example, Exercise, and Understanding Check sections.
      - "speak": A concise, conversational version of your response suitable for text-to-speech (no markdown, shorter)
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
