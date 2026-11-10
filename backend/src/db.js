import { Database } from 'bun:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const dbPath = resolve(import.meta.dir, '..', process.env.DB_PATH || './data/flowers.sqlite');
mkdirSync(dirname(dbPath), { recursive: true });
export const db = new Database(dbPath, { create: true });
db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'customer' CHECK(role IN ('customer','admin')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL REFERENCES categories(id),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  occasion TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL,
  price INTEGER NOT NULL CHECK(price >= 0),
  available_qty INTEGER NOT NULL DEFAULT 0 CHECK(available_qty >= 0),
  featured INTEGER NOT NULL DEFAULT 0 CHECK(featured IN (0,1)),
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  recipient_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  requested_date TEXT NOT NULL,
  card_message TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  subtotal INTEGER NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'cod' CHECK(payment_method IN ('cod','bank_transfer')),
  payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK(payment_status IN ('unpaid','paid')),
  paid_at TEXT,
  payment_bank_name TEXT NOT NULL DEFAULT '',
  payment_account_number TEXT NOT NULL DEFAULT '',
  payment_account_name TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new','confirmed','delivering','delivered','cancelled')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  product_name TEXT NOT NULL,
  unit_price INTEGER NOT NULL,
  quantity INTEGER NOT NULL CHECK(quantity > 0),
  image_url TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS contact_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new','read')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id, active);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id, id DESC);
CREATE INDEX IF NOT EXISTS idx_contact_messages_created ON contact_messages(created_at DESC);
`);

// Existing local databases predate the payment fields. Keep their COD orders.
const orderColumns = new Set(db.query('PRAGMA table_info(orders)').all().map(column => column.name));
for (const [name, definition] of [
  ['payment_method', "TEXT NOT NULL DEFAULT 'cod' CHECK(payment_method IN ('cod','bank_transfer'))"],
  ['payment_status', "TEXT NOT NULL DEFAULT 'unpaid' CHECK(payment_status IN ('unpaid','paid'))"],
  ['paid_at', 'TEXT'],
  ['payment_bank_name', "TEXT NOT NULL DEFAULT ''"],
  ['payment_account_number', "TEXT NOT NULL DEFAULT ''"],
  ['payment_account_name', "TEXT NOT NULL DEFAULT ''"],
]) {
  if (!orderColumns.has(name)) db.exec(`ALTER TABLE orders ADD COLUMN ${name} ${definition}`);
}

export const one = (sql, ...args) => db.query(sql).get(...args);
export const all = (sql, ...args) => db.query(sql).all(...args);
export const run = (sql, ...args) => db.query(sql).run(...args);

if (!db.query('PRAGMA table_info(users)').all().some(column => column.name === 'active')) {
  db.exec('ALTER TABLE users ADD COLUMN active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1))');
}
db.exec(`
CREATE TABLE IF NOT EXISTS favorites (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, product_id)
);
CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
  comment TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, product_id)
);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);
`);
