import 'dotenv/config'; 
import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

// Check required environment variables
if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!,
    );
  },
  { maxAge: 3600 * 1000 },
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(claims: any) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure Replit Auth
  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback,
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };

  for (const domain of process.env.REPLIT_DOMAINS!.split(",")) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
  }

  // Configure Google Auth
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    const primaryDomain = process.env.REPLIT_DOMAINS!.split(",")[0];
    const callbackURL = `https://${primaryDomain}/api/auth/google/callback`;

    console.log("Setting up Google OAuth with callback URL:", callbackURL);

    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: callbackURL,
          proxy: true,
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            console.log(
              "Google auth callback received for:",
              profile.displayName,
            );
            const userId = `google-${profile.id}`;
            const user = await storage.upsertUser({
              id: userId,
              email: profile.emails?.[0]?.value,
              firstName: profile.name?.givenName,
              lastName: profile.name?.familyName,
              profileImageUrl: profile.photos?.[0]?.value,
              // Default values for required fields
              name:
                profile.displayName ||
                `${profile.name?.givenName || ""} ${profile.name?.familyName || ""}`.trim(),
              mobileNumber: "",
              profession: "",
              gender: "",
              collegeOrUniversity: "",
              interests: "",
              goals: "",
              educationLevel: "",
            });

            console.log("User saved/updated in database:", userId);

            const userSession = {
              claims: {
                sub: userId,
                email: profile.emails?.[0]?.value,
                first_name: profile.name?.givenName,
                last_name: profile.name?.familyName,
                profile_image_url: profile.photos?.[0]?.value,
                iat: Math.floor(Date.now() / 1000),
                exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 hours
              },
              access_token: accessToken,
              refresh_token: refreshToken,
            };

            return done(null, userSession);
          } catch (error) {
            console.error("Error in Google authentication:", error);
            return done(error as Error);
          }
        },
      ),
    );
  } else {
    console.warn(
      "Google OAuth credentials not found. Google login will be disabled.",
    );
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  // Replit Auth routes
  app.get("/api/login", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  // Google Auth routes
  app.get("/api/auth/google", (req, res, next) => {
    console.log("Google login route hit with hostname:", req.hostname);

    console.log("Google auth credentials available:", {
      clientId: !!process.env.GOOGLE_CLIENT_ID,
      clientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
    });

    passport.authenticate("google", {
      scope: ["profile", "email"],
    })(req, res, next);
  });

  app.get("/api/auth/google/callback", (req, res, next) => {
    console.log("Google callback route hit with hostname:", req.hostname);

    passport.authenticate(
      "google",
      {
        failureRedirect: "/auth",
      },
      (err, user, info) => {
        if (err) {
          console.error("Google auth error:", err);
          return res.redirect("/auth?error=google_auth_error");
        }
        if (!user) {
          console.error("Google auth failed:", info);
          return res.redirect("/auth?error=google_user_missing");
        }
        req.login(user, (loginErr) => {
          if (loginErr) {
            console.error("Google login error:", loginErr);
            return res.redirect("/auth?error=session_error");
          }
          console.log("Google login successful, redirecting to home");
          setTimeout(() => {
            res.redirect("/");
          }, 100);
        });
      },
    )(req, res, next);
  });

  // Shared logout route
  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      // If it was a Replit login, use their logout URL
      if (
        req.user &&
        (req.user as any).claims?.iss === "https://replit.com/oidc"
      ) {
        res.redirect(
          client.buildEndSessionUrl(config, {
            client_id: process.env.REPL_ID!,
            post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
          }).href,
        );
      } else {
        // Otherwise just redirect to home
        res.redirect("/");
      }
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    return res.redirect("/api/login");
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    return res.redirect("/api/login");
  }
};
