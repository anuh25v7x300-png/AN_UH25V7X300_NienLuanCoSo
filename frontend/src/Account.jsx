import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { api } from './api';

export default function Account({ user, setUser, notify }) {
  const [name, setName] = useState(null), [passwords, setPasswords] = useState({ current_password: '', new_password: '' }), [busy, setBusy] = useState(false), [error, setError] = useState('');
  if (user === undefined) return <main className="container page-space">Đang tải...</main>;
  if (!user) return <Navigate to="/dang-nhap" replace />;
  const submit = async (event, password = false) => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      if (password) { await api('/account/password', { method: 'POST', body: passwords }); setPasswords({ current_password: '', new_password: '' }); }
      else setUser(await api('/account', { method: 'PATCH', body: { name: name ?? user.name } }));
      notify('success', password ? 'Đã đổi mật khẩu và đăng xuất các phiên khác.' : 'Đã lưu hồ sơ.');
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  return <main className="container page-space"><div className="page-intro"><p className="eyebrow">TÀI KHOẢN</p><h1>Thông tin của bạn.</h1><p>{user.email}</p></div>{error && <p className="notice error" role="alert">{error}</p>}<div className="account-grid"><form onSubmit={event => submit(event)}><h2>Hồ sơ cá nhân</h2><label>Họ và tên<input required minLength="2" maxLength="100" value={name ?? user.name} onChange={event => setName(event.target.value)} /></label><button className="button button-dark" disabled={busy}>Lưu hồ sơ</button></form><form onSubmit={event => submit(event, true)}><h2>Đổi mật khẩu</h2><label>Mật khẩu hiện tại<input required type="password" autoComplete="current-password" maxLength="72" value={passwords.current_password} onChange={event => setPasswords({ ...passwords, current_password: event.target.value })}/></label><label>Mật khẩu mới<input required type="password" autoComplete="new-password" minLength="8" maxLength="72" value={passwords.new_password} onChange={event => setPasswords({ ...passwords, new_password: event.target.value })}/></label><button className="button button-dark" disabled={busy}>Đổi mật khẩu</button></form></div></main>;
}
