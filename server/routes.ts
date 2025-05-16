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
  app.get('/api/auth/user', async (req: any, res) => {
    try {
      // Check for demo mode in headers
      const isDemo = req.headers['x-demo-mode'] === 'true';
      
      if (isDemo) {
        // Return a mock user for demo mode
        return res.json({
          id: "demo-user-123",
          email: "demo@example.com",
          firstName: "Demo",
          lastName: "User",
          profileImageUrl: "https://ui-avatars.com/api/?name=Demo+User&background=0D8ABC&color=fff",
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
      
      // Regular authentication check for non-demo mode
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
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
            title: "Introduction to Digital Media Communication",
            description: "Explore the evolution of digital media, its impact on the Indian digital revolution, and understand the digital consumer in both global and Indian landscapes.",
            icon: "school",
            estimatedHours: 4,
            order: 1
          },
          {
            title: "Digital Platforms and Terminologies",
            description: "Learn about various digital media platforms, terminologies, and compare popular platforms in India with global usage statistics.",
            icon: "language",
            estimatedHours: 3,
            order: 2
          },
          {
            title: "Content Creation and Development",
            description: "Master the art of crafting messages for digital audiences, understand the importance of visuals, and learn best practices for digital content.",
            icon: "edit_document",
            estimatedHours: 5,
            order: 3
          },
          {
            title: "Digital Media Planning Strategy",
            description: "Set effective goals and objectives, learn target audience segmentation specific to India, and understand platform selection and budget allocation.",
            icon: "campaign",
            estimatedHours: 4,
            order: 4
          },
          {
            title: "Performance Marketing",
            description: "Dive into audience targeting, segmentation, buyer personas, research tools, and understanding the consumer journey in digital marketing.",
            icon: "bar_chart",
            estimatedHours: 6,
            order: 5
          },
          {
            title: "Email Marketing Essentials",
            description: "Learn about building email lists, campaign types, crafting effective emails, automation, metrics, compliance, and integration with other channels.",
            icon: "email",
            estimatedHours: 4,
            order: 6
          },
          {
            title: "Programmatic Advertising Fundamentals",
            description: "Understand programmatic advertising, its components, types of buys, targeting capabilities, creative formats, measurement, and platforms.",
            icon: "ads_click",
            estimatedHours: 5,
            order: 7
          },
          {
            title: "Campaign Creation on Google",
            description: "Master Google Ads, keyword research for the Indian market, bidding strategies, budget management, and campaign optimization.",
            icon: "search",
            estimatedHours: 5,
            order: 8
          },
          {
            title: "Campaign Creation on Facebook",
            description: "Learn Facebook's advertising ecosystem, craft compelling ads, understand audience selection for the Indian market, and interpret A/B testing results.",
            icon: "groups",
            estimatedHours: 5,
            order: 9
          },
          {
            title: "Digital Marketing Strategy",
            description: "Build comprehensive digital strategies, integrate offline and online marketing in India, leverage local events, and implement global insights.",
            icon: "insights",
            estimatedHours: 6,
            order: 10
          },
          {
            title: "Digital Media Analytics",
            description: "Understand the importance of data in decision making, learn analytics tools, interpret key metrics, and study success cases from India and globally.",
            icon: "analytics",
            estimatedHours: 5,
            order: 11
          },
          {
            title: "Future of Digital Marketing in India",
            description: "Explore predictions for the next decade, emerging technologies like AR, VR, and AI in marketing, and prepare for adapting to industry changes.",
            icon: "trending_up",
            estimatedHours: 3,
            order: 12
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

  app.get('/api/progress/:moduleId', async (req: any, res) => {
    try {
      // Check for demo mode
      const isDemo = req.headers['x-demo-mode'] === 'true';
      
      if (isDemo) {
        const moduleId = parseInt(req.params.moduleId);
        
        if (isNaN(moduleId)) {
          return res.status(400).json({ message: "Invalid module ID" });
        }
        
        // Return mock progress for demo mode
        return res.json({
          id: moduleId,
          userId: "demo-user-123",
          moduleId: moduleId,
          percentComplete: Math.min(100, Math.floor(Math.random() * 100) + (moduleId === 1 ? 30 : 0)),
          completed: moduleId === 1 ? false : Math.random() > 0.7,
          lastAccessed: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
      
      // Regular authentication check
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
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
  app.get('/api/history', async (req: any, res) => {
    try {
      // Check for demo mode
      const isDemo = req.headers['x-demo-mode'] === 'true';
      
      if (isDemo) {
        // Return mock chat history for demo mode
        return res.json([
          {
            id: 1,
            userId: "demo-user-123",
            moduleId: 1,
            question: "What is the best social media platform for B2B marketing?",
            answer: "LinkedIn is typically the most effective for B2B marketing as it's business-oriented.",
            confidenceScore: 95,
            source: "Digital Marketing Basics",
            timestamp: new Date(Date.now() - 1000 * 60 * 30)
          },
          {
            id: 2,
            userId: "demo-user-123",
            moduleId: 1,
            question: "How do I measure ROI for digital marketing?",
            answer: "Track conversions, analyze cost per acquisition, and monitor lifetime value.",
            confidenceScore: 92,
            source: "Advanced Analytics",
            timestamp: new Date(Date.now() - 1000 * 60 * 60)
          }
        ]);
      }
      
      // Regular authentication check
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const userId = req.user.claims.sub;
      const limit = req.query.limit ? parseInt(req.query.limit) : 10;
      
      const history = await storage.getChatHistoryByUser(userId, limit);
      res.json(history);
    } catch (error) {
      console.error("Error fetching chat history:", error);
      res.status(500).json({ message: "Failed to fetch chat history" });
    }
  });

  app.get('/api/history/:moduleId', async (req: any, res) => {
    try {
      // Check for demo mode
      const isDemo = req.headers['x-demo-mode'] === 'true';
      const moduleId = parseInt(req.params.moduleId);
      
      if (isNaN(moduleId)) {
        return res.status(400).json({ message: "Invalid module ID" });
      }
      
      if (isDemo) {
        // Return mock module-specific chat history for demo mode
        return res.json([
          {
            id: 1,
            userId: "demo-user-123",
            moduleId: moduleId,
            question: "What are the key metrics for " + (moduleId === 1 ? "digital marketing" : "social media marketing") + "?",
            answer: moduleId === 1 
              ? "Key digital marketing metrics include conversion rate, customer acquisition cost (CAC), return on ad spend (ROAS), click-through rate (CTR), and customer lifetime value (CLV)."
              : "Key social media metrics include engagement rate, reach, impressions, share of voice, and conversion rate.",
            confidenceScore: 95,
            source: moduleId === 1 ? "Digital Marketing Basics" : "Social Media Marketing Guide",
            timestamp: new Date(Date.now() - 1000 * 60 * 30)
          },
          {
            id: 2,
            userId: "demo-user-123",
            moduleId: moduleId,
            question: "How often should I post on social media?",
            answer: "Posting frequency depends on the platform. For LinkedIn, 1-2 times per week is optimal. For Twitter, 3-5 times daily can be effective. For Instagram, 1-2 posts per day works well. Facebook typically performs best with 3-5 posts per week.",
            confidenceScore: 92,
            source: "Social Media Best Practices",
            timestamp: new Date(Date.now() - 1000 * 60 * 60)
          }
        ]);
      }
      
      // Regular authentication check
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const userId = req.user.claims.sub;
      const limit = req.query.limit ? parseInt(req.query.limit) : 10;
      
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
