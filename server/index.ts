import express from 'express';
import session from 'express-session';
import { setupViteServer } from './vite';
import { setupRoutes } from './routes';
import { setupAuth } from './replitAuth';
import { log } from './vite';

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

// Setup routes
setupRoutes(app);

// Setup Vite in development
if (process.env.NODE_ENV === 'development') {
  setupViteServer(app);
}

app.listen(port, '0.0.0.0', () => {
  log(`serving on port ${port}`, 'express');
});