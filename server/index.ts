import express from 'express';
import session from 'express-session';
import { setupVite, serveStatic, log } from './vite';
import { registerRoutes } from './routes';
import { setupAuth } from './replitAuth';
import { createServer } from 'http';

const app = express();
const port = process.env.PORT || 5000;

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'development_secret',
  resave: false,
  saveUninitialized: false
}));

// Parse JSON bodies
app.use(express.json());

// Setup authentication
setupAuth(app);

// Create HTTP server
const httpServer = createServer(app);

// Register routes
registerRoutes(app).then(() => {
  // Setup Vite for development or serve static files for production
  if (process.env.NODE_ENV === 'development') {
    setupVite(app, httpServer);
  } else {
    serveStatic(app);
  }

  // Start the server
  httpServer.listen(Number(port), '0.0.0.0', () => {
    log(`serving on port ${port}`, 'express');
  });
}).catch(err => {
  console.error('Failed to register routes:', err);
  process.exit(1);
});