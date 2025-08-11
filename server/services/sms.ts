import { randomInt } from 'crypto';

// SMS Provider Interface
interface SMSProvider {
  sendSMS(to: string, message: string): Promise<void>;
}

// Mock SMS Provider for development
class MockSMSProvider implements SMSProvider {
  async sendSMS(to: string, message: string): Promise<void> {
    console.log(`[MOCK SMS] Sending to ${to}: ${message}`);
    // In development, log the OTP to console
    const otpMatch = message.match(/\b\d{6}\b/);
    if (otpMatch) {
      console.log(`[MOCK SMS] OTP Code: ${otpMatch[0]}`);
    }
  }
}

// Twilio SMS Provider (requires environment variables)
class TwilioSMSProvider implements SMSProvider {
  private twilioClient: any;
  private fromNumber: string;

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER || '';

    if (accountSid && authToken) {
      // Only import Twilio if credentials are provided
      try {
        const twilio = require('twilio');
        this.twilioClient = twilio(accountSid, authToken);
      } catch (error) {
        console.error('Twilio SDK not installed. Please run: npm install twilio');
        throw new Error('Twilio SDK not available');
      }
    } else {
      throw new Error('Twilio credentials not configured');
    }
  }

  async sendSMS(to: string, message: string): Promise<void> {
    try {
      await this.twilioClient.messages.create({
        body: message,
        from: this.fromNumber,
        to: to
      });
      console.log(`SMS sent successfully to ${to}`);
    } catch (error) {
      console.error('Failed to send SMS via Twilio:', error);
      throw new Error('Failed to send SMS');
    }
  }
}

// SMS Service class
class SMSService {
  private provider: SMSProvider;

  constructor() {
    // Use Twilio in production if configured, otherwise use mock
    if (process.env.NODE_ENV === 'production' && process.env.TWILIO_ACCOUNT_SID) {
      try {
        this.provider = new TwilioSMSProvider();
        console.log('SMS Service: Using Twilio provider');
      } catch (error) {
        console.warn('Twilio not configured, falling back to mock provider');
        this.provider = new MockSMSProvider();
      }
    } else {
      this.provider = new MockSMSProvider();
      console.log('SMS Service: Using mock provider (development mode)');
    }
  }

  // Generate a 6-digit OTP
  generateOTP(): string {
    return randomInt(100000, 999999).toString();
  }

  // Send OTP to phone number
  async sendOTP(phoneNumber: string, otp: string): Promise<void> {
    const message = `Your ClinicFlow verification code is: ${otp}. This code will expire in 10 minutes.`;
    await this.provider.sendSMS(phoneNumber, message);
  }

  // Send appointment reminder
  async sendAppointmentReminder(phoneNumber: string, doctorName: string, appointmentTime: string): Promise<void> {
    const message = `Reminder: You have an appointment with Dr. ${doctorName} at ${appointmentTime}. Please arrive 10 minutes early.`;
    await this.provider.sendSMS(phoneNumber, message);
  }

  // Send appointment confirmation
  async sendAppointmentConfirmation(phoneNumber: string, doctorName: string, appointmentTime: string, tokenNumber: number): Promise<void> {
    const message = `Your appointment with Dr. ${doctorName} is confirmed for ${appointmentTime}. Your token number is ${tokenNumber}.`;
    await this.provider.sendSMS(phoneNumber, message);
  }

  // Send doctor arrival notification
  async sendDoctorArrivalNotification(phoneNumber: string, doctorName: string): Promise<void> {
    const message = `Dr. ${doctorName} has arrived and consultations have started. Please be ready when your token is called.`;
    await this.provider.sendSMS(phoneNumber, message);
  }

  // Send token progress notification
  async sendTokenProgressNotification(phoneNumber: string, currentToken: number, yourToken: number): Promise<void> {
    const tokensAway = yourToken - currentToken;
    const message = `Current token: ${currentToken}. Your token: ${yourToken}. You are ${tokensAway} tokens away. Please be ready.`;
    await this.provider.sendSMS(phoneNumber, message);
  }
}

// Export singleton instance
export const smsService = new SMSService();