import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import fs from 'node:fs';
import path from 'node:path';

// Seed generator for picPac.by (ООО «Фотопринт»)
export function seedDatabase(db: Database.Database): {
  usersCount: number;
  customersCount: number;
  productsCount: number;
  variantsCount: number;
  ordersCount: number;
  ticketsCount: number;
} {
  console.log('🌱 Starting picPac.by database seeding...');

  // 1. Password hashes for test accounts (using bcrypt)
  const customerPasswordHash = bcrypt.hashSync('Customer123!', 10);
  const operatorPasswordHash = bcrypt.hashSync('Operator123!', 10);
  const generalPasswordHash = bcrypt.hashSync('Password123!', 8); // faster salt for synthetic users

  const nowIso = new Date().toISOString();

  const insertUser = db.prepare(`
    INSERT OR IGNORE INTO users (id, email, password_hash, role, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  const insertCustomer = db.prepare(`
    INSERT OR IGNORE INTO customers (id, user_id, name, phone, address, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertProduct = db.prepare(`
    INSERT OR REPLACE INTO products (
      id, slug, name, category, description, base_price, currency,
      min_resolution_width, min_resolution_height, min_photos, max_photos,
      production_days, image_url, is_active, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertVariant = db.prepare(`
    INSERT OR REPLACE INTO product_variants (
      id, product_id, name, sku, price_modifier, attributes_json, is_default
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertPromo = db.prepare(`
    INSERT OR IGNORE INTO promo_codes (
      id, code, discount_percent, discount_fixed, min_order_amount, is_active, expires_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertOrder = db.prepare(`
    INSERT OR IGNORE INTO orders (
      id, order_number, user_id, customer_id, idempotency_key, status,
      total_amount, discount_amount, delivery_amount, currency, delivery_method,
      delivery_address, contact_name, contact_phone, contact_email, promo_code_id,
      comment, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertOrderItem = db.prepare(`
    INSERT OR IGNORE INTO order_items (
      id, order_id, product_id, variant_id, project_id, quantity,
      unit_price, total_price, product_snapshot_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertStatusHistory = db.prepare(`
    INSERT OR IGNORE INTO order_status_history (
      id, order_id, status, comment, created_by_user_id, created_at
    ) VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertTicket = db.prepare(`
    INSERT OR IGNORE INTO support_tickets (
      id, ticket_number, order_id, user_id, subject, message, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertAudit = db.prepare(`
    INSERT OR IGNORE INTO audit_logs (
      id, user_id, timestamp, action, entity_type, entity_id, result, details_json, ip_address
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Wrap in transaction for speed and atomicity
  const runSeeding = db.transaction(() => {
    // Disable FKs temporarily during full re-seed cleanup
    db.pragma('foreign_keys = OFF');
    db.exec(`
      DELETE FROM order_status_history;
      DELETE FROM order_items;
      DELETE FROM support_tickets;
      DELETE FROM audit_logs;
      DELETE FROM orders;
      DELETE FROM photos;
      DELETE FROM projects;
      DELETE FROM product_variants;
      DELETE FROM products;
      DELETE FROM promo_codes;
      DELETE FROM customers;
      DELETE FROM users;
      DELETE FROM idempotency_keys;
    `);
    db.pragma('foreign_keys = ON');

    // A. 2 Required Test Accounts
    const customerUserId = 'usr-test-customer-001';
    const customerId = 'cust-test-customer-001';
    insertUser.run(customerUserId, 'customer@test.by', customerPasswordHash, 'customer', nowIso);
    insertCustomer.run(customerId, customerUserId, 'Иван Тестович Радкевич', '+375 29 123-45-67', 'г. Минск, пр-т Победителей, 10, кв. 42', nowIso);

    const operatorUserId = 'usr-test-operator-001';
    insertUser.run(operatorUserId, 'operator@test.by', operatorPasswordHash, 'operator', nowIso);
    insertCustomer.run('cust-test-operator-001', operatorUserId, 'Оператор Анна (Фотопринт)', '+375 17 200-11-22', 'г. Минск, ул. Октябрьская, 16 (Лаборатория)', nowIso);

    insertAudit.run(
      uuidv4(),
      operatorUserId,
      nowIso,
      'auth:system_seed',
      'user',
      customerUserId,
      'success',
      JSON.stringify({ note: 'Initialized test accounts' }),
      '127.0.0.1'
    );

    // B. Promo codes
    insertPromo.run('promo-start10', 'START10', 10.0, 0.0, 20.0, 1, '2027-12-31T23:59:59Z');
    insertPromo.run('promo-hackathon', 'HACKATHON', 0.0, 15.0, 50.0, 1, '2027-12-31T23:59:59Z');
    insertPromo.run('promo-picpac5', 'PICPAC5', 0.0, 5.0, 15.0, 1, '2027-12-31T23:59:59Z');

    // C. Products & Variants (from products_seed.json)
    const seedJsonPath = path.resolve(process.cwd(), 'data/products_seed.json');
    let productsList: any[] = [];
    if (fs.existsSync(seedJsonPath)) {
      productsList = JSON.parse(fs.readFileSync(seedJsonPath, 'utf8'));
    }

    const createdVariants: { id: string; productId: string; name: string; price: number }[] = [];

    for (const p of productsList) {
      insertProduct.run(
        p.id,
        p.slug,
        p.name,
        p.category,
        p.description,
        p.base_price,
        p.currency,
        p.min_resolution_width,
        p.min_resolution_height,
        p.min_photos,
        p.max_photos,
        p.production_days,
        p.image_url,
        1,
        nowIso
      );

      for (const v of p.variants) {
        insertVariant.run(
          v.id,
          p.id,
          v.name,
          v.sku,
          v.price_modifier,
          JSON.stringify(v.attributes),
          v.is_default
        );
        createdVariants.push({
          id: v.id,
          productId: p.id,
          name: `${p.name} - ${v.name}`,
          price: p.base_price + v.price_modifier
        });
      }
    }

    // D. Generate >= 200 synthetic customers
    const firstNames = ['Александр', 'Максим', 'Дмитрий', 'Сергей', 'Андрей', 'Алексей', 'Артем', 'Илья', 'Владислав', 'Михаил', 'Никита', 'Евгений', 'Ольга', 'Анна', 'Елена', 'Татьяна', 'Наталья', 'Ирина', 'Юлия', 'Светлана', 'Екатерина', 'Марина', 'Полина', 'Виктория', 'Дарья'];
    const lastNames = ['Ковалёв', 'Иванов', 'Новиков', 'Морозов', 'Козлов', 'Васильев', 'Зайцев', 'Павлов', 'Семёнов', 'Голубев', 'Виноградов', 'Богданов', 'Воробьёв', 'Фёдоров', 'Михайлов', 'Беляев', 'Тарасов', 'Белов', 'Комаров', 'Орлов', 'Киселёв', 'Макаров', 'Андреев', 'Ковалёва', 'Иванова', 'Новикова', 'Морозова', 'Козлова'];
    const cities = [
      { name: 'Минск', streets: ['пр-т Независимости', 'пр-т Победителей', 'ул. Притыцкого', 'ул. Немига', 'ул. Якуба Коласа', 'пр-т Дзержинского'] },
      { name: 'Гомель', streets: ['ул. Советская', 'пр-т Ленина', 'ул. Победы', 'ул. Кирова'] },
      { name: 'Брест', streets: ['ул. Советская', 'бульвар Космонавтов', 'ул. Московская', 'ул. Ленина'] },
      { name: 'Гродно', streets: ['ул. Советская', 'ул. Ожешко', 'ул. Горького', 'ул. Замковая'] },
      { name: 'Витебск', streets: ['ул. Ленина', 'пр-т Фрунзе', 'ул. Суворова', 'пр-т Черняховского'] },
      { name: 'Могилев', streets: ['ул. Первомайская', 'ул. Ленинская', 'пр-т Мира', 'ул. Пионерская'] }
    ];
    const phonePrefixes = ['29', '33', '44', '25'];

    const userCustomerIds: { userId: string; customerId: string; name: string; phone: string; email: string; address: string }[] = [
      {
        userId: customerUserId,
        customerId: customerId,
        name: 'Иван Тестович Радкевич',
        phone: '+375 29 123-45-67',
        email: 'customer@test.by',
        address: 'г. Минск, пр-т Победителей, 10, кв. 42'
      }
    ];

    const TARGET_CUSTOMERS = 220; // >= 200 required
    for (let i = 1; i <= TARGET_CUSTOMERS; i++) {
      const uId = `usr-synth-${String(i).padStart(4, '0')}`;
      const cId = `cust-synth-${String(i).padStart(4, '0')}`;
      const fn = firstNames[i % firstNames.length];
      const ln = lastNames[(i * 3) % lastNames.length];
      const fullName = `${fn} ${ln}`;
      const email = `user${i}@mail.by`;
      const pref = phonePrefixes[i % phonePrefixes.length];
      const phoneNum = `${Math.floor(100 + (i * 7) % 900)}-${Math.floor(10 + (i * 3) % 90)}-${Math.floor(10 + (i * 5) % 90)}`;
      const phone = `+375 ${pref} ${phoneNum}`;
      
      const city = cities[i % cities.length];
      const street = city.streets[(i * 2) % city.streets.length];
      const address = `г. ${city.name}, ${street}, д. ${(i % 120) + 1}, кв. ${(i % 95) + 1}`;

      const createdDate = new Date(Date.now() - (TARGET_CUSTOMERS - i) * 3600 * 1000 * 8).toISOString();

      insertUser.run(uId, email, generalPasswordHash, 'customer', createdDate);
      insertCustomer.run(cId, uId, fullName, phone, address, createdDate);

      userCustomerIds.push({ userId: uId, customerId: cId, name: fullName, phone, email, address });
    }

    // E. Generate >= 500 synthetic orders
    const TARGET_ORDERS = 520; // >= 500 required
    const statuses: ('received' | 'moderation' | 'production' | 'ready_for_delivery' | 'completed' | 'cancelled')[] = [
      'completed', 'completed', 'completed', 'ready_for_delivery', 'production', 'moderation', 'received', 'cancelled'
    ];
    const deliveryMethods: ('courier' | 'pickup_minsk' | 'europost' | 'belpost')[] = [
      'courier', 'pickup_minsk', 'europost', 'belpost'
    ];

    const orderIds: { id: string; userId: string; orderNumber: string }[] = [];

    for (let i = 1; i <= TARGET_ORDERS; i++) {
      const orderId = `ord-synth-${String(i).padStart(5, '0')}`;
      const orderNum = `PP-2026-${String(i + 1000).padStart(6, '0')}`;
      const userIdx = i % userCustomerIds.length;
      const user = userCustomerIds[userIdx];
      const status = statuses[i % statuses.length];
      const deliveryMethod = deliveryMethods[i % deliveryMethods.length];

      // Delivery cost
      const deliveryAmount = deliveryMethod === 'pickup_minsk' ? 0.0 : deliveryMethod === 'courier' ? 8.5 : 5.0;

      // Select 1 to 3 items
      const itemsCount = 1 + (i % 2);
      let itemsTotal = 0;
      const itemsToInsert: { variant: typeof createdVariants[0]; qty: number; unitPrice: number; totalPrice: number }[] = [];

      for (let j = 0; j < itemsCount; j++) {
        const v = createdVariants[(i + j) % createdVariants.length];
        const qty = v.productId === 'prod-photo-prints' ? 20 + (i % 30) : 1 + (i % 2);
        const unitPrice = v.price;
        const lineTotal = Math.round(unitPrice * qty * 100) / 100;
        itemsTotal += lineTotal;
        itemsToInsert.push({ variant: v, qty, unitPrice, totalPrice: lineTotal });
      }

      // Promo discount
      let discountAmount = 0;
      let promoId: string | null = null;
      if (i % 7 === 0) {
        promoId = 'promo-start10';
        discountAmount = Math.round(itemsTotal * 0.1 * 100) / 100;
      }

      const totalAmount = Math.max(0, Math.round((itemsTotal - discountAmount + deliveryAmount) * 100) / 100);
      const daysAgo = Math.floor((TARGET_ORDERS - i) / 10);
      const orderDate = new Date(Date.now() - (daysAgo * 86400000) - (i % 24) * 3600000).toISOString();
      const updateDate = new Date(Date.parse(orderDate) + 3600000 * 4).toISOString();

      insertOrder.run(
        orderId,
        orderNum,
        user.userId,
        user.customerId,
        `idemp-${orderId}`,
        status,
        totalAmount,
        discountAmount,
        deliveryAmount,
        'BYN',
        deliveryMethod,
        user.address,
        user.name,
        user.phone,
        user.email,
        promoId,
        i % 5 === 0 ? 'Позвонить за час до доставки' : null,
        orderDate,
        updateDate
      );

      orderIds.push({ id: orderId, userId: user.userId, orderNumber: orderNum });

      // Insert Order Items
      for (const item of itemsToInsert) {
        insertOrderItem.run(
          uuidv4(),
          orderId,
          item.variant.productId,
          item.variant.id,
          null, // project_id
          item.qty,
          item.unitPrice,
          item.totalPrice,
          JSON.stringify({
            title: item.variant.name,
            sku: item.variant.id,
            price: item.unitPrice,
            currency: 'BYN'
          })
        );
      }

      // Status history timeline
      const statusSteps: { status: string; comment: string; offsetHours: number }[] = [
        { status: 'received', comment: 'Заказ успешно принят в обработку', offsetHours: 0 }
      ];

      if (['moderation', 'production', 'ready_for_delivery', 'completed'].includes(status)) {
        statusSteps.push({ status: 'moderation', comment: 'Макет проверен оператором печатного цеха', offsetHours: 2 });
      }
      if (['production', 'ready_for_delivery', 'completed'].includes(status)) {
        statusSteps.push({ status: 'production', comment: 'Заказ отправлен на печать и сборку', offsetHours: 8 });
      }
      if (['ready_for_delivery', 'completed'].includes(status)) {
        statusSteps.push({ status: 'ready_for_delivery', comment: deliveryMethod === 'pickup_minsk' ? 'Готов к выдаче в пункте самовывоза' : 'Передан курьерской службе', offsetHours: 24 });
      }
      if (status === 'completed') {
        statusSteps.push({ status: 'completed', comment: 'Заказ успешно вручен клиенту', offsetHours: 36 });
      }
      if (status === 'cancelled') {
        statusSteps.push({ status: 'cancelled', comment: 'Заказ отменён по согласованию с клиентом', offsetHours: 3 });
      }

      for (const step of statusSteps) {
        const stepTime = new Date(Date.parse(orderDate) + step.offsetHours * 3600000).toISOString();
        insertStatusHistory.run(
          uuidv4(),
          orderId,
          step.status,
          step.comment,
          operatorUserId,
          stepTime
        );
      }
    }

    // F. Generate >= 300 support tickets linked to orders
    const TARGET_TICKETS = 310; // >= 300 required
    const ticketSubjects = [
      'Уточнение по срокам готовности заказа',
      'Возможность замены адреса доставки курьером',
      'Вопрос по калибровке цвета и контрасту фотокниги',
      'Просьба упаковать заказ в подарочный крафт-бокс',
      'Добавление дополнительного листа к календарю',
      'Согласование времени самовывоза на Октябрьской',
      'Вопрос по разрешению загруженных мобильных фото',
      'Повторный заказ предыдущего фотохолста'
    ];
    const ticketStatuses: ('open' | 'in_progress' | 'resolved' | 'closed')[] = [
      'resolved', 'resolved', 'closed', 'in_progress', 'open'
    ];

    for (let i = 1; i <= TARGET_TICKETS; i++) {
      const ticketId = `tkt-synth-${String(i).padStart(5, '0')}`;
      const ticketNum = `TCK-${String(i + 2000).padStart(5, '0')}`;
      const order = orderIds[i % orderIds.length];
      const subject = ticketSubjects[i % ticketSubjects.length];
      const tStatus = ticketStatuses[i % ticketStatuses.length];

      const ticketDate = new Date(Date.now() - (TARGET_TICKETS - i) * 3600000 * 5).toISOString();

      insertTicket.run(
        ticketId,
        ticketNum,
        order.id,
        order.userId,
        subject,
        `Здравствуйте! По заказу #${order.orderNumber}: ${subject.toLowerCase()}. Пожалуйста, подскажите статус.`,
        tStatus,
        ticketDate,
        ticketDate
      );
    }

    // G. Audit log for seeding completion
    insertAudit.run(
      uuidv4(),
      operatorUserId,
      new Date().toISOString(),
      'system:seed_complete',
      'database',
      'picpac.db',
      'success',
      JSON.stringify({
        seeded: {
          testAccounts: 2,
          customers: TARGET_CUSTOMERS + 1,
          orders: TARGET_ORDERS,
          tickets: TARGET_TICKETS,
          products: productsList.length
        }
      }),
      '127.0.0.1'
    );
  });

  runSeeding();

  const counts = {
    usersCount: (db.prepare('SELECT COUNT(*) as count FROM users').get() as any).count,
    customersCount: (db.prepare('SELECT COUNT(*) as count FROM customers').get() as any).count,
    productsCount: (db.prepare('SELECT COUNT(*) as count FROM products').get() as any).count,
    variantsCount: (db.prepare('SELECT COUNT(*) as count FROM product_variants').get() as any).count,
    ordersCount: (db.prepare('SELECT COUNT(*) as count FROM orders').get() as any).count,
    ticketsCount: (db.prepare('SELECT COUNT(*) as count FROM support_tickets').get() as any).count
  };

  console.log('✅ picPac.by database successfully seeded:', counts);
  return counts;
}

// Standalone execution support
if (import.meta.url === `file://${process.argv[1]}`) {
  const dbPath = path.resolve(process.cwd(), 'data/picpac.db');
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  const schemaPath = path.resolve(process.cwd(), 'server/src/db/schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schemaSql);

  seedDatabase(db);
  db.close();
}
