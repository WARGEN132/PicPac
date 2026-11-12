import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/database';
import { closeSession, openSession, readSession } from '../session';

export const authRouter = Router();
authRouter.use('/auth', (_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

authRouter.get('/auth/me', (req, res) => {
  res.json({ user: readSession(req) });
});

authRouter.post('/auth/login', async (req, res, next) => {
  try {
    const { email, password } = req.body ?? {};
    if (typeof email !== 'string' || !email.trim() ||
        typeof password !== 'string' || !password || Buffer.byteLength(password) > 72) {
      return res.status(400).json({ error: 'Укажите email и пароль' });
    }

    const db = getDatabase();
    const user = db.prepare("SELECT id, password_hash FROM users WHERE email = ? AND role <> 'guest'")
      .get(email.trim().toLowerCase()) as { id: string; password_hash: string } | undefined;
    if (!user || !await bcrypt.compare(password, user.password_hash)) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    const profile = db.prepare(`
      SELECT u.id, u.email, u.role, c.name, c.phone, c.address
      FROM users u LEFT JOIN customers c ON c.user_id = u.id WHERE u.id = ?
    `).get(user.id) as { id: string; email: string; role: string; name?: string; phone?: string; address?: string };
    openSession(req, res, user.id);
    db.prepare(`
      INSERT INTO audit_logs (id, user_id, timestamp, action, entity_type, entity_id, result, ip_address)
      VALUES (?, ?, ?, 'auth:login', 'user', ?, 'success', ?)
    `).run(uuidv4(), user.id, new Date().toISOString(), user.id, req.ip || '127.0.0.1');
    res.json({
      success: true,
      user: {
        ...profile,
        name: profile.name || (profile.role === 'operator' ? 'Оператор' : 'Покупатель'),
        phone: profile.phone || '',
        address: profile.address || ''
      }
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/auth/register', async (req, res, next) => {
  try {
    const { email, password, name, phone = '', address = '' } = req.body ?? {};
    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
        email.trim().length > 254 || typeof name !== 'string' || !name.trim() || name.trim().length > 100 ||
        typeof phone !== 'string' || phone.length > 32 || typeof address !== 'string' || address.length > 300) {
      return res.status(400).json({ error: 'Проверьте имя, email и контактные данные' });
    }
    if (typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password) > 72) {
      return res.status(400).json({ error: 'Пароль должен содержать не менее 8 символов и занимать до 72 байт' });
    }

    const db = getDatabase();
    const normalizedEmail = email.trim().toLowerCase();
    const passwordHash = await bcrypt.hash(password, 10);
    const now = new Date().toISOString();
    const user = {
      id: `usr-${uuidv4()}`,
      email: normalizedEmail,
      role: 'customer',
      name: name.trim(),
      phone: phone.trim(),
      address: address.trim()
    };

    const registered = db.transaction(() => {
      if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(normalizedEmail)) return false;
      db.prepare("INSERT INTO users (id, email, password_hash, role, created_at) VALUES (?, ?, ?, 'customer', ?)")
        .run(user.id, normalizedEmail, passwordHash, now);
      db.prepare('INSERT INTO customers (id, user_id, name, phone, address, created_at) VALUES (?, ?, ?, ?, ?, ?)')
        .run(`cust-${uuidv4()}`, user.id, user.name, user.phone, user.address, now);
      db.prepare(`
        INSERT INTO audit_logs (id, user_id, timestamp, action, entity_type, entity_id, result)
        VALUES (?, ?, ?, 'auth:register', 'user', ?, 'success')
      `).run(uuidv4(), user.id, now, user.id);
      return true;
    }).immediate();

    if (!registered) return res.status(409).json({ error: 'Этот email уже зарегистрирован' });
    openSession(req, res, user.id);
    res.status(201).json({ success: true, user });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/auth/anonymous', (req, res) => {
  openSession(req, res, null);
  res.json({ success: true, user: { id: 'guest', role: 'guest', email: '', name: 'Гость', phone: '', address: '' } });
});

authRouter.post('/auth/logout', (req, res) => {
  closeSession(req, res);
  res.sendStatus(204);
});
