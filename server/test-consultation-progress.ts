import { storage } from "./storage";

async function testConsultationProgress() {
  try {
    console.log("\nTesting Consultation Progress API");
    console.log("--------------------------------");

    // Test data
    const doctorId = 1;
    const date = new Date();
    const currentToken = 5;

    console.log("Creating test progress entry:");
    console.log("Doctor ID:", doctorId);
    console.log("Date:", date);
    console.log("Current Token:", currentToken);

    // Create a progress entry
    const created = await storage.updateConsultationProgress(
      doctorId,
      date,
      currentToken
    );
    console.log("\nCreated progress entry:", created);

    // Fetch the progress
    const progress = await storage.getConsultationProgress(doctorId, date);
    console.log("\nFetched progress:", progress);

    // Verify the data
    if (progress) {
      console.log("\nVerification:");
      console.log("- Progress found:", !!progress);
      console.log("- Doctor ID matches:", progress.doctorId === doctorId);
      console.log("- Current token matches:", progress.currentToken === currentToken);
    } else {
      console.log("\nERROR: No progress found after creation!");
    }

  } catch (error) {
    console.error("\nTest failed with error:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    throw error;
  }
}

// Run the test
testConsultationProgress()
  .then(() => {
    console.log("\nTest completed successfully!");
    process.exit(0);
  })
  .catch(error => {
    console.error("\nTest failed:", error);
    process.exit(1);
  });
