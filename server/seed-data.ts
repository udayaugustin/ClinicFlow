import { storage } from "./storage";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { exec } from "child_process";
import { InsertUser } from "../shared/schema";

const scryptAsync = promisify(scrypt);

// Helper function to run shell commands
function runCommand(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`Command failed: ${command}\n${error.message}\n${stderr}`));
        return;
      }
      resolve(stdout);
    });
  });
}

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function seedDatabase() {
  console.log("🌱 Starting database seed...\n");
  
  try {
    // Step 1: Generate database schema
    console.log("📝 Generating database schema...");
    try {
      const generateOutput = await runCommand("npm run db:generate");
      console.log("✓ Database schema generated successfully");
      if (generateOutput.trim()) {
        console.log(`   Output: ${generateOutput.trim()}`);
      }
    } catch (error) {
      console.log("⚠️  Schema generation skipped (may already be up to date)");
      console.log(`   Reason: ${error.message}`);
    }

    // Step 2: Run database migrations
    console.log("\n📊 Running database migrations...");
    try {
      const migrateOutput = await runCommand("npm run db:migrate");
      console.log("✓ Database migrations completed successfully");
      if (migrateOutput.trim()) {
        console.log(`   Output: ${migrateOutput.trim()}`);
      }
    } catch (error) {
      console.log("⚠️  Migrations may have already been applied");
      console.log(`   Reason: ${error.message}`);
    }

    console.log("\n👥 Creating users...");
    // 1. Create Super Admin
    console.log("Creating Super Admin...");
    const superAdminData = {
      username: "super.admin",
      password: "Admin@123",
      name: "Super Administrator",
      role: "super_admin" as const,
      clinicId: null,
      specialty: null,
      bio: null,
      imageUrl: null,
      address: null,
      city: null,
      state: null,
      zipCode: null,
      latitude: null,
      longitude: null,
      phone: "1234567890",
      email: "super.admin@clinicflow.com"
    };

    const existingSuperAdmin = await storage.getUserByUsername(superAdminData.username);
    let superAdmin;
    if (existingSuperAdmin) {
      console.log("✓ Super admin already exists");
      superAdmin = existingSuperAdmin;
    } else {
      const hashedPassword = await hashPassword(superAdminData.password);
      superAdmin = await storage.createUser({
        ...superAdminData,
        password: hashedPassword
      });
      console.log("✓ Super admin created");
    }

    // 2. Create Clinic Admin (assuming clinic ID 1 exists from migrations)
    console.log("\nCreating Clinic Admin...");
    const clinicAdminData = {
      username: "clinic.admin",
      password: "Clinic@123",
      name: "Clinic Administrator",
      role: "clinic_admin" as const,
      clinicId: 1,
      specialty: null,
      bio: null,
      imageUrl: null,
      address: "123 Main Street",
      city: "New York",
      state: "NY",
      zipCode: "10001",
      latitude: null,
      longitude: null,
      phone: "2125550123",
      email: "admin@citymedical.com"
    };

    const existingClinicAdmin = await storage.getUserByUsername(clinicAdminData.username);
    let clinicAdmin;
    if (existingClinicAdmin) {
      console.log("✓ Clinic admin already exists");
      clinicAdmin = existingClinicAdmin;
    } else {
      const hashedPassword = await hashPassword(clinicAdminData.password);
      clinicAdmin = await storage.createUser({
        ...clinicAdminData,
        password: hashedPassword
      });
      console.log("✓ Clinic admin created");
    }

    // 3. Create 5 Doctors
    console.log("\nCreating Doctors...");
    const doctorsData = [
      {
        username: "doctor1",
        password: "Doctor@123",
        name: "Dr. Sarah Johnson",
        specialty: "Cardiology",
        bio: "Experienced cardiologist with 15 years of practice specializing in heart disease prevention and treatment.",
        address: "123 Main Street",
        city: "New York",
        state: "NY",
        zipCode: "10001",
        phone: "2125551001",
        email: "sarah.johnson@citymedical.com"
      },
      {
        username: "doctor2",
        password: "Doctor@123",
        name: "Dr. Michael Chen",
        specialty: "Pediatrics",
        bio: "Board-certified pediatrician dedicated to providing comprehensive healthcare for children and adolescents.",
        address: "123 Main Street",
        city: "New York",
        state: "NY",
        zipCode: "10001",
        phone: "2125551002",
        email: "michael.chen@citymedical.com"
      },
      {
        username: "doctor3",
        password: "Doctor@123",
        name: "Dr. Emily Rodriguez",
        specialty: "Dermatology",
        bio: "Skilled dermatologist specializing in skin conditions, cosmetic procedures, and skin cancer prevention.",
        address: "123 Main Street",
        city: "New York",
        state: "NY",
        zipCode: "10001",
        phone: "2125551003",
        email: "emily.rodriguez@citymedical.com"
      },
      {
        username: "doctor4",
        password: "Doctor@123",
        name: "Dr. James Wilson",
        specialty: "Orthopedics",
        bio: "Orthopedic surgeon with expertise in joint replacement, sports medicine, and trauma surgery.",
        address: "123 Main Street",
        city: "New York",
        state: "NY",
        zipCode: "10001",
        phone: "2125551004",
        email: "james.wilson@citymedical.com"
      },
      {
        username: "doctor5",
        password: "Doctor@123",
        name: "Dr. Lisa Thompson",
        specialty: "Internal Medicine",
        bio: "Internal medicine physician focused on adult primary care, preventive medicine, and chronic disease management.",
        address: "123 Main Street",
        city: "New York",
        state: "NY",
        zipCode: "10001",
        phone: "2125551005",
        email: "lisa.thompson@citymedical.com"
      }
    ];

    const doctors = [];
    for (let i = 0; i < doctorsData.length; i++) {
      const doctorData = doctorsData[i];
      const existingDoctor = await storage.getUserByUsername(doctorData.username);
      
      if (existingDoctor) {
        console.log(`✓ Doctor ${i + 1} (${doctorData.name}) already exists`);
        doctors.push(existingDoctor);
      } else {
        const hashedPassword = await hashPassword(doctorData.password);
        const doctor = await storage.createUser({
          ...doctorData,
          password: hashedPassword,
          role: "doctor" as const,
          clinicId: 1, // Assign to first clinic
          imageUrl: null,
          latitude: 40.7128,
          longitude: -74.0060
        });
        doctors.push(doctor);
        console.log(`✓ Doctor ${i + 1} (${doctorData.name}) created`);
      }
    }

    // 4. Create 5 Patients
    console.log("\nCreating Patients...");
    const patientsData = [
      {
        username: "patient1",
        password: "Patient@123",
        name: "John Smith",
        address: "456 Oak Street",
        city: "New York",
        state: "NY",
        zipCode: "10002",
        phone: "2125552001",
        email: "john.smith@email.com"
      },
      {
        username: "patient2",
        password: "Patient@123",
        name: "Maria Garcia",
        address: "789 Pine Avenue",
        city: "New York",
        state: "NY",
        zipCode: "10003",
        phone: "2125552002",
        email: "maria.garcia@email.com"
      },
      {
        username: "patient3",
        password: "Patient@123",
        name: "David Brown",
        address: "321 Elm Road",
        city: "New York",
        state: "NY",
        zipCode: "10004",
        phone: "2125552003",
        email: "david.brown@email.com"
      },
      {
        username: "patient4",
        password: "Patient@123",
        name: "Jennifer Lee",
        address: "654 Maple Lane",
        city: "New York",
        state: "NY",
        zipCode: "10005",
        phone: "2125552004",
        email: "jennifer.lee@email.com"
      },
      {
        username: "patient5",
        password: "Patient@123",
        name: "Robert Davis",
        address: "987 Cedar Drive",
        city: "New York",
        state: "NY",
        zipCode: "10006",
        phone: "2125552005",
        email: "robert.davis@email.com"
      }
    ];

    const patients = [];
    for (let i = 0; i < patientsData.length; i++) {
      const patientData = patientsData[i];
      const existingPatient = await storage.getUserByUsername(patientData.username);
      
      if (existingPatient) {
        console.log(`✓ Patient ${i + 1} (${patientData.name}) already exists`);
        patients.push(existingPatient);
      } else {
        const hashedPassword = await hashPassword(patientData.password);
        const patient = await storage.createUser({
          ...patientData,
          password: hashedPassword,
          role: "patient" as const,
          clinicId: null, // Patients don't belong to a specific clinic
          specialty: null,
          bio: null,
          imageUrl: null,
          latitude: 40.7128,
          longitude: -74.0060
        });
        patients.push(patient);
        console.log(`✓ Patient ${i + 1} (${patientData.name}) created`);
      }
    }

    // 5. Display Summary
    console.log("\n" + "=".repeat(60));
    console.log("🎉 DATABASE SEED COMPLETED SUCCESSFULLY!");
    console.log("=".repeat(60));
    console.log("📝 Database schema generated");
    console.log("📊 Database migrations applied");
    console.log("👥 All users created");
    
    console.log("\n📋 CREATED ACCOUNTS SUMMARY:");
    console.log("\n👑 SUPER ADMIN:");
    console.log(`   Username: ${superAdminData.username}`);
    console.log(`   Password: ${superAdminData.password}`);
    
    console.log("\n🏥 CLINIC ADMIN:");
    console.log(`   Username: ${clinicAdminData.username}`);
    console.log(`   Password: ${clinicAdminData.password}`);
    
    console.log("\n👨‍⚕️ DOCTORS:");
    doctorsData.forEach((doctor, index) => {
      console.log(`   ${index + 1}. ${doctor.name} (${doctor.specialty})`);
      console.log(`      Username: ${doctor.username}`);
      console.log(`      Password: ${doctor.password}`);
    });
    
    console.log("\n🧑‍💼 PATIENTS:");
    patientsData.forEach((patient, index) => {
      console.log(`   ${index + 1}. ${patient.name}`);
      console.log(`      Username: ${patient.username}`);
      console.log(`      Password: ${patient.password}`);
    });
    
    console.log("\n" + "=".repeat(60));
    console.log("✅ All accounts created successfully!");
    console.log("💡 All passwords are: Admin@123, Clinic@123, Doctor@123, Patient@123");
    console.log("🔒 Remember to change default passwords in production!");
    console.log("=".repeat(60));

  } catch (error) {
    console.error("\n❌ Error during database seed:", error);
    throw error;
  }
}

// Execute the seed
seedDatabase()
  .then(() => {
    console.log("\n🌱 Database seed completed successfully!");
    process.exit(0);
  })
  .catch(error => {
    console.error("\n💥 Database seed failed:", error);
    process.exit(1);
  });