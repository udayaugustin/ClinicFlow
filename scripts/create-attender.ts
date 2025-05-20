import { storage } from "../server/storage";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function createAttender() {
  try {
    // Get attender details from command line arguments
    const args = process.argv.slice(2);
    if (args.length < 5) {
      console.error("Usage: ts-node scripts/create-attender.ts <username> <password> <name> <phone> <clinicId>");
      process.exit(1);
    }

    const [username, password, name, phone, clinicId] = args;

    // Hash the password
    const hashedPassword = await hashPassword(password);
    console.log("\nCreating attender with credentials:");
    console.log("Username:", username);
    console.log("Name:", name);
    console.log("Phone:", phone);
    console.log("Clinic ID:", clinicId);

    const user = await storage.createUser({
      username,
      password: hashedPassword,
      name,
      role: "attender",
      phone,
      clinicId: parseInt(clinicId),
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
    console.log("\nAttender created successfully!");
    console.log("----------------------------------------");
    console.log("LOGIN CREDENTIALS");
    console.log("Username:", username);
    console.log("Password:", password);
    console.log("----------------------------------------");

    return user;
  } catch (error) {
    console.error("Error creating attender:", error);
    throw error;
  }
}

// Execute and log results
createAttender()
  .then(() => {
    console.log("\nAttender creation completed successfully!");
    process.exit(0);
  })
  .catch(error => {
    console.error("\nFailed to create attender:", error);
    process.exit(1);
  }); 