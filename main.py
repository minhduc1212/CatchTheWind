import asyncio
import requests
from urllib.parse import urlparse
from playwright.async_api import async_playwright
from playwright_stealth import Stealth 

class CaptureHTTP:
    def __init__(self, url: str):
        self.url = url
        self.session = requests.Session()
        self.base_domain = urlparse(url).netloc
        
        self.session.headers.update({
            'Accept': '*/*',
            'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
            'Connection': 'keep-alive',
            'Referer': url,
            'Origin': f"https://{self.base_domain}"
        })

    async def capture_network_requests(self):
        async with Stealth().use_async(async_playwright()) as p:
            browser = await p.firefox.launch(headless=False, args=['--mute-audio'])
            context = await browser.new_context(
                viewport={'width': 1920, 'height': 1080},
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0'
            )
            page = await context.new_page()

            # ---------------------------------------------------------
            # 1. LOGGING REQUEST NHƯ DEVTOOLS
            # ---------------------------------------------------------
            def handle_request(request):
                try:
                    url = request.url
                    method = request.method
                    headers = request.headers
                    
                    # In Log Request
                    print(f"\n[➡ REQUEST] {method} {url}")
                    print("  |-- Request Headers:")
                    for k, v in headers.items():
                        # Cắt ngắn value nếu quá dài để console không bị rối
                        val_str = v[:150] + '...' if len(v) > 150 else v
                        print(f"  |     {k}: {val_str}")
                    
                    # Logic lưu header của file TS đầu tiên
                    if ('.ts' in url or 'seg-' in url) and not self.ts_headers:
                        safe_headers = {
                            k: v for k, v in headers.items() 
                            if not k.startswith(':') and k.lower() not in ['host', 'content-length', 'accept-encoding']
                        }
                        self.ts_headers = safe_headers
                        print(f"  [🔑] ĐÃ LƯU REQUEST HEADER TỪ FILE TS MẪU NÀY!")
                except Exception as e:
                    print(f"  [!] Lỗi khi đọc Request: {e}")

            # ---------------------------------------------------------
            # 2. LOGGING RESPONSE NHƯ DEVTOOLS
            # ---------------------------------------------------------
            async def handle_response(response):
                try:
                    url = response.url
                    status = response.status
                    headers = response.headers
                    
                    # In Log Response
                    print(f"\n[⬅ RESPONSE] Status: {status} | URL: {url}")
                    print("  |-- Response Headers:")
                    for k, v in headers.items():
                        val_str = v[:150] + '...' if len(v) > 150 else v
                        print(f"  |     {k}: {val_str}")
                except Exception as e:
                    pass

            # Gắn bộ lắng nghe vào trang
            page.on("request", handle_request)
            page.on("response", handle_response)

            print(f"[*] Bắt đầu tải trang và giám sát mạng...")
            try:
                await page.goto(self.url, wait_until='domcontentloaded', timeout=60000)
                print("\n[*] Trang đã được tải. Đang giám sát traffic mạng...")
                print("[*] Nhấn Ctrl + C để dừng chương trình.\n")
                while True:
                    await asyncio.sleep(1)
            except Exception as e:
                print(f"[!] Lỗi khi điều hướng: {e}")

            playwright_cookies = await context.cookies()
            request_cookies = {cookie['name']: cookie['value'] for cookie in playwright_cookies}
            self.session.cookies.update(request_cookies)

            await browser.close()

async def main():
    url = input("\n[?] Nhập link trang bắt đầu: ").strip()
    if not url:
        return
    capture = CaptureHTTP(url)
    await capture.capture_network_requests()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n[*] Đã nhận lệnh dừng (Ctrl+C). Đang thoát chương trình...")