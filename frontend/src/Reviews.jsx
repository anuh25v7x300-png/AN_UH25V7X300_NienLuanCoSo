import Icon from './Icon';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from './api';

export default function Reviews({ productId, user, notify }) {
  const [reviews, setReviews] = useState([]), [rating, setRating] = useState('5'), [comment, setComment] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const load = () => api(`/products/${productId}/reviews`).then(setReviews).catch(e => setError(e.message));
  useEffect(() => { setReviews([]); setError(''); load(); }, [productId]);
  const submit = async event => {
    event.preventDefault(); setBusy(true); setError('');
    try { await api(`/products/${productId}/review`, { method: 'PUT', body: { rating: Number(rating), comment } }); await load(); notify('success', 'Đã lưu đánh giá của bạn.'); setComment(''); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  const favorite = async () => { try { await api(`/favorites/${productId}`, { method: 'PUT' }); notify('success', 'Đã lưu bó hoa yêu thích.', '/yeu-thich'); } catch (e) { setError(e.message); } };
  return <section className="reviews-section"><h2>Chia sẻ từ người nhận hoa</h2><p>{reviews.length ? `${(reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)} / 5 · ${reviews.length} đánh giá` : 'Chưa có đánh giá cho bó hoa này.'}</p>{error && <p className="notice error" role="alert">{error}</p>}{reviews.map(r => <article className="review-row" key={r.id}><strong>{r.name}</strong><span aria-label={`${r.rating} trên 5 sao`}>{Array.from({length:5},(_,index)=><Icon key={index} name="star" fill={index<r.rating?'currentColor':'none'}/>)}</span><p>{r.comment}</p></article>)}{user ? <><button type="button" className="text-link" onClick={favorite}><Icon name="heart"/> Lưu bó hoa yêu thích</button><form onSubmit={submit} className="mt-4"><p>Đánh giá dành cho khách có đơn đã giao. Gửi lại để cập nhật đánh giá của bạn.</p><label>Số sao<select aria-label="Số sao" value={rating} onChange={e => setRating(e.target.value)}>{[5,4,3,2,1].map(n => <option key={n} value={n}>{n} sao</option>)}</select></label><label>Nhận xét<textarea required minLength="5" maxLength="1000" rows="3" value={comment} onChange={e => setComment(e.target.value)}/></label><button className="button button-dark" disabled={busy}>{busy ? 'Đang lưu...' : 'Gửi đánh giá'}</button></form></> : <p><Link to="/dang-nhap">Đăng nhập</Link> để lưu hoa yêu thích và đánh giá hoa đã mua.</p>}</section>;
}
