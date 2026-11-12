import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/database';

export const ordersRouter = Router();

// GET /api/orders — Get orders (filtered by user or all for operator)
ordersRouter.get('/orders', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const userId = req.query.userId as string || 'usr-test-customer-001';
    const isOperator = req.query.role === 'operator';

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
        SELECT * FROM order_items WHERE order_id = ?
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
ordersRouter.get('/orders/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const order = db.prepare(`
      SELECT * FROM orders WHERE id = ? OR order_number = ?
    `).get(id, id) as any;

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
        history,
        tickets
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/orders — Create new order with Idempotency-Key support
ordersRouter.post('/orders', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const idempotencyKey = req.headers['idempotency-key'] as string || req.body.idempotencyKey;

    // Idempotency check: if key already exists, return previous response
    if (idempotencyKey) {
      const cached = db.prepare('SELECT * FROM idempotency_keys WHERE key = ?').get(idempotencyKey) as any;
      if (cached && cached.response_body) {
        return res.status(cached.response_code || 200).json(JSON.parse(cached.response_body));
      }
    }

    const {
      userId = 'usr-test-customer-001',
      contactName,
      contactPhone,
      contactEmail,
      deliveryMethod = 'europost',
      deliveryAddress = '',
      items = [],
      promoCode = '',
      comment = ''
    } = req.body;

    if (!items || items.length === 0) {
      res.status(400).json({ success: false, error: 'Корзина пуста' });
      return;
    }

    const orderId = `ord-${uuidv4().slice(0, 8)}`;
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `PP-2026-${randomNum}`;

    let itemsTotal = 0;
    for (const item of items) {
      itemsTotal += Number(item.totalPrice || item.unitPrice * (item.quantity || 1));
    }

    // Delivery cost (Section 15 & docs/pricing_formula.md)
    let deliveryAmount = 0.0;
    if (deliveryMethod === 'courier') deliveryAmount = 8.5;
    else if (deliveryMethod === 'europost') deliveryAmount = 5.0;
    else if (deliveryMethod === 'belpost') deliveryAmount = 5.5;
    else if (deliveryMethod === 'ems') deliveryAmount = 12.0;

    // Promo code check
    let discountAmount = 0.0;
    let promoCodeId: string | null = null;
    if (promoCode) {
      const promo = db.prepare('SELECT * FROM promo_codes WHERE code = ? AND is_active = 1').get(promoCode.toUpperCase()) as any;
      if (promo) {
        promoCodeId = promo.id;
        if (promo.discount_percent > 0) {
          discountAmount = Math.round((itemsTotal * promo.discount_percent / 100) * 100) / 100;
        } else if (promo.discount_fixed > 0) {
          discountAmount = Math.min(itemsTotal, promo.discount_fixed);
        }
      }
    }

    const totalAmount = Math.max(0, Math.round((itemsTotal - discountAmount + deliveryAmount) * 100) / 100);
    const nowIso = new Date().toISOString();

    const runCreateOrder = db.transaction(() => {
      // 1. Insert Order
      db.prepare(`
        INSERT INTO orders (
          id, order_number, user_id, customer_id, idempotency_key, status,
          total_amount, discount_amount, delivery_amount, currency, delivery_method,
          delivery_address, contact_name, contact_phone, contact_email, promo_code_id,
          comment, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        orderId,
        orderNumber,
        userId,
        null,
        idempotencyKey || null,
        'received',
        totalAmount,
        discountAmount,
        deliveryAmount,
        'BYN',
        deliveryMethod,
        deliveryAddress,
        contactName || 'Иван Радкевич',
        contactPhone || '+375 29 123-45-67',
        contactEmail || 'customer@test.by',
        promoCodeId,
        comment,
        nowIso,
        nowIso
      );

      // 2. Insert Order Items
      const insertItemStmt = db.prepare(`
        INSERT INTO order_items (
          id, order_id, product_id, variant_id, project_id, quantity, unit_price, total_price, product_snapshot_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const item of items) {
        insertItemStmt.run(
          uuidv4(),
          orderId,
          item.productId || 'prod-book-classic',
          item.variantId || null,
          item.projectId || null,
          item.quantity || 1,
          item.unitPrice || 0,
          item.totalPrice || 0,
          JSON.stringify(item.snapshot || { title: item.title || 'Позиция PicPac' })
        );
      }

      // 3. Insert Initial Status History
      db.prepare(`
        INSERT INTO order_status_history (id, order_id, status, comment, created_by_user_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        uuidv4(),
        orderId,
        'received',
        'Заказ успешно оформлен и передан в систему PicPac',
        userId,
        nowIso
      );

      // 4. Audit Log
      db.prepare(`
        INSERT INTO audit_logs (id, user_id, timestamp, action, entity_type, entity_id, result, details_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        uuidv4(),
        userId,
        nowIso,
        'order:create',
        'order',
        orderId,
        'success',
        JSON.stringify({ orderNumber, totalAmount, itemsCount: items.length })
      );
    });

    runCreateOrder();

    const responsePayload = {
      success: true,
      message: 'Заказ успешно создан',
      data: {
        id: orderId,
        orderNumber,
        status: 'received',
        totalAmount,
        discountAmount,
        deliveryAmount,
        currency: 'BYN',
        deliveryMethod,
        createdAt: nowIso
      }
    };

    // Cache in idempotency_keys
    if (idempotencyKey) {
      db.prepare(`
        INSERT OR REPLACE INTO idempotency_keys (key, user_id, request_path, request_hash, response_code, response_body, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        idempotencyKey,
        userId,
        '/api/orders',
        idempotencyKey,
        201,
        JSON.stringify(responsePayload),
        nowIso
      );
    }

    res.status(201).json(responsePayload);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/orders/:id/status — Operator changes order status
ordersRouter.patch('/orders/:id/status', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, comment = '', operatorUserId = 'usr-test-operator-001' } = req.body;
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
ordersRouter.get('/support/tickets', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const userId = req.query.userId as string;
    const isOperator = req.query.role === 'operator';

    let tickets: any[];
    if (isOperator || !userId) {
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

    res.json({ success: true, count: tickets.length, data: tickets });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/support/tickets — Create support ticket for order
ordersRouter.post('/support/tickets', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { orderId, userId = 'usr-test-customer-001', subject, message } = req.body;

    if (!subject || !message) {
      res.status(400).json({ success: false, error: 'Укажите тему и текст сообщения' });
      return;
    }

    const ticketId = `tkt-${uuidv4().slice(0, 8)}`;
    const ticketNum = `TCK-${Math.floor(1000 + Math.random() * 9000)}`;
    const nowIso = new Date().toISOString();

    db.prepare(`
      INSERT INTO support_tickets (id, ticket_number, order_id, user_id, subject, message, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(ticketId, ticketNum, orderId || null, userId, subject, message, 'open', nowIso, nowIso);

    // Audit log
    db.prepare(`
      INSERT INTO audit_logs (id, user_id, timestamp, action, entity_type, entity_id, result, details_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      userId,
      nowIso,
      'support:create_ticket',
      'support_ticket',
      ticketId,
      'success',
      JSON.stringify({ ticketNum, orderId, subject })
    );

    res.status(201).json({
      success: true,
      message: 'Обращение зарегистрировано. Оператор свяжется с вами в течение 15 минут.',
      data: {
        id: ticketId,
        ticketNumber: ticketNum,
        subject,
        status: 'open',
        createdAt: nowIso
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/audit-logs — Operator only audit log
ordersRouter.get('/audit-logs', (req: Request, res: Response) => {
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
