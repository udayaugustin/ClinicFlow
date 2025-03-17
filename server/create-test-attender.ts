import { storage } from "./storage";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function createTestAttender() {
  try {
    // Create predictable test credentials
    const username = "test.attender";
    const password = "test123";

    // Hash the password
    const hashedPassword = await hashPassword(password);
    console.log("\nCreating test attender with credentials:");
    console.log("Username:", username);
    console.log("Password:", password);
    console.log("Hashed password:", hashedPassword);

    const user = await storage.createUser({
      username,
      password: hashedPassword,
      name: "Test Attender",
      role: "attender",
      clinicId: 1,
      specialty: null,
      bio: null,
      imageUrl: null,
      address: null,
      city: null,
      state: null,
      zipCode: null,
      latitude: null,
      longitude: null,
    });

    console.log("\nCreated attender:", user);

    // Link to some doctors for testing
    await storage.addDoctorToAttender(user.id, 1, 1); // Link to first doctor
    await storage.addDoctorToAttender(user.id, 2, 1); // Link to second doctor

    console.log("\nTest attender created successfully!");
    console.log("----------------------------------------");
    console.log("LOGIN CREDENTIALS");
    console.log("Username:", username);
    console.log("Password:", password);
    console.log("----------------------------------------");
    console.log("Linked to doctors with IDs: 1, 2");

    return user;
  } catch (error) {
    console.error("Error creating test attender:", error);
    throw error;
  }
}

// Execute and log results
createTestAttender()
  .then(() => {
    console.log("\nTest attender creation completed successfully!");
    process.exit(0);
  })
  .catch(error => {
    console.error("\nFailed to create test attender:", error);
    process.exit(1);
  });