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
  const hashedPassword = await hashPassword("demo123");
  const user = await storage.createUser({
    username: "attender.demo",
    password: hashedPassword,
    name: "Demo Attender",
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

  console.log("Created attender:", user);

  // Link to some doctors
  await storage.addDoctorToAttender(user.id, 1, 1); // Link to Dr. Smith
  await storage.addDoctorToAttender(user.id, 2, 1); // Link to Dr. Jones

  console.log("Linked doctors to attender");
}

createTestAttender().catch(console.error);
