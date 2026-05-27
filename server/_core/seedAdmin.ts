/**
 * Admin user credentials for testing
 * Used in development only
 */

export async function ensureAdminUser() {
  return {
    email: "admin@test.local",
    password: "admin123456",
    message: "Test admin credentials (dev only)",
  };
}
