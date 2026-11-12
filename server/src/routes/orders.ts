import { createHash } from 'node:crypto';
import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/database';
import { requireAccount, requireCustomer, requireOperator } from '../session';
import { OrderRequestError, priceOrder } from './order-pricing';

export const ordersRouter = Router();

// GET /api/orders — Get orders (filtered by user or all for operator)
ordersRouter.get('/orders', requireAccount, (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { id: userId, role } = res.locals.account;
    const isOperator = role === 'operator';

    let orders: any[];
    if (isOperator) {
      orders = db.prepare(`
        SELECT * FROM orders ORDER BY created_at DESC LIMIT 100
      `).all();
    } else {
      orders = db.prepare(`
        SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 50
      `).all(userId);
    }

    const formattedOrders = orders.map(order => {
      const items = db.prepare(`
        SELECT id, product_id, variant_id, project_id, quantity, unit_price, total_price,
          json_remove(product_snapshot_json, '$.document', '$.photos') AS product_snapshot_json
        FROM order_items WHERE order_id = ?
      `).all(order.id) as any[];

      const history = db.prepare(`
        SELECT * FROM order_status_history WHERE order_id = ? ORDER BY created_at ASC
      `).all(order.id) as any[];

      return {
        id: order.id,
        orderNumber: order.order_number,
        userId: order.user_id,
        customerId: order.customer_id,
        status: order.status,
        totalAmount: order.total_amount,
        discountAmount: order.discount_amount,
        deliveryAmount: order.delivery_amount,
        currency: order.currency,
        deliveryMethod: order.delivery_method,
        deliveryAddress: order.delivery_address,
        contactName: order.contact_name,
        contactPhone: order.contact_phone,
        contactEmail: order.contact_email,
        createdAt: order.created_at,
        updatedAt: order.updated_at,
        itemsCount: items.reduce((acc, i) => acc + (i.quantity || 1), 0),
        items: items.map(i => ({
          id: i.id,
          productId: i.product_id,
          variantId: i.variant_id,
          projectId: i.project_id,
          quantity: i.quantity,
          unitPrice: i.unit_price,
          totalPrice: i.total_price,
          snapshot: i.product_snapshot_json ? JSON.parse(i.product_snapshot_json) : null
        })),
        history: history.map(h => ({
          id: h.id,
          status: h.status,
          comment: h.comment,
          createdAt: h.created_at
        }))
      };
    });

    res.json({ success: true, count: formattedOrders.length, data: formattedOrders });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/orders/:id — Get order by ID or orderNumber
ordersRouter.get('/orders/:id', requireAccount, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const account = res.locals.account;
    const order = db.prepare(`
      SELECT * FROM orders WHERE (id = ? OR order_number = ?) AND (? = 'operator' OR user_id = ?)
    `).get(id, id, account.role, account.id) as any;

    if (!order) {
      res.status(404).json({ success: false, error: 'Заказ не найден' });
      return;
    }

    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id) as any[];
    const history = db.prepare('SELECT * FROM order_status_history WHERE order_id = ? ORDER BY created_at ASC').all(order.id) as any[];
    const tickets = db.prepare('SELECT * FROM support_tickets WHERE order_id = ? ORDER BY created_at DESC').all(order.id) as any[];

    res.json({
      success: true,
      data: {
        id: order.id,
        orderNumber: order.order_number,
        userId: order.user_id,
        customerId: order.customer_id,
        status: order.status,
        totalAmount: order.total_amount,
        discountAmount: order.discount_amount,
        deliveryAmount: order.delivery_amount,
        currency: order.currency,
        deliveryMethod: order.delivery_method,
        deliveryAddress: order.delivery_address,
        contactName: order.contact_name,
        contactPhone: order.contact_phone,
        contactEmail: order.contact_email,
        createdAt: order.created_at,
        updatedAt: order.updated_at,
        items: items.map(i => ({
          id: i.id,
          productId: i.product_id,
          variantId: i.variant_id,
          projectId: i.project_id,
          quantity: i.quantity,
          unitPrice: i.unit_price,
          totalPrice: i.total_price,
          snapshot: i.product_snapshot_json ? JSON.parse(i.product_snapshot_json) : null
        })),
        itemsCount: items.length,
        history: history.map(h => ({
          id: h.id, status: h.status, comment: h.comment, createdAt: h.created_at
        })),
        tickets
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

ordersRouter.post('/orders/quote', (req, res) => {
  try {
    const { quote } = priceOrder(getDatabase(), req.body);
    res.json({ success: true, data: quote });
  } catch (err) {
    if (!(err instanceof OrderRequestError)) console.error('Order quote:', err);
    res.status(err instanceof OrderRequestError ? err.status : 500).json({
      success: false,
      error: err instanceof OrderRequestError ? err.message : 'Не удалось рассчитать стоимость заказа'
    });
  }
});

ordersRouter.post('/orders', requireCustomer, (req, res) => {
  try {
    const db = getDatabase();
    const { idempotencyKey: bodyKey, ...body } = req.body;
    const account = res.locals.account;
    const userId = account.id;
    const idempotencyKey = req.get('Idempotency-Key') || bodyKey;
    if (idempotencyKey != null && (typeof idempotencyKey !== 'string' || idempotencyKey.length > 200)) {
      throw new OrderRequestError('Некорректный ключ заказа');
    }
    const requestHash = createHash('sha256').update(JSON.stringify(body)).digest('hex');

    const submitOrder = db.transaction(() => {
      const {
        contactName, contactPhone, contactEmail,
        deliveryAddress = '', comment = ''
      } = body;

      if (idempotencyKey) {
        const cached = db.prepare(`
          SELECT user_id, request_hash, response_code, response_body FROM idempotency_keys WHERE key = ?
        `).get(idempotencyKey) as {
          user_id: string; request_hash: string; response_code: number; response_body: string;
        } | undefined;
        if (cached?.response_body) {
          if (cached.user_id !== userId ||
              (cached.request_hash !== idempotencyKey && cached.request_hash !== requestHash)) {
            throw new OrderRequestError('Ключ уже использован для другого заказа', 409);
          }
          return { status: cached.response_code || 200, payload: JSON.parse(cached.response_body) };
        }
      }

      if ([contactName, contactPhone, contactEmail, deliveryAddress, comment]
        .some(value => value != null && typeof value !== 'string')) {
        throw new OrderRequestError('Некорректные контактные данные');
      }

      const { items, promoCodeId, quote } = priceOrder(db, body);
      const { deliveryMethod, deliveryAmount, totalAmount, discountAmount } = quote;
      const now = new Date();
      const nowIso = now.toISOString();
      const orderId = `ord-${uuidv4()}`;
      const numberPrefix = `PP-${now.getUTCFullYear()}-`;
      const { latest } = db.prepare(`
        SELECT COALESCE(MAX(CAST(SUBSTR(order_number, ?) AS INTEGER)), 0) AS latest
        FROM orders WHERE order_number LIKE ?
      `).get(numberPrefix.length + 1, numberPrefix + '%') as { latest: number };
      const orderNumber = numberPrefix + String(latest + 1).padStart(4, '0');

      db.prepare(`
        INSERT INTO orders (
          id, order_number, user_id, customer_id, idempotency_key, status,
          total_amount, discount_amount, delivery_amount, currency, delivery_method,
          delivery_address, contact_name, contact_phone, contact_email, promo_code_id,
          comment, created_at, updated_at
        ) VALUES (?, ?, ?, (SELECT id FROM customers WHERE user_id = ? LIMIT 1), ?, 'received',
          ?, ?, ?, 'BYN', ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        orderId, orderNumber, userId, userId, idempotencyKey || null,
        totalAmount, discountAmount, deliveryAmount, deliveryMethod,
        deliveryMethod === 'pickup_minsk' ? '' : deliveryAddress,
        contactName || account.name, contactPhone || account.phone,
        contactEmail || account.email, promoCodeId, comment, nowIso, nowIso
      );

      const insertItem = db.prepare(`
        INSERT INTO order_items (
          id, order_id, product_id, variant_id, project_id, quantity, unit_price, total_price, product_snapshot_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const findProject = db.prepare('SELECT 1 FROM projects WHERE id = ? AND user_id = ? AND product_id = ?');
      for (const item of items) {
        if (item.projectId != null && (typeof item.projectId !== 'string' ||
            !findProject.get(item.projectId, userId, item.productId))) {
          throw new OrderRequestError('Макет не найден для выбранного товара');
        }
        insertItem.run(
          uuidv4(), orderId, item.productId, item.variantId, item.projectId ?? null,
          item.quantity, item.unitPrice, item.totalPrice,
          JSON.stringify(item.snapshot || { title: item.title || 'Позиция PicPac' })
        );
      }

      db.prepare(`
        INSERT INTO order_status_history (id, order_id, status, comment, created_by_user_id, created_at)
        VALUES (?, ?, 'received', ?, ?, ?)
      `).run(uuidv4(), orderId, 'Заказ принят в обработку', userId, nowIso);

      db.prepare(`
        INSERT INTO audit_logs (id, user_id, timestamp, action, entity_type, entity_id, result, details_json)
        VALUES (?, ?, ?, 'order:create', 'order', ?, 'success', ?)
      `).run(uuidv4(), userId, nowIso, orderId, JSON.stringify({ orderNumber, totalAmount, itemsCount: items.length }));

      const payload = {
        success: true,
        message: 'Заказ успешно создан',
        data: {
          id: orderId, orderNumber, status: 'received', totalAmount, discountAmount,
          deliveryAmount, currency: 'BYN', deliveryMethod, createdAt: nowIso
        }
      };
      if (idempotencyKey) {
        db.prepare(`
          INSERT INTO idempotency_keys (key, user_id, request_path, request_hash, response_code, response_body, created_at)
          VALUES (?, ?, '/api/orders', ?, 201, ?, ?)
        `).run(idempotencyKey, userId, requestHash, JSON.stringify(payload), nowIso);
      }
      return { status: 201, payload };
    });

    const { status, payload } = submitOrder.immediate();
    res.status(status).json(payload);
  } catch (err) {
    if (!(err instanceof OrderRequestError)) console.error('Order creation:', err);
    res.status(err instanceof OrderRequestError ? err.status : 500).json({
      success: false,
      error: err instanceof OrderRequestError ? err.message : 'Не удалось оформить заказ'
    });
  }
});

// PATCH /api/orders/:id/status — Operator changes order status
ordersRouter.patch('/orders/:id/status', requireOperator, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, comment = '' } = req.body;
    const operatorUserId = res.locals.account.id;
    const statuses = ['received', 'moderation', 'production', 'ready_for_delivery', 'completed', 'cancelled'];
    if (!statuses.includes(status) || typeof comment !== 'string') {
      return res.status(400).json({ success: false, error: 'Некорректный статус или комментарий' });
    }
    const db = getDatabase();

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as any;
    if (!order) {
      res.status(404).json({ success: false, error: 'Заказ не найден' });
      return;
    }

    const nowIso = new Date().toISOString();

    db.transaction(() => {
      // 1. Update order status
      db.prepare('UPDATE orders SET status = ?, updated_at = ? WHERE id = ?').run(status, nowIso, id);

      // 2. Add history record
      db.prepare(`
        INSERT INTO order_status_history (id, order_id, status, comment, created_by_user_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        uuidv4(),
        id,
        status,
        comment || `Статус изменен оператором на: ${status}`,
        operatorUserId,
        nowIso
      );

      // 3. Audit log
      db.prepare(`
        INSERT INTO audit_logs (id, user_id, timestamp, action, entity_type, entity_id, result, details_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        uuidv4(),
        operatorUserId,
        nowIso,
        'order:status_change',
        'order',
        id,
        'success',
        JSON.stringify({ previousStatus: order.status, newStatus: status, comment })
      );
    })();

    res.json({
      success: true,
      message: 'Статус заказа успешно обновлен',
      data: { id, status, updatedAt: nowIso }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/support/tickets — Get support tickets
ordersRouter.get('/support/tickets', requireAccount, (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { id: userId, role } = res.locals.account;
    const isOperator = role === 'operator';

    let tickets: any[];
    if (isOperator) {
      tickets = db.prepare(`
        SELECT t.*, o.order_number
        FROM support_tickets t
        LEFT JOIN orders o ON t.order_id = o.id
        ORDER BY t.created_at DESC LIMIT 50
      `).all();
    } else {
      tickets = db.prepare(`
        SELECT t.*, o.order_number
        FROM support_tickets t
        LEFT JOIN orders o ON t.order_id = o.id
        WHERE t.user_id = ?
        ORDER BY t.created_at DESC LIMIT 50
      `).all(userId);
    }

    res.json({
      success: true,
      count: tickets.length,
      data: tickets.map(ticket => ({
        ...ticket,
        ticketNumber: ticket.ticket_number,
        orderId: ticket.order_id,
        orderNumber: ticket.order_number,
        createdAt: ticket.created_at
      }))
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/support/tickets — Create support ticket for order
ordersRouter.post('/support/tickets', requireCustomer, (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { orderId, subject, message } = req.body;
    const userId = res.locals.account.id;

    if (typeof subject !== 'string' || !subject.trim() ||
        typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ success: false, error: 'Укажите тему и текст сообщения' });
    }
    if (orderId != null && (typeof orderId !== 'string' ||
        !db.prepare('SELECT 1 FROM orders WHERE id = ? AND user_id = ?').get(orderId, userId))) {
      return res.status(400).json({ success: false, error: 'Заказ не найден' });
    }

    const ticketId = `tkt-${uuidv4()}`;
    const nowIso = new Date().toISOString();

    const ticketNum = db.transaction(() => {
      const { latest } = db.prepare(`
        SELECT COALESCE(MAX(CAST(SUBSTR(ticket_number, 5) AS INTEGER)), 0) AS latest
        FROM support_tickets WHERE ticket_number LIKE 'TCK-%'
      `).get() as { latest: number };
      const ticketNumber = `TCK-${String(latest + 1).padStart(5, '0')}`;

      db.prepare(`
        INSERT INTO support_tickets (id, ticket_number, order_id, user_id, subject, message, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 'open', ?, ?)
      `).run(ticketId, ticketNumber, orderId ?? null, userId, subject.trim(), message.trim(), nowIso, nowIso);

      db.prepare(`
        INSERT INTO audit_logs (id, user_id, timestamp, action, entity_type, entity_id, result, details_json)
        VALUES (?, ?, ?, 'support:create_ticket', 'support_ticket', ?, 'success', ?)
      `).run(uuidv4(), userId, nowIso, ticketId, JSON.stringify({ ticketNumber, orderId, subject: subject.trim() }));

      return ticketNumber;
    }).immediate();

    res.status(201).json({
      success: true,
      message: 'Обращение зарегистрировано.',
      data: {
        id: ticketId,
        ticketNumber: ticketNum,
        subject: subject.trim(),
        status: 'open',
        createdAt: nowIso
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/audit-logs — Operator only audit log
ordersRouter.get('/audit-logs', requireOperator, (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const logs = db.prepare(`
      SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 100
    `).all();

    res.json({ success: true, count: logs.length, data: logs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
