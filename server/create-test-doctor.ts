import { storage } from "./storage";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function createTestDoctor() {
  try {
    // Create predictable test credentials
    const username = "testdoctor";
    const password = "doctor123";

    // Hash the password
    const hashedPassword = await hashPassword(password);
    console.log("\nCreating test doctor with credentials:");
    console.log("Username:", username);
    console.log("Password:", password);
    console.log("Hashed password:", hashedPassword);

    // Check if user already exists
    const existingUser = await storage.getUserByUsername(username);
    if (existingUser) {
      console.log("\nTest doctor already exists with username:", username);
      return existingUser;
    }

    const user = await storage.createUser({
      username,
      password: hashedPassword,
      name: "Dr. John Smith",
      role: "doctor",
      clinicId: 1,  // Assuming clinic ID 1 exists, adjust as needed
      specialty: "General Medicine",
      bio: "Dr. John Smith is a general practitioner with over 10 years of experience in family medicine.",
      imageUrl: null,
      address: "456 Medical Avenue",
      city: "Healthville",
      state: "Wellness State",
      zipCode: "54321",
      latitude: 40.7128,
      longitude: -74.0060,
    });

    console.log("\nCreated doctor:", user);
    console.log("\nTest doctor created successfully!");
    console.log("----------------------------------------");
    console.log("LOGIN CREDENTIALS");
    console.log("Username:", username);
    console.log("Password:", password);
    console.log("----------------------------------------");

    return user;
  } catch (error) {
    console.error("Error creating test doctor:", error);
    throw error;
  }
}

// Execute and log results
createTestDoctor()
  .then(() => {
    console.log("\nTest doctor creation completed successfully!");
    process.exit(0);
  })
  .catch(error => {
    console.error("\nFailed to create test doctor:", error);
    process.exit(1);
  });
