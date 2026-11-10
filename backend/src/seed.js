import { db, one, run } from './db.js';

const categories = [
  ['Hoa sinh nhật', 'hoa-sinh-nhat'],
  ['Hoa tình yêu', 'hoa-tinh-yeu'],
  ['Hoa chúc mừng', 'hoa-chuc-mung'],
];
for (const [name, slug] of categories) {
  run('INSERT OR IGNORE INTO categories (name,slug) VALUES (?,?)', name, slug);
}

const products = [
  ['Mộng Mơ', 'mong-mo', 'Hoa sinh nhật', 'Bó hoa tông hồng phấn dịu dàng, dành cho những lời chúc thật riêng.', 'Sinh nhật', '/images/hoa-mong-mo.webp', 420000, 12, 1],
  ['Nắng Mai', 'nang-mai', 'Hoa chúc mừng', 'Sắc vàng tươi vui cho một khởi đầu rạng rỡ.', 'Chúc mừng', '/images/nang-mai.webp', 390000, 15, 1],
  ['Lời Yêu', 'loi-yeu', 'Hoa tình yêu', 'Những đóa hồng đỏ đậm gửi thay lời muốn nói.', 'Tình yêu', '/images/loi-yeu.webp', 560000, 10, 1],
  ['Ban Mai Dịu Êm', 'ban-mai-diu-em', 'Hoa sinh nhật', 'Hồng kem, lá xanh và nắng sớm trong một bó hoa thanh nhã.', 'Sinh nhật', '/images/hero.webp', 480000, 8, 0],
  ['Ngày Rực Rỡ', 'ngay-ruc-ro', 'Hoa chúc mừng', 'Một chút nắng vàng cho ngày vui thêm trọn vẹn.', 'Chúc mừng', '/images/nang-mai.webp', 350000, 14, 0],
  ['Thương Mến', 'thuong-men', 'Hoa tình yêu', 'Sắc hồng nhẹ, chân thành và gần gũi.', 'Tình yêu', '/images/hoa-mong-mo.webp', 450000, 9, 0],
];
for (const [name, slug, category, description, occasion, image, price, qty, featured] of products) {
  if (one('SELECT id FROM products WHERE slug = ?', slug)) continue;
  const categoryId = one('SELECT id FROM categories WHERE name = ?', category).id;
  run('INSERT INTO products (category_id,name,slug,description,occasion,image_url,price,available_qty,featured) VALUES (?,?,?,?,?,?,?,?,?)', categoryId, name, slug, description, occasion, image, price, qty, featured);
}

const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.SEED_ADMIN_PASSWORD;
if (email && password && !one('SELECT id FROM users WHERE email = ?', email)) {
  const hash = await Bun.password.hash(password);
  run("INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,'admin')", 'Quản trị viên', email, hash);
  console.log(`Đã tạo tài khoản quản trị: ${email}`);
}
console.log(`Dữ liệu mẫu: ${one('SELECT count(*) AS n FROM products').n} sản phẩm`);
db.close();
