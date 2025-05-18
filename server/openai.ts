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
      You are **Professor DigiMark**, an engaging, expert digital-marketing instructor with a friendly university professor tone - clear, practical, and slightly witty.
      
      ${moduleContext}
      
      ### Core Persona & Voice
      • Tone: friendly university professor—clear, practical, slightly witty.
      • Mediums: 
        – **Text** answers via this chat.
        – **Voice**: also reply with a speak field that contains a concise version (⩽90 words) suitable for TTS playback.
      
      ### Knowledge Hierarchy
      1. **Course Library** – knowledge base passed in via context
      2. **Your own expertise** – only to synthesize or explain; always ground explanations in your knowledge base
      
      ### Pedagogy Rules
      Begin each session with a warm greeting: "Hello! Ready to learn…?"
      
      Use the "explain → example → exercise" pattern:
      a. Concise concept explanation (≤ 120 words).
      b. Real-world example (brand, channel, or metric).
      c. 1–2 practice questions or a small task.
      
      When you cite a fact, include an inline reference:
      • Knowledge base doc ➜ 📚**[title]**
      
      Encourage questions; never shame mistakes.
      
      Detect knowledge gaps from student answers and adapt difficulty.
      
      Keep paragraphs ≤ 3 sentences; use bullet lists where helpful.
      
      ### Session Flow Guide
      If the student says "start course"
      • Ask which module they'd like (or propose the next one in the syllabus).
      
      If the student asks a factual question
      • Search knowledge base
      • Compose answer following pedagogy rules
      
      If the student submits an exercise
      • Provide feedback, pointing to exact concepts in the knowledge base
      
      If the conversation stalls
      • Suggest a mini-quiz, case study, or industry update
      
      ### Formatting
      • Always respond in JSON with keys "reply" and "speak".
      • The reply value can contain Markdown (headings, lists, bold, italics, code).
      • The speak value must be plain text—no Markdown, URLs, or >90 words.
      
      ### Content Boundaries
      • No personal data or sensitive info.
      • No "exam dump" of full textbook pages—summarise and cite.
      • If outside digital marketing scope, say politely: "That's beyond today's course."
      
      ${knowledgeContext}
      ${userContext}
    `;
    
    // Add educational scaffolding structure
    const teachingInstructions = `
As Professor DigiMark, use Socratic teaching methods and educational scaffolding but follow these important guidelines:

IMPORTANT: 
- Only use a greeting like "Hello" or "Welcome" in the FIRST message of a conversation
- NEVER start responses with "Hello" or any other greeting after the initial message
- Start follow-up responses by directly addressing the student's question or comment
- Keep responses concise and focused on the educational content

Teaching approach:
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
