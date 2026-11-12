import { createHash, randomBytes } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { getDatabase } from './db/database';

type Role = 'customer' | 'operator' | 'guest';
export interface Account {
  id: string;
  role: Role;
  email: string;
  name: string;
  phone: string;
  address: string;
}

declare global {
  namespace Express {
    interface Locals {
      account: Account;
    }
  }
}

const COOKIE = 'picpac_session';
const SESSION_MS = 7 * 24 * 60 * 60 * 1000;
const GUEST: Account = { id: 'guest', role: 'guest', email: '', name: 'Гость', phone: '', address: '' };

function sessionHash(req: Request): string | undefined {
  const entry = req.headers.cookie?.split(';').map(value => value.trim()).find(value => value.startsWith(COOKIE + '='));
  const token = entry?.slice(COOKIE.length + 1);
  return token && /^[A-Za-z0-9_-]{43}$/.test(token) ? hashToken(token) : undefined;
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function readSession(req: Request): Account | null {
  const hash = sessionHash(req);
  if (!hash) return null;
  const session = getDatabase().prepare(`
    SELECT u.id, u.email, u.role, c.name, c.phone, c.address
    FROM auth_sessions s
    LEFT JOIN users u ON s.user_id = u.id
    LEFT JOIN customers c ON c.user_id = u.id
    WHERE s.token_hash = ? AND s.expires_at > ?
    LIMIT 1
  `).get(hash, Date.now()) as Account | undefined;

  if (!session) return null;
  if (!session.id) return GUEST;
  return {
    ...session,
    name: session.name || (session.role === 'operator' ? 'Оператор' : 'Покупатель'),
    phone: session.phone || '',
    address: session.address || ''
  };
}

export function openSession(req: Request, res: Response, userId: string | null): void {
  const db = getDatabase();
  const token = randomBytes(32).toString('base64url');
  const now = Date.now();
  const oldHash = sessionHash(req);
  db.transaction(() => {
    db.prepare('DELETE FROM auth_sessions WHERE expires_at <= ?').run(now);
    if (oldHash) db.prepare('DELETE FROM auth_sessions WHERE token_hash = ?').run(oldHash);
    db.prepare('INSERT INTO auth_sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)')
      .run(hashToken(token), userId, now + SESSION_MS);
  })();
  res.cookie(COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: req.secure, path: '/api', maxAge: SESSION_MS });
}

export function closeSession(req: Request, res: Response): void {
  const hash = sessionHash(req);
  if (hash) getDatabase().prepare('DELETE FROM auth_sessions WHERE token_hash = ?').run(hash);
  res.clearCookie(COOKIE, { httpOnly: true, sameSite: 'lax', secure: req.secure, path: '/api' });
}

function checkRole(roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    res.set('Cache-Control', 'no-store');
    const account = readSession(req);
    if (!account || account.role === 'guest') return res.status(401).json({ error: 'Войдите в аккаунт' });
    if (!roles.includes(account.role)) return res.status(403).json({ error: 'Действие недоступно для этой роли' });
    res.locals.account = account;
    next();
  };
}

export const requireAccount = checkRole(['customer', 'operator']);
export const requireCustomer = checkRole(['customer']);
export const requireOperator = checkRole(['operator']);
