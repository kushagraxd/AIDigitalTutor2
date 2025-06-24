import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from "dotenv";

// Get __dirname in ESM:
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Now load .env:
dotenv.config({ path: path.resolve(__dirname, '.env') });
console.log("ACTUAL DATABASE_URL VALUE:", process.env.DATABASE_URL);

// ...rest of your db.ts...
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });
