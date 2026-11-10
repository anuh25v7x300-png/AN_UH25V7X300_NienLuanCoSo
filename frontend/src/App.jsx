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
import Admin from './Admin';
import Home from './Home';
import { Header, Footer } from './SiteChrome';
import Icon from './Icon';

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

function ProductDetail({ add, user, notify }) {
  const { id } = useParams(), [product, setProduct] = useState(null), [error, setError] = useState(''), [quantity, setQuantity] = useState(1), [added, setAdded] = useState(false);
  useEffect(() => { setProduct(null); setError(''); setQuantity(1); setAdded(false); let cancelled = false; api(`/products/${id}`).then(value => { if (!cancelled) setProduct(value); }).catch(e => { if (!cancelled) setError(e.message); }); return () => { cancelled = true; }; }, [id]);
  if (error) return <main className="container page-space"><Notice text={error} /><Link to="/hoa">Trở lại bộ sưu tập</Link></main>;
  if (!product) return <main className="container page-space">Đang tải...</main>;
  return <main className="container detail-layout page-space"><div className="detail-photo"><img src={image(product.image_url)} alt={product.name} /></div><div className="detail-copy"><Link to="/hoa" className="back-link">Tất cả bó hoa</Link><p className="eyebrow">{product.category_name}</p><h1>{product.name}</h1><p className="detail-price">{money(product.price)}</p><p>{product.description}</p><div className="detail-meta"><span>Dịp tặng</span><strong>{product.occasion || 'Mọi dịp'}</strong></div><div className="detail-meta"><span>Khả năng nhận đặt</span><strong>{product.available_qty > 0 ? `Còn ${product.available_qty} bó` : 'Tạm hết'}</strong></div><div className="detail-buy"><div className="quantity"><button aria-label="Giảm số lượng" onClick={() => setQuantity(Math.max(1, quantity - 1))}><Icon name="minus"/></button><span>{quantity}</span><button aria-label="Tăng số lượng" onClick={() => setQuantity(Math.min(product.available_qty, quantity + 1))}><Icon name="plus"/></button></div><button className="button button-dark" disabled={!product.available_qty} onClick={() => { add(product, quantity); setAdded(true); }}>Thêm vào giỏ <Icon name="arrowUpRight"/></button></div>{added && <p className="success-inline">Đã thêm vào giỏ. <Link to="/gio-hang">Xem giỏ hàng</Link></p>}<p className="fine-print">Hoa tươi có thể thay đổi nhẹ theo mùa. Ngày nhận được cửa hàng xác nhận sau khi đặt.</p></div><Reviews productId={id} user={user} notify={notify}/></main>;
}

function Cart({ cart, change }) {
  const subtotal = cart.reduce((n, item) => n + item.price * item.quantity, 0);
  return <main className="container page-space"><div className="page-intro"><p className="eyebrow">GIỎ HÀNG</p><h1>Hoa bạn đã chọn.</h1></div>{!cart.length ? <div className="empty-state"><h2>Giỏ hàng còn trống.</h2><p>Một bó hoa đang chờ được bạn tìm thấy.</p><Link className="button button-dark" to="/hoa">Khám phá bó hoa</Link></div> : <div className="cart-layout"><div className="cart-items">{cart.map(item => <div className="cart-item" key={item.id}><img src={image(item.image_url)} alt={item.name} /><div><Link to={`/hoa/${item.id}`}><h2>{item.name}</h2></Link><p>{money(item.price)}</p><button className="remove-link" onClick={() => change(item.id, 0)}>Xóa</button></div><div className="quantity"><button aria-label={`Giảm số lượng ${item.name}`} onClick={() => change(item.id, item.quantity - 1)}><Icon name="minus"/></button><span>{item.quantity}</span><button aria-label={`Tăng số lượng ${item.name}`} onClick={() => change(item.id, item.quantity + 1)}><Icon name="plus"/></button></div><strong>{money(item.price * item.quantity)}</strong></div>)}</div><aside className="summary"><h2>Tóm tắt đơn hàng</h2><div><span>Tạm tính</span><strong>{money(subtotal)}</strong></div><p>Phí giao và ngày nhận sẽ được cửa hàng xác nhận.</p><Link to="/thanh-toan" className="button button-dark">Tiếp tục đặt hoa <Icon name="arrowUpRight"/></Link></aside></div>}</main>;
}

function Notice({ text, type = 'error' }) { return text ? <div className={`notice ${type}`} role="alert">{text}</div> : null; }

function Notifications({ items, dismiss }) {
  return <div className="notification-stack" aria-live="polite">{items.map(item => <div key={item.id} className={`notification notification-${item.type}`} role={item.type === 'error' ? 'alert' : 'status'}><span className="notification-symbol"><Icon name={item.type === 'error' ? 'alert' : 'check'}/></span><span>{item.message}{item.action && <Link to={item.action} onClick={() => dismiss(item.id)}> Xem ngay</Link>}</span><button type="button" onClick={() => dismiss(item.id)} aria-label="Đóng thông báo"><Icon name="close"/></button></div>)}</div>;
}

function BackToTop() {
  const { pathname } = useLocation();
  const [visible, setVisible] = useState(false);
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  useEffect(() => { const onScroll = () => setVisible(window.scrollY > 500); onScroll(); window.addEventListener('scroll', onScroll, { passive: true }); return () => window.removeEventListener('scroll', onScroll); }, []);
  return visible && <button className="back-to-top" type="button" aria-label="Trở về đầu trang" title="Trở về đầu trang" onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })}><Icon name="arrowUp"/></button>;
}

function Auth({ setUser, notify }) {
  const navigate = useNavigate(), location = useLocation(), [register, setRegister] = useState(false), [form, setForm] = useState({ name: '', email: '', password: '' }), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const submit = async e => { e.preventDefault(); setError(''); setBusy(true); try { const user = await api(`/auth/${register ? 'register' : 'login'}`, { method: 'POST', body: form }); setUser(user); notify('success', register ? 'Tài khoản đã được tạo.' : 'Đăng nhập thành công.'); navigate(user.role === 'admin' ? '/admin' : location.state?.from || '/don-hang'); } catch (err) { setError(err.message); notify('error', err.message); } finally { setBusy(false); } };
  return <main className="auth-page"><div className="auth-image"/><div className="auth-form"><p className="eyebrow">TIỆM HOA AN</p><h1>{register ? 'Tạo tài khoản.' : 'Chào mừng trở lại.'}</h1><p>{register ? 'Lưu lại những bó hoa và theo dõi đơn của bạn.' : 'Đăng nhập để tiếp tục hành trình gửi hoa.'}</p><form onSubmit={submit}><Notice text={error} />{register && <label>Họ và tên<input required minLength="2" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>}<label>Email<input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></label><label>Mật khẩu<input type="password" required minLength="8" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></label><button className="button button-dark" disabled={busy}>{busy ? 'Đang xử lý...' : register ? 'Tạo tài khoản' : 'Đăng nhập'} <Icon name="arrowUpRight"/></button></form><button className="auth-switch" onClick={() => { setRegister(!register); setError(''); }}>{register ? 'Đã có tài khoản? Đăng nhập' : 'Chưa có tài khoản? Đăng ký'}</button></div></main>;
}

function Checkout({ user, cart, clear, notify }) {
  const navigate = useNavigate(), [form, setForm] = useState({ recipient_name: user?.name || '', phone: '', address: '', requested_date: '', card_message: '', note: '', payment_method: 'cod' }), [error, setError] = useState(''), [busy, setBusy] = useState(false), [placed, setPlaced] = useState(false), [methods, setMethods] = useState(null);
  useEffect(() => { if (user?.name) setForm(f => ({ ...f, recipient_name: f.recipient_name || user.name })); }, [user]);
  useEffect(() => { api('/payment-methods').then(setMethods).catch(e => setError(e.message)); }, []);
  if (user === undefined) return <main className="container page-space">Đang tải...</main>;
  if (!user) return <Navigate to="/dang-nhap" state={{ from: '/thanh-toan' }} replace />;
  if (!cart.length && !placed) return <Navigate to="/gio-hang" replace />;
  const submit = async e => { e.preventDefault(); setError(''); setBusy(true); try { const order = await api('/orders', { method: 'POST', body: { ...form, items: cart.map(item => ({ product_id: item.id, quantity: item.quantity })) } }); setPlaced(true); clear(); notify('success', `Đã nhận yêu cầu đặt hoa #${order.id}.`); navigate(`/don-hang/${order.id}`, { state: { justOrdered: true } }); } catch (err) { setError(err.message); notify('error', err.message); } finally { setBusy(false); } };
  return <main className="container page-space"><div className="page-intro"><p className="eyebrow">ĐẶT HOA</p><h1>Thông tin người nhận.</h1><p>Ngày nhận mong muốn sẽ được cửa hàng xác nhận.</p></div><div className="checkout-layout"><form className="checkout-form" onSubmit={submit}><Notice text={error}/><div className="form-grid"><label>Người nhận<input required minLength="2" maxLength="100" value={form.recipient_name} onChange={e => setForm({ ...form, recipient_name: e.target.value })}/></label><label>Số điện thoại<input required pattern="0[0-9]{9,10}" placeholder="0xxxxxxxxx" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}/></label></div><label>Địa chỉ nhận hoa<textarea required minLength="8" maxLength="300" rows="2" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}/></label><label>Ngày nhận mong muốn<input required type="date" min={new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())} value={form.requested_date} onChange={e => setForm({ ...form, requested_date: e.target.value })}/></label><label>Lời nhắn trên thiệp <small>(không bắt buộc)</small><textarea maxLength="300" rows="2" value={form.card_message} onChange={e => setForm({ ...form, card_message: e.target.value })}/></label><label>Ghi chú <small>(không bắt buộc)</small><textarea maxLength="300" rows="2" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })}/></label><fieldset className="payment-choice"><legend>Phương thức thanh toán</legend><label><input type="radio" name="payment_method" checked={form.payment_method === 'cod'} onChange={() => setForm({ ...form, payment_method: 'cod' })}/> Thanh toán khi nhận hoa (COD)</label>{methods?.bank_transfer && <label><input type="radio" name="payment_method" checked={form.payment_method === 'bank_transfer'} onChange={() => setForm({ ...form, payment_method: 'bank_transfer' })}/> Chuyển khoản ngân hàng</label>}</fieldset>{form.payment_method === 'bank_transfer' && <p className="payment-hint">Thông tin tài khoản và nội dung chuyển khoản sẽ hiện sau khi tạo đơn. Cửa hàng xác nhận thủ công khi nhận được tiền.</p>}<button className="button button-dark" disabled={busy}>{busy ? 'Đang đặt hoa...' : 'Xác nhận đặt hoa'} <Icon name="arrowUpRight"/></button></form><aside className="summary"><h2>Đơn của bạn</h2>{cart.map(item => <div key={item.id}><span>{item.name} × {item.quantity}</span><strong>{money(item.price * item.quantity)}</strong></div>)}<div className="summary-total"><span>Tạm tính</span><strong>{money(cart.reduce((n, item) => n + item.price * item.quantity, 0))}</strong></div><p>Chưa bao gồm phí giao; cửa hàng sẽ liên hệ xác nhận trước khi giao.</p></aside></div></main>;
}

function Orders({ user }) {
  const [orders, setOrders] = useState([]), [error, setError] = useState('');
  useEffect(() => { if (user) api('/orders').then(setOrders).catch(e => setError(e.message)); }, [user]);
  if (user === undefined) return <main className="container page-space">Đang tải...</main>;
  if (!user) return <Navigate to="/dang-nhap" replace />;
  return <main className="container page-space"><div className="page-intro"><p className="eyebrow">TÀI KHOẢN CỦA BẠN</p><h1>Đơn hoa đã đặt.</h1></div><Notice text={error}/>{orders.length ? <div className="order-list">{orders.map(o => <Link to={`/don-hang/${o.id}`} className="order-row" key={o.id}><strong>Đơn #{o.id}</strong><span>Ngày nhận: {o.requested_date}<br/><small>{paymentMethod[o.payment_method]} · {paymentStatus[o.payment_status]}</small></span><span className={`status status-${o.status}`}>{orderStatus[o.status]}</span><b>{money(o.subtotal)}</b><Icon name="arrowUpRight"/></Link>)}</div> : <div className="empty-state"><h2>Bạn chưa có đơn hoa nào.</h2><Link className="button button-dark" to="/hoa">Chọn bó hoa đầu tiên</Link></div>}</main>;
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
  return <main className="container page-space"><Link className="back-link" to="/don-hang"><Icon name="chevronLeft"/>Đơn hàng của tôi</Link><Notice text={error}/>{!order ? !error && <p>Đang tải...</p> : <><div className="page-intro"><p className="eyebrow">ĐƠN HOA CỦA BẠN</p><h1>Đơn hoa #{order.id}</h1><p><span className={`status status-${order.status}`}>{orderStatus[order.status]}</span> · Ngày nhận mong muốn: {order.requested_date}</p></div><div className="order-detail-layout"><div><h2>Sản phẩm</h2>{order.items.map(item => <div className="cart-item" key={item.product_id}><img src={image(item.image_url)} alt={item.product_name}/><div><h3>{item.product_name}</h3><p>{money(item.unit_price)} × {item.quantity}</p></div><strong>{money(item.unit_price * item.quantity)}</strong></div>)}<div className="order-total">Tổng tiền hoa <strong>{money(order.subtotal)}</strong></div>{order.status === 'new' && order.payment_status === 'unpaid' && order.payment_method === 'cod' && user.role !== 'admin' && <button className="remove-link cancel-order" disabled={busy} onClick={cancel}>{busy ? 'Đang hủy...' : 'Hủy đơn hàng'}</button>}</div><aside className="summary"><h2>Thông tin nhận</h2><p><strong>{order.recipient_name}</strong><br/>{order.phone}<br/>{order.address}</p>{order.card_message && <p><small>Lời nhắn:</small><br/>{order.card_message}</p>}<div className="payment-info"><h3>Thanh toán</h3><p>{paymentMethod[order.payment_method]}<br/><strong>{paymentStatus[order.payment_status]}</strong></p>{order.payment_method === 'bank_transfer' && order.payment_status === 'unpaid' && order.status !== 'cancelled' && <div className="bank-details"><p>Ngân hàng: <strong>{order.payment_bank_name}</strong></p><p>Số tài khoản: <strong>{order.payment_account_number}</strong></p><p>Chủ tài khoản: <strong>{order.payment_account_name}</strong></p><p>Nội dung: <strong>HOA{order.id}</strong></p><p>Chuyển đúng {money(order.subtotal)} tiền hoa. Phí giao được cửa hàng xác nhận riêng. Trạng thái sẽ cập nhật sau khi cửa hàng kiểm tra giao dịch.</p></div>}</div><p>Phí giao và ngày nhận sẽ được cửa hàng liên hệ xác nhận.</p></aside></div></>}</main>;
}

export default function App() {
  const { pathname } = useLocation();
  const adminView = pathname === '/admin';
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
  return <>{!adminView && <Header user={store.user} cart={store.cart} onLogout={logout}/>}<Notifications items={notifications} dismiss={dismiss}/><BackToTop/><Routes>
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
    <Route path="/admin" element={<Admin user={store.user} categories={categories} refreshCategories={() => api('/categories').then(setCategories).catch(() => {})} notify={notify} onLogout={logout}/>} />
    <Route path="*" element={<main className="container page-space empty-state"><h1>Không tìm thấy trang.</h1><Link to="/">Về trang chủ</Link></main>} />
  </Routes>{!adminView && <Footer/>}</>;
}
