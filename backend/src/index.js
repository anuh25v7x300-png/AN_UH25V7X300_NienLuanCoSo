import { Elysia } from 'elysia';
import { createHash, randomBytes } from 'node:crypto';
import { db, one, all, run } from './db.js';
import { registerFeatures } from './features.js';

class ApiError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const fail = (status, message) => { throw new ApiError(status, message); };
const clean = (value, max = 255) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const emailOf = (value) => clean(value, 254).toLowerCase();
const tokenHash = (token) => createHash('sha256').update(token).digest('hex');
const cookie = (request) => (request.headers.get('cookie') || '').split(';').map(x => x.trim()).find(x => x.startsWith('flower_session='))?.slice(15) || '';
const sessionUser = (request) => {
  const token = cookie(request);
  if (!token) return null;
  return one("SELECT u.id,u.name,u.email,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND datetime(s.expires_at)>datetime('now') AND u.active=1", tokenHash(token)) || null;
};
const requireUser = (request) => sessionUser(request) || fail(401, 'Vui lòng đăng nhập.');
const requireAdmin = (request) => { const user = requireUser(request); if (user.role !== 'admin') fail(403, 'Bạn không có quyền quản trị.'); return user; };
const sessionCookie = (token, age) => `flower_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${age}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
const issueSession = (userId, set) => {
  const token = randomBytes(32).toString('hex');
  const expiry = new Date(Date.now() + 7 * 86400000).toISOString();
  run('INSERT INTO sessions (token_hash,user_id,expires_at) VALUES (?,?,?)', tokenHash(token), userId, expiry);
  set.headers['set-cookie'] = sessionCookie(token, 604800);
};
const productFields = 'p.id,p.name,p.slug,p.description,p.occasion,p.image_url,p.price,p.available_qty,p.featured,p.active,p.category_id,c.name AS category_name,c.slug AS category_slug';
const productJoin = ' FROM products p JOIN categories c ON c.id=p.category_id ';
const orderDetails = (id) => {
  const order = one('SELECT * FROM orders WHERE id=?', id);
  if (!order) return null;
  return { ...order, items: all('SELECT product_id,product_name,unit_price,quantity,image_url FROM order_items WHERE order_id=?', id) };
};
const validDate = (date) => /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(`${date}T00:00:00Z`)) && new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) === date;
const todayVN = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const safeNumber = (v) => (typeof v === 'number' || (typeof v === 'string' && /^\d+$/.test(v))) && Number.isSafeInteger(Number(v)) ? Number(v) : NaN;
const bankAccount = () => {
  const bank_name = clean(process.env.BANK_NAME, 100);
  const account_number = clean(process.env.BANK_ACCOUNT_NUMBER, 40);
  const account_name = clean(process.env.BANK_ACCOUNT_NAME, 100);
  return bank_name && account_number && account_name ? { bank_name, account_number, account_name } : null;
};
const cancelOrder = (id, allowedStatuses, allowBankTransfer = false) => db.transaction(() => {
  const order = one('SELECT * FROM orders WHERE id=?', id);
  if (!order) fail(404, 'Không tìm thấy đơn hàng.');
  if (!allowedStatuses.includes(order.status) || order.payment_status === 'paid' || (order.payment_method === 'bank_transfer' && !allowBankTransfer)) fail(409, 'Đơn hàng này không thể hủy trực tuyến. Vui lòng liên hệ cửa hàng.');
  for (const item of all('SELECT product_id,quantity FROM order_items WHERE order_id=?', id)) {
    run('UPDATE products SET available_qty=available_qty+? WHERE id=?', item.quantity, item.product_id);
  }
  run("UPDATE orders SET status='cancelled' WHERE id=?", id);
  return orderDetails(id);
})();

const app = new Elysia()
  .onError(({ code, error, set }) => {
    if (error instanceof ApiError) { set.status = error.status; return { error: error.message }; }
    if (code === 'NOT_FOUND') { set.status = 404; return { error: 'Không tìm thấy đường dẫn.' }; }
    if (code === 'VALIDATION' || code === 'PARSE') { set.status = 400; return { error: 'Dữ liệu gửi lên không hợp lệ.' }; }
    console.error(error);
    set.status = 500;
    return { error: 'Máy chủ gặp lỗi. Vui lòng thử lại.' };
  })
  .get('/api/health', () => ({ ok: true }))
  .get('/api/categories', () => all('SELECT id,name,slug FROM categories ORDER BY id'))
  .get('/api/payment-methods', () => ({ cod: true, bank_transfer: bankAccount() }))
  .get('/api/products', ({ query }) => {
    const filters = ['p.active=1'];
    const args = [];
    if (query.category) { filters.push('c.slug=?'); args.push(clean(query.category, 80)); }
    if (query.search) { filters.push("(p.name LIKE ? ESCAPE '!' OR p.description LIKE ? ESCAPE '!')"); const term = `%${clean(query.search, 100).replace(/[!%_]/g, '!$&')}%`; args.push(term, term); }
    if (query.featured === '1') filters.push('p.featured=1');
    if (query.in_stock === '1') filters.push('p.available_qty>0');
    for (const [key, op] of [['min_price', '>='], ['max_price', '<=']]) {
      if (query[key] !== undefined) {
        const price = safeNumber(query[key]);
        if (!Number.isInteger(price) || price < 0 || price > 100000000) fail(400, 'Khoảng giá không hợp lệ.');
        filters.push(`p.price${op}?`);
        args.push(price);
      }
    }
    if (query.min_price !== undefined && query.max_price !== undefined && Number(query.min_price) > Number(query.max_price)) fail(400, 'Khoảng giá không hợp lệ.');
    const sort = query.sort === 'price-asc' ? 'p.price ASC' : query.sort === 'price-desc' ? 'p.price DESC' : 'p.id DESC';
    const sql = `SELECT ${productFields}${productJoin}WHERE ${filters.join(' AND ')} ORDER BY ${sort} LIMIT 100`;
    return all(sql, ...args);
  })
  .get('/api/products/:id', ({ params }) => one(`SELECT ${productFields}${productJoin}WHERE p.id=? AND p.active=1`, safeNumber(params.id)) || fail(404, 'Không tìm thấy sản phẩm.'))
  .post('/api/contact', ({ body, set }) => {
    const name = clean(body?.name, 100), email = emailOf(body?.email);
    const subject = clean(body?.subject, 100), message = clean(body?.message, 2000);
    if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || subject.length < 3 || message.length < 10) fail(400, 'Vui lòng nhập đầy đủ họ tên, email, chủ đề và lời nhắn.');
    const recent = one("SELECT count(*) AS n FROM contact_messages WHERE email=? AND created_at>datetime('now','-1 hour')", email).n;
    if (recent >= 5) fail(429, 'Bạn đã gửi nhiều lời nhắn. Vui lòng thử lại sau.');
    const result = run('INSERT INTO contact_messages (name,email,subject,message) VALUES (?,?,?,?)', name, email, subject, message);
    set.status = 201;
    return { id: Number(result.lastInsertRowid), message: 'Tiệm đã nhận lời nhắn của bạn.' };
  })
  .post('/api/auth/register', async ({ body, set }) => {
    const name = clean(body?.name, 100), email = emailOf(body?.email), password = body?.password;
    if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || typeof password !== 'string' || password.length < 8 || password.length > 72) fail(400, 'Vui lòng nhập tên, email và mật khẩu 8–72 ký tự hợp lệ.');
    if (one('SELECT id FROM users WHERE email=?', email)) fail(409, 'Email đã được đăng ký.');
    const hash = await Bun.password.hash(password);
    if (one('SELECT id FROM users WHERE email=?', email)) fail(409, 'Email đã được đăng ký.');
    const result = run('INSERT INTO users (name,email,password_hash) VALUES (?,?,?)', name, email, hash);
    issueSession(Number(result.lastInsertRowid), set);
    set.status = 201;
    return { id: Number(result.lastInsertRowid), name, email, role: 'customer' };
  })
  .post('/api/auth/login', async ({ body, set }) => {
    const user = one('SELECT * FROM users WHERE email=?', emailOf(body?.email));
    if (!user || !user.active || typeof body?.password !== 'string' || body.password.length > 72 || !await Bun.password.verify(body.password, user.password_hash)) fail(401, 'Email hoặc mật khẩu không đúng.');
    issueSession(user.id, set);
    return { id: user.id, name: user.name, email: user.email, role: user.role };
  })
  .post('/api/auth/logout', ({ request, set }) => {
    const token = cookie(request);
    if (token) run('DELETE FROM sessions WHERE token_hash=?', tokenHash(token));
    set.headers['set-cookie'] = sessionCookie('', 0);
    return { ok: true };
  })
  .get('/api/auth/me', ({ request }) => Response.json(sessionUser(request)))
  .post('/api/orders', ({ request, body, set }) => {
    const user = requireUser(request);
    const paymentMethod = body?.payment_method || 'cod';
    const bank = bankAccount();
    if (!['cod', 'bank_transfer'].includes(paymentMethod) || (paymentMethod === 'bank_transfer' && !bank)) fail(400, 'Phương thức thanh toán không khả dụng.');
    const recipient = clean(body?.recipient_name, 100), phone = clean(body?.phone, 20), address = clean(body?.address, 300);
    const date = clean(body?.requested_date, 10), card = clean(body?.card_message, 300), note = clean(body?.note, 300);
    if (recipient.length < 2 || !/^0\d{9,10}$/.test(phone) || address.length < 8 || !validDate(date) || date < todayVN()) fail(400, 'Thông tin người nhận hoặc ngày nhận không hợp lệ.');
    if (!Array.isArray(body?.items) || body.items.length < 1 || body.items.length > 30) fail(400, 'Giỏ hàng không hợp lệ.');
    const ids = new Set();
    const items = body.items.map(item => {
      const id = safeNumber(item?.product_id), quantity = safeNumber(item?.quantity);
      if (!Number.isInteger(id) || !Number.isInteger(quantity) || id < 1 || quantity < 1 || quantity > 50 || ids.has(id)) fail(400, 'Sản phẩm hoặc số lượng không hợp lệ.');
      ids.add(id);
      return { id, quantity };
    });
    const create = db.transaction(() => {
      const selected = items.map(item => {
        const product = one('SELECT id,name,price,available_qty,image_url FROM products WHERE id=? AND active=1', item.id);
        if (!product || product.available_qty < item.quantity) fail(409, 'Một sản phẩm đã hết hoặc không đủ số lượng nhận đặt. Vui lòng kiểm tra lại giỏ.');
        return { ...product, quantity: item.quantity };
      });
      const subtotal = selected.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const result = run('INSERT INTO orders (user_id,recipient_name,phone,address,requested_date,card_message,note,subtotal,payment_method,payment_bank_name,payment_account_number,payment_account_name) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)', user.id, recipient, phone, address, date, card, note, subtotal, paymentMethod, bank && paymentMethod === 'bank_transfer' ? bank.bank_name : '', bank && paymentMethod === 'bank_transfer' ? bank.account_number : '', bank && paymentMethod === 'bank_transfer' ? bank.account_name : '');
      const orderId = Number(result.lastInsertRowid);
      for (const item of selected) {
        const updated = run('UPDATE products SET available_qty=available_qty-? WHERE id=? AND available_qty>=?', item.quantity, item.id, item.quantity);
        if (updated.changes !== 1) fail(409, 'Số lượng nhận đặt vừa thay đổi. Vui lòng thử lại.');
        run('INSERT INTO order_items (order_id,product_id,product_name,unit_price,quantity,image_url) VALUES (?,?,?,?,?,?)', orderId, item.id, item.name, item.price, item.quantity, item.image_url);
      }
      return orderDetails(orderId);
    });
    set.status = 201;
    return create();
  })
  .get('/api/orders', ({ request }) => {
    const user = requireUser(request);
    return all('SELECT id,recipient_name,requested_date,subtotal,status,payment_method,payment_status,created_at FROM orders WHERE user_id=? ORDER BY id DESC', user.id);
  })
  .get('/api/orders/:id', ({ request, params }) => {
    const user = requireUser(request), order = orderDetails(safeNumber(params.id));
    if (!order || (user.role !== 'admin' && order.user_id !== user.id)) fail(404, 'Không tìm thấy đơn hàng.');
    return order;
  })
  .post('/api/orders/:id/cancel', ({ request, params }) => {
    const user = requireUser(request);
    const id = safeNumber(params.id);
    const order = one('SELECT user_id FROM orders WHERE id=?', id);
    if (!order || order.user_id !== user.id) fail(404, 'Không tìm thấy đơn hàng.');
    return cancelOrder(id, ['new']);
  })
  .get('/api/admin/products', ({ request }) => { requireAdmin(request); return all(`SELECT ${productFields}${productJoin}ORDER BY p.id DESC`); })
  .post('/api/admin/categories', ({ request, body, set }) => {
    requireAdmin(request);
    const name = clean(body?.name, 80), slug = clean(body?.slug, 80).toLowerCase();
    if (name.length < 2 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) fail(400, 'Tên hoặc đường dẫn danh mục không hợp lệ.');
    if (one('SELECT id FROM categories WHERE name=? OR slug=?', name, slug)) fail(409, 'Danh mục đã tồn tại.');
    const result = run('INSERT INTO categories (name,slug) VALUES (?,?)', name, slug);
    set.status = 201;
    return one('SELECT id,name,slug FROM categories WHERE id=?', Number(result.lastInsertRowid));
  })
  .patch('/api/admin/categories/:id', ({ request, params, body }) => {
    requireAdmin(request);
    const id = safeNumber(params.id), name = clean(body?.name, 80), slug = clean(body?.slug, 80).toLowerCase();
    if (!one('SELECT id FROM categories WHERE id=?', id)) fail(404, 'Không tìm thấy danh mục.');
    if (name.length < 2 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) fail(400, 'Tên hoặc đường dẫn danh mục không hợp lệ.');
    if (one('SELECT id FROM categories WHERE (name=? OR slug=?) AND id<>?', name, slug, id)) fail(409, 'Danh mục đã tồn tại.');
    run('UPDATE categories SET name=?,slug=? WHERE id=?', name, slug, id);
    return one('SELECT id,name,slug FROM categories WHERE id=?', id);
  })
  .delete('/api/admin/categories/:id', ({ request, params }) => {
    requireAdmin(request);
    const id = safeNumber(params.id);
    if (!one('SELECT id FROM categories WHERE id=?', id)) fail(404, 'Không tìm thấy danh mục.');
    if (one('SELECT id FROM products WHERE category_id=? LIMIT 1', id)) fail(409, 'Danh mục đang có sản phẩm. Hãy chuyển sản phẩm trước khi xóa.');
    run('DELETE FROM categories WHERE id=?', id);
    return { ok: true };
  })
  .post('/api/admin/products', ({ request, body, set }) => {
    requireAdmin(request);
    const data = validateProduct(body);
    if (one('SELECT id FROM products WHERE slug=?', data.slug)) fail(409, 'Đường dẫn sản phẩm đã tồn tại.');
    const result = run('INSERT INTO products (category_id,name,slug,description,occasion,image_url,price,available_qty,featured,active) VALUES (?,?,?,?,?,?,?,?,?,?)', ...Object.values(data));
    set.status = 201;
    return one(`SELECT ${productFields}${productJoin}WHERE p.id=?`, Number(result.lastInsertRowid));
  })
  .patch('/api/admin/products/:id', ({ request, body, params }) => {
    requireAdmin(request);
    const id = safeNumber(params.id);
    const current = one('SELECT id,available_qty FROM products WHERE id=?', id);
    if (!current) fail(404, 'Không tìm thấy sản phẩm.');
    if (safeNumber(body?.expected_qty) !== current.available_qty) fail(409, 'Số lượng nhận đặt đã thay đổi. Hãy tải lại sản phẩm trước khi lưu.');
    const data = validateProduct(body);
    if (one('SELECT id FROM products WHERE slug=? AND id<>?', data.slug, id)) fail(409, 'Đường dẫn sản phẩm đã tồn tại.');
    run('UPDATE products SET category_id=?,name=?,slug=?,description=?,occasion=?,image_url=?,price=?,available_qty=?,featured=?,active=? WHERE id=?', ...Object.values(data), id);
    return one(`SELECT ${productFields}${productJoin}WHERE p.id=?`, id);
  })
  .get('/api/admin/orders', ({ request }) => { requireAdmin(request); return all('SELECT o.id,o.recipient_name,o.phone,o.requested_date,o.subtotal,o.status,o.payment_method,o.payment_status,o.created_at,u.name AS customer_name FROM orders o JOIN users u ON u.id=o.user_id ORDER BY o.id DESC'); })
  .post('/api/admin/orders/:id/mark-paid', ({ request, params }) => {
    requireAdmin(request);
    const id = safeNumber(params.id);
    const order = one('SELECT payment_method,payment_status,status FROM orders WHERE id=?', id);
    if (!order) fail(404, 'Không tìm thấy đơn hàng.');
    if (order.payment_method !== 'bank_transfer' || order.payment_status !== 'unpaid' || order.status === 'cancelled') fail(409, 'Không thể xác nhận thanh toán cho đơn này.');
    run("UPDATE orders SET payment_status='paid',paid_at=datetime('now') WHERE id=?", id);
    return orderDetails(id);
  })
  .get('/api/admin/messages', ({ request }) => { requireAdmin(request); return all('SELECT id,name,email,subject,message,status,created_at FROM contact_messages ORDER BY id DESC LIMIT 200'); })
  .patch('/api/admin/messages/:id', ({ request, params, body }) => {
    requireAdmin(request);
    const id = safeNumber(params.id), status = clean(body?.status, 10);
    if (!['new', 'read'].includes(status)) fail(400, 'Trạng thái lời nhắn không hợp lệ.');
    if (!one('SELECT id FROM contact_messages WHERE id=?', id)) fail(404, 'Không tìm thấy lời nhắn.');
    run('UPDATE contact_messages SET status=? WHERE id=?', status, id);
    return one('SELECT id,name,email,subject,message,status,created_at FROM contact_messages WHERE id=?', id);
  })
  .patch('/api/admin/orders/:id/status', ({ request, params, body }) => {
    requireAdmin(request);
    const id = safeNumber(params.id), next = clean(body?.status, 20);
    const transitions = { new: ['confirmed', 'cancelled'], confirmed: ['delivering', 'cancelled'], delivering: ['delivered'], delivered: [], cancelled: [] };
    if (next === 'cancelled') return cancelOrder(id, ['new', 'confirmed'], true);
    const change = db.transaction(() => {
      const order = one('SELECT * FROM orders WHERE id=?', id);
      if (!order) fail(404, 'Không tìm thấy đơn hàng.');
      if (!transitions[order.status].includes(next)) fail(409, 'Không thể chuyển sang trạng thái này.');
      if (next === 'delivering' && order.payment_method === 'bank_transfer' && order.payment_status !== 'paid') fail(409, 'Cần xác nhận đã nhận chuyển khoản trước khi giao.');
      run("UPDATE orders SET status=?,payment_status=CASE WHEN ?='delivered' AND payment_method='cod' THEN 'paid' ELSE payment_status END,paid_at=CASE WHEN ?='delivered' AND payment_method='cod' THEN datetime('now') ELSE paid_at END WHERE id=?", next, next, next, id);
      return orderDetails(id);
    });
    return change();
  });

function validateProduct(body) {
  const category_id = safeNumber(body?.category_id), name = clean(body?.name, 120), slug = clean(body?.slug, 120).toLowerCase();
  const description = clean(body?.description, 2000), occasion = clean(body?.occasion, 100), image_url = clean(body?.image_url, 500);
  const price = safeNumber(body?.price), available_qty = safeNumber(body?.available_qty);
  const featured = body?.featured ? 1 : 0, active = body?.active === false || body?.active === 0 ? 0 : 1;
  if (!one('SELECT id FROM categories WHERE id=?', category_id) || name.length < 2 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || !/^\/(?:images\/[a-zA-Z0-9_-]+\.(?:png|jpg|jpeg|webp)|api\/uploads\/[a-f0-9-]{36}\.(?:jpg|png|webp))$/.test(image_url) || !Number.isInteger(price) || price < 0 || price > 100000000 || !Number.isInteger(available_qty) || available_qty < 0 || available_qty > 100000) fail(400, 'Thông tin sản phẩm không hợp lệ.');
  return { category_id, name, slug, description, occasion, image_url, price, available_qty, featured, active };
}

registerFeatures(app, { requireUser, requireAdmin, fail, clean, safeNumber, productFields, productJoin, issueSession });
if (import.meta.main) app.listen(Number(process.env.PORT || 3001));
export default app;
