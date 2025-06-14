import { storage } from "./storage";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function createSuperAdmin() {
  try {
    // Create super admin credentials
    const username = "super.admin";
    const password = "Admin@123"; // You should change this in production

    // Hash the password
    const hashedPassword = await hashPassword(password);
    console.log("\nCreating super admin with credentials:");
    console.log("Username:", username);
    console.log("Password:", password);
    console.log("Hashed password:", hashedPassword);

    // Check if user already exists
    const existingUser = await storage.getUserByUsername(username);
    if (existingUser) {
      console.log("\nSuper admin already exists with username:", username);
      return existingUser;
    }

    // Create the super admin user
    // Note: We're using "attender" role since "super-admin" isn't in the schema
    // In a production environment, you should add "super-admin" to the role enum in schema
    const user = await storage.createUser({
      username,
      password: hashedPassword,
      name: "Super Administrator",
      role: "super_admin", // Using attender as a placeholder for super-admin
      clinicId: null, // Super admin isn't associated with a specific clinic
      specialty: null,
      bio: null,
      imageUrl: null,
      address: null,
      city: null,
      state: null,
      zipCode: null,
      latitude: null,
      longitude: null,
      phone: ""
    });

    console.log("\nCreated super admin:", user);
    console.log("\nSuper admin created successfully!");
    console.log("----------------------------------------");
    console.log("LOGIN CREDENTIALS");
    console.log("Username:", username);
    console.log("Password:", password);
    console.log("----------------------------------------");
    console.log("NOTE: This super admin uses the 'attender' role as a placeholder.");
    console.log("In production, you should add 'super-admin' to the role enum in schema.");

    return user;
  } catch (error) {
    console.error("Error creating super admin:", error);
    throw error;
  }
}

// Execute and log results
createSuperAdmin()
  .then(() => {
    console.log("\nSuper admin creation completed successfully!");
    process.exit(0);
  })
  .catch(error => {
    console.error("\nFailed to create super admin:", error);
    process.exit(1);
  });
