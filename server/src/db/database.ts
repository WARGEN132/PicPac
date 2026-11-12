import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { seedDatabase } from './seed';

let dbInstance: Database.Database | null = null;

export function getDatabasePath(): string {
  if (process.env.DB_PATH) {
    return path.resolve(process.cwd(), process.env.DB_PATH);
  }
  return path.resolve(process.cwd(), 'data/picpac.db');
}

export function getDatabase(): Database.Database {
  if (dbInstance) {
    return dbInstance;
  }

  const dbPath = getDatabasePath();
  const dbDir = path.dirname(dbPath);

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Apply schema
  const schemaPath = path.resolve(process.cwd(), 'server/src/db/schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schemaSql);
  } else {
    console.warn('⚠️ schema.sql not found at', schemaPath);
  }

  // Check if seeding is required
  const productCount = (db.prepare('SELECT COUNT(*) as cnt FROM products').get() as any)?.cnt || 0;
  const orderCount = (db.prepare('SELECT COUNT(*) as cnt FROM orders').get() as any)?.cnt || 0;

  if (productCount === 0 || orderCount < 500) {
    console.log(`📦 Database needs initial seeding (products: ${productCount}, orders: ${orderCount}). Seeding now...`);
    seedDatabase(db);
  }

  dbInstance = db;
  return dbInstance;
}

export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
