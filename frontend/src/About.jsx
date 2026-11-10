import Icon from './Icon';
import { Link } from 'react-router-dom';

export default function About() {
  return <main className="about-page">
    <section className="about-hero">
      <div className="about-hero-photo"><img src="/images/hoa-mong-mo.webp" alt="Bó hoa tông hồng được gói bằng giấy màu kem" /></div>
      <div className="about-hero-copy"><p className="eyebrow">VỀ TIỆM HOA AN</p><h1>Mỗi bó hoa,<br/><em>một lời chân thành.</em></h1><p>Tiệm Hoa An là không gian dành cho những khoảnh khắc bạn muốn gửi đi một chút dịu dàng.</p><Link className="button button-dark" to="/hoa">Xem những bó hoa <Icon name="arrowUpRight"/></Link></div>
    </section>
    <section className="container about-statement"><p className="eyebrow">ĐIỀU CHÚNG MÌNH TIN</p><h2>Không cần một dịp thật lớn để trao đi niềm vui.</h2><p>Một bó hoa có thể thay lời cảm ơn, lời chúc mừng hay câu “mình đang nghĩ đến bạn”. Vì thế, từng mẫu hoa được giới thiệu rõ ràng để bạn dễ chọn theo dịp, theo sắc màu và ngân sách.</p></section>
    <section className="about-values"><div className="container"><div className="section-heading"><div><p className="eyebrow">TỪ LÚC CHỌN ĐẾN LÚC TRAO</p><h2>Một hành trình đơn giản.</h2></div></div><div className="about-values-grid"><div><span>01</span><h3>Chọn hoa</h3><p>Khám phá các mẫu hoa và xem giá, mô tả trước khi đặt.</p></div><div><span>02</span><h3>Gửi lời nhắn</h3><p>Điền thông tin người nhận, ngày mong muốn và lời nhắn trên thiệp.</p></div><div><span>03</span><h3>Chờ xác nhận</h3><p>Cửa hàng xem đơn và xác nhận khả năng chuẩn bị, giao hoa.</p></div></div></div></section>
    <section className="about-last"><img src="/images/hero.webp" alt="Bó hoa màu kem dưới ánh sáng dịu" /><div><p className="eyebrow light">GỬI MỘT CHÚT YÊU THƯƠNG</p><h2>Hoa đẹp nhất khi được trao đúng người.</h2><Link to="/lien-he" className="button button-light">Gửi lời nhắn cho tiệm <Icon name="arrowUpRight"/></Link></div></section>
  </main>;
}
