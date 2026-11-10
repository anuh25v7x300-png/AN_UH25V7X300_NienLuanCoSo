import { useState } from 'react';
import { api } from './api';

const initial = { name: '', email: '', subject: '', message: '' };

export default function Contact({ notify }) {
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const submit = async event => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api('/contact', { method: 'POST', body: form });
      setForm(initial);
      setSent(true);
      notify('success', 'Đã gửi lời nhắn. Cảm ơn bạn đã liên hệ!');
    } catch (err) {
      const message = err.message;
      setError(message);
      notify('error', message);
    } finally { setBusy(false); }
  };
  const change = (key, value) => { setSent(false); setForm(old => ({ ...old, [key]: value })); };
  return <main className="contact-page container page-space">
    <div className="contact-intro"><p className="eyebrow">LIÊN HỆ</p><h1>Để lại một lời nhắn.</h1><p>Bạn muốn hỏi về một bó hoa, đơn hàng hay ngày nhận? Hãy viết cho tiệm; thông tin phản hồi sẽ được gửi qua email bạn cung cấp.</p></div>
    <div className="contact-layout"><div className="contact-aside"><img src="/images/nang-mai.webp" alt="Bó hoa hướng dương và cúc vàng" /><div><span>TIỆM HOA AN</span><h2>Chúng mình ở đây để lắng nghe.</h2><p>Đối với đơn hàng đã đặt, hãy ghi mã đơn trong lời nhắn để tiện tra cứu.</p></div></div>
      <form className="contact-form" onSubmit={submit}><h2>Gửi lời nhắn</h2><p>Các ô có dấu * là bắt buộc.</p>{error && <div className="notice" role="alert">{error}</div>}{sent && <div className="notice success" role="status">Tiệm đã nhận lời nhắn của bạn.</div>}
        <div className="form-grid"><label>Họ và tên *<input required minLength="2" maxLength="100" value={form.name} onChange={e => change('name', e.target.value)} /></label><label>Email *<input required type="email" maxLength="254" value={form.email} onChange={e => change('email', e.target.value)} /></label></div>
        <label>Chủ đề *<select required value={form.subject} onChange={e => change('subject', e.target.value)}><option value="">Chọn chủ đề</option><option value="Tư vấn chọn hoa">Tư vấn chọn hoa</option><option value="Hỏi về đơn hàng">Hỏi về đơn hàng</option><option value="Ngày nhận và giao hoa">Ngày nhận và giao hoa</option><option value="Khác">Khác</option></select></label>
        <label>Lời nhắn *<textarea required minLength="10" maxLength="2000" rows="7" value={form.message} onChange={e => change('message', e.target.value)} placeholder="Bạn muốn chia sẻ điều gì?" /></label>
        <button className="button button-dark" disabled={busy}>{busy ? 'Đang gửi...' : 'Gửi lời nhắn'} <span>↗</span></button>
      </form>
    </div>
  </main>;
}
