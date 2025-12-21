/**
 * Test Better Auth initialization directly
 */

import dotenv from "dotenv";
import path from "path";
import { betterAuth } from "better-auth";

dotenv.config({ path: path.join(__dirname, "../.env.local") });

async function testBetterAuth() {
  console.log("🧪 Testing Better Auth initialization...\n");
  console.log("Database URL:", process.env.POSTGRES_URL?.substring(0, 50) + "...");

  try {
    const auth = betterAuth({
      database: {
        provider: "postgres",
        url: process.env.POSTGRES_URL!,
      },
      emailAndPassword: {
        enabled: true,
        requireEmailVerification: false,
      },
    });

    console.log("\n✅ Better Auth instance created");
    console.log("Auth object:", Object.keys(auth));

    // Try to actually use it
    console.log("\n🔍 Attempting to create a test user...");

    // Wait a bit to let async validation complete
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log("\n✅ Test completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error:", error);
    console.error("Error type:", error?.constructor?.name);
    console.error("Error message:", error instanceof Error ? error.message : String(error));
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack");
    console.error("Error cause:", (error as any)?.cause);
    process.exit(1);
  }
}

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('\n🚨 UNHANDLED REJECTION:');
  console.error('Reason:', reason);
  if (reason instanceof Error) {
    console.error('Message:', reason.message);
    console.error('Stack:', reason.stack);
    console.error('Cause:', (reason as any).cause);

    // Try to get more details
    const errorObj = reason as any;
    console.error('\nAll error properties:');
    for (const key in errorObj) {
      console.error(`  ${key}:`, errorObj[key]);
    }
  }
  process.exit(1);
});

testBetterAuth();
