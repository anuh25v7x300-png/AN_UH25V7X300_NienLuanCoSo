import { useEffect, useState } from 'react';
import { Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { api, money, orderStatus, paymentMethod, paymentStatus } from './api';
import ProductCard from './ProductCard';
import Catalog from './Catalog';
import About from './About';
import Contact from './Contact';
import Account from './Account';
import Favorites from './Favorites';
import Reviews from './Reviews';
import AdminExtras from './AdminExtras';

const CART_KEY = 'hoa-an-cart';
const image = (url) => url || '/images/hero.webp';

function useStore() {
  const [user, setUser] = useState(undefined);
  const [cart, setCart] = useState(() => {
    try { const saved = JSON.parse(localStorage.getItem(CART_KEY) || '[]'); return Array.isArray(saved) ? saved.filter(item => item && Number.isInteger(item.id) && item.id > 0 && Number.isInteger(item.quantity) && item.quantity > 0 && item.quantity <= 50 && Number.isInteger(item.price) && item.price >= 0 && typeof item.name === 'string').slice(0, 30) : []; } catch { return []; }
  });
  useEffect(() => { api('/auth/me').then(setUser).catch(() => setUser(null)); }, []);
  useEffect(() => { try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch { /* Shopping remains available if browser storage is full. */ } }, [cart]);
  const add = (product, quantity = 1) => setCart(old => {
    const existing = old.find(item => item.id === product.id);
    if (existing) return old.map(item => item.id === product.id ? { ...item, quantity: Math.min(50, item.quantity + quantity) } : item);
    return [...old, { id: product.id, name: product.name, price: product.price, image_url: product.image_url, quantity }];
  });
  const change = (id, quantity) => setCart(old => quantity < 1 ? old.filter(item => item.id !== id) : old.map(item => item.id === id ? { ...item, quantity: Math.min(50, quantity) } : item));
  return { user, setUser, cart, setCart, add, change };
}

function Header({ user, cart, onLogout }) {
  const [open, setOpen] = useState(false);
  const count = cart.reduce((n, item) => n + item.quantity, 0);
  return <>
    <div className="announcement">Hoa tươi mỗi ngày · Gói ghém bằng sự chân thành</div>
    <header className="site-header">
      <div className="site-header-inner container-fluid">
        <Link to="/" className="brand" onClick={() => setOpen(false)}>TIỆM HOA <span>AN.</span></Link>
        <button className="menu-button d-lg-none" aria-label="Mở menu" onClick={() => setOpen(!open)}>☰</button>
        <nav className={open ? 'nav-links open' : 'nav-links'} onClick={() => setOpen(false)}>
          <NavLink to="/" end>Trang chủ</NavLink><NavLink to="/hoa">Bó hoa</NavLink><NavLink to="/gioi-thieu">Giới thiệu</NavLink><NavLink to="/lien-he">Liên hệ</NavLink>{user && <><NavLink to="/yeu-thich">Yêu thích</NavLink><NavLink to="/tai-khoan">Hồ sơ</NavLink></>}
          {user?.role === 'admin' && <NavLink to="/admin">Quản trị</NavLink>}
        </nav>
        <div className="header-actions">
          {user ? <div className="account-menu"><Link to="/don-hang">{user.name.split(' ').at(-1)}</Link><button onClick={onLogout} title="Đăng xuất">↗</button></div> : <Link to="/dang-nhap" className="login-link">Đăng nhập</Link>}
          <Link to="/gio-hang" className="cart-link" aria-label={`Giỏ hàng ${count} sản phẩm`}>Giỏ hàng <span>{count}</span></Link>
        </div>
      </div>
    </header>
  </>;
}

function Footer() {
  return <footer className="site-footer"><div className="container footer-grid">
    <div><div className="footer-brand">TIỆM HOA AN.</div><p>Hoa tươi cho những điều khó nói thành lời.</p></div>
    <div><strong>Khám phá</strong><Link to="/hoa">Tất cả bó hoa</Link><Link to="/hoa?category=hoa-tinh-yeu">Hoa tình yêu</Link><Link to="/hoa?category=hoa-chuc-mung">Hoa chúc mừng</Link></div>
    <div><strong>Thông tin</strong><Link to="/gioi-thieu">Giới thiệu</Link><Link to="/lien-he">Liên hệ</Link><small>Ảnh minh họa được tạo cho dự án học tập CT271. Ngày và phí giao cần được xác nhận.</small></div>
  </div><div className="container footer-bottom">© 2026 Tiệm Hoa An · Đồ án CT271 của Nguyễn Thị Thùy An</div></footer>;
}

function Home({ add }) {
  const [featured, setFeatured] = useState([]);
  useEffect(() => { api('/products?featured=1').then(setFeatured).catch(() => {}); }, []);
  return <>
    <section className="hero"><div className="hero-image" /><div className="hero-shade" /><div className="container hero-content"><p className="eyebrow light">TIỆM HOA AN · FRESH FLOWERS</p><h1>Gửi hoa.<br/><em>Gửi thương.</em></h1><p>Một bó hoa tươi, một lời nhắn từ lòng mình.</p><Link className="button button-light" to="/hoa">Khám phá bó hoa <span>↗</span></Link></div><div className="hero-index">01 / NHỮNG MÙA HOA</div></section>
    <section className="intro-strip"><div className="container intro-grid"><div><span>01</span><p>Chọn bó hoa<br/>hợp khoảnh khắc</p></div><div><span>02</span><p>Viết lời nhắn<br/>cho người nhận</p></div><div><span>03</span><p>Chọn ngày nhận<br/>mong muốn</p></div></div></section>
    <section className="section-space container"><div className="section-heading"><div><p className="eyebrow">TỪ TIỆM HOA CỦA CHÚNG MÌNH</p><h2>Những bó hoa được yêu thích</h2></div><Link className="text-link" to="/hoa">Xem tất cả <span>↗</span></Link></div><div className="product-grid">{featured.map(p => <ProductCard key={p.id} product={p} onAdd={add} />)}</div></section>
    <section className="story-section"><div className="story-image"><img src="/images/hoa-mong-mo.webp" alt="Bó hoa sắc hồng nhẹ nhàng" loading="lazy" /></div><div className="story-copy"><p className="eyebrow">MỘT CHÚT QUAN TÂM</p><h2>Hoa đẹp nhất khi được trao đúng lúc.</h2><p>Dành cho sinh nhật, lời cảm ơn hay đơn giản là một ngày bạn muốn ai đó mỉm cười.</p><Link className="button button-dark" to="/hoa">Chọn hoa hôm nay <span>↗</span></Link></div></section>
    <section className="closing container"><p className="eyebrow">MỘT LỜI NHẮN NHỎ</p><h2>Hãy để hoa nói hộ bạn.</h2><Link to="/hoa" className="text-link">Bắt đầu chọn hoa <span>↗</span></Link></section>
  </>;
}

function ProductDetail({ add, user, notify }) {
  const { id } = useParams(), [product, setProduct] = useState(null), [error, setError] = useState(''), [quantity, setQuantity] = useState(1), [added, setAdded] = useState(false);
  useEffect(() => { setProduct(null); setError(''); setQuantity(1); setAdded(false); let cancelled = false; api(`/products/${id}`).then(value => { if (!cancelled) setProduct(value); }).catch(e => { if (!cancelled) setError(e.message); }); return () => { cancelled = true; }; }, [id]);
  if (error) return <main className="container page-space"><Notice text={error} /><Link to="/hoa">← Trở lại bộ sưu tập</Link></main>;
  if (!product) return <main className="container page-space">Đang tải...</main>;
  return <main className="container detail-layout page-space"><div className="detail-photo"><img src={image(product.image_url)} alt={product.name} /></div><div className="detail-copy"><Link to="/hoa" className="back-link">← Tất cả bó hoa</Link><p className="eyebrow">{product.category_name}</p><h1>{product.name}</h1><p className="detail-price">{money(product.price)}</p><p>{product.description}</p><div className="detail-meta"><span>Dịp tặng</span><strong>{product.occasion || 'Mọi dịp'}</strong></div><div className="detail-meta"><span>Khả năng nhận đặt</span><strong>{product.available_qty > 0 ? `Còn ${product.available_qty} bó` : 'Tạm hết'}</strong></div><div className="detail-buy"><div className="quantity"><button onClick={() => setQuantity(Math.max(1, quantity - 1))}>−</button><span>{quantity}</span><button onClick={() => setQuantity(Math.min(product.available_qty, quantity + 1))}>+</button></div><button className="button button-dark" disabled={!product.available_qty} onClick={() => { add(product, quantity); setAdded(true); }}>Thêm vào giỏ <span>↗</span></button></div>{added && <p className="success-inline">Đã thêm vào giỏ. <Link to="/gio-hang">Xem giỏ hàng →</Link></p>}<p className="fine-print">Hoa tươi có thể thay đổi nhẹ theo mùa. Ngày nhận được cửa hàng xác nhận sau khi đặt.</p></div><Reviews productId={id} user={user} notify={notify}/></main>;
}

function Cart({ cart, change }) {
  const subtotal = cart.reduce((n, item) => n + item.price * item.quantity, 0);
  return <main className="container page-space"><div className="page-intro"><p className="eyebrow">GIỎ HÀNG</p><h1>Hoa bạn đã chọn.</h1></div>{!cart.length ? <div className="empty-state"><h2>Giỏ hàng còn trống.</h2><p>Một bó hoa đang chờ được bạn tìm thấy.</p><Link className="button button-dark" to="/hoa">Khám phá bó hoa</Link></div> : <div className="cart-layout"><div className="cart-items">{cart.map(item => <div className="cart-item" key={item.id}><img src={image(item.image_url)} alt={item.name} /><div><Link to={`/hoa/${item.id}`}><h2>{item.name}</h2></Link><p>{money(item.price)}</p><button className="remove-link" onClick={() => change(item.id, 0)}>Xóa</button></div><div className="quantity"><button onClick={() => change(item.id, item.quantity - 1)}>−</button><span>{item.quantity}</span><button onClick={() => change(item.id, item.quantity + 1)}>+</button></div><strong>{money(item.price * item.quantity)}</strong></div>)}</div><aside className="summary"><h2>Tóm tắt đơn hàng</h2><div><span>Tạm tính</span><strong>{money(subtotal)}</strong></div><p>Phí giao và ngày nhận sẽ được cửa hàng xác nhận.</p><Link to="/thanh-toan" className="button button-dark">Tiếp tục đặt hoa <span>↗</span></Link></aside></div>}</main>;
}

function Notice({ text, type = 'error' }) { return text ? <div className={`notice ${type}`} role="alert">{text}</div> : null; }

function Notifications({ items, dismiss }) {
  return <div className="notification-stack" aria-live="polite">{items.map(item => <div key={item.id} className={`notification notification-${item.type}`} role={item.type === 'error' ? 'alert' : 'status'}><span className="notification-symbol">{item.type === 'error' ? '!' : '✓'}</span><span>{item.message}{item.action && <Link to={item.action} onClick={() => dismiss(item.id)}> Xem ngay →</Link>}</span><button type="button" onClick={() => dismiss(item.id)} aria-label="Đóng thông báo">×</button></div>)}</div>;
}

function BackToTop() {
  const { pathname } = useLocation();
  const [visible, setVisible] = useState(false);
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  useEffect(() => { const onScroll = () => setVisible(window.scrollY > 500); onScroll(); window.addEventListener('scroll', onScroll, { passive: true }); return () => window.removeEventListener('scroll', onScroll); }, []);
  return visible && <button className="back-to-top" type="button" aria-label="Trở về đầu trang" title="Trở về đầu trang" onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })}>↑</button>;
}

function Auth({ setUser, notify }) {
  const navigate = useNavigate(), location = useLocation(), [register, setRegister] = useState(false), [form, setForm] = useState({ name: '', email: '', password: '' }), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const submit = async e => { e.preventDefault(); setError(''); setBusy(true); try { const user = await api(`/auth/${register ? 'register' : 'login'}`, { method: 'POST', body: form }); setUser(user); notify('success', register ? 'Tài khoản đã được tạo.' : 'Đăng nhập thành công.'); navigate(user.role === 'admin' ? '/admin' : location.state?.from || '/don-hang'); } catch (err) { setError(err.message); notify('error', err.message); } finally { setBusy(false); } };
  return <main className="auth-page"><div className="auth-image"/><div className="auth-form"><p className="eyebrow">TIỆM HOA AN</p><h1>{register ? 'Tạo tài khoản.' : 'Chào mừng trở lại.'}</h1><p>{register ? 'Lưu lại những bó hoa và theo dõi đơn của bạn.' : 'Đăng nhập để tiếp tục hành trình gửi hoa.'}</p><form onSubmit={submit}><Notice text={error} />{register && <label>Họ và tên<input required minLength="2" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>}<label>Email<input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></label><label>Mật khẩu<input type="password" required minLength="8" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></label><button className="button button-dark" disabled={busy}>{busy ? 'Đang xử lý...' : register ? 'Tạo tài khoản' : 'Đăng nhập'} <span>↗</span></button></form><button className="auth-switch" onClick={() => { setRegister(!register); setError(''); }}>{register ? 'Đã có tài khoản? Đăng nhập' : 'Chưa có tài khoản? Đăng ký'}</button></div></main>;
}

function Checkout({ user, cart, clear, notify }) {
  const navigate = useNavigate(), [form, setForm] = useState({ recipient_name: user?.name || '', phone: '', address: '', requested_date: '', card_message: '', note: '', payment_method: 'cod' }), [error, setError] = useState(''), [busy, setBusy] = useState(false), [placed, setPlaced] = useState(false), [methods, setMethods] = useState(null);
  useEffect(() => { if (user?.name) setForm(f => ({ ...f, recipient_name: f.recipient_name || user.name })); }, [user]);
  useEffect(() => { api('/payment-methods').then(setMethods).catch(e => setError(e.message)); }, []);
  if (user === undefined) return <main className="container page-space">Đang tải...</main>;
  if (!user) return <Navigate to="/dang-nhap" state={{ from: '/thanh-toan' }} replace />;
  if (!cart.length && !placed) return <Navigate to="/gio-hang" replace />;
  const submit = async e => { e.preventDefault(); setError(''); setBusy(true); try { const order = await api('/orders', { method: 'POST', body: { ...form, items: cart.map(item => ({ product_id: item.id, quantity: item.quantity })) } }); setPlaced(true); clear(); notify('success', `Đã nhận yêu cầu đặt hoa #${order.id}.`); navigate(`/don-hang/${order.id}`, { state: { justOrdered: true } }); } catch (err) { setError(err.message); notify('error', err.message); } finally { setBusy(false); } };
  return <main className="container page-space"><div className="page-intro"><p className="eyebrow">ĐẶT HOA</p><h1>Thông tin người nhận.</h1><p>Ngày nhận mong muốn sẽ được cửa hàng xác nhận.</p></div><div className="checkout-layout"><form className="checkout-form" onSubmit={submit}><Notice text={error}/><div className="form-grid"><label>Người nhận<input required minLength="2" maxLength="100" value={form.recipient_name} onChange={e => setForm({ ...form, recipient_name: e.target.value })}/></label><label>Số điện thoại<input required pattern="0[0-9]{9,10}" placeholder="0xxxxxxxxx" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}/></label></div><label>Địa chỉ nhận hoa<textarea required minLength="8" maxLength="300" rows="2" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}/></label><label>Ngày nhận mong muốn<input required type="date" min={new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())} value={form.requested_date} onChange={e => setForm({ ...form, requested_date: e.target.value })}/></label><label>Lời nhắn trên thiệp <small>(không bắt buộc)</small><textarea maxLength="300" rows="2" value={form.card_message} onChange={e => setForm({ ...form, card_message: e.target.value })}/></label><label>Ghi chú <small>(không bắt buộc)</small><textarea maxLength="300" rows="2" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })}/></label><fieldset className="payment-choice"><legend>Phương thức thanh toán</legend><label><input type="radio" name="payment_method" checked={form.payment_method === 'cod'} onChange={() => setForm({ ...form, payment_method: 'cod' })}/> Thanh toán khi nhận hoa (COD)</label>{methods?.bank_transfer && <label><input type="radio" name="payment_method" checked={form.payment_method === 'bank_transfer'} onChange={() => setForm({ ...form, payment_method: 'bank_transfer' })}/> Chuyển khoản ngân hàng</label>}</fieldset>{form.payment_method === 'bank_transfer' && <p className="payment-hint">Thông tin tài khoản và nội dung chuyển khoản sẽ hiện sau khi tạo đơn. Cửa hàng xác nhận thủ công khi nhận được tiền.</p>}<button className="button button-dark" disabled={busy}>{busy ? 'Đang đặt hoa...' : 'Xác nhận đặt hoa'} <span>↗</span></button></form><aside className="summary"><h2>Đơn của bạn</h2>{cart.map(item => <div key={item.id}><span>{item.name} × {item.quantity}</span><strong>{money(item.price * item.quantity)}</strong></div>)}<div className="summary-total"><span>Tạm tính</span><strong>{money(cart.reduce((n, item) => n + item.price * item.quantity, 0))}</strong></div><p>Chưa bao gồm phí giao; cửa hàng sẽ liên hệ xác nhận trước khi giao.</p></aside></div></main>;
}

function Orders({ user }) {
  const [orders, setOrders] = useState([]), [error, setError] = useState('');
  useEffect(() => { if (user) api('/orders').then(setOrders).catch(e => setError(e.message)); }, [user]);
  if (user === undefined) return <main className="container page-space">Đang tải...</main>;
  if (!user) return <Navigate to="/dang-nhap" replace />;
  return <main className="container page-space"><div className="page-intro"><p className="eyebrow">TÀI KHOẢN CỦA BẠN</p><h1>Đơn hoa đã đặt.</h1></div><Notice text={error}/>{orders.length ? <div className="order-list">{orders.map(o => <Link to={`/don-hang/${o.id}`} className="order-row" key={o.id}><strong>Đơn #{o.id}</strong><span>Ngày nhận: {o.requested_date}<br/><small>{paymentMethod[o.payment_method]} · {paymentStatus[o.payment_status]}</small></span><span className={`status status-${o.status}`}>{orderStatus[o.status]}</span><b>{money(o.subtotal)}</b><span>↗</span></Link>)}</div> : <div className="empty-state"><h2>Bạn chưa có đơn hoa nào.</h2><Link className="button button-dark" to="/hoa">Chọn bó hoa đầu tiên</Link></div>}</main>;
}

function OrderDetail({ user, notify }) {
  const { id } = useParams(), [order, setOrder] = useState(null), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  useEffect(() => { if (user) api(`/orders/${id}`).then(setOrder).catch(e => setError(e.message)); }, [user, id]);
  const cancel = async () => {
    if (!window.confirm(`Hủy đơn hoa #${id}?`)) return;
    setBusy(true);
    try { const updated = await api(`/orders/${id}/cancel`, { method: 'POST' }); setOrder(updated); setError(''); notify('success', `Đã hủy đơn #${id}.`); }
    catch (e) { setError(e.message); notify('error', e.message); }
    finally { setBusy(false); }
  };
  if (user === undefined) return <main className="container page-space">Đang tải...</main>;
  if (!user) return <Navigate to="/dang-nhap" replace />;
  return <main className="container page-space"><Link className="back-link" to="/don-hang">← Đơn hàng của tôi</Link><Notice text={error}/>{!order ? !error && <p>Đang tải...</p> : <><div className="page-intro"><p className="eyebrow">ĐƠN HOA CỦA BẠN</p><h1>Đơn hoa #{order.id}</h1><p><span className={`status status-${order.status}`}>{orderStatus[order.status]}</span> · Ngày nhận mong muốn: {order.requested_date}</p></div><div className="order-detail-layout"><div><h2>Sản phẩm</h2>{order.items.map(item => <div className="cart-item" key={item.product_id}><img src={image(item.image_url)} alt={item.product_name}/><div><h3>{item.product_name}</h3><p>{money(item.unit_price)} × {item.quantity}</p></div><strong>{money(item.unit_price * item.quantity)}</strong></div>)}<div className="order-total">Tổng tiền hoa <strong>{money(order.subtotal)}</strong></div>{order.status === 'new' && order.payment_status === 'unpaid' && order.payment_method === 'cod' && user.role !== 'admin' && <button className="remove-link cancel-order" disabled={busy} onClick={cancel}>{busy ? 'Đang hủy...' : 'Hủy đơn hàng'}</button>}</div><aside className="summary"><h2>Thông tin nhận</h2><p><strong>{order.recipient_name}</strong><br/>{order.phone}<br/>{order.address}</p>{order.card_message && <p><small>Lời nhắn:</small><br/>{order.card_message}</p>}<div className="payment-info"><h3>Thanh toán</h3><p>{paymentMethod[order.payment_method]}<br/><strong>{paymentStatus[order.payment_status]}</strong></p>{order.payment_method === 'bank_transfer' && order.payment_status === 'unpaid' && order.status !== 'cancelled' && <div className="bank-details"><p>Ngân hàng: <strong>{order.payment_bank_name}</strong></p><p>Số tài khoản: <strong>{order.payment_account_number}</strong></p><p>Chủ tài khoản: <strong>{order.payment_account_name}</strong></p><p>Nội dung: <strong>HOA{order.id}</strong></p><p>Chuyển đúng {money(order.subtotal)} tiền hoa. Phí giao được cửa hàng xác nhận riêng. Trạng thái sẽ cập nhật sau khi cửa hàng kiểm tra giao dịch.</p></div>}</div><p>Phí giao và ngày nhận sẽ được cửa hàng liên hệ xác nhận.</p></aside></div></>}</main>;
}

function Admin({ user, categories, refreshCategories, notify }) {
  const [tab, setTab] = useState('statistics'), [products, setProducts] = useState([]), [orders, setOrders] = useState([]), [messages, setMessages] = useState([]), [error, setError] = useState(''), [success, setSuccess] = useState(''), [editing, setEditing] = useState(null), [categoryEditing, setCategoryEditing] = useState(null);
  const load = () => { api('/admin/products').then(setProducts).catch(e => setError(e.message)); api('/admin/orders').then(setOrders).catch(e => setError(e.message)); api('/admin/messages').then(setMessages).catch(e => setError(e.message)); };
  useEffect(() => { if (user?.role === 'admin') load(); }, [user]);
  if (user === undefined) return <main className="container page-space">Đang tải...</main>;
  if (user?.role !== 'admin') return <Navigate to="/" replace />;
  const statusChange = async (id, status) => { try { await api(`/admin/orders/${id}/status`, { method: 'PATCH', body: { status } }); setSuccess(`Đã cập nhật đơn #${id}.`); notify('success', `Đã cập nhật đơn #${id}.`); setError(''); load(); } catch (e) { setError(e.message); notify('error', e.message); } };
  const markPaid = async id => { if (!window.confirm(`Đã kiểm tra tài khoản và nhận tiền cho đơn #${id}?`)) return; try { await api(`/admin/orders/${id}/mark-paid`, { method: 'POST' }); setSuccess(`Đã xác nhận thanh toán đơn #${id}.`); setError(''); notify('success', `Đơn #${id} đã thanh toán.`); load(); } catch (e) { setError(e.message); notify('error', e.message); } };
  const categorySaved = () => { setCategoryEditing(null); setSuccess('Đã lưu danh mục.'); setError(''); refreshCategories(); };
  const deleteCategory = async category => { if (!window.confirm(`Xóa danh mục ${category.name}?`)) return; try { await api(`/admin/categories/${category.id}`, { method: 'DELETE' }); categorySaved(); } catch (e) { setError(e.message); } };
  const markMessage = async (id, status) => { try { await api(`/admin/messages/${id}`, { method: 'PATCH', body: { status } }); load(); notify('success', 'Đã cập nhật lời nhắn.'); } catch (e) { setError(e.message); notify('error', e.message); } };
  return <main className="container page-space admin-page"><div className="page-intro"><p className="eyebrow">QUẢN TRỊ TIỆM HOA</p><h1>Quản lý cửa hàng.</h1><p>Sản phẩm, số lượng nhận đặt và đơn hoa.</p></div>
    <div className="admin-tabs">{[['statistics','Thống kê'],['users','Khách hàng'],['reviews','Đánh giá']].map(([key,label]) => <button key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>{label}</button>)}<button className={tab === 'orders' ? 'active' : ''} onClick={() => setTab('orders')}>Đơn hàng ({orders.length})</button><button className={tab === 'products' ? 'active' : ''} onClick={() => setTab('products')}>Sản phẩm ({products.length})</button><button className={tab === 'categories' ? 'active' : ''} onClick={() => setTab('categories')}>Danh mục ({categories.length})</button><button className={tab === 'messages' ? 'active' : ''} onClick={() => setTab('messages')}>Lời nhắn ({messages.filter(m => m.status === 'new').length})</button></div><Notice text={error}/><Notice text={success} type="success"/>
    {['statistics', 'users', 'reviews'].includes(tab) && <AdminExtras key={tab} tab={tab} notify={notify}/>}
    {tab === 'orders' && <div className="admin-table-wrap"><table className="table admin-table"><thead><tr><th>Đơn</th><th>Khách / người nhận</th><th>Ngày nhận</th><th>Giá trị</th><th>Thanh toán</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{orders.map(o => <tr key={o.id}><td><Link to={`/don-hang/${o.id}`}>#{o.id}</Link></td><td>{o.customer_name}<br/><small>{o.recipient_name} · {o.phone}</small></td><td>{o.requested_date}</td><td>{money(o.subtotal)}</td><td><small>{paymentMethod[o.payment_method]}</small><br/>{paymentStatus[o.payment_status]}{o.payment_method === 'bank_transfer' && o.payment_status === 'unpaid' && o.status !== 'cancelled' && <><br/><button className="text-link" onClick={() => markPaid(o.id)}>Xác nhận đã nhận tiền</button></>}</td><td><span className={`status status-${o.status}`}>{orderStatus[o.status]}</span></td><td><select aria-label={`Cập nhật đơn ${o.id}`} value={o.status} onChange={e => statusChange(o.id, e.target.value)}><option value={o.status}>{orderStatus[o.status]}</option>{({ new: ['confirmed', 'cancelled'], confirmed: ['delivering', 'cancelled'], delivering: ['delivered'], delivered: [], cancelled: [] }[o.status]).filter(s => s !== 'cancelled' || o.payment_status !== 'paid').map(s => <option key={s} value={s}>→ {orderStatus[s]}</option>)}</select></td></tr>)}</tbody></table>{!orders.length && <p>Chưa có đơn hàng.</p>}</div>}
    {tab === 'products' && <><div className="admin-toolbar"><button className="button button-dark" onClick={() => setEditing({})}>+ Thêm sản phẩm</button></div><div className="admin-table-wrap"><table className="table admin-table"><thead><tr><th>Hoa</th><th>Danh mục</th><th>Giá</th><th>Nhận đặt</th><th>Hiển thị</th><th></th></tr></thead><tbody>{products.map(p => <tr key={p.id}><td><div className="admin-product"><img src={image(p.image_url)} alt=""/><strong>{p.name}</strong></div></td><td>{p.category_name}</td><td>{money(p.price)}</td><td>{p.available_qty}</td><td>{p.active ? 'Có' : 'Ẩn'}</td><td><button className="text-link" onClick={() => setEditing(p)}>Chỉnh sửa ↗</button></td></tr>)}</tbody></table></div></>}
    {tab === 'categories' && <><div className="admin-toolbar"><button className="button button-dark" onClick={() => setCategoryEditing({})}>+ Thêm danh mục</button></div><div className="admin-table-wrap"><table className="table admin-table"><thead><tr><th>Tên danh mục</th><th>Đường dẫn</th><th>Thao tác</th></tr></thead><tbody>{categories.map(c => <tr key={c.id}><td>{c.name}</td><td>{c.slug}</td><td><button className="text-link me-3" onClick={() => setCategoryEditing(c)}>Chỉnh sửa</button><button className="text-link" onClick={() => deleteCategory(c)}>Xóa</button></td></tr>)}</tbody></table></div></>}
    {tab === 'messages' && <div className="message-list">{messages.length ? messages.map(message => <article className="message-row" key={message.id}><div><span className="eyebrow">{message.status === 'new' ? 'CHƯA ĐỌC' : 'ĐÃ ĐỌC'} · {message.created_at}</span><h3>{message.subject}</h3><p>{message.message}</p><small>{message.name} · <a href={`mailto:${message.email}`}>{message.email}</a></small></div><button className="text-link" onClick={() => markMessage(message.id, message.status === 'new' ? 'read' : 'new')}>{message.status === 'new' ? 'Đánh dấu đã đọc' : 'Đánh dấu chưa đọc'}</button></article>) : <p>Chưa có lời nhắn nào.</p>}</div>}
    {editing && <ProductEditor product={editing} categories={categories} close={() => setEditing(null)} saved={() => { setEditing(null); setSuccess('Đã lưu sản phẩm.'); setError(''); load(); }}/>}
    {categoryEditing && <CategoryEditor category={categoryEditing} close={() => setCategoryEditing(null)} saved={categorySaved}/>}</main>;
}

function CategoryEditor({ category, close, saved }) {
  const [form, setForm] = useState({ name: category.name || '', slug: category.slug || '' }), [busy, setBusy] = useState(false), [formError, setFormError] = useState('');
  const submit = async e => { e.preventDefault(); setBusy(true); setFormError(''); try { await api(category.id ? `/admin/categories/${category.id}` : '/admin/categories', { method: category.id ? 'PATCH' : 'POST', body: form }); saved(); } catch (err) { setFormError(err.message); } finally { setBusy(false); } };
  return <div className="modal-backdrop-custom" role="dialog" aria-modal="true" aria-label="Chỉnh sửa danh mục"><div className="editor small-editor"><div className="editor-top"><h2>{category.id ? 'Chỉnh sửa danh mục' : 'Thêm danh mục'}</h2><button onClick={close} aria-label="Đóng">×</button></div><form onSubmit={submit}><Notice text={formError}/><label>Tên danh mục<input required minLength="2" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}/></label><label>Đường dẫn không dấu<input required pattern="[a-z0-9]+(-[a-z0-9]+)*" value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })}/></label><button className="button button-dark" disabled={busy}>{busy ? 'Đang lưu...' : 'Lưu danh mục'}</button></form></div></div>;
}

function ProductEditor({ product, categories, close, saved }) {
  const blank = { category_id: categories[0]?.id || 1, name: '', slug: '', description: '', occasion: '', image_url: '/images/hoa-mong-mo.webp', price: 0, available_qty: 0, featured: false, active: true };
  const [uploading, setUploading] = useState(false);
  const upload = async event => { const file = event.target.files?.[0]; if (!file) return; setUploading(true); setFormError(''); try { const body = new FormData(); body.append('file', file); const result = await api('/admin/uploads', { method: 'POST', body }); change('image_url', result.image_url); } catch (e) { setFormError(e.message); } finally { setUploading(false); } };
  const [form, setForm] = useState({ ...blank, ...product }), [busy, setBusy] = useState(false), [formError, setFormError] = useState('');
  const change = (key, value) => setForm(f => ({ ...f, [key]: value }));
  const submit = async e => { e.preventDefault(); setBusy(true); setFormError(''); try { await api(product.id ? `/admin/products/${product.id}` : '/admin/products', { method: product.id ? 'PATCH' : 'POST', body: { ...form, category_id: Number(form.category_id), price: Number(form.price), available_qty: Number(form.available_qty), expected_qty: product.available_qty } }); saved(); } catch (err) { setFormError(err.message); } finally { setBusy(false); } };
  return <div className="modal-backdrop-custom" role="dialog" aria-modal="true" aria-label="Chỉnh sửa sản phẩm"><div className="editor"><div className="editor-top"><h2>{product.id ? 'Chỉnh sửa hoa' : 'Thêm bó hoa'}</h2><button onClick={close} aria-label="Đóng">×</button></div><form onSubmit={submit}><Notice text={formError}/><div className="form-grid"><label>Tên sản phẩm<input required minLength="2" value={form.name} onChange={e => change('name', e.target.value)}/></label><label>Đường dẫn (không dấu)<input required pattern="[a-z0-9]+(-[a-z0-9]+)*" value={form.slug} onChange={e => change('slug', e.target.value)}/></label></div><label>Danh mục<select value={form.category_id} onChange={e => change('category_id', e.target.value)}>{categories.map(c => <option value={c.id} key={c.id}>{c.name}</option>)}</select></label><label>Mô tả<textarea rows="3" value={form.description} onChange={e => change('description', e.target.value)}/></label><div className="form-grid"><label>Dịp tặng<input value={form.occasion} onChange={e => change('occasion', e.target.value)}/></label><label>Đường dẫn ảnh<input value={form.image_url} onChange={e => change('image_url', e.target.value)}/></label></div><div className="form-grid"><label>Giá (₫)<input required type="number" min="0" value={form.price} onChange={e => change('price', e.target.value)}/></label><label>Số lượng nhận đặt<input required type="number" min="0" value={form.available_qty} onChange={e => change('available_qty', e.target.value)}/></label></div><label>Tải ảnh sản phẩm (JPG, PNG, WebP; tối đa 3 MB)<input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={upload}/></label>{uploading && <p>Đang tải ảnh...</p>}<img className="upload-preview" src={form.image_url} alt="Xem trước ảnh sản phẩm"/><div className="check-row"><label><input type="checkbox" checked={!!form.featured} onChange={e => change('featured', e.target.checked)}/> Nổi bật</label><label><input type="checkbox" checked={!!form.active} onChange={e => change('active', e.target.checked)}/> Hiển thị</label></div><button className="button button-dark" disabled={busy || uploading}>{busy ? 'Đang lưu...' : 'Lưu sản phẩm'}</button></form></div></div>;
}

export default function App() {
  const store = useStore(), [categories, setCategories] = useState([]), [notifications, setNotifications] = useState([]);
  useEffect(() => { api('/categories').then(setCategories).catch(() => {}); }, []);
  const dismiss = id => setNotifications(items => items.filter(item => item.id !== id));
  const notify = (type, message, action) => {
    const id = crypto.randomUUID();
    setNotifications(items => [...items.slice(-2), { id, type, message, action }]);
    window.setTimeout(() => dismiss(id), 5000);
  };
  const add = (p, quantity = 1) => { store.add(p, quantity); notify('success', `Đã thêm ${p.name} vào giỏ.`, '/gio-hang'); };
  const logout = async () => { await api('/auth/logout', { method: 'POST' }).catch(() => {}); store.setUser(null); window.location.href = '/'; };
  return <><Header user={store.user} cart={store.cart} onLogout={logout}/><Notifications items={notifications} dismiss={dismiss}/><BackToTop/><Routes>
    <Route path="/" element={<Home add={add}/>} />
    <Route path="/hoa" element={<Catalog add={add}/>} />
    <Route path="/hoa/:id" element={<ProductDetail add={add} user={store.user} notify={notify}/>} />
    <Route path="/gioi-thieu" element={<About/>} />
    <Route path="/lien-he" element={<Contact notify={notify}/>} />
    <Route path="/tai-khoan" element={<Account user={store.user} setUser={store.setUser} notify={notify}/>} />
    <Route path="/yeu-thich" element={<Favorites user={store.user} add={add} notify={notify}/>} />
    <Route path="/gio-hang" element={<Cart cart={store.cart} change={store.change}/>} />
    <Route path="/dang-nhap" element={<Auth setUser={store.setUser} notify={notify}/>} />
    <Route path="/thanh-toan" element={<Checkout user={store.user} cart={store.cart} clear={() => store.setCart([])} notify={notify}/>} />
    <Route path="/don-hang" element={<Orders user={store.user}/>} />
    <Route path="/don-hang/:id" element={<OrderDetail user={store.user} notify={notify}/>} />
    <Route path="/admin" element={<Admin user={store.user} categories={categories} refreshCategories={() => api('/categories').then(setCategories).catch(() => {})} notify={notify}/>} />
    <Route path="*" element={<main className="container page-space empty-state"><h1>Không tìm thấy trang.</h1><Link to="/">Về trang chủ →</Link></main>} />
  </Routes><Footer/></>;
}
