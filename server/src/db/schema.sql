-- picPac.by SQLite Database Schema
-- ООО «Фотопринт» — Mobile PWA Photo Products Order System

PRAGMA foreign_keys = ON;

-- 1. Users table (authentication & roles: customer, operator, guest)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('customer', 'operator', 'guest')),
    created_at TEXT NOT NULL
);

-- 2. Customers table (personal contact and delivery information)
CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT,
    created_at TEXT NOT NULL
);

-- 3. Products catalog (Photo products specifications)
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    base_price REAL NOT NULL, -- in BYN
    currency TEXT NOT NULL DEFAULT 'BYN',
    min_resolution_width INTEGER NOT NULL DEFAULT 1200,
    min_resolution_height INTEGER NOT NULL DEFAULT 1600,
    min_photos INTEGER NOT NULL DEFAULT 1,
    max_photos INTEGER NOT NULL DEFAULT 100,
    production_days INTEGER NOT NULL DEFAULT 3,
    image_url TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
);

-- 4. Product Variants (sizes, formats, materials, finishes)
CREATE TABLE IF NOT EXISTS product_variants (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sku TEXT UNIQUE NOT NULL,
    price_modifier REAL NOT NULL DEFAULT 0.0, -- added to base_price in BYN
    attributes_json TEXT NOT NULL DEFAULT '{}',
    is_default INTEGER NOT NULL DEFAULT 0
);

-- 5. Projects (Drafts created by users, auto-saved from client)
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    guest_token TEXT,
    product_id TEXT NOT NULL REFERENCES products(id),
    variant_id TEXT REFERENCES product_variants(id),
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'ready_for_review', 'in_cart', 'ordered', 'archived')),
    settings_json TEXT NOT NULL DEFAULT '{}',
    client_updated_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 6. Photos attached to projects
CREATE TABLE IF NOT EXISTS photos (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    file_path TEXT NOT NULL,
    thumbnail_path TEXT,
    original_filename TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    slot_index INTEGER NOT NULL DEFAULT 0,
    is_cover INTEGER NOT NULL DEFAULT 0,
    quality_score REAL,
    blur_score REAL,
    phash TEXT,
    ai_analysis_json TEXT,
    created_at TEXT NOT NULL
);

-- 7. Promo codes
CREATE TABLE IF NOT EXISTS promo_codes (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    discount_percent REAL NOT NULL DEFAULT 0.0,
    discount_fixed REAL NOT NULL DEFAULT 0.0, -- BYN
    min_order_amount REAL NOT NULL DEFAULT 0.0, -- BYN
    is_active INTEGER NOT NULL DEFAULT 1,
    expires_at TEXT
);

-- 8. Orders
CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    order_number TEXT UNIQUE NOT NULL,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
    idempotency_key TEXT UNIQUE,
    status TEXT NOT NULL DEFAULT 'received' CHECK(status IN ('received', 'moderation', 'production', 'ready_for_delivery', 'completed', 'cancelled')),
    total_amount REAL NOT NULL, -- BYN
    discount_amount REAL NOT NULL DEFAULT 0.0, -- BYN
    delivery_amount REAL NOT NULL DEFAULT 0.0, -- BYN
    currency TEXT NOT NULL DEFAULT 'BYN',
    delivery_method TEXT NOT NULL CHECK(delivery_method IN ('courier', 'pickup_minsk', 'europost', 'belpost')),
    delivery_address TEXT,
    contact_name TEXT NOT NULL,
    contact_phone TEXT NOT NULL,
    contact_email TEXT NOT NULL,
    promo_code_id TEXT REFERENCES promo_codes(id),
    comment TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 9. Order items
CREATE TABLE IF NOT EXISTS order_items (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES products(id),
    variant_id TEXT REFERENCES product_variants(id),
    project_id TEXT REFERENCES projects(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price REAL NOT NULL,
    total_price REAL NOT NULL,
    product_snapshot_json TEXT NOT NULL
);

-- 10. Order status timeline history (принят → модерация → производство → готов → завершён)
CREATE TABLE IF NOT EXISTS order_status_history (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    comment TEXT,
    created_by_user_id TEXT REFERENCES users(id),
    created_at TEXT NOT NULL
);

-- 11. Support tickets (linked to order)
CREATE TABLE IF NOT EXISTS support_tickets (
    id TEXT PRIMARY KEY,
    ticket_number TEXT UNIQUE NOT NULL,
    order_id TEXT REFERENCES orders(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'in_progress', 'resolved', 'closed')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 12. Audit log
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    timestamp TEXT NOT NULL, -- ISO 8601 with timezone (e.g. 2026-11-11T12:00:00+03:00)
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    result TEXT NOT NULL CHECK(result IN ('success', 'failure')),
    details_json TEXT NOT NULL DEFAULT '{}',
    ip_address TEXT
);

-- 13. Idempotency keys for safe retries
CREATE TABLE IF NOT EXISTS idempotency_keys (
    key TEXT PRIMARY KEY,
    user_id TEXT,
    request_path TEXT NOT NULL,
    request_hash TEXT NOT NULL,
    response_code INTEGER,
    response_body TEXT,
    created_at TEXT NOT NULL,
    locked_until TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_photos_project ON photos(project_id);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_status_history_order ON order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_order ON support_tickets(order_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
