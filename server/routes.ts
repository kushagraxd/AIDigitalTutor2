import 'dotenv/config'; 
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { generateAIResponse } from "./openai";
import { createKnowledgeBaseEntry } from "./knowledgeBase";
import { populateKnowledgeBase } from "./knowledgeBaseData";
import { addIndiaMarketingKnowledge } from "./indiaMarketingKnowledge";
import { addDMA2025Knowledge } from "./dma2025Knowledge";
import { addAllModules } from "./addModules";
import multer from "multer";
import fs from "fs";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import {
  insertModuleSchema,
  insertKnowledgeBaseEntrySchema,
  users,
} from "@shared/schema";
import { eq } from "drizzle-orm";
import { db } from "./db";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup file upload middleware
  const upload = multer({ dest: "uploads/" });

  // Initialize knowledge base with starter content
  await populateKnowledgeBase(storage);

  // Add India-specific digital marketing knowledge
  await addIndiaMarketingKnowledge(storage);

  // Add DMA 2025 course knowledge
  await addDMA2025Knowledge(storage);

  // Add all course modules
  await addAllModules();

  // Auth middleware
  await setupAuth(app);

  // Demo login endpoint
  app.post("/api/auth/demo-login", async (req, res) => {
    try {
      console.log("Demo login requested");

      // Check if demo user exists
      const demoEmail = "demo@example.com";
      const demoUserId = "demo-user-123";

      let demoUser = await storage.getUser(demoUserId);

      // Create demo user if it doesn't exist
      if (!demoUser) {
        console.log("Creating demo user");
        const hashedPassword = await bcrypt.hash("demo123", 10);

        try {
          demoUser = await storage.upsertUser({
            id: demoUserId,
            email: demoEmail,
            name: "Demo User",
            password: hashedPassword,
          });
          console.log("Demo user created:", demoUser);
        } catch (err) {
          console.error("Failed to create demo user:", err);
          return res
            .status(500)
            .json({ message: "Failed to create demo account" });
        }
      }

      // Login as demo user
      req.login(demoUser, (err) => {
        if (err) {
          console.error("Demo login error:", err);
          return res
            .status(500)
            .json({ message: "Failed to login as demo user" });
        }

        console.log("Demo login successful");
        // Remove password from response
        const { password, ...userWithoutPassword } = demoUser;
        return res.status(200).json(userWithoutPassword);
      });
    } catch (error) {
      console.error("Demo login error:", error);
      res.status(500).json({ message: "Failed to process demo login" });
    }
  });

  // Auth routes - Get current user
  app.get("/api/auth/user", async (req: any, res) => {
    try {
      console.log("Auth check - isAuthenticated:", req.isAuthenticated());

      // Check if user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      console.log("Authenticated user session:", req.user);

      let userId;

      // Handle different authentication types
      if (req.user.claims && req.user.claims.sub) {
        // OAuth (Replit/Google) authentication
        userId = req.user.claims.sub;
      } else if (req.user.id) {
        // Email/password authentication
        userId = req.user.id;
      } else {
        console.error("Unknown authentication type:", req.user);
        return res.status(500).json({ message: "Unknown authentication type" });
      }

      console.log("Fetching user with ID:", userId);

      // Get user from database
      let user = await storage.getUser(userId);

      if (!user) {
        console.log("User not found in database, creating new record");

        try {
          // Create user data based on auth type
          const userData: any = { id: userId };

          if (req.user.claims) {
            // OAuth login
            userData.email = req.user.claims.email;
            userData.firstName = req.user.claims.first_name;
            userData.lastName = req.user.claims.last_name;
            userData.profileImageUrl = req.user.claims.profile_image_url;
          } else {
            // Email login - this shouldn't happen as users are created during registration
            userData.email = req.user.email;
            userData.name = req.user.name;
          }

          user = await storage.upsertUser(userData);
        } catch (err) {
          console.error("Error creating user:", err);
          return res.status(500).json({ message: "Failed to create user" });
        }
      }

      // Return user without sensitive data
      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Profile routes
  app.get("/api/profile", async (req: any, res) => {
    try {
      console.log("Profile request - isAuthenticated:", req.isAuthenticated());

      // Check if user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Get user ID based on auth type
      let userId;

      if (req.user.claims && req.user.claims.sub) {
        // OAuth auth (Replit/Google)
        userId = req.user.claims.sub;
      } else if (req.user.id) {
        // Email/password auth
        userId = req.user.id;
      } else {
        console.error("Unknown user format in profile request:", req.user);
        return res.status(500).json({ message: "Invalid session format" });
      }

      console.log("Getting profile for user ID:", userId);

      const user = await storage.getUser(userId);

      if (!user) {
        console.log("User not found in database");
        return res.status(404).json({ message: "User not found" });
      }

      // Return user without password
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error fetching profile:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  app.post("/api/profile", async (req: any, res) => {
    try {
      console.log("Profile update request received");

      // Check if user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      console.log("User authenticated, session:", req.user);

      // Get user ID based on auth method
      let userId;
      let existingClaims = {};

      if (req.user.claims && req.user.claims.sub) {
        // OAuth authentication
        userId = req.user.claims.sub;
        existingClaims = {
          email: req.user.claims.email,
          firstName: req.user.claims.first_name,
          lastName: req.user.claims.last_name,
          profileImageUrl: req.user.claims.profile_image_url,
        };
      } else if (req.user.id) {
        // Email/password authentication
        userId = req.user.id;
      } else {
        console.error("Unknown user session format:", req.user);
        return res.status(500).json({ message: "Invalid user session format" });
      }

      console.log("Updating profile for user ID:", userId);

      // Get existing user data to preserve fields not updated by profile
      const existingUser = await storage.getUser(userId);

      if (!existingUser) {
        console.error("User not found in database:", userId);
        return res.status(404).json({ message: "User not found" });
      }

      console.log("Found existing user:", {
        id: existingUser.id,
        email: existingUser.email,
      });

      // Validate required fields
      const { name, mobileNumber, profession, gender } = req.body;
      if (!name || !mobileNumber || !profession || !gender) {
        console.error("Missing required fields:", {
          name,
          mobileNumber,
          profession,
          gender,
        });
        return res.status(400).json({ message: "Missing required fields" });
      }

      console.log("Processing profile update with data:", {
        id: userId,
        name: req.body.name,
        profession: req.body.profession,
      });

      // Create updated user data
      const userData = {
        id: userId,

        // Essential fields that must be preserved
        email: existingUser.email,
        password: existingUser.password, // Keep existing password if any

        // Preserve OAuth data if exists
        firstName: existingUser.firstName,
        lastName: existingUser.lastName,
        profileImageUrl: existingUser.profileImageUrl,

        // Update with any new OAuth claims (important for OAuth users)
        ...existingClaims,

        // Update profile data from request
        name: req.body.name,
        mobileNumber: req.body.mobileNumber,
        profession: req.body.profession,
        collegeOrUniversity: req.body.collegeOrUniversity,
        gender: req.body.gender,
        interests: req.body.interests,
        goals: req.body.goals,
        educationLevel: req.body.educationLevel,
      };

      console.log("Updating user with data:", {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        profession: userData.profession,
      });

      const updatedUser = await storage.upsertUser(userData);

      // Remove sensitive data before returning
      const { password, ...safeUser } = updatedUser;
      res.json(safeUser);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Module routes
  app.get("/api/modules", async (_req, res) => {
    try {
      let modules = await storage.getModules();

      // If no modules exist yet, create sample modules for demonstration
      if (modules.length === 0) {
        const sampleModules = [
          {
            title: "Introduction to Digital Media Communication",
            description:
              "Explore the evolution of digital media, its impact on the Indian digital revolution, and understand the digital consumer in both global and Indian landscapes.",
            icon: "school",
            estimatedHours: 4,
            order: 1,
          },
          {
            title: "Digital Platforms and Terminologies",
            description:
              "Learn about various digital media platforms, terminologies, and compare popular platforms in India with global usage statistics.",
            icon: "language",
            estimatedHours: 3,
            order: 2,
          },
          {
            title: "Content Creation and Development",
            description:
              "Master the art of crafting messages for digital audiences, understand the importance of visuals, and learn best practices for digital content.",
            icon: "edit_document",
            estimatedHours: 5,
            order: 3,
          },
          {
            title: "Digital Media Planning Strategy",
            description:
              "Set effective goals and objectives, learn target audience segmentation specific to India, and understand platform selection and budget allocation.",
            icon: "campaign",
            estimatedHours: 4,
            order: 4,
          },
          {
            title: "Performance Marketing",
            description:
              "Dive into audience targeting, segmentation, buyer personas, research tools, and understanding the consumer journey in digital marketing.",
            icon: "bar_chart",
            estimatedHours: 6,
            order: 5,
          },
          {
            title: "Email Marketing Essentials",
            description:
              "Learn about building email lists, campaign types, crafting effective emails, automation, metrics, compliance, and integration with other channels.",
            icon: "email",
            estimatedHours: 4,
            order: 6,
          },
          {
            title: "Programmatic Advertising Fundamentals",
            description:
              "Understand programmatic advertising, its components, types of buys, targeting capabilities, creative formats, measurement, and platforms.",
            icon: "ads_click",
            estimatedHours: 5,
            order: 7,
          },
          {
            title: "Campaign Creation on Google",
            description:
              "Master Google Ads, keyword research for the Indian market, bidding strategies, budget management, and campaign optimization.",
            icon: "search",
            estimatedHours: 5,
            order: 8,
          },
          {
            title: "Campaign Creation on Facebook",
            description:
              "Learn Facebook's advertising ecosystem, craft compelling ads, understand audience selection for the Indian market, and interpret A/B testing results.",
            icon: "groups",
            estimatedHours: 5,
            order: 9,
          },
          {
            title: "Digital Marketing Strategy",
            description:
              "Build comprehensive digital strategies, integrate offline and online marketing in India, leverage local events, and implement global insights.",
            icon: "insights",
            estimatedHours: 6,
            order: 10,
          },
          {
            title: "Digital Media Analytics",
            description:
              "Understand the importance of data in decision making, learn analytics tools, interpret key metrics, and study success cases from India and globally.",
            icon: "analytics",
            estimatedHours: 5,
            order: 11,
          },
          {
            title: "Future of Digital Marketing in India",
            description:
              "Explore predictions for the next decade, emerging technologies like AR, VR, and AI in marketing, and prepare for adapting to industry changes.",
            icon: "trending_up",
            estimatedHours: 3,
            order: 12,
          },
          {
            title: "Social Media Marketing for Indian Audiences",
            description:
              "Learn strategies for engaging Indian audiences on social platforms, understanding regional preferences, and measuring campaign effectiveness.",
            icon: "share",
            estimatedHours: 4,
            order: 13,
          },
          {
            title: "Mobile Marketing in India",
            description:
              "Master mobile marketing techniques for the mobile-first Indian consumer, including app promotion, SMS marketing, and WhatsApp strategies.",
            icon: "smartphone",
            estimatedHours: 3,
            order: 14,
          },
          {
            title: "Content Localization for Indian Markets",
            description:
              "Develop multilingual content strategies for India's diverse linguistic landscape and create culturally relevant marketing materials.",
            icon: "translate",
            estimatedHours: 4,
            order: 15,
          },
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

  app.get("/api/modules/:id", async (req, res) => {
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

  app.post("/api/modules", async (req, res) => {
    try {
      const validationResult = insertModuleSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res
          .status(400)
          .json({
            message: "Invalid module data",
            errors: validationResult.error,
          });
      }

      const module = await storage.createModule(validationResult.data);
      res.status(201).json(module);
    } catch (error) {
      console.error("Error creating module:", error);
      res.status(500).json({ message: "Failed to create module" });
    }
  });

  // User Progress routes
  app.get("/api/progress", async (req: any, res) => {
    try {
      // Check for demo mode
      const isDemo = req.headers["x-demo-mode"] === "true";

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

  app.get("/api/progress/:moduleId", async (req: any, res) => {
    try {
      // Check for demo mode
      const isDemo = req.headers["x-demo-mode"] === "true";
      const moduleId = parseInt(req.params.moduleId);

      if (isNaN(moduleId)) {
        return res.status(400).json({ message: "Invalid module ID" });
      }

      // For both demo mode and authenticated users
      let userId = "demo-user";

      // Get the user ID if authenticated
      if (req.isAuthenticated()) {
        userId = req.user.claims.sub;
      } else if (!isDemo) {
        // Only require authentication if not in demo mode
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Try to get existing progress
      let progress = await storage.getUserModuleProgress(userId, moduleId);

      // If no progress exists, create a default progress object
      if (!progress) {
        // Create default progress
        progress = await storage.updateUserProgress(userId, moduleId, 0, false);
      }

      res.json(progress);
    } catch (error) {
      console.error("Error fetching module progress:", error);
      res.status(500).json({ message: "Failed to fetch module progress" });
    }
  });

  app.post(
    "/api/progress/:moduleId",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const moduleId = parseInt(req.params.moduleId);

        if (isNaN(moduleId)) {
          return res.status(400).json({ message: "Invalid module ID" });
        }

        const { percentComplete, completed } = req.body;

        if (
          typeof percentComplete !== "number" ||
          percentComplete < 0 ||
          percentComplete > 100
        ) {
          return res
            .status(400)
            .json({ message: "Invalid percentComplete value" });
        }

        if (typeof completed !== "boolean") {
          return res.status(400).json({ message: "Invalid completed value" });
        }

        const progress = await storage.updateUserProgress(
          userId,
          moduleId,
          percentComplete,
          completed,
        );
        res.json(progress);
      } catch (error) {
        console.error("Error updating progress:", error);
        res.status(500).json({ message: "Failed to update progress" });
      }
    },
  );

  // AI Professor routes
  app.post("/api/chat", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      const { question, moduleId, context } = req.body;

      if (!question || typeof question !== "string") {
        return res.status(400).json({ message: "Question is required" });
      }

      const aiResponse = await generateAIResponse(
        userId,
        question,
        moduleId ? parseInt(moduleId) : undefined,
        context,
      );

      // Save chat history with proper error handling
      if (aiResponse.reply) {
        try {
          // Log debug info
          console.log(
            `Saving chat: User=${userId}, Module=${moduleId}, Question=${question.substring(0, 20)}...`,
          );

          const savedChat = await storage.createChatHistory({
            userId,
            moduleId: moduleId ? parseInt(moduleId) : null,
            question,
            answer: aiResponse.reply,
            confidenceScore: Math.round(aiResponse.confidence * 100),
            source: aiResponse.source,
          });

          console.log(
            `Chat history saved successfully with ID: ${savedChat.id}`,
          );
        } catch (saveError) {
          console.error("Error saving chat history:", saveError);
          // Continue with the response even if chat history saving fails
        }
      }

      res.json(aiResponse);
    } catch (error) {
      console.error("Error generating AI response:", error);
      res.status(500).json({ message: "Failed to generate AI response" });
    }
  });

  // Chat History routes
  app.get("/api/history", async (req: any, res) => {
    try {
      // Check for demo mode
      const isDemo = req.headers["x-demo-mode"] === "true";

      if (isDemo) {
        // Return empty array for demo mode
        return res.json([]);
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

  app.get("/api/history/:moduleId", async (req: any, res) => {
    try {
      // Check for demo mode
      const isDemo = req.headers["x-demo-mode"] === "true";
      const moduleId = parseInt(req.params.moduleId);

      if (isNaN(moduleId)) {
        return res.status(400).json({ message: "Invalid module ID" });
      }

      // For both demo mode and authenticated users
      let userId = "demo-user";

      // Get the user ID if authenticated
      if (req.isAuthenticated()) {
        userId = req.user.claims.sub;
      } else if (!isDemo) {
        // Only require authentication if not in demo mode
        return res.status(401).json({ message: "Unauthorized" });
      }

      console.log(
        `Fetching chat history for user ${userId} and module ${moduleId}`,
      );

      const limit = req.query.limit ? parseInt(req.query.limit) : 10;
      const history = await storage.getChatHistoryByUserAndModule(
        userId,
        moduleId,
        limit,
      );

      console.log(`Found ${history.length} chat history entries`);

      res.json(history);
    } catch (error) {
      console.error("Error fetching module chat history:", error);
      res.status(500).json({ message: "Failed to fetch module chat history" });
    }
  });

  // Knowledge Base routes
  app.post("/api/knowledge", isAuthenticated, async (req, res) => {
    try {
      const validationResult = insertKnowledgeBaseEntrySchema.safeParse(
        req.body,
      );
      if (!validationResult.success) {
        return res
          .status(400)
          .json({
            message: "Invalid knowledge base entry data",
            errors: validationResult.error,
          });
      }

      const entry = await createKnowledgeBaseEntry(
        validationResult.data.title,
        validationResult.data.content,
        validationResult.data.moduleId || undefined,
      );

      res.status(201).json(entry);
    } catch (error) {
      console.error("Error creating knowledge base entry:", error);
      res
        .status(500)
        .json({ message: "Failed to create knowledge base entry" });
    }
  });

  // File upload for knowledge base
  app.post(
    "/api/upload/knowledge",
    isAuthenticated,
    upload.single("file"),
    async (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ message: "No file uploaded" });
        }

        const { moduleId, title } = req.body;

        // Read file content
        const content = fs.readFileSync(req.file.path, "utf8");

        // Create knowledge base entry
        const entry = await createKnowledgeBaseEntry(
          title || req.file.originalname,
          content,
          moduleId ? parseInt(moduleId) : undefined,
        );

        // Delete temporary file
        fs.unlinkSync(req.file.path);

        res.status(201).json(entry);
      } catch (error) {
        console.error("Error processing file upload:", error);
        res.status(500).json({ message: "Failed to process file upload" });
      }
    },
  );

  // Debug endpoint to check the session
  app.get("/api/debug/session", (req: any, res) => {
    res.json({
      isAuthenticated: req.isAuthenticated(),
      session: req.session,
      user: req.isAuthenticated() ? req.user : null,
    });
  });

  // Email/password registration
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { name, email, password } = req.body;

      if (!email || !password) {
        return res
          .status(400)
          .json({ message: "Email and password are required" });
      }

      console.log("Registration request:", {
        name,
        email,
        passwordLength: password?.length,
      });

      // Check if the user already exists
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existingUser.length > 0) {
        console.log("Registration failed: Email already exists");
        return res
          .status(400)
          .json({ message: "User with this email already exists" });
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Generate a unique ID for the user
      const userId = `local_${crypto.randomUUID()}`;

      console.log("Creating new user with ID:", userId);

      try {
        // Insert user with all required fields
        const [newUser] = await db
          .insert(users)
          .values({
            id: userId,
            email,
            name,
            password: hashedPassword,
          })
          .returning();

        console.log("User created successfully:", {
          id: newUser.id,
          email: newUser.email,
        });

        // Remove the password from the response
        const { password: _, ...userWithoutPassword } = newUser;

        // Log the user in immediately
        req.login(newUser, (err) => {
          if (err) {
            console.error("Auto-login error:", err);
            return res.status(201).json({
              ...userWithoutPassword,
              message: "Account created successfully. Please log in.",
            });
          }

          console.log("User automatically logged in after registration");
          res.status(201).json({
            ...userWithoutPassword,
            message: "Account created and logged in successfully.",
          });
        });
      } catch (dbError: any) {
        console.error("Database error during registration:", dbError);
        res.status(500).json({
          message: "Error creating account",
          error: dbError.message,
        });
      }
    } catch (error: any) {
      console.error("Registration error:", error);
      res.status(500).json({
        message: "Failed to register user",
        error: error.message,
      });
    }
  });

  // Email/password login
  app.post("/api/auth/login", async (req, res) => {
    try {
      console.log("Login attempt received:", req.body);
      const { email, password } = req.body;

      if (!email || !password) {
        console.log("Login failed: Email or password missing");
        return res
          .status(400)
          .json({ message: "Email and password are required" });
      }

      // Find the user by email
      console.log("Looking for user with email:", email);
      const usersFound = await db
        .select()
        .from(users)
        .where(eq(users.email, email));

      console.log(`Found ${usersFound.length} users with email:`, email);

      if (usersFound.length === 0) {
        console.log("Login failed: User not found with email:", email);
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const user = usersFound[0];

      // Check if user was created with OAuth (Google/Replit) and has no password
      if (!user.password) {
        console.log(
          "Login failed: This account doesn't use password authentication",
        );
        return res.status(401).json({
          message:
            "This email address is registered with a social login method. Please use Google or Replit login instead.",
        });
      }

      // Check password
      console.log("Verifying password...");
      const passwordMatch = await bcrypt.compare(password, user.password);

      if (!passwordMatch) {
        console.log("Login failed: Password doesn't match");
        return res.status(401).json({ message: "Invalid email or password" });
      }

      console.log("Password verified, creating session");

      // Remove the password from the response
      const { password: _, ...userWithoutPassword } = user;

      // Create a user session
      req.login(user, (err) => {
        if (err) {
          console.error("Login session error:", err);
          return res
            .status(500)
            .json({ message: "Failed to create login session" });
        }

        console.log("Login successful, user ID:", user.id);
        res.status(200).json(userWithoutPassword);
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "An error occurred during login" });
    }
  });

  // API endpoint for message feedback
  app.post("/api/feedback", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { messageId, isHelpful, comments } = req.body;

      if (!messageId || typeof isHelpful !== "boolean") {
        return res.status(400).json({ message: "Invalid feedback data" });
      }

      // Save the feedback
      const feedback = await storage.createMessageFeedback(
        userId,
        messageId,
        isHelpful,
        comments,
      );

      // Return success
      res.json({
        success: true,
        feedback,
      });
    } catch (error) {
      console.error("Error submitting feedback:", error);
      res.status(500).json({ message: "Failed to submit feedback" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// End of routes configuration
