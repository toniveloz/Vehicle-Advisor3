import 'dotenv/config';
import express from 'express';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { appRouter } from '../server/routers';
import { createContext } from '../server/_core/context';

const app = express();
app.use(express.json({ limit: '50mb' }));

app.use(
  // mount at root because Vercel will route `/api/trpc` to this function
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

export default function handler(req: any, res: any) {
  return app(req, res);
}
