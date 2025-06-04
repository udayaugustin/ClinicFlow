import { storage } from "./storage";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function assignDoctorToAttender() {
  try {
    // Step 1: Find the doctor
    const doctorUsername = "testdoctor";
    const doctor = await storage.getUserByUsername(doctorUsername);
    
    if (!doctor) {
      console.error(`Doctor with username '${doctorUsername}' not found.`);
      return null;
    }
    
    console.log(`Found doctor: ${doctor.name} (ID: ${doctor.id})`);
    
    // Step 2: Find or create an attender
    let attender = await storage.getUserByUsername("testattender");
    
    if (!attender) {
      console.log("Creating a new test attender...");
      
      // Create a new attender
      const username = "testattender";
      const password = "attender123";
      const hashedPassword = await hashPassword(password);
      
      attender = await storage.createUser({
        username,
        password: hashedPassword,
        name: "Test Attender",
        role: "attender",
        phone: "1234567890",
        email: null,
        specialty: null,
        bio: null,
        imageUrl: null,
        address: null,
        city: null,
        state: null,
        zipCode: null,
        latitude: null,
        longitude: null,
        clinicId: doctor.clinicId // Use the same clinic as the doctor
      });
      
      console.log(`Created new attender: ${attender.name} (ID: ${attender.id})`);
      console.log(`Attender credentials: username=${username}, password=${password}`);
    } else {
      console.log(`Found existing attender: ${attender.name} (ID: ${attender.id})`);
    }
    
    // Step 3: Get the clinic ID (assuming doctor is associated with a clinic)
    const clinicId = doctor.clinicId || 1; // Default to clinic ID 1 if not set
    
    // Step 4: Check if the relationship already exists
    const existingRelationships = await storage.getAttenderDoctors(attender.id);
    const alreadyAssigned = existingRelationships.some(rel => rel.doctorId === doctor.id);
    
    if (alreadyAssigned) {
      console.log(`Doctor ${doctor.name} is already assigned to attender ${attender.name}.`);
      return null;
    }
    
    // Step 5: Create the relationship
    const relationship = await storage.addDoctorToAttender(attender.id, doctor.id, clinicId);
    
    console.log(`\nSuccessfully assigned doctor to attender!`);
    console.log(`Doctor: ${doctor.name} (ID: ${doctor.id})`);
    console.log(`Attender: ${attender.name} (ID: ${attender.id})`);
    console.log(`Clinic ID: ${clinicId}`);
    console.log(`Relationship ID: ${relationship.id}`);
    
    return relationship;
  } catch (error) {
    console.error("Error assigning doctor to attender:", error);
    throw error;
  }
}

// Execute and log results
assignDoctorToAttender()
  .then(() => {
    console.log("\nAssignment completed successfully!");
    process.exit(0);
  })
  .catch(error => {
    console.error("\nFailed to assign doctor to attender:", error);
    process.exit(1);
  });
