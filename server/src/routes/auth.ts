import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/database';

export const authRouter = Router();

// POST /api/auth/login — Authenticate user against SQLite
authRouter.post('/auth/login', (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Укажите email и пароль' });
    }

    const db = getDatabase();
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim().toLowerCase()) as any;

    if (!user) {
      return res.status(401).json({ error: 'Пользователь с таким email не найден' });
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Неверный пароль' });
    }

    // Get customer details if exists
    const customer = db.prepare('SELECT * FROM customers WHERE user_id = ?').get(user.id) as any;

    // Log in audit log
    db.prepare(`
      INSERT INTO audit_logs (id, user_id, timestamp, action, entity_type, entity_id, result, details_json, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      user.id,
      new Date().toISOString(),
      'auth:login',
      'user',
      user.id,
      'success',
      JSON.stringify({ role: user.role, email: user.email }),
      req.ip || '127.0.0.1'
    );

    return res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: customer ? customer.name : (user.role === 'operator' ? 'Оператор Анна' : 'Покупатель'),
        phone: customer ? customer.phone : '+375 29 123-45-67',
        address: customer ? customer.address : 'г. Минск, пр-т Победителей, 10'
      }
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Ошибка авторизации на сервере: ' + err.message });
  }
});

// POST /api/auth/register — Register new customer or operator
authRouter.post('/auth/register', (req: Request, res: Response) => {
  try {
    const { email, password, name, phone, address, role = 'customer' } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Заполните обязательные поля: имя, email и пароль' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const db = getDatabase();

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
    if (existing) {
      return res.status(409).json({ error: 'Пользователь с таким email уже зарегистрирован' });
    }

    const userId = `usr-${Date.now()}-${uuidv4().slice(0, 6)}`;
    const customerId = `cust-${Date.now()}-${uuidv4().slice(0, 6)}`;
    const nowIso = new Date().toISOString();
    const passwordHash = bcrypt.hashSync(password, 10);
    const userRole = role === 'operator' ? 'operator' : 'customer';

    const insertUser = db.prepare(`
      INSERT INTO users (id, email, password_hash, role, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    const insertCustomer = db.prepare(`
      INSERT INTO customers (id, user_id, name, phone, address, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    db.transaction(() => {
      insertUser.run(userId, normalizedEmail, passwordHash, userRole, nowIso);
      insertCustomer.run(
        customerId,
        userId,
        name.trim(),
        phone ? phone.trim() : '+375 29 000-00-00',
        address ? address.trim() : 'г. Минск, Беларусь',
        nowIso
      );
    })();

    // Audit log
    db.prepare(`
      INSERT INTO audit_logs (id, user_id, timestamp, action, entity_type, entity_id, result, details_json, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      userId,
      nowIso,
      'auth:register',
      'user',
      userId,
      'success',
      JSON.stringify({ role: userRole, email: normalizedEmail, name }),
      req.ip || '127.0.0.1'
    );

    return res.status(201).json({
      success: true,
      user: {
        id: userId,
        email: normalizedEmail,
        role: userRole,
        name: name.trim(),
        phone: phone || '',
        address: address || ''
      }
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'Ошибка регистрации: ' + err.message });
  }
});

// POST /api/auth/anonymous — Quick guest session with DB persistence
authRouter.post('/auth/anonymous', (req: Request, res: Response) => {
  try {
    const guestId = `usr-guest-${Date.now()}-${uuidv4().slice(0, 6)}`;
    const guestEmail = `guest-${guestId.slice(-6)}@picpac.by`;
    const nowIso = new Date().toISOString();
    const db = getDatabase();

    db.prepare(`
      INSERT INTO users (id, email, password_hash, role, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(guestId, guestEmail, 'anonymous-guest', 'guest', nowIso);

    return res.json({
      success: true,
      user: {
        id: guestId,
        email: guestEmail,
        role: 'guest',
        name: 'Гость (Анонимный режим)',
        phone: '',
        address: ''
      }
    });
  } catch (err: any) {
    console.error('Anonymous auth error:', err);
    return res.status(500).json({ error: 'Ошибка гостевого входа' });
  }
});

// GET /api/auth/test-users — Quick demo accounts list for evaluation
authRouter.get('/auth/test-users', (req: Request, res: Response) => {
  return res.json({
    accounts: [
      {
        role: 'customer',
        roleLabel: 'Обычный покупатель',
        email: 'customer@test.by',
        passwordHint: 'Customer123!',
        name: 'Иван Тестович Радкевич',
        phone: '+375 29 123-45-67',
        description: 'Видит личный кабинет, дорожку доставки заказа, сохранённые черновики и корзину.'
      },
      {
        role: 'operator',
        roleLabel: 'Оператор лаборатории',
        email: 'operator@test.by',
        passwordHint: 'Operator123!',
        name: 'Оператор Анна (Фотопринт)',
        phone: '+375 17 200-11-22',
        description: 'Имеет доступ к очереди заказов, смене производственных статусов и журналу аудита.'
      }
    ]
  });
});
