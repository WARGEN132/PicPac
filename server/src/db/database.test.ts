import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { getDatabase } from './database';

test('picPac.by SQLite Database & Schema Verification', async (t) => {
  const db = getDatabase();

  await t.test('database instance is active and WAL mode enabled', () => {
    assert.ok(db, 'Database instance should be initialized');
    const journalMode = db.prepare('PRAGMA journal_mode').get() as any;
    assert.equal(journalMode.journal_mode, 'wal', 'Journal mode should be WAL');
    const fk = db.prepare('PRAGMA foreign_keys').get() as any;
    assert.equal(fk.foreign_keys, 1, 'Foreign keys must be enabled');
  });

  await t.test('catalog has at least 5 products with variants and BYN currency', () => {
    const products = db.prepare('SELECT * FROM products WHERE is_active = 1').all() as any[];
    assert.ok(products.length >= 5, `Expected >= 5 products, got ${products.length}`);

    for (const p of products) {
      assert.equal(p.currency, 'BYN', `Product ${p.slug} must have BYN currency`);
      assert.ok(p.base_price > 0, `Product ${p.slug} must have positive base_price`);
      assert.ok(p.min_resolution_width > 0, 'min_resolution_width must be positive');
      assert.ok(p.min_photos > 0, 'min_photos must be positive');

      const variants = db.prepare('SELECT * FROM product_variants WHERE product_id = ?').all(p.id) as any[];
      assert.ok(variants.length >= 1, `Product ${p.slug} must have at least 1 variant`);
    }
  });

  await t.test('seed data meets hackathon criteria: >= 200 customers, >= 500 orders, >= 300 tickets', () => {
    const customersCount = (db.prepare('SELECT COUNT(*) as cnt FROM customers').get() as any).cnt;
    const ordersCount = (db.prepare('SELECT COUNT(*) as cnt FROM orders').get() as any).cnt;
    const ticketsCount = (db.prepare('SELECT COUNT(*) as cnt FROM support_tickets').get() as any).cnt;

    assert.ok(customersCount >= 200, `Expected >= 200 customers, got ${customersCount}`);
    assert.ok(ordersCount >= 500, `Expected >= 500 orders, got ${ordersCount}`);
    assert.ok(ticketsCount >= 300, `Expected >= 300 support tickets, got ${ticketsCount}`);
  });

  await t.test('required test accounts exist with valid password hashes', () => {
    const customerUser = db.prepare('SELECT * FROM users WHERE email = ?').get('customer@test.by') as any;
    assert.ok(customerUser, 'customer@test.by must exist');
    assert.equal(customerUser.role, 'customer', 'Role must be customer');
    assert.ok(bcrypt.compareSync('Customer123!', customerUser.password_hash), 'Customer123! password must verify');

    const operatorUser = db.prepare('SELECT * FROM users WHERE email = ?').get('operator@test.by') as any;
    assert.ok(operatorUser, 'operator@test.by must exist');
    assert.equal(operatorUser.role, 'operator', 'Role must be operator');
    assert.ok(bcrypt.compareSync('Operator123!', operatorUser.password_hash), 'Operator123! password must verify');
  });

  await t.test('orders have valid status history and BYN amounts', () => {
    const sampleOrder = db.prepare('SELECT * FROM orders LIMIT 1').get() as any;
    assert.ok(sampleOrder, 'Must have at least one sample order');
    assert.equal(sampleOrder.currency, 'BYN');
    assert.ok(sampleOrder.total_amount >= 0);

    const history = db.prepare('SELECT * FROM order_status_history WHERE order_id = ?').all(sampleOrder.id) as any[];
    assert.ok(history.length >= 1, 'Order must have status history entry');
  });
});
