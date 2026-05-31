/**
 * Database migration and initialization
 * Runs automatically on server startup
 */

import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import path from "path";
import fs from "fs";
import { ENV } from "./env";
import { ensureAdminUser } from "./seedAdmin";

let migrationAttempted = false;

export async function initializeDatabase() {
  // Prevent double migration
  if (migrationAttempted) return;
  migrationAttempted = true;

  if (!ENV.databaseUrl) {
    console.warn("⚠️  DATABASE_URL not configured - skipping migrations");
    return;
  }

  try {
    console.log("🔄 Initializing database...");

    const db = drizzle(ENV.databaseUrl);

    // Run migrations if they exist
    const migrationsPath = path.join(process.cwd(), "drizzle");
    if (fs.existsSync(migrationsPath)) {
      console.log("📋 Running database migrations...");
      await migrate(db, {
        migrationsFolder: migrationsPath,
      });
      console.log("✅ Database migrations completed");
    } else {
      console.warn("⚠️  No migrations folder found");
    }

    // Seed admin user if needed (only in dev or if configured)
    if (ENV.isDev) {
      try {
        const adminInfo = await ensureAdminUser();
        if (adminInfo) {
          console.log(`✅ Admin user: ${adminInfo.email}`);
        }
      } catch (error) {
        console.warn("⚠️  Could not seed admin user:", error);
      }
    }

    console.log("✅ Database initialized successfully");
  } catch (error) {
    if (ENV.isDev) {
      console.warn("⚠️  Database initialization failed (non-critical in dev):", error);
    } else {
      console.error("❌ Database initialization failed:", error);
      throw error;
    }
  }
}
