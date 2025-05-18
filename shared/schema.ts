import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  boolean,
  integer
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  name: varchar("name"),
  mobileNumber: varchar("mobile_number"),
  profession: varchar("profession"),
  gender: varchar("gender"),
  collegeOrUniversity: varchar("college_or_university"),
  interests: varchar("interests"),
  goals: varchar("goals"),
  educationLevel: varchar("education_level"),
  password: varchar("password"), // For email/password authentication
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Digital Marketing Modules
export const modules = pgTable("modules", {
  id: serial("id").primaryKey(),
  title: varchar("title").notNull(),
  description: text("description").notNull(),
  icon: varchar("icon").notNull(),
  estimatedHours: integer("estimated_hours").notNull(),
  order: integer("order").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertModuleSchema = createInsertSchema(modules).omit({
  id: true,
  createdAt: true,
});

export type InsertModule = z.infer<typeof insertModuleSchema>;
export type Module = typeof modules.$inferSelect;

// User Progress
export const userProgress = pgTable("user_progress", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  moduleId: integer("module_id").notNull().references(() => modules.id),
  completed: boolean("completed").default(false),
  percentComplete: integer("percent_complete").default(0),
  lastAccessed: timestamp("last_accessed").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserProgressSchema = createInsertSchema(userProgress).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUserProgress = z.infer<typeof insertUserProgressSchema>;
export type UserProgress = typeof userProgress.$inferSelect;

// Chat History
export const chatHistory = pgTable("chat_history", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  moduleId: integer("module_id").references(() => modules.id),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  confidenceScore: integer("confidence_score"),
  source: varchar("source"),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const insertChatHistorySchema = createInsertSchema(chatHistory).omit({
  id: true,
  timestamp: true,
});

export type InsertChatHistory = z.infer<typeof insertChatHistorySchema>;
export type ChatHistory = typeof chatHistory.$inferSelect;

// Knowledge Base Entries
export const knowledgeBaseEntries = pgTable("knowledge_base_entries", {
  id: serial("id").primaryKey(),
  title: varchar("title").notNull(),
  content: text("content").notNull(),
  moduleId: integer("module_id").references(() => modules.id),
  embedding: text("embedding"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertKnowledgeBaseEntrySchema = createInsertSchema(knowledgeBaseEntries).omit({
  id: true,
  embedding: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertKnowledgeBaseEntry = z.infer<typeof insertKnowledgeBaseEntrySchema>;
export type KnowledgeBaseEntry = typeof knowledgeBaseEntries.$inferSelect;

// Message Feedback
export const messageFeedback = pgTable("message_feedback", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  messageId: varchar("message_id").notNull(),
  isHelpful: boolean("is_helpful").notNull(),
  comments: text("comments"),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const insertMessageFeedbackSchema = createInsertSchema(messageFeedback).omit({
  id: true,
  timestamp: true,
});

export type InsertMessageFeedback = z.infer<typeof insertMessageFeedbackSchema>;
export type MessageFeedback = typeof messageFeedback.$inferSelect;
