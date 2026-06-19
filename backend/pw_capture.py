import asyncio
import requests
from urllib.parse import urlparse
from playwright.async_api import async_playwright
from playwright_stealth import Stealth 
import logging 

log_file = 'network_capture.log'
logging.basicConfig(level=logging.INFO
                    , format='[%(asctime)s] %(levelname)s: %(message)s'
                    , datefmt='%Y-%m-%d %H:%M:%S'
                    , handlers=[logging.FileHandler(log_file, mode='w', encoding='utf-8'), logging.StreamHandler()])

class CaptureHTTP:
    def __init__(self, url: str):
        self.url = url
        self.session = requests.Session()
        self.base_domain = urlparse(url).netloc
        self.ts_headers = {}
        
        self.session.headers.update({
            'Accept': '*/*',
            'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
            'Connection': 'keep-alive',
            'Referer': url,
            'Origin': f"https://{self.base_domain}"
        })

    async def capture_network_requests(self):
        async with Stealth().use_async(async_playwright()) as p:
            browser = await p.firefox.launch(
                headless=False,
                args=['--mute-audio'],
                firefox_user_prefs={
                    # Force Firefox to use system DNS (disables DNS-over-HTTPS
                    # which can silently fail inside Playwright's sandboxed Firefox)
                    "network.trr.mode": 5,              # 5 = off, use OS resolver only
                    "network.trr.uri": "",
                    "network.dns.disablePrefetch": False,

                    # Disable IPv6 probing — common cause of NS_ERROR_UNKNOWN_HOST
                    # when the host resolves only to IPv4 but Firefox tries AAAA first
                    "network.dns.disableIPv6": True,

                    # Relax SSL/cert strictness that can manifest as host errors
                    "security.mixed_content.block_active_content": False,
                    "network.stricttransportsecurity.preloadlist": False,
                }
            )
            context = await browser.new_context(
                viewport={'width': 1920, 'height': 1080},
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0'
            )
            page = await context.new_page()

            # Intercept and abort ads, tracking, and analytics to speed up load and prevent OOM
            async def intercept_route(route):
                url = route.request.url.lower()
                blacklist = [
                    "analytics", "doubleclick", "googleadservices", "adsystem", 
                    "adservice", "adskeeper", "adsterra", "popads", "popcash", 
                    "cnzz.com", "umeng.com", "statcounter", "hotjar", "mixpanel",
                    "facebook.net", "facebook.com/tr", "coeus", "log.", "report",
                    "stat", "ping", "metrics", "beacon", "telemetry", "track",
                    "advertis", "syndication", "amazon-adsystem", "adnxs",
                    "criteo", "pubmatic", "rubiconproject", "casalemedia",
                    "openx", "yieldlab", "indexww", "smartadserver"
                ]
                if any(k in url for k in blacklist):
                    await route.abort()
                else:
                    await route.continue_()

            await page.route("**/*", intercept_route)

            # ---------------------------------------------------------
            # 1. LOGGING REQUEST
            # ---------------------------------------------------------
            def handle_request(request):
                try:
                    url = request.url
                    method = request.method
                    headers = request.headers
                    
                    logging.info(f"➡ Request: {method} {url[:90]}...")
                    
                    # Logic lưu header của file TS đầu tiên
                    if ('.ts' in url or 'seg-' in url) and not self.ts_headers:
                        safe_headers = {
                            k: v for k, v in headers.items() 
                            if not k.startswith(':') and k.lower() not in ['host', 'content-length', 'accept-encoding']
                        }
                        self.ts_headers = safe_headers
                        logging.info(f"  [🔑] ĐÃ LƯU REQUEST HEADER TỪ FILE TS MẪU NÀY!")
                except Exception as e:
                    logging.error(f"  [!] Lỗi khi đọc Request: {e}")

            # ---------------------------------------------------------
            # 2. LOGGING RESPONSE
            # ---------------------------------------------------------
            async def handle_response(response):
                try:
                    url = response.url
                    status = response.status
                    logging.info(f"⬅ Response: {status} {url[:90]}...")
                except Exception as e:
                    logging.error(f"  [!] Lỗi khi đọc Response: {e}")

            # Gắn bộ lắng nghe vào trang
            page.on("request", handle_request)
            page.on("response", handle_response)

            logging.info(f"[*] Bắt đầu tải trang và giám sát mạng...")
            try:
                await page.goto(self.url, wait_until='domcontentloaded', timeout=60000)
                logging.info("\n[*] Trang đã được tải. Đang giám sát traffic mạng...")
                logging.info   ("[*] Nhấn Ctrl + C để dừng chương trình.\n")
                while True:
                    await asyncio.sleep(1)
            except Exception as e:
                logging.error(f"[!] Lỗi khi điều hướng: {e}")

            playwright_cookies = await context.cookies()
            request_cookies = {cookie['name']: cookie['value'] for cookie in playwright_cookies}
            self.session.cookies.update(request_cookies)

            await browser.close()

async def main():
    import sys
    url = ""
    if len(sys.argv) > 1:
        url = sys.argv[1].strip()
    else:
        url = input("\n[?] Nhập link trang bắt đầu: ").strip()
        
    if not url:
        return
    capture = CaptureHTTP(url)
    await capture.capture_network_requests()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logging.info("\n[*] Đã nhận lệnh dừng (Ctrl+C). Đang thoát chương trình...")
