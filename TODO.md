# Idea
    Capture all request, response, http, api, flow of web, content and print to cmd, also save in readable suitable data file

# Tech
    python playwright with firefox in pw_capture
    mitm fastapi, react, electron

# Error
    """
    Bản chất của lỗi: Cuộc chiến "Phân giải tên miền" (DNS)
    Khi bạn gõ freetube.com.mx vào thanh địa chỉ, máy tính thực chất không biết máy chủ đó nằm ở đâu. Nó cần một thao tác gọi là DNS Resolution để dịch tên miền thành địa chỉ IP (ví dụ: 104.21.21.50). Lỗi xảy ra do sự khác biệt trong cách các ứng dụng đi tìm IP này:

    Trình duyệt (Chrome): Các trình duyệt hiện đại được trang bị tính năng Secure DNS (DoH - DNS over HTTPS). Nó tạo một luồng mã hóa đi thẳng tới máy chủ DNS của Google (8.8.8.8) hoặc Cloudflare (1.1.1.1) để xin IP. Nhờ vậy, nó vượt qua được mọi bộ lọc của nhà mạng và truy cập web bình thường.

    Công cụ Proxy (Charles/Mitmproxy) & Hệ điều hành (Lệnh Ping): Những công cụ này phụ thuộc vào DNS mặc định của hệ điều hành Windows. Windows lại lấy cấu hình DNS từ Router mạng (do ISP cung cấp). Khi nhà mạng chủ động xóa hoặc chặn tên miền này trong hệ thống DNS của họ, Windows sẽ nhận được câu trả lời là "Không tìm thấy".

    Kết quả (Lỗi 503 UnknownHost): Proxy không lấy được IP, nên nó đành ngắt đường hầm kết nối ngay từ bước đầu tiên và báo lỗi UnknownHostException.
    """
        DNS SPoofing charles proxy for https://freetube.com.mx/
        DNS checker