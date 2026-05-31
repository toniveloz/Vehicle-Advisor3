import 'dotenv/config';
import express from 'express';
import { registerStorageProxy } from '../server/_core/storageProxy';

const app = express();
app.use(express.json());
registerStorageProxy(app);

export default function handler(req: any, res: any) {
  return app(req, res);
}
