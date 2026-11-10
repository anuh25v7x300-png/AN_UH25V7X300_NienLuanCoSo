import Icon from './Icon';
import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { api } from './api';
import ProductCard from './ProductCard';

export default function Favorites({ user, add, notify }) {
  const [products, setProducts] = useState(null), [error, setError] = useState('');
  useEffect(() => { if (user) api('/favorites').then(setProducts).catch(e => setError(e.message)); }, [user]);
  if (user === undefined) return <main className="container page-space">Đang tải...</main>;
  if (!user) return <Navigate to="/dang-nhap" replace />;
  const remove = async id => { try { await api(`/favorites/${id}`, { method: 'DELETE' }); setProducts(old => old.filter(p => p.id !== id)); notify('success', 'Đã bỏ lưu bó hoa.'); } catch (e) { setError(e.message); } };
  return <main className="container page-space"><div className="page-intro"><p className="eyebrow">DÀNH RIÊNG CHO BẠN</p><h1>Những bó hoa yêu thích.</h1></div>{error && <p role="alert" className="notice error">{error}</p>}{products === null ? !error && <p>Đang tải...</p> : products.length ? <div className="product-grid">{products.map(product => <div key={product.id}><ProductCard product={product} onAdd={add}/><button className="text-link mt-3" onClick={() => remove(product.id)}><Icon name="heart"/> Bỏ lưu</button></div>)}</div> : <div className="empty-state"><p>Bạn chưa lưu bó hoa nào.</p><Link to="/hoa" className="button button-dark">Khám phá bó hoa</Link></div>}</main>;
}
