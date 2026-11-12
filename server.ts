import path from 'node:path';
import fs from 'node:fs';
import dotenv from 'dotenv';
import { createExpressApp } from './server/src/app';
import { getDatabase } from './server/src/db/database';

dotenv.config();

const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

async function startServer() {
  console.log('🚀 Initializing picPac.by full-stack server...');

  // 1. Ensure SQLite database is connected and initialized
  const db = getDatabase();
  console.log('📦 Database ready at:', db.name);

  // 2. Create Express app with API routes
  const app = createExpressApp();

  // 3. Mount Vite middleware for dev mode or static files for production
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('⚡ Vite dev middleware mounted');
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      const express = (await import('express')).default;
      app.use(express.static(distPath));
      app.get('*', (req: any, res: any) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
      console.log('📁 Serving production static build from dist/');
    }
  }

  // 4. Start listening on port 3000
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n======================================================`);
    console.log(`📱 picPac.by server running at http://localhost:${PORT}`);
    console.log(`🩺 Health API:     http://localhost:${PORT}/api/health`);
    console.log(`📦 Products API:   http://localhost:${PORT}/api/products`);
    console.log(`======================================================\n`);
  });
}

startServer().catch((err) => {
  console.error('❌ Failed to start picPac.by server:', err);
  process.exit(1);
});
