"""
main.py — Entry point for MITM Proxy Backend
Starts mitmproxy with the custom addon, runs a WebSocket broadcaster on port 9000,
and handles graceful cleanup of OS proxy settings on exit.
"""

import asyncio
import json
import signal
import sys
import threading
import logging
from queue import Queue, Empty
from mitmproxy.proxy import server_hooks
import websockets
from mitmproxy import http
from mitmproxy.tools.dump import DumpMaster
from mitmproxy.options import Options

from os_utils import set_system_proxy, clear_system_proxy, install_ca_cert
from proxy_addon import ProxyAddon

# ─── Logging ─────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s: %(message)s",
    datefmt="%H:%M:%S",
    stream=sys.stdout # Force write to stdout for Node JS child process readability
)
log = logging.getLogger("mitm-backend")

# ─── Shared queue between mitmproxy thread → WebSocket broadcaster ────────────
packet_queue: Queue = Queue()

# ─── WebSocket clients ────────────────────────────────────────────────────────
connected_clients: set = set()


# ─── Addon: DNS Bypass (Hardcode IP) ──────────────────────────────────────────
class DNSBypass:
    """
    Can thiệp ở tầng TCP (server_connect) ngay trước khi DNS Resolution diễn ra.
    """
    def server_connect(self, data: server_hooks.ServerConnectionHookData):
        # Kiểm tra xem đích đến có phải là tên miền bị chặn không
        if data.server.address and data.server.address[0] == "freetube.com.mx":
            # Ghi đè trực tiếp IP và Port. 
            # Mitmproxy sẽ bỏ qua bước hỏi DNS của Windows và cắm thẳng cáp tới IP này.
            data.server.address = ("104.21.21.50", 443)
            log.info("[DNS Bypass] Đã ép định tuyến thẳng tới 104.21.21.50 thành công!")


# ─── WebSocket Server ─────────────────────────────────────────────────────────
async def ws_handler(websocket):
    """Registers a new UI client and keeps the connection alive."""
    connected_clients.add(websocket)
    log.info(f"[WS] Client connected: {websocket.remote_address}")
    try:
        await websocket.wait_closed()
    finally:
        connected_clients.discard(websocket)
        log.info(f"[WS] Client disconnected.")


async def broadcaster():
    """
    Drains the packet_queue and fans out each JSON payload
    to every connected WebSocket client.
    """
    while True:
        await asyncio.sleep(0.02)  # 20 ms poll — low CPU, near-realtime
        batch = []
        try:
            while True:
                batch.append(packet_queue.get_nowait())
        except Empty:
            pass

        if batch and connected_clients:
            dead = set()
            for msg in batch:
                payload = json.dumps(msg)
                for ws in list(connected_clients):
                    try:
                        await ws.send(payload)
                    except Exception:
                        dead.add(ws)
            connected_clients.difference_update(dead)


async def run_ws_server():
    """Starts the WebSocket server and the broadcaster coroutine."""
    async with websockets.serve(ws_handler, "127.0.0.1", 9000):
        log.info("[WS] WebSocket broadcaster listening on ws://127.0.0.1:9000")
        await broadcaster()  # runs forever


# ─── mitmproxy Thread ─────────────────────────────────────────────────────────
def run_mitmproxy():
    """
    Runs mitmproxy in a background thread.
    Uses asyncio.run() because DumpMaster requires its own event loop.
    """
    async def _start():
        options = Options(
            listen_host="127.0.0.1",
            listen_port=8080,
            ssl_insecure=True,
        )
        master = DumpMaster(options, with_termlog=False, with_dumper=False)
        
        # Nạp các addons vào hệ thống
        master.addons.add(ProxyAddon(packet_queue))
        master.addons.add(DNSBypass()) # Nạp addon Bypass DNS vào đây
        
        try:
            await master.run()
        except KeyboardInterrupt:
            master.shutdown()

    asyncio.run(_start())


# ─── Shutdown Handling ────────────────────────────────────────────────────────
def shutdown(signum, frame):
    log.info("[*] Shutting down — restoring OS proxy settings...")
    clear_system_proxy()
    sys.exit(0)


def listen_stdin():
    """Listens to stdin for quit commands from the Electron parent process."""
    while True:
        try:
            line = sys.stdin.readline()
            if not line:
                break
            if line.strip().lower() in ("quit", "exit", "stop"):
                log.info("[*] Received quit command from parent process.")
                break
        except Exception:
            break
    clear_system_proxy()
    sys.exit(0)


# ─── Main ─────────────────────────────────────────────────────────────────────
def main():
    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)

    # Start stdin listener thread in background
    stdin_thread = threading.Thread(target=listen_stdin, daemon=True)
    stdin_thread.start()

    log.info("[*] Installing mitmproxy Root CA certificate...")
    install_ca_cert()

    log.info("[*] Activating system proxy  →  127.0.0.1:8080")
    set_system_proxy("127.0.0.1", 8080)

    # mitmproxy runs in its own thread (it owns its own event loop)
    proxy_thread = threading.Thread(target=run_mitmproxy, daemon=True)
    proxy_thread.start()
    log.info("[*] mitmproxy running on 127.0.0.1:8080")

    # WebSocket broadcaster runs in the main thread's event loop
    try:
        asyncio.run(run_ws_server())
    except KeyboardInterrupt:
        pass
    finally:
        log.info("[*] Cleanup: restoring OS proxy settings...")
        clear_system_proxy()


if __name__ == "__main__":
    main()
