import { storage } from "../server/storage";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { db } from "../server/db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function resetPassword(username: string, newPassword: string) {
  try {
    console.log(`Resetting password for user: ${username}`);
    
    // Hash the new password
    const hashedPassword = await hashPassword(newPassword);
    console.log("Generated password hash:", hashedPassword);
    
    // Update the user's password in the database
    const result = await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.username, username))
      .returning();
    
    if (result.length === 0) {
      console.error(`User not found: ${username}`);
      return false;
    }
    
    console.log(`Password successfully reset for user: ${username}`);
    console.log("New credentials:");
    console.log(`Username: ${username}`);
    console.log(`Password: ${newPassword}`);
    return true;
  } catch (error) {
    console.error("Error resetting password:", error);
    return false;
  }
}

// Get command line arguments
const args = process.argv.slice(2);
if (args.length !== 2) {
  console.error("Usage: tsx scripts/reset-password.ts <username> <new_password>");
  process.exit(1);
}

const [username, newPassword] = args;

// Run the password reset
resetPassword(username, newPassword)
  .then(success => {
    if (!success) {
      process.exit(1);
    }
  })
  .catch(error => {
    console.error("Unhandled error:", error);
    process.exit(1);
  }); 