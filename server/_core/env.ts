/**
 * Environment validation with fallbacks and warnings
 * Supports: Local (localhost), Vercel, Railway, Docker
 */

const isDev = process.env.NODE_ENV !== "production";
const isVercel = !!process.env.VERCEL;
const isRailway = !!process.env.RAILWAY_ENVIRONMENT_ID;

// Auto-detect environment
const environment = isVercel ? "vercel" : isRailway ? "railway" : isDev ? "dev" : "production";

// Port detection (Railway uses PORT, Vercel uses VERCEL_URL, local uses hardcoded)
const detectPort = (): number => {
  if (process.env.PORT) return parseInt(process.env.PORT, 10);
  if (isDev) return 3000;
  return 3000; // fallback
};

// Validate and warn about missing critical env vars
const validateEnv = () => {
  const warnings: string[] = [];
  const errors: string[] = [];

  const checkRequired = (key: string, value: string | undefined) => {
    if (!value || value.trim() === "") {
      errors.push(`❌ Missing critical: ${key}`);
      return false;
    }
    return true;
  };

  const checkOptional = (key: string, value: string | undefined) => {
    if (!value || value.trim() === "") {
      warnings.push(`⚠️  Optional not configured: ${key}`);
      return false;
    }
    return true;
  };

  // Check critical variables
  checkRequired("DATABASE_URL", process.env.DATABASE_URL);
  checkRequired("JWT_SECRET", process.env.JWT_SECRET);
  checkRequired("BUILT_IN_FORGE_API_URL", process.env.BUILT_IN_FORGE_API_URL);
  checkRequired("BUILT_IN_FORGE_API_KEY", process.env.BUILT_IN_FORGE_API_KEY);

  // Check optional but recommended
  checkOptional("OAUTH_SERVER_URL", process.env.OAUTH_SERVER_URL);
  checkOptional("VITE_APP_ID", process.env.VITE_APP_ID);

  if (errors.length > 0) {
    console.error("\n🚨 CRITICAL CONFIGURATION ERRORS:\n");
    errors.forEach(e => console.error(e));
    console.error("\n📋 See .env.example for required variables\n");
    if (!isDev) {
      throw new Error("Critical environment variables missing");
    }
  }

  if (warnings.length > 0 && isDev) {
    console.warn("\n⚠️  CONFIGURATION WARNINGS:\n");
    warnings.forEach(w => console.warn(w));
    console.warn("");
  }
};

// Run validation on startup
if (typeof window === "undefined") { // Only on server
  validateEnv();
}

export const ENV = {
  // Core
  environment,
  isDev,
  isProduction: !isDev,
  isVercel,
  isRailway,
  port: detectPort(),

  // Database
  databaseUrl: process.env.DATABASE_URL ?? "",

  // Authentication
  cookieSecret: process.env.JWT_SECRET ?? "dev-secret-change-in-production",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",

  // Manus Forge
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",

  // App
  appId: process.env.VITE_APP_ID ?? "vehicle-advisor-pro",

  // CORS (auto-detect based on environment)
  corsOrigin: (() => {
    if (process.env.CORS_ORIGIN) return process.env.CORS_ORIGIN;
    if (isVercel && process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
    if (isDev) return "*";
    return ""; // Same-origin for Railway
  })(),

  // Frontend URLs
  frontendUrl: (() => {
    if (isVercel && process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
    if (isRailway && process.env.RAILWAY_PUBLIC_DOMAIN) return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
    if (isDev) return "http://localhost:3000";
    return ""; // Same-origin for unified deploy
  })(),

  // API URL (for frontend client)
  apiUrl: (() => {
    if (process.env.VITE_API_URL && process.env.VITE_API_URL.trim()) {
      return process.env.VITE_API_URL;
    }
    // Default to same-origin (most reliable)
    return "";
  })(),
};
