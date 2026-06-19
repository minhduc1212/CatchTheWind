"""
os_utils.py — OS-level proxy and certificate management.
Supports Windows (winreg) with a graceful no-op fallback for Linux/macOS
so the backend can be tested cross-platform.
"""

import os
import subprocess
import logging
import sys

log = logging.getLogger("mitm-backend.os")

# ─── Certificate ──────────────────────────────────────────────────────────────

def get_ca_cert_path() -> str:
    """Returns the path to the mitmproxy Root CA certificate."""
    home = os.path.expanduser("~")
    return os.path.join(home, ".mitmproxy", "mitmproxy-ca-cert.cer")


def install_ca_cert():
    """
    Trusts the mitmproxy Root CA in the Windows certificate store.
    Runs `certutil -addstore root <cert>` silently.
    Skipped if the cert file doesn't exist yet (first launch before mitmproxy
    auto-generates it) — caller should retry after mitmproxy has started.
    """
    cert_path = get_ca_cert_path()

    if not os.path.exists(cert_path):
        log.warning(
            f"[CA] Cert not found at {cert_path}. "
            "mitmproxy will generate it on first run — please restart the app once."
        )
        return

    if sys.platform == "win32":
        try:
            result = subprocess.run(
                ["certutil", "-addstore", "-f", "root", cert_path],
                capture_output=True,
                text=True,
            )
            if result.returncode == 0:
                log.info("[CA] Root CA installed successfully.")
            else:
                log.error(f"[CA] certutil failed: {result.stderr.strip()}")
        except FileNotFoundError:
            log.error("[CA] certutil not found — are you on Windows?")
    else:
        log.info(f"[CA] Non-Windows platform — skipping certutil. Cert at: {cert_path}")


# ─── System Proxy (Windows Registry) ─────────────────────────────────────────

def set_system_proxy(host: str, port: int):
    """
    Points Windows' global HTTP/S proxy to host:port via the registry.
    Key: HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings
    """
    if sys.platform != "win32":
        log.info(f"[Proxy] Non-Windows — skipping registry proxy. Would set {host}:{port}")
        return

    try:
        import winreg
        key = winreg.OpenKey(
            winreg.HKEY_CURRENT_USER,
            r"Software\Microsoft\Windows\CurrentVersion\Internet Settings",
            0,
            winreg.KEY_SET_VALUE,
        )
        winreg.SetValueEx(key, "ProxyServer", 0, winreg.REG_SZ, f"{host}:{port}")
        winreg.SetValueEx(key, "ProxyEnable", 0, winreg.REG_DWORD, 1)
        winreg.SetValueEx(key, "ProxyOverride", 0, winreg.REG_SZ, "localhost;127.0.0.1;<local>")
        winreg.CloseKey(key)
        log.info(f"[Proxy] System proxy enabled → {host}:{port}")

        # Tell WinInet to pick up the change immediately
        _refresh_wininet()
    except Exception as e:
        log.error(f"[Proxy] Failed to set registry proxy: {e}")


def clear_system_proxy():
    """
    Disables the Windows system proxy.
    ALWAYS called on shutdown — critical failsafe to prevent user losing internet.
    """
    if sys.platform != "win32":
        log.info("[Proxy] Non-Windows — skipping registry proxy clear.")
        return

    try:
        import winreg
        key = winreg.OpenKey(
            winreg.HKEY_CURRENT_USER,
            r"Software\Microsoft\Windows\CurrentVersion\Internet Settings",
            0,
            winreg.KEY_SET_VALUE,
        )
        winreg.SetValueEx(key, "ProxyEnable", 0, winreg.REG_DWORD, 0)
        winreg.CloseKey(key)
        log.info("[Proxy] System proxy disabled — internet restored.")
        _refresh_wininet()
    except Exception as e:
        log.error(f"[Proxy] Failed to clear registry proxy: {e}")


def _refresh_wininet():
    """
    Calls InternetSetOption to notify WinInet of proxy changes
    without requiring a system restart or browser refresh.
    """
    try:
        import ctypes
        INTERNET_OPTION_SETTINGS_CHANGED = 39
        INTERNET_OPTION_REFRESH = 37
        wininet = ctypes.windll.wininet
        wininet.InternetSetOptionW(0, INTERNET_OPTION_SETTINGS_CHANGED, 0, 0)
        wininet.InternetSetOptionW(0, INTERNET_OPTION_REFRESH, 0, 0)
    except Exception as e:
        log.warning(f"[Proxy] WinInet refresh failed (non-critical): {e}")
