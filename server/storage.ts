import { 
  users, type User, type UpsertUser,
  modules, type Module, type InsertModule,
  userProgress, type UserProgress, type InsertUserProgress,
  chatHistory, type ChatHistory, type InsertChatHistory,
  knowledgeBaseEntries, type KnowledgeBaseEntry, type InsertKnowledgeBaseEntry
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Module operations
  getModules(): Promise<Module[]>;
  getModuleById(id: number): Promise<Module | undefined>;
  createModule(module: InsertModule): Promise<Module>;
  
  // User Progress operations
  getUserProgress(userId: string): Promise<UserProgress[]>;
  getUserModuleProgress(userId: string, moduleId: number): Promise<UserProgress | undefined>;
  updateUserProgress(userId: string, moduleId: number, percentComplete: number, completed: boolean): Promise<UserProgress>;
  
  // Chat History operations
  getChatHistoryByUser(userId: string, limit?: number): Promise<ChatHistory[]>;
  getChatHistoryByUserAndModule(userId: string, moduleId: number, limit?: number): Promise<ChatHistory[]>;
  createChatHistory(entry: InsertChatHistory): Promise<ChatHistory>;
  
  // Knowledge Base operations
  getKnowledgeBaseEntries(): Promise<KnowledgeBaseEntry[]>;
  getKnowledgeBaseEntriesByModule(moduleId: number): Promise<KnowledgeBaseEntry[]>;
  createKnowledgeBaseEntry(entry: InsertKnowledgeBaseEntry): Promise<KnowledgeBaseEntry>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }
  
  // Module operations
  async getModules(): Promise<Module[]> {
    return await db.select().from(modules).orderBy(modules.order);
  }
  
  async getModuleById(id: number): Promise<Module | undefined> {
    const [module] = await db.select().from(modules).where(eq(modules.id, id));
    return module;
  }
  
  async createModule(moduleData: InsertModule): Promise<Module> {
    const [module] = await db.insert(modules).values(moduleData).returning();
    return module;
  }
  
  // User Progress operations
  async getUserProgress(userId: string): Promise<UserProgress[]> {
    return await db
      .select()
      .from(userProgress)
      .where(eq(userProgress.userId, userId))
      .orderBy(desc(userProgress.lastAccessed));
  }
  
  async getUserModuleProgress(userId: string, moduleId: number): Promise<UserProgress | undefined> {
    const [progress] = await db
      .select()
      .from(userProgress)
      .where(
        and(
          eq(userProgress.userId, userId),
          eq(userProgress.moduleId, moduleId)
        )
      );
    return progress;
  }
  
  async updateUserProgress(
    userId: string, 
    moduleId: number, 
    percentComplete: number, 
    completed: boolean
  ): Promise<UserProgress> {
    const existingProgress = await this.getUserModuleProgress(userId, moduleId);
    
    if (existingProgress) {
      const [updated] = await db
        .update(userProgress)
        .set({
          percentComplete,
          completed,
          lastAccessed: new Date(),
          updatedAt: new Date()
        })
        .where(eq(userProgress.id, existingProgress.id))
        .returning();
      return updated;
    } else {
      const [newProgress] = await db
        .insert(userProgress)
        .values({
          userId,
          moduleId,
          percentComplete,
          completed,
          lastAccessed: new Date()
        })
        .returning();
      return newProgress;
    }
  }
  
  // Chat History operations
  async getChatHistoryByUser(userId: string, limit: number = 10): Promise<ChatHistory[]> {
    return await db
      .select()
      .from(chatHistory)
      .where(eq(chatHistory.userId, userId))
      .orderBy(desc(chatHistory.timestamp))
      .limit(limit);
  }
  
  async getChatHistoryByUserAndModule(userId: string, moduleId: number, limit: number = 10): Promise<ChatHistory[]> {
    return await db
      .select()
      .from(chatHistory)
      .where(
        and(
          eq(chatHistory.userId, userId),
          eq(chatHistory.moduleId, moduleId)
        )
      )
      .orderBy(desc(chatHistory.timestamp))
      .limit(limit);
  }
  
  async createChatHistory(entry: InsertChatHistory): Promise<ChatHistory> {
    const [newEntry] = await db
      .insert(chatHistory)
      .values(entry)
      .returning();
    return newEntry;
  }
  
  // Knowledge Base operations
  async getKnowledgeBaseEntries(): Promise<KnowledgeBaseEntry[]> {
    return await db.select().from(knowledgeBaseEntries);
  }
  
  async getKnowledgeBaseEntriesByModule(moduleId: number): Promise<KnowledgeBaseEntry[]> {
    return await db
      .select()
      .from(knowledgeBaseEntries)
      .where(eq(knowledgeBaseEntries.moduleId, moduleId));
  }
  
  async createKnowledgeBaseEntry(entry: InsertKnowledgeBaseEntry): Promise<KnowledgeBaseEntry> {
    const [newEntry] = await db
      .insert(knowledgeBaseEntries)
      .values(entry)
      .returning();
    return newEntry;
  }
}

export const storage = new DatabaseStorage();
