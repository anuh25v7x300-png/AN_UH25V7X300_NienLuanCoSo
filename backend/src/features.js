import { db, one, all, run } from './db.js';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

export const uploadDirectory = resolve(import.meta.dir, '../data/uploads');

export function registerFeatures(app, { requireUser, requireAdmin, fail, clean, safeNumber, productFields, productJoin, issueSession }) {
  app
    .patch('/api/account', ({ request, body }) => {
      const user = requireUser(request), name = clean(body?.name, 100);
      if (name.length < 2) fail(400, 'Họ tên cần ít nhất hai ký tự.');
      run('UPDATE users SET name=? WHERE id=?', name, user.id);
      return { ...user, name };
    })
    .post('/api/account/password', async ({ request, body, set }) => {
      const user = requireUser(request), current = body?.current_password, next = body?.new_password;
      if (typeof current !== 'string' || current.length > 72 || typeof next !== 'string' || next.length < 8 || next.length > 72) fail(400, 'Mật khẩu mới cần 8–72 ký tự.');
      const original = one('SELECT password_hash FROM users WHERE id=?', user.id).password_hash;
      if (!await Bun.password.verify(current, original)) fail(400, 'Mật khẩu hiện tại không đúng.');
      const hash = await Bun.password.hash(next);
      db.transaction(() => {
        if (run('UPDATE users SET password_hash=? WHERE id=? AND password_hash=?', hash, user.id, original).changes !== 1) fail(409, 'Mật khẩu vừa thay đổi. Vui lòng đăng nhập lại.');
        run('DELETE FROM sessions WHERE user_id=?', user.id);
        issueSession(user.id, set);
      })();
      return { ok: true };
    })
    .get('/api/favorites', ({ request }) => {
      const user = requireUser(request);
      return all(`SELECT ${productFields}${productJoin}JOIN favorites f ON f.product_id=p.id WHERE f.user_id=? AND p.active=1 ORDER BY f.created_at DESC`, user.id);
    })
    .put('/api/favorites/:id', ({ request, params }) => {
      const user = requireUser(request), id = safeNumber(params.id);
      if (!one('SELECT id FROM products WHERE id=? AND active=1', id)) fail(404, 'Không tìm thấy sản phẩm.');
      run('INSERT OR IGNORE INTO favorites (user_id,product_id) VALUES (?,?)', user.id, id);
      return { ok: true };
    })
    .delete('/api/favorites/:id', ({ request, params }) => {
      const user = requireUser(request);
      run('DELETE FROM favorites WHERE user_id=? AND product_id=?', user.id, safeNumber(params.id));
      return { ok: true };
    })
    .get('/api/products/:id/reviews', ({ params }) => {
      const id = safeNumber(params.id);
      if (!one('SELECT id FROM products WHERE id=? AND active=1', id)) fail(404, 'Không tìm thấy sản phẩm.');
      return all('SELECT r.id,r.user_id,r.rating,r.comment,r.created_at,u.name FROM reviews r JOIN users u ON u.id=r.user_id WHERE r.product_id=? ORDER BY r.id DESC', id);
    })
    .put('/api/products/:id/review', ({ request, params, body }) => {
      const user = requireUser(request), id = safeNumber(params.id), rating = safeNumber(body?.rating), comment = clean(body?.comment, 1000);
      if (!Number.isInteger(rating) || rating < 1 || rating > 5 || comment.length < 5) fail(400, 'Chọn 1–5 sao và viết nhận xét từ 5 ký tự.');
      if (!one('SELECT id FROM products WHERE id=? AND active=1', id)) fail(404, 'Không tìm thấy sản phẩm.');
      if (!one("SELECT o.id FROM orders o JOIN order_items i ON i.order_id=o.id WHERE o.user_id=? AND o.status='delivered' AND i.product_id=? LIMIT 1", user.id, id)) fail(403, 'Bạn chỉ có thể đánh giá hoa đã mua trong đơn giao thành công.');
      run("INSERT INTO reviews (user_id,product_id,rating,comment) VALUES (?,?,?,?) ON CONFLICT(user_id,product_id) DO UPDATE SET rating=excluded.rating,comment=excluded.comment,created_at=datetime('now')", user.id, id, rating, comment);
      return { ok: true };
    })
    .get('/api/admin/users', ({ request }) => {
      requireAdmin(request);
      return all("SELECT u.id,u.name,u.email,u.role,u.active,u.created_at,COUNT(o.id) AS order_count,COALESCE(SUM(CASE WHEN o.status='delivered' THEN o.subtotal ELSE 0 END),0) AS total_spent FROM users u LEFT JOIN orders o ON o.user_id=u.id GROUP BY u.id ORDER BY u.id DESC");
    })
    .patch('/api/admin/users/:id', ({ request, params, body }) => {
      requireAdmin(request);
      const id = safeNumber(params.id), target = one('SELECT id,role FROM users WHERE id=?', id);
      if (!target) fail(404, 'Không tìm thấy tài khoản.');
      if (target.role !== 'customer') fail(409, 'Chỉ cập nhật trạng thái tài khoản khách hàng.');
      if (![0, 1].includes(body?.active)) fail(400, 'Trạng thái tài khoản không hợp lệ.');
      db.transaction(() => {
        run('UPDATE users SET active=? WHERE id=?', body.active, id);
        if (!body.active) run('DELETE FROM sessions WHERE user_id=?', id);
      })();
      return { ok: true };
    })
    .get('/api/admin/reviews', ({ request }) => {
      requireAdmin(request);
      return all('SELECT r.*,u.name AS customer_name,p.name AS product_name FROM reviews r JOIN users u ON u.id=r.user_id JOIN products p ON p.id=r.product_id ORDER BY r.id DESC');
    })
    .delete('/api/admin/reviews/:id', ({ request, params }) => {
      requireAdmin(request);
      if (!run('DELETE FROM reviews WHERE id=?', safeNumber(params.id)).changes) fail(404, 'Không tìm thấy đánh giá.');
      return { ok: true };
    })
    .get('/api/admin/statistics', ({ request, query }) => {
      requireAdmin(request);
      const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '') && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
      const from = query.from || '2000-01-01', to = query.to || '2099-12-31';
      if (!validDate(from) || !validDate(to) || from > to) fail(400, 'Khoảng ngày thống kê không hợp lệ.');
      const range = "date(o.created_at,'+7 hours') BETWEEN ? AND ?";
      return {
        summary: one(`SELECT COUNT(*) AS orders,COALESCE(SUM(CASE WHEN o.status='delivered' THEN o.subtotal ELSE 0 END),0) AS revenue,COALESCE(SUM(CASE WHEN o.status IN ('new','confirmed','delivering') THEN 1 ELSE 0 END),0) AS processing,COALESCE(SUM(CASE WHEN o.status='cancelled' THEN 1 ELSE 0 END),0) AS cancelled FROM orders o WHERE ${range}`, from, to),
        by_status: all(`SELECT o.status,COUNT(*) AS count FROM orders o WHERE ${range} GROUP BY o.status`, from, to),
        daily: all(`SELECT date(o.created_at,'+7 hours') AS day,SUM(o.subtotal) AS revenue FROM orders o WHERE o.status='delivered' AND ${range} GROUP BY day ORDER BY day`, from, to),
        best_sellers: all(`SELECT i.product_id,i.product_name,SUM(i.quantity) AS quantity,SUM(i.unit_price*i.quantity) AS revenue FROM order_items i JOIN orders o ON o.id=i.order_id WHERE o.status='delivered' AND ${range} GROUP BY i.product_id ORDER BY quantity DESC LIMIT 5`, from, to),
        low_stock: all('SELECT id,name,available_qty FROM products WHERE active=1 AND available_qty<=5 ORDER BY available_qty,id'),
      };
    })
    .post('/api/admin/uploads', async ({ request, body, set }) => {
      requireAdmin(request);
      const file = body?.file;
      if (!(file instanceof File) || file.size < 12 || file.size > 3 * 1024 * 1024) fail(400, 'Chọn ảnh JPG, PNG hoặc WebP tối đa 3 MB.');
      const bytes = new Uint8Array(await file.arrayBuffer());
      let extension;
      if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) extension = 'jpg';
      else if ([137,80,78,71,13,10,26,10].every((value,index) => bytes[index] === value)) extension = 'png';
      else if (new TextDecoder().decode(bytes.slice(0,4)) === 'RIFF' && new TextDecoder().decode(bytes.slice(8,12)) === 'WEBP') extension = 'webp';
      else fail(400, 'Nội dung ảnh không hợp lệ. Chỉ nhận JPG, PNG và WebP.');
      mkdirSync(uploadDirectory, { recursive: true });
      const name = `${randomUUID()}.${extension}`;
      await Bun.write(resolve(uploadDirectory, name), bytes);
      set.status = 201;
      return { image_url: `/api/uploads/${name}` };
    }, { parse: 'multipart/form-data' })
    .get('/api/uploads/:name', async ({ params, set }) => {
      if (!/^[a-f0-9-]{36}\.(jpg|png|webp)$/.test(params.name)) fail(404, 'Không tìm thấy ảnh.');
      const file = Bun.file(resolve(uploadDirectory, params.name));
      if (!await file.exists()) fail(404, 'Không tìm thấy ảnh.');
      set.headers['cache-control'] = 'public, max-age=86400';
      set.headers['x-content-type-options'] = 'nosniff';
      return file;
    });
}
