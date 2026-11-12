import express, { Express, Request, Response, NextFunction } from 'express';
import { healthRouter } from './routes/health';
import { productsRouter } from './routes/products';
import { projectsRouter } from './routes/projects';
import { aiRouter } from './routes/ai';
import { ordersRouter } from './routes/orders';
import { authRouter } from './routes/auth';

export function createExpressApp(): Express {
  const app = express();

  // Basic security and parsing middlewares
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // CORS headers for local / cross-origin development
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Idempotency-Key');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    next();
  });

  // API router prefix
  const apiRouter = express.Router();
  apiRouter.use(healthRouter);
  apiRouter.use(productsRouter);
  apiRouter.use(projectsRouter);
  apiRouter.use(aiRouter);
  apiRouter.use(ordersRouter);
  apiRouter.use(authRouter);

  app.use('/api', apiRouter);

  return app;
}
