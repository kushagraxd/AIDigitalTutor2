import { storage } from "./storage";
import { generateEmbedding } from "./openai";
import { KnowledgeBaseEntry } from "@shared/schema";

/**
 * Performs similarity search between a query and knowledge base entries
 */
export async function findRelevantEntries(
  query: string,
  moduleId?: number,
  limit: number = 3,
  threshold: number = 0.7
): Promise<KnowledgeBaseEntry[]> {
  try {
    // Get query embedding
    const queryEmbedding = await generateEmbedding(query);
    
    // Get knowledge base entries
    let entries: KnowledgeBaseEntry[];
    if (moduleId) {
      entries = await storage.getKnowledgeBaseEntriesByModule(moduleId);
    } else {
      entries = await storage.getKnowledgeBaseEntries();
    }
    
    // Calculate similarity scores
    const scoredEntries = await Promise.all(
      entries.map(async (entry) => {
        let entryEmbedding: number[];
        
        // If entry has no embedding, generate one
        if (!entry.embedding) {
          entryEmbedding = await generateEmbedding(entry.content);
          
          // In a production app, we would update the entry with the new embedding
          // For this implementation, we'll just use it in memory
        } else {
          // Parse stored embedding string to array
          entryEmbedding = JSON.parse(entry.embedding);
        }
        
        // Calculate cosine similarity
        const similarity = calculateCosineSimilarity(queryEmbedding, entryEmbedding);
        return { entry, similarity };
      })
    );
    
    // Filter by threshold and sort by similarity
    return scoredEntries
      .filter(item => item.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
      .map(item => item.entry);
    
  } catch (error) {
    console.error("Error finding relevant entries:", error);
    return [];
  }
}

/**
 * Calculate cosine similarity between two vectors
 */
function calculateCosineSimilarity(vec1: number[], vec2: number[]): number {
  // Handle vector length mismatch gracefully
  if (vec1.length !== vec2.length) {
    console.warn(`Vector length mismatch: ${vec1.length} vs ${vec2.length}. Using minimum length.`);
    // Return a low similarity score but don't throw an error
    return 0.1;
  }
  
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;
  
  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    norm1 += vec1[i] * vec1[i];
    norm2 += vec2[i] * vec2[i];
  }
  
  norm1 = Math.sqrt(norm1);
  norm2 = Math.sqrt(norm2);
  
  if (norm1 === 0 || norm2 === 0) {
    return 0;
  }
  
  return dotProduct / (norm1 * norm2);
}

/**
 * Create a new knowledge base entry
 */
export async function createKnowledgeBaseEntry(
  title: string,
  content: string,
  moduleId?: number
): Promise<KnowledgeBaseEntry> {
  try {
    // Generate embedding for the content
    const embedding = await generateEmbedding(content);
    
    // Create entry in database
    const entry = await storage.createKnowledgeBaseEntry({
      title,
      content,
      moduleId: moduleId || null,
      embedding: JSON.stringify(embedding)
    });
    
    return entry;
  } catch (error) {
    console.error("Error creating knowledge base entry:", error);
    throw error;
  }
}
