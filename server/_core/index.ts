import "dotenv/config";
import cors from "cors";
import express, { type Express, type Request, type Response } from "express";
import { createServer, type Server } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { initializeDatabase } from "./migrate";
import { ENV } from "./env";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  // Initialize database with migrations
  await initializeDatabase();

  const app = express();
  const server = createServer(app);
  app.set("trust proxy", true);

  // CORS configuration based on environment
  const allowedOrigins = [
    ENV.corsOrigin,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ].filter(Boolean) as string[];

  app.use(
    cors({
      origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        if (!origin || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(new Error(`CORS origin not allowed: ${origin}`));
      },
      credentials: true,
    })
  );

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (ENV.isDev) {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = ENV.port;
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`⚠️  Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`\n✅ Server running on http://localhost:${port}/`);
    console.log(`📍 Environment: ${ENV.environment}`);
    console.log(`🔗 API: http://localhost:${port}/api/trpc`);
    console.log(`🏠 Frontend: http://localhost:${port}/\n`);
  });
}

startServer().catch(console.error);
