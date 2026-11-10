import Icon from './Icon';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from './api';
import ProductCard from './ProductCard';

const priceOptions = [
  { value: '', label: 'Mọi mức giá' },
  { value: 'under-400', label: 'Dưới 400.000 ₫' },
  { value: '400-500', label: '400.000–500.000 ₫' },
  { value: 'over-500', label: 'Trên 500.000 ₫' },
];

export default function Catalog({ add }) {
  const [params, setParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState(params.get('search') || '');
  const currentQuery = params.toString();

  useEffect(() => { api('/categories').then(setCategories).catch(e => setError(e.message)); }, []);
  useEffect(() => { setSearch(params.get('search') || ''); }, [currentQuery]);
  useEffect(() => {
    let active = true;
    const request = new URLSearchParams(params);
    const price = request.get('price');
    request.delete('price');
    if (price === 'under-400') request.set('max_price', '399999');
    if (price === '400-500') { request.set('min_price', '400000'); request.set('max_price', '500000'); }
    if (price === 'over-500') request.set('min_price', '500001');
    setLoading(true); setError('');
    api(`/products?${request.toString()}`).then(data => { if (active) setProducts(data); }).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [currentQuery]);

  const update = (key, value) => {
    setParams(previous => {
      const next = new URLSearchParams(previous);
      if (value) next.set(key, value); else next.delete(key);
      return next;
    });
  };
  const reset = () => { setSearch(''); setParams({}); };
  const hasFilter = ['category', 'search', 'price', 'in_stock', 'sort'].some(key => params.has(key));
  return <main className="container page-space catalog-page">
    <div className="page-intro"><p className="eyebrow">BỘ SƯU TẬP</p><h1>Chọn hoa cho một ngày đặc biệt.</h1><p>Mỗi bó hoa là một cách nói yêu thương.</p></div>
    <div className="catalog-tools"><div className="category-list"><button type="button" className={!params.get('category') ? 'active' : ''} onClick={() => update('category', '')}>Tất cả</button>{categories.map(c => <button type="button" key={c.id} className={params.get('category') === c.slug ? 'active' : ''} onClick={() => update('category', c.slug)}>{c.name}</button>)}</div>
      <form className="catalog-search" role="search" onSubmit={e => { e.preventDefault(); update('search', search.trim()); }}><input aria-label="Tìm hoa" placeholder="Tìm tên hoa..." value={search} onChange={e => setSearch(e.target.value)} /><button aria-label="Tìm kiếm" title="Tìm kiếm"><Icon name="search"/></button></form>
    </div>
    <div className="catalog-filters"><div className="catalog-filter-controls"><label>Khoảng giá<select aria-label="Lọc theo giá" value={params.get('price') || ''} onChange={e => update('price', e.target.value)}>{priceOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label><label>Sắp xếp<select aria-label="Sắp xếp" value={params.get('sort') || ''} onChange={e => update('sort', e.target.value)}><option value="">Mới nhất</option><option value="price-asc">Giá tăng dần</option><option value="price-desc">Giá giảm dần</option></select></label><label className="stock-filter"><input type="checkbox" checked={params.get('in_stock') === '1'} onChange={e => update('in_stock', e.target.checked ? '1' : '')} /> Còn nhận đặt</label></div><div className="catalog-count"><span>{loading ? 'Đang tìm...' : `${products.length} bó hoa`}</span>{hasFilter && <button type="button" onClick={reset}>Xóa bộ lọc</button>}</div></div>
    {error && <div className="notice" role="alert">{error}</div>}
    {loading ? <p className="catalog-loading">Đang tải hoa...</p> : products.length ? <div className="product-grid catalog-grid">{products.map(product => <ProductCard key={product.id} product={product} onAdd={add} />)}</div> : <div className="empty-state"><h2>Chưa tìm thấy bó hoa phù hợp.</h2><p>Thử từ khóa hoặc mức giá khác nhé.</p><button className="button button-dark" onClick={reset}>Xem tất cả</button></div>}
  </main>;
}
