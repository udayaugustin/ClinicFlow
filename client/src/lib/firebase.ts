import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  RecaptchaVerifier, 
  signInWithPhoneNumber,
  PhoneAuthProvider,
  signInWithCredential,
  Auth,
  ConfirmationResult
} from 'firebase/auth';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase only if config is provided
let app: any = null;
let auth: Auth | null = null;

if (firebaseConfig.apiKey) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
}

// Firebase Auth Service
export class FirebaseAuthService {
  private recaptchaVerifier: RecaptchaVerifier | null = null;
  private confirmationResult: ConfirmationResult | null = null;

  constructor() {
    if (!auth) {
      console.warn('Firebase Auth not configured. Using mock OTP service.');
    }
  }

  isConfigured(): boolean {
    return !!auth;
  }

  // Initialize reCAPTCHA verifier
  initializeRecaptcha(containerId: string): void {
    if (!auth) return;

    this.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
      size: 'invisible',
      callback: () => {
        // reCAPTCHA solved
      }
    });
  }

  // Send OTP to phone number
  async sendOTP(phoneNumber: string): Promise<void> {
    if (!auth || !this.recaptchaVerifier) {
      throw new Error('Firebase Auth not initialized');
    }

    try {
      this.confirmationResult = await signInWithPhoneNumber(
        auth, 
        phoneNumber, 
        this.recaptchaVerifier
      );
    } catch (error: any) {
      console.error('Error sending OTP:', error);
      throw new Error(error.message || 'Failed to send OTP');
    }
  }

  // Verify OTP code
  async verifyOTP(code: string): Promise<any> {
    if (!this.confirmationResult) {
      throw new Error('No OTP verification in progress');
    }

    try {
      const result = await this.confirmationResult.confirm(code);
      return result.user;
    } catch (error: any) {
      console.error('Error verifying OTP:', error);
      throw new Error(error.message || 'Invalid OTP code');
    }
  }

  // Get current user ID token for backend verification
  async getIdToken(): Promise<string | null> {
    if (!auth || !auth.currentUser) return null;
    
    try {
      return await auth.currentUser.getIdToken();
    } catch (error) {
      console.error('Error getting ID token:', error);
      return null;
    }
  }

  // Sign out
  async signOut(): Promise<void> {
    if (auth) {
      await auth.signOut();
    }
  }
}

// Export singleton instance
export const firebaseAuth = new FirebaseAuthService();