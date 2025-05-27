import { storage } from "./storage";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { InsertUser } from "../shared/schema";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function createClinicAdmin() {
  try {
    // Get clinic ID from command line arguments
    const clinicIdArg = process.argv.find(arg => arg.startsWith('--clinicId='));
    if (!clinicIdArg) {
      throw new Error("Clinic ID is required. Please provide it using --clinicId=<id>");
    }
    
    const clinicId = parseInt(clinicIdArg.split('=')[1], 10);
    if (isNaN(clinicId)) {
      throw new Error("Invalid clinic ID. Please provide a valid number.");
    }
    
    // Verify that the clinic exists
    const clinic = await storage.getClinic(clinicId);
    if (!clinic) {
      throw new Error(`Clinic with ID ${clinicId} not found.`);
    }
    
    console.log(`\nCreating admin for clinic: ${clinic.name} (ID: ${clinic.id})`);
    
    // Create admin credentials
    // Use clinic name to generate a username (lowercase, no spaces)
    const baseUsername = clinic.name.toLowerCase().replace(/\s+/g, '');
    const username = `${baseUsername}.admin`;
    const password = `admin${Math.floor(1000 + Math.random() * 9000)}`; // Generate a random password

    // Hash the password
    const hashedPassword = await hashPassword(password);
    console.log("\nCreating clinic admin with credentials:");
    console.log("Username:", username);
    console.log("Password:", password);
    console.log("Hashed password:", hashedPassword);

    // Check if user already exists
    const existingUser = await storage.getUserByUsername(username);
    if (existingUser) {
      console.log("\nClinic admin already exists with username:", username);
      return existingUser;
    }

    // Create the clinic admin user
    const userData: InsertUser = {
      username,
      password: hashedPassword,
      name: `${clinic.name} Administrator`,
      role: "clinic_admin",
      phone: clinic.phone || "0000000000", // Use clinic phone or default
      email: clinic.email || `${username}@clinicflow.com`, // Use clinic email or generate one
      clinicId: clinic.id,
      specialty: null,
      bio: null,
      imageUrl: null,
      address: clinic.address || null,
      city: clinic.city || null,
      state: clinic.state || null,
      zipCode: clinic.zipCode || null,
      latitude: null,
      longitude: null,
    };

    const user = await storage.createUser(userData);

    console.log("\nCreated clinic admin:", user);
    console.log("\nClinic admin created successfully!");
    console.log("----------------------------------------");
    console.log("LOGIN CREDENTIALS");
    console.log("Username:", username);
    console.log("Password:", password);
    console.log("----------------------------------------");
    console.log(`This admin is associated with clinic: ${clinic.name} (ID: ${clinic.id})`);

    return user;
  } catch (error) {
    console.error("Error creating clinic admin:", error);
    throw error;
  }
}

// Execute and log results
createClinicAdmin()
  .then(() => {
    console.log("\nClinic admin creation completed successfully!");
    process.exit(0);
  })
  .catch(error => {
    console.error("\nFailed to create clinic admin:", error);
    process.exit(1);
  });
