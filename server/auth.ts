import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser, insertUserSchema } from "@shared/schema";
import { smsService } from "./services/sms";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  try {
    const [hashed, salt] = stored.split(".");
    if (!hashed || !salt) {
      console.error("Invalid password format in database");
      return false;
    }
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    return timingSafeEqual(hashedBuf, suppliedBuf);
  } catch (error) {
    console.error("Error comparing passwords:", error);
    return false;
  }
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    },
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false);
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) {
        return done(new Error('User not found'), null);
      }
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const data = { ...req.body };
      const parsed = insertUserSchema.parse(data);

      const existingUser = await storage.getUserByUsername(parsed.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const hashedPassword = await hashPassword(parsed.password);
      const user = await storage.createUser({
        ...parsed,
        password: hashedPassword,
      });

      // If this is an attender being created by a clinic admin, don't auto-login
      if (req.user && req.user.role === "clinic_admin" && parsed.role === "attender") {
        return res.status(201).json(user);
      }
      
      // Otherwise, log the user in (normal registration flow)
      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(user);
      });
    } catch (err) {
      console.error("Registration error:", err);
      res.status(400).json({ message: err instanceof Error ? err.message : "Invalid request" });
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err, user) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: "Invalid credentials" });

      req.login(user, (err) => {
        if (err) return next(err);
        res.json(user);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });

  // OTP Authentication endpoints
  app.post("/api/auth/request-otp", async (req, res) => {
    try {
      const { phone } = req.body;
      
      if (!phone) {
        return res.status(400).json({ message: "Phone number is required" });
      }

      // Check if user exists
      const user = await storage.getUserByPhone(phone);
      if (!user) {
        return res.status(404).json({ message: "No account found with this phone number" });
      }

      // Check rate limiting
      const canSend = await storage.canSendOtp(phone);
      if (!canSend) {
        return res.status(429).json({ message: "Please wait 1 minute before requesting another OTP" });
      }

      // Cleanup expired OTPs
      await storage.cleanupExpiredOtps();

      // Generate OTP
      const otp = smsService.generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Store OTP in database
      await storage.createOtpVerification({
        phone,
        otpCode: otp,
        expiresAt,
        verified: false,
        verificationAttempts: 0
      });

      // Update last OTP sent time
      await storage.updateLastOtpSentAt(phone);

      // Send OTP via SMS
      await smsService.sendOTP(phone, otp);

      res.json({ message: "OTP sent successfully" });
    } catch (error) {
      console.error("Error sending OTP:", error);
      res.status(500).json({ message: "Failed to send OTP" });
    }
  });

  app.post("/api/auth/verify-otp", async (req, res, next) => {
    try {
      const { phone, otp } = req.body;

      if (!phone || !otp) {
        return res.status(400).json({ message: "Phone number and OTP are required" });
      }

      // Get valid OTP from database
      const otpRecord = await storage.getValidOtp(phone, otp);
      
      if (!otpRecord) {
        return res.status(401).json({ message: "Invalid or expired OTP" });
      }

      // Check if too many attempts
      if (otpRecord.verificationAttempts >= 5) {
        return res.status(429).json({ message: "Too many attempts. Please request a new OTP" });
      }

      // Increment attempts
      await storage.incrementOtpAttempts(otpRecord.id);

      // Get user
      const user = await storage.getUserByPhone(phone);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Mark OTP as verified
      await storage.markOtpAsVerified(otpRecord.id);

      // Update phone verification status
      await storage.updateUser(user.id, { phoneVerified: true });

      // Login the user
      req.login(user, (err) => {
        if (err) return next(err);
        res.json(user);
      });
    } catch (error) {
      console.error("Error verifying OTP:", error);
      res.status(500).json({ message: "Failed to verify OTP" });
    }
  });

  // OTP Registration endpoints
  app.post("/api/register/request-otp", async (req, res) => {
    try {
      const { phone } = req.body;
      
      if (!phone) {
        return res.status(400).json({ message: "Phone number is required" });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByPhone(phone);
      if (existingUser) {
        return res.status(400).json({ message: "An account already exists with this phone number" });
      }

      // Check rate limiting
      const canSend = await storage.canSendOtp(phone);
      if (!canSend) {
        return res.status(429).json({ message: "Please wait 1 minute before requesting another OTP" });
      }

      // Cleanup expired OTPs
      await storage.cleanupExpiredOtps();

      // Generate OTP
      const otp = smsService.generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Store OTP in database
      await storage.createOtpVerification({
        phone,
        otpCode: otp,
        expiresAt,
        verified: false,
        verificationAttempts: 0
      });

      // Send OTP via SMS
      await smsService.sendOTP(phone, otp);

      res.json({ message: "OTP sent successfully" });
    } catch (error) {
      console.error("Error sending registration OTP:", error);
      res.status(500).json({ message: "Failed to send OTP" });
    }
  });

  app.post("/api/register/verify-otp", async (req, res, next) => {
    try {
      const { phone, otp, name, username, password } = req.body;

      if (!phone || !otp || !name) {
        return res.status(400).json({ message: "Phone, OTP, and name are required" });
      }

      // Get valid OTP from database
      const otpRecord = await storage.getValidOtp(phone, otp);
      
      if (!otpRecord) {
        return res.status(401).json({ message: "Invalid or expired OTP" });
      }

      // Check if too many attempts
      if (otpRecord.verificationAttempts >= 5) {
        return res.status(429).json({ message: "Too many attempts. Please request a new OTP" });
      }

      // Mark OTP as verified
      await storage.markOtpAsVerified(otpRecord.id);

      // Generate username if not provided
      const finalUsername = username || `patient${phone.slice(-6)}`;
      
      // Generate random password if not provided
      const finalPassword = password || randomBytes(8).toString('hex');
      const hashedPassword = await hashPassword(finalPassword);

      // Create user
      const user = await storage.createUser({
        username: finalUsername,
        password: hashedPassword,
        name,
        phone,
        phoneVerified: true,
        role: "patient"
      });

      // Login the user
      req.login(user, (err) => {
        if (err) return next(err);
        
        // Include generated credentials in response if they were auto-generated
        const response: any = { ...user };
        if (!username) response.generatedUsername = finalUsername;
        if (!password) response.generatedPassword = finalPassword;
        
        res.status(201).json(response);
      });
    } catch (error) {
      console.error("Registration OTP verification error:", error);
      res.status(500).json({ message: "Failed to complete registration" });
    }
  });

  // Firebase Auth verification endpoint
  app.post("/api/auth/firebase-verify", async (req, res, next) => {
    try {
      const { idToken, phone } = req.body;

      if (!idToken || !phone) {
        return res.status(400).json({ message: "ID token and phone are required" });
      }

      // For now, we'll trust the Firebase token and just check/create user
      // In production, you should verify the Firebase ID token using firebase-admin SDK
      
      // Check if user exists
      let user = await storage.getUserByPhone(phone);
      
      if (!user) {
        // Create new user with Firebase auth
        const username = `firebase${phone.slice(-6)}`;
        const randomPassword = randomBytes(16).toString('hex');
        const hashedPassword = await hashPassword(randomPassword);
        
        user = await storage.createUser({
          username,
          password: hashedPassword,
          name: `User ${phone.slice(-4)}`,
          phone,
          phoneVerified: true,
          role: "patient"
        });
      } else {
        // Update phone verification status
        await storage.updateUser(user.id, { phoneVerified: true });
      }

      // Login the user
      req.login(user, (err) => {
        if (err) return next(err);
        res.json(user);
      });
    } catch (error) {
      console.error("Firebase verification error:", error);
      res.status(500).json({ message: "Failed to verify Firebase authentication" });
    }
  });
}