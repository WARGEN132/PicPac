import { Router, Request, Response } from 'express';
import { getDatabase } from '../db/database';

export const healthRouter = Router();

healthRouter.get('/health', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const stats = {
      products: (db.prepare('SELECT COUNT(*) as count FROM products').get() as any)?.count || 0,
      orders: (db.prepare('SELECT COUNT(*) as count FROM orders').get() as any)?.count || 0,
      users: (db.prepare('SELECT COUNT(*) as count FROM users').get() as any)?.count || 0,
      customers: (db.prepare('SELECT COUNT(*) as count FROM customers').get() as any)?.count || 0,
      tickets: (db.prepare('SELECT COUNT(*) as count FROM support_tickets').get() as any)?.count || 0,
    };

    res.status(200).json({
      status: 'ok',
      service: 'picPac.by API',
      organization: 'ООО «Фотопринт»',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      database: {
        engine: 'SQLite (better-sqlite3)',
        status: 'connected',
        stats
      }
    });
  } catch (err: any) {
    res.status(500).json({
      status: 'error',
      service: 'picPac.by API',
      timestamp: new Date().toISOString(),
      error: err.message
    });
  }
});
