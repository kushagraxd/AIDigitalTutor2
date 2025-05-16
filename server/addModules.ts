import { db } from './db';
import { storage } from './storage';
import { modules } from '@shared/schema';

export async function addAllModules() {
  // Get existing modules
  const existingModules = await storage.getModules();
  
  // Create new modules only if they don't exist
  if (existingModules.length < 15) {
    console.log("Adding additional modules to the curriculum...");

    const allModules = [
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
        description: "Master the art of crafting messages for digital audiences, understand the importance of visuals, and learn about tools for content creation.",
        icon: "create",
        estimatedHours: 4,
        order: 3
      },
      {
        title: "Content Marketing Strategies",
        description: "Develop comprehensive content marketing strategies tailored for Indian audiences, including content calendars and distribution plans.",
        icon: "calendar_today",
        estimatedHours: 5,
        order: 4
      },
      {
        title: "Digital Media Planning Strategy",
        description: "Set goals and objectives, learn audience segmentation for the Indian market, select appropriate platforms, and allocate budgets effectively.",
        icon: "bar_chart",
        estimatedHours: 5,
        order: 5
      },
      {
        title: "Email Marketing",
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
        title: "Introduction to Audience Targeting",
        description: "Learn what audience targeting is in digital marketing, why understanding your audience matters, and its impact on ROI and engagement.",
        icon: "people",
        estimatedHours: 4,
        order: 8
      },
      {
        title: "Campaign Creation on Google",
        description: "Master Google Ads, keyword research for the Indian market, bidding strategies, budget management, and campaign optimization.",
        icon: "search",
        estimatedHours: 5,
        order: 9
      },
      {
        title: "Campaign Creation on Facebook",
        description: "Learn Facebook's advertising ecosystem, craft compelling ads, understand audience selection for the Indian market, and interpret A/B testing results.",
        icon: "groups",
        estimatedHours: 5,
        order: 10
      },
      {
        title: "Digital Marketing Strategy",
        description: "Build comprehensive digital strategies, integrate offline and online marketing in India, leverage local events, and implement global insights.",
        icon: "insights",
        estimatedHours: 6,
        order: 11
      },
      {
        title: "Digital Media Analytics",
        description: "Understand the importance of data in decision making, learn analytics tools, interpret key metrics, and study success cases from India and globally.",
        icon: "analytics",
        estimatedHours: 5,
        order: 12
      },
      {
        title: "Future of Digital Marketing in India",
        description: "Explore predictions for the next decade, emerging technologies like AR, VR, and AI in marketing, and prepare for adapting to industry changes.",
        icon: "trending_up",
        estimatedHours: 3,
        order: 13
      },
      {
        title: "Social Media Marketing for Indian Audiences",
        description: "Learn strategies for engaging Indian audiences on social platforms, understanding regional preferences, and measuring campaign effectiveness.",
        icon: "share",
        estimatedHours: 4,
        order: 14
      },
      {
        title: "Mobile Marketing in India",
        description: "Master mobile marketing techniques for the mobile-first Indian consumer, including app promotion, SMS marketing, and WhatsApp strategies.",
        icon: "smartphone",
        estimatedHours: 3,
        order: 15
      }
    ];

    // Filter out modules that already exist by checking title
    const existingTitles = existingModules.map(mod => mod.title);
    const newModules = allModules.filter(mod => !existingTitles.includes(mod.title));

    // Add new modules
    for (const moduleData of newModules) {
      await storage.createModule(moduleData);
      console.log(`Added module: ${moduleData.title}`);
    }
    
    console.log(`Successfully added ${newModules.length} new modules.`);
    return true;
  } else {
    console.log("All modules already exist. No new modules added.");
    return false;
  }
}