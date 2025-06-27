import { storage } from "./storage";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function createTestPatient() {
  try {
    // Create predictable test credentials
    const username = "patient5";
    const password = "Test@123";

    // Hash the password
    const hashedPassword = await hashPassword(password);
    console.log("\nCreating test patient with credentials:");
    console.log("Username:", username);
    console.log("Password:", password);
    console.log("Hashed password:", hashedPassword);

    // Check if user already exists
    const existingUser = await storage.getUserByUsername(username);
    if (existingUser) {
      console.log("\nTest patient already exists with username:", username);
      return existingUser;
    }

    const user = await storage.createUser({
      username,
      password: hashedPassword,
      name: "Patient 5",
      role: "patient",
      clinicId: null,   // Patients don't have a clinic ID
      specialty: null,
      bio: null,
      imageUrl: null,
      address: "123 Test Street",
      city: "Test City",
      state: "Test State",
      zipCode: "12345",
      latitude: 40.7128,
      longitude: -74.0060,
      phone: "1234567890",
      email: "patient5@test.com",
    });

    console.log("\nCreated patient:", user);
    console.log("\nTest patient created successfully!");
    console.log("----------------------------------------");
    console.log("LOGIN CREDENTIALS");
    console.log("Username:", username);
    console.log("Password:", password);
    console.log("----------------------------------------");

    return user;
  } catch (error) {
    console.error("Error creating test patient:", error);
    throw error;
  }
}

// Execute and log results
createTestPatient()
  .then(() => {
    console.log("\nTest patient creation completed successfully!");
    process.exit(0);
  })
  .catch(error => {
    console.error("\nFailed to create test patient:", error);
    process.exit(1);
  });
