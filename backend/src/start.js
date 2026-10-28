import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { fileURLToPath } from 'node:url';
import { makeServer } from './server.js';
import { prepareIndexes } from './models/Application.js';
import { requirePrivateDatabase } from './config/privateDatabase.js';

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)) });

async function launch() {
  const uri = process.env.MONGODB_URI;
  requirePrivateDatabase(uri);
  new Intl.DateTimeFormat('en-CA', { timeZone: process.env.APP_TIMEZONE || 'Asia/Kolkata' }).format(new Date());
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 12000 });
  await prepareIndexes();
  const app = makeServer();
  const server = app.listen(Number(process.env.PORT || 5001), () => console.log(`NextStep ready on port ${process.env.PORT || 5001}`));
  const stop = () => server.close(async () => { await mongoose.disconnect(); });
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  server.on('error', async error => { console.error('Listener error:', error.message); await mongoose.disconnect(); process.exitCode = 1; });
}
launch().catch(async error => { console.error('Startup stopped:', error.message); await mongoose.disconnect(); process.exitCode = 1; });
