import Icon from './Icon';
import { Link } from 'react-router-dom';
import { money } from './api';

export default function ProductCard({ product, onAdd }) {
  return <article className="product-card">
    <Link className="product-media" to={`/hoa/${product.id}`}><img src={product.image_url || '/images/hero.webp'} alt={product.name} loading="lazy" />{product.available_qty < 1 && <span className="sold-out">Tạm hết</span>}</Link>
    <div className="product-info"><div><small>{product.category_name}</small><Link to={`/hoa/${product.id}`}><h3>{product.name}</h3></Link><strong>{money(product.price)}</strong></div>
      <button className="round-add" onClick={() => onAdd(product)} disabled={!product.available_qty} aria-label={`Thêm ${product.name} vào giỏ`}><Icon name="plus"/></button></div>
  </article>;
}
