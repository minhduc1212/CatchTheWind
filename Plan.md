# Bản Thiết Kế Dự Án: 1-Click MITM Proxy App

## 1. Tổng Quan Kiến Trúc (Architecture Overview)
Ứng dụng giám sát mạng (MITM Proxy) hoạt động theo cơ chế **1-Click**: Mở app, bấm Start là tự động bắt toàn bộ luồng mạng của máy tính, không cần cấu hình thủ công. Giải pháp sử dụng kiến trúc đa tiến trình (Multi-process) chia làm 2 phần độc lập:
* **Backend (Xử lý mạng & OS):** Đảm nhiệm can thiệp hệ điều hành, cấu hình proxy, cài chứng chỉ và chặn bắt gói tin.
* **Frontend (Giao diện & Quản lý):** Đảm nhiệm hiển thị dữ liệu real-time, format JSON/HTML và quản lý vòng đời của Backend.

Thích hợp để làm công cụ debug API, kiểm tra bảo mật nội bộ, hoặc phân tích request phục vụ cho các luồng cào dữ liệu (web crawling) và tự động hóa.

---

## 2. Tech Stack Khuyến Nghị
* **Lõi Proxy (Backend):** Python 3 + `mitmproxy` + `websockets` (hoặc `FastAPI`).
* **Can thiệp OS (Windows):** `os`, `subprocess` (chạy lệnh `certutil`), `winreg` (sửa Registry).
* **App Shell (Quản lý tiến trình):** Node.js + Electron.
* **Giao diện (UI):** ReactJS hoặc VueJS + TailwindCSS.
* **Giao tiếp (IPC):** WebSockets (truyền data mạng) & Electron IPC (truyền lệnh Start/Stop).
* **Đóng gói:** `PyInstaller` (cho Python) và `electron-builder` (cho UI).

---

## 3. Lộ Trình Triển Khai (Implementation Plan)

### Giai đoạn 1: Xây Dựng Python Backend (Core Engine)
Mục tiêu: Tạo một script Python chạy ngầm có khả năng tự động hóa Windows và bắt gói tin.
1.  **Tự động hóa Chứng chỉ (Root CA):**
    * Sử dụng `subprocess` gọi `certutil -addstore root ~/.mitmproxy/mitmproxy-ca-cert.cer` để tự động Trust CA trên Windows.
2.  **Tự động hóa System Proxy:**
    * Sử dụng `winreg` can thiệp `HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings`.
    * Bật/tắt cờ `ProxyEnable` và set `ProxyServer` thành `127.0.0.1:8080`.
3.  **Xử lý Logic Gói tin:**
    * Viết addon cho `mitmproxy` (`def request`, `def response`).
    * Trích xuất Method, URL, Headers, giải mã (decode) Body.
4.  **Phát sóng Dữ liệu (Broadcaster):**
    * Mở một WebSocket server ở cổng `9000`.
    * Đóng gói thông tin Request/Response thành chuỗi JSON và `send()` qua WebSocket.

### Giai đoạn 2: Lớp Vỏ Electron (Process Manager)
Mục tiêu: Đóng gói thành App Desktop và xử lý an toàn (Failsafe).
1.  **Khởi chạy Backend:**
    * Trong `main.js`, dùng `child_process.spawn()` để gọi ngầm script Python khi app mở.
2.  **Cơ chế An toàn (Rất quan trọng):**
    * Bắt sự kiện `app.on('will-quit')`.
    * Trước khi app tắt, **bắt buộc** gọi script trả Registry `ProxyEnable` về `0` để tránh làm máy tính mất mạng.
    * Kill tiến trình Python (`pythonProcess.kill()`).

### Giai đoạn 3: Thiết Kế Frontend UI (React/Vue)
Mục tiêu: Hiển thị trực quan, dễ nhìn như Charles Proxy.
1.  **Layout:**
    * Chia đôi màn hình (`flex` / `grid`). Trái: Danh sách luồng mạng. Phải: Chi tiết.
2.  **Kết nối Data:**
    * Mở `new WebSocket('ws://localhost:9000')`.
    * Đổ dữ liệu vào mảng (State) để render danh sách.
3.  **Tính năng UI:**
    * Thanh tìm kiếm/Lọc (Filter theo Domain/Status).
    * Sử dụng thư viện như `react-json-view` để tự động format, tạo màu (syntax highlight) cho JSON body.
4.  **Tối ưu hóa (Performance):**
    * Chỉ render các component trong tầm nhìn (Virtualization) bằng `react-window` để tránh lag khi có hàng ngàn request đi qua.

### Giai đoạn 4: Đóng Gói Phân Phối (Packaging)
1.  Đóng gói thư mục Python thành file thực thi duy nhất bằng `PyInstaller` (VD: `core_engine.exe`).
2.  Cấu hình `electron-builder`: Đưa `core_engine.exe` vào mục `extraResources` để gắn kèm vào bộ cài đặt.
3.  Build ra file Setup (`.exe` hoặc `.dmg`) hoàn chỉnh.

---

## 4. Cấu Trúc Thư Mục Dự Kiến
```text
mitm-1click-app/
├── backend-python/
│   ├── main.py             # Entry point (Quản lý proxy & WebSocket)
│   ├── os_utils.py         # Chứa hàm winreg và certutil
│   ├── proxy_addon.py      # Logic bóc tách dữ liệu của mitmproxy
│   └── requirements.txt    # mitmproxy, websockets
├── frontend-electron/
│   ├── public/             # Index.html
│   ├── src/
│   │   ├── components/     # Table, DetailView, JSONViewer
│   │   ├── App.jsx         # Giao diện chính React
│   │   └── main.js         # Code Node.js quản lý tiến trình của Electron
│   ├── package.json        
│   └── vite.config.js      # Build tool (nếu dùng Vite)
└── README.md