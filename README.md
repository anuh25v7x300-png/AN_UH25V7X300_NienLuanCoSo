# Tiệm Hoa An — Niên luận cơ sở CT271

Website bán hoa tươi của **Nguyễn Thị Thùy An — UH25V7X300**, gồm frontend React và backend ElysiaJS/Bun trong cùng repository. Dữ liệu lưu bằng SQLite.

## Chạy trên máy Windows mới

Cần có Git để tải mã nguồn và Internet cho lần cài đầu tiên. Mở PowerShell hoặc Terminal, chạy:

```powershell
git clone https://github.com/anuh25v7x300-png/AN_UH25V7X300_NienLuanCoSo.git
cd AN_UH25V7X300_NienLuanCoSo
.\start.cmd
```

Nếu đã tải hoặc giải nén mã nguồn, mở Terminal tại thư mục chứa `start.cmd`, `backend` và `frontend`, rồi chỉ chạy:

```powershell
.\start.cmd
```

## Chạy trên Linux/macOS

Cần Git, Internet, `curl` hoặc `wget`, và `unzip` hoặc Python 3 để giải nén môi trường:

```bash
git clone https://github.com/anuh25v7x300-png/AN_UH25V7X300_NienLuanCoSo.git
cd AN_UH25V7X300_NienLuanCoSo
sh start.sh
```

Các script `start.cmd` và `start.sh` tự thực hiện:

1. Tải Bun **1.4.4** nếu chưa có đúng phiên bản; kiểm tra SHA-256 và lưu môi trường cục bộ trong `.runtime/`.
2. Cài thư viện backend/frontend theo các file `bun.lock`.
3. Giữ nguyên `backend/.env` hiện có; nếu thiếu thì tạo từ `.env.example`.
4. Tạo DB, cấu trúc bảng, dữ liệu hoa mẫu và tài khoản quản trị.
5. Chạy đồng thời backend và frontend.

Mở **[http://localhost:5173](http://localhost:5173)** để sử dụng. API mặc định chạy tại **[http://localhost:3001/api/health](http://localhost:3001/api/health)**. Hai cổng này cần còn trống.

Giữ cửa sổ Terminal trong lúc sử dụng. Nhấn **Ctrl+C** để dừng; nếu Windows hỏi dừng batch job thì chọn `Y`. Những lần sau vẫn chạy `start.cmd` hoặc `sh start.sh`.

## Tài khoản quản trị mẫu

| Thông tin | Giá trị |
| --- | --- |
| Email | `admin@tiemhoaan.vn` |
| Mật khẩu | `Admin123!` |

Tài khoản mẫu được tạo khi khởi tạo DB mới theo `SEED_ADMIN_EMAIL` và `SEED_ADMIN_PASSWORD` trong `backend/.env`. Nếu đã đổi mật khẩu, dùng mật khẩu đã đổi: chạy lại script không đặt lại mật khẩu của tài khoản đã tồn tại. Khách hàng tự đăng ký trên giao diện.

## DB có tự tải không?

**DB được tạo tự động trên máy mới, không cần tải hoặc nhập file SQL thủ công.** SQLite được tích hợp trong Bun. Khi chạy script lần đầu, backend tự tạo:

- File mặc định: `backend/data/flowers.sqlite`.
- Chín bảng: `users`, `sessions`, `categories`, `products`, `orders`, `order_items`, `favorites`, `reviews`, `contact_messages`.
- Ba danh mục, sáu sản phẩm hoa mẫu và tài khoản admin ở trên.

Chạy lại script giữ dữ liệu hiện có và không nhân đôi danh mục, sản phẩm mẫu. Các đơn hàng, tài khoản khách và ảnh tải lên từ máy cũ không được tự đồng bộ sang máy mới. Nếu muốn chuyển dữ liệu cũ theo cấu hình mặc định, dừng ứng dụng trên cả hai máy rồi sao chép toàn bộ thư mục `backend/data/` sang máy mới.

Cấu trúc SQL để tham khảo nằm trong `backend/schema.sql`; cấu trúc được ứng dụng khởi tạo qua `backend/src/db.js`. DB và ảnh tải lên là dữ liệu sinh khi chạy, được Git bỏ qua. Ảnh mẫu cần cho giao diện đã có trong mã nguồn.

## Các lệnh bổ sung

Chỉ cài môi trường, thư viện và khởi tạo DB, chưa chạy ứng dụng:

```powershell
.\setup.cmd
```

Trên Linux/macOS:

```bash
sh setup.sh
```

Nếu Bun >= 1.4.4 đã có sẵn trong PATH, có thể chạy từ thư mục gốc:

```bash
bun run setup
bun run dev
```

Biên dịch frontend khi Bun đã có trong PATH:

```bash
bun run build
```

## Chức năng chính

- Tra cứu, tìm kiếm, lọc và xem chi tiết hoa; quản lý giỏ hàng.
- Đăng ký/đăng nhập, hồ sơ, đổi mật khẩu; phân quyền khách hàng và quản trị.
- Đặt hoa COD, lịch sử/chi tiết đơn và hủy đơn đủ điều kiện.
- Hoa yêu thích, đánh giá sau khi giao hàng và biểu mẫu liên hệ.
- Quản trị sản phẩm, tải ảnh, danh mục, đơn hàng, tài khoản khách, đánh giá và lời nhắn; thống kê doanh thu.

Chuyển khoản thủ công được bật khi điền đủ `BANK_NAME`, `BANK_ACCOUNT_NUMBER`, `BANK_ACCOUNT_NAME` trong `backend/.env` rồi khởi động lại ứng dụng. Quản trị đối chiếu và xác nhận tiền thủ công. Ngày nhận là mong muốn của khách; phí giao và lịch giao cần cửa hàng xác nhận.
