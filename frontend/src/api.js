export async function api(path, options = {}) {
  let response;
  try {
    response = await fetch(`/api${path}`, {
      credentials: 'same-origin',
      ...options,
      headers: { ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...(options.headers || {}) },
      body: options.body && typeof options.body !== 'string' && !(options.body instanceof FormData) ? JSON.stringify(options.body) : options.body,
    });
  } catch {
    throw new Error('Không thể kết nối máy chủ. Vui lòng thử lại.');
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error || 'Yêu cầu chưa thành công.');
  return data;
}

export const money = (value) => new Intl.NumberFormat('vi-VN').format(value) + ' ₫';
export const orderStatus = { new: 'Mới', confirmed: 'Đã xác nhận', delivering: 'Đang giao', delivered: 'Đã giao', cancelled: 'Đã hủy' };
export const paymentMethod = { cod: 'Thanh toán khi nhận hoa', bank_transfer: 'Chuyển khoản ngân hàng' };
export const paymentStatus = { unpaid: 'Chưa thanh toán', paid: 'Đã thanh toán' };
