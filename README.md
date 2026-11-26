# Personal Wallet — Ví Thu Chi & Mục Tiêu Tiết Kiệm (MERN + Expo)

Dự án ví cá nhân giúp theo dõi thu chi hằng tháng và trích tiền vào các mục tiêu tiết kiệm sắp tới.
Công thức dòng tiền xuyên suốt hệ thống:

> **Số dư khả dụng** = Tổng Thu − Tổng Chi − Tổng tiền đã trích vào Mục tiêu tiết kiệm

## Cấu trúc thư mục

```text
personal-wallet/
├── server/   # Backend API (Node.js + Express + MongoDB + JWT)
├── web/      # Web Dashboard (React + Vite + Tailwind CSS + Recharts)
└── mobile/   # Mobile App (React Native + Expo + Expo Router)
```

---

## Bước 1: Chạy Backend (`server/`)

1. Cài đặt thư viện:
   ```bash
   cd server
   npm install
   ```
2. Tạo file `.env` từ file mẫu:
   ```bash
   cp .env.example .env
   ```
   Sửa `MONGO_URI` thành chuỗi kết nối MongoDB Atlas (hoặc MongoDB local `mongodb://127.0.0.1:27017/personal_wallet`) và đặt lại `ADMIN_EMAIL` / `ADMIN_PASSWORD` theo ý bạn.
3. Tạo tài khoản mặc định + 8 danh mục thu/chi cơ bản:
   ```bash
   npm run seed
   ```
4. Chạy server:
   ```bash
   npm run dev
   ```
   Kiểm tra hoạt động tại `http://localhost:5000/api/health`.

---

## Bước 2: Chạy Web Dashboard (`web/`)

1. Mở terminal mới và cài đặt:
   ```bash
   cd web
   npm install
   cp .env.example .env
   npm run dev
   ```
2. Mở trình duyệt tại `http://localhost:5173` và đăng nhập bằng tài khoản đã seed ở Bước 1.

---

## Bước 3: Chạy Mobile App (`mobile/`)

1. Mở terminal mới và cài đặt:
   ```bash
   cd mobile
   npm install
   cp .env.example .env
   ```
2. **Quan trọng khi test trên điện thoại thật bằng Expo Go:**
   Mở `mobile/.env` và thay `localhost` bằng **IP LAN của máy tính** (cùng Wi-Fi với điện thoại).
   - Windows: chạy `ipconfig` xem dòng `IPv4 Address` (ví dụ `192.168.1.15`).
   - macOS/Linux: chạy `ifconfig` hoặc `ip a`.
   - Ví dụ trong `mobile/.env`:
     ```env
     EXPO_PUBLIC_API_URL=http://192.168.1.15:5000/api
     ```
3. Khởi động Expo:
   ```bash
   npx expo start
   ```
4. Dùng ứng dụng **Expo Go** trên điện thoại quét mã QR.

---

## Gợi ý Deploy dùng thật (Miễn phí)

- **MongoDB:** MongoDB Atlas (Free M0 cluster).
- **Server:** Render.com hoặc Koyeb (nhớ khai báo biến môi trường từ `.env`).
- **Web:** Vercel (chọn Root Directory là `web`, khai báo `VITE_API_URL` trỏ tới link server Render).
- **Mobile:** Đổi `EXPO_PUBLIC_API_URL` sang link server Render, sau đó chạy qua Expo Go hoặc build file `.apk` bằng `eas build -p android --profile preview`.
