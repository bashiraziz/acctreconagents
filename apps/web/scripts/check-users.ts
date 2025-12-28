/**
 * Check users in database
 */

import { Pool } from "pg";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

async function checkUsers() {
  const pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log("🔍 Checking users in database...\n");

    const result = await pool.query(`
      SELECT
        id,
        name,
        email,
        "emailVerified",
        "createdAt"
      FROM "user"
      ORDER BY "createdAt" DESC
    `);

    if (result.rows.length === 0) {
      console.log("❌ No users found in database");
    } else {
      console.log(`✅ Found ${result.rows.length} user(s):\n`);
      result.rows.forEach((user, index) => {
        console.log(`User ${index + 1}:`);
        console.log(`  Name: ${user.name}`);
        console.log(`  Email: ${user.email}`);
        console.log(`  Email Verified: ${user.emailVerified}`);
        console.log(`  Created: ${new Date(user.createdAt).toLocaleString()}`);
        console.log(`  ID: ${user.id}`);
        console.log("");
      });
    }

    // Check active sessions
    const sessionResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM "session"
      WHERE "expiresAt" > NOW()
    `);

    console.log(`📊 Active sessions: ${sessionResult.rows[0].count}`);

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await pool.end();
  }
}

checkUsers();
