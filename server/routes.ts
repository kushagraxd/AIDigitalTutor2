import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { generateAIResponse } from "./openai";
import { createKnowledgeBaseEntry } from "./knowledgeBase";
import multer from "multer";
import fs from "fs";
import { insertModuleSchema, insertKnowledgeBaseEntrySchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup file upload middleware
  const upload = multer({ dest: 'uploads/' });
  
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Module routes
  app.get('/api/modules', async (_req, res) => {
    try {
      let modules = await storage.getModules();
      
      // If no modules exist yet, create sample modules for demonstration
      if (modules.length === 0) {
        const sampleModules = [
          {
            title: "Introduction to Digital Marketing",
            description: "Learn the fundamentals of digital marketing and its key concepts.",
            icon: "school",
            estimatedHours: 3,
            order: 1
          },
          {
            title: "Social Media Marketing",
            description: "Master social media platforms to engage audiences and build brands.",
            icon: "groups",
            estimatedHours: 5,
            order: 2
          },
          {
            title: "Search Engine Optimization",
            description: "Optimize your website for better search engine rankings and visibility.",
            icon: "search",
            estimatedHours: 4,
            order: 3
          },
          {
            title: "Content Marketing Strategies",
            description: "Create compelling content that attracts and converts your target audience.",
            icon: "edit_document",
            estimatedHours: 4,
            order: 4
          }
        ];
        
        for (const moduleData of sampleModules) {
          await storage.createModule(moduleData);
        }
        
        // Fetch the newly created modules
        modules = await storage.getModules();
      }
      
      res.json(modules);
    } catch (error) {
      console.error("Error fetching modules:", error);
      res.status(500).json({ message: "Failed to fetch modules" });
    }
  });

  app.get('/api/modules/:id', async (req, res) => {
    try {
      const moduleId = parseInt(req.params.id);
      if (isNaN(moduleId)) {
        return res.status(400).json({ message: "Invalid module ID" });
      }
      
      const module = await storage.getModuleById(moduleId);
      if (!module) {
        return res.status(404).json({ message: "Module not found" });
      }
      
      res.json(module);
    } catch (error) {
      console.error("Error fetching module:", error);
      res.status(500).json({ message: "Failed to fetch module" });
    }
  });

  app.post('/api/modules', async (req, res) => {
    try {
      const validationResult = insertModuleSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ message: "Invalid module data", errors: validationResult.error });
      }
      
      const module = await storage.createModule(validationResult.data);
      res.status(201).json(module);
    } catch (error) {
      console.error("Error creating module:", error);
      res.status(500).json({ message: "Failed to create module" });
    }
  });

  // User Progress routes
  app.get('/api/progress', async (req: any, res) => {
    try {
      // Check for demo mode
      const isDemo = req.headers['x-demo-mode'] === 'true';
      
      if (isDemo) {
        // Return empty array for demo mode - client will generate mock progress
        return res.json([]);
      }
      
      // Regular auth check for non-demo mode
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const userId = req.user.claims.sub;
      const progress = await storage.getUserProgress(userId);
      res.json(progress);
    } catch (error) {
      console.error("Error fetching user progress:", error);
      res.status(500).json({ message: "Failed to fetch user progress" });
    }
  });

  app.get('/api/progress/:moduleId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const moduleId = parseInt(req.params.moduleId);
      
      if (isNaN(moduleId)) {
        return res.status(400).json({ message: "Invalid module ID" });
      }
      
      const progress = await storage.getUserModuleProgress(userId, moduleId);
      if (!progress) {
        return res.status(404).json({ message: "Progress not found" });
      }
      
      res.json(progress);
    } catch (error) {
      console.error("Error fetching module progress:", error);
      res.status(500).json({ message: "Failed to fetch module progress" });
    }
  });

  app.post('/api/progress/:moduleId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const moduleId = parseInt(req.params.moduleId);
      
      if (isNaN(moduleId)) {
        return res.status(400).json({ message: "Invalid module ID" });
      }
      
      const { percentComplete, completed } = req.body;
      
      if (typeof percentComplete !== 'number' || percentComplete < 0 || percentComplete > 100) {
        return res.status(400).json({ message: "Invalid percentComplete value" });
      }
      
      if (typeof completed !== 'boolean') {
        return res.status(400).json({ message: "Invalid completed value" });
      }
      
      const progress = await storage.updateUserProgress(userId, moduleId, percentComplete, completed);
      res.json(progress);
    } catch (error) {
      console.error("Error updating progress:", error);
      res.status(500).json({ message: "Failed to update progress" });
    }
  });

  // AI Professor routes
  app.post('/api/ai/chat', async (req: any, res) => {
    try {
      const isDemo = req.headers['x-demo-mode'] === 'true';
      const userId = isDemo ? 'demo-user-123' : req.user?.claims?.sub;
      
      if (!isDemo && !userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const { question, moduleId, context } = req.body;
      
      if (!question || typeof question !== 'string') {
        return res.status(400).json({ message: "Question is required" });
      }
      
      const aiResponse = await generateAIResponse(
        userId,
        question,
        moduleId ? parseInt(moduleId) : undefined,
        context
      );
      
      // Save chat history if needed and not in demo mode
      if (!isDemo && aiResponse.reply) {
        await storage.createChatHistory({
          userId,
          moduleId: moduleId ? parseInt(moduleId) : null,
          question,
          answer: aiResponse.reply,
          confidenceScore: Math.round(aiResponse.confidence * 100),
          source: aiResponse.source
        });
      }
      
      res.json(aiResponse);
    } catch (error) {
      console.error("Error generating AI response:", error);
      res.status(500).json({ message: "Failed to generate AI response" });
    }
  });

  // Chat History routes
  app.get('/api/history', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const limit = req.query.limit ? parseInt(req.query.limit) : 10;
      
      const history = await storage.getChatHistoryByUser(userId, limit);
      res.json(history);
    } catch (error) {
      console.error("Error fetching chat history:", error);
      res.status(500).json({ message: "Failed to fetch chat history" });
    }
  });

  app.get('/api/history/:moduleId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const moduleId = parseInt(req.params.moduleId);
      const limit = req.query.limit ? parseInt(req.query.limit) : 10;
      
      if (isNaN(moduleId)) {
        return res.status(400).json({ message: "Invalid module ID" });
      }
      
      const history = await storage.getChatHistoryByUserAndModule(userId, moduleId, limit);
      res.json(history);
    } catch (error) {
      console.error("Error fetching module chat history:", error);
      res.status(500).json({ message: "Failed to fetch module chat history" });
    }
  });

  // Knowledge Base routes
  app.post('/api/knowledge', isAuthenticated, async (req, res) => {
    try {
      const validationResult = insertKnowledgeBaseEntrySchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ message: "Invalid knowledge base entry data", errors: validationResult.error });
      }
      
      const entry = await createKnowledgeBaseEntry(
        validationResult.data.title,
        validationResult.data.content,
        validationResult.data.moduleId || undefined
      );
      
      res.status(201).json(entry);
    } catch (error) {
      console.error("Error creating knowledge base entry:", error);
      res.status(500).json({ message: "Failed to create knowledge base entry" });
    }
  });

  // File upload for knowledge base
  app.post('/api/upload/knowledge', isAuthenticated, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      const { moduleId, title } = req.body;
      
      // Read file content
      const content = fs.readFileSync(req.file.path, 'utf8');
      
      // Create knowledge base entry
      const entry = await createKnowledgeBaseEntry(
        title || req.file.originalname,
        content,
        moduleId ? parseInt(moduleId) : undefined
      );
      
      // Delete temporary file
      fs.unlinkSync(req.file.path);
      
      res.status(201).json(entry);
    } catch (error) {
      console.error("Error processing file upload:", error);
      res.status(500).json({ message: "Failed to process file upload" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
