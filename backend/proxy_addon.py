"""
proxy_addon.py — mitmproxy addon.
Hooks into every request and response, extracts structured data,
and puts it on the shared queue for the WebSocket broadcaster.
"""

import json
import time
import gzip
import zlib
import brotli
import logging
from queue import Queue
from mitmproxy import http

log = logging.getLogger("mitm-backend.addon")

# Content-Types treated as text — everything else is base64 or truncated
TEXT_TYPES = (
    "text/",
    "application/json",
    "application/xml",
    "application/x-www-form-urlencoded",
    "application/javascript",
    "application/graphql",
)

MAX_BODY_BYTES = 256 * 1024  # 256 KB — truncate larger bodies to prevent UI lag / OOM


def _decode_body(content: bytes, content_encoding: str, content_type: str) -> tuple[str, bool]:
    """
    Decompress + decode body bytes to a string.
    Returns (decoded_string, is_truncated).
    """
    if not content:
        return "", False

    # Decompress
    try:
        enc = content_encoding.lower() if content_encoding else ""
        if "br" in enc:
            content = brotli.decompress(content)
        elif "gzip" in enc:
            content = gzip.decompress(content)
        elif "deflate" in enc:
            content = zlib.decompress(content)
    except Exception:
        pass  # decompression failed — return raw

    truncated = len(content) > MAX_BODY_BYTES
    content = content[:MAX_BODY_BYTES]

    ct = content_type.lower() if content_type else ""
    if any(ct.startswith(t) for t in TEXT_TYPES):
        try:
            text = content.decode("utf-8", errors="replace")
            # If it looks like JSON, pretty-print it
            if "json" in ct:
                try:
                    text = json.dumps(json.loads(text), ensure_ascii=False, indent=2)
                except Exception:
                    pass
            return text, truncated
        except Exception:
            pass

    # Binary — hex preview
    return content.hex()[:512] + ("..." if truncated else ""), truncated


class ProxyAddon:
    """mitmproxy addon that streams structured traffic data to the UI."""

    # Temporary store keyed by flow id, holding request metadata
    # while we wait for the matching response.
    _pending: dict = {}

    def __init__(self, queue: Queue):
        self.queue = queue

    # ── mitmproxy lifecycle ────────────────────────────────────────────────────

    def request(self, flow: http.HTTPFlow):
        req = flow.request
        fid = flow.id

        content_type = req.headers.get("content-type", "")
        content_encoding = req.headers.get("content-encoding", "")
        body, body_truncated = _decode_body(req.content, content_encoding, content_type)

        self._pending[fid] = {
            "id": fid,
            "timestamp": time.time(),
            "method": req.method,
            "url": req.pretty_url,
            "host": req.pretty_host,
            "path": req.path,
            "scheme": req.scheme,
            "request": {
                "headers": dict(req.headers),
                "body": body,
                "bodyTruncated": body_truncated,
                "contentType": content_type,
            },
            "response": None,
            "status": None,
            "duration_ms": None,
        }

    def response(self, flow: http.HTTPFlow):
        fid = flow.id
        res = flow.response

        if fid not in self._pending:
            return

        record = self._pending.pop(fid)
        req_time = record["timestamp"]
        duration_ms = round((time.time() - req_time) * 1000, 1)

        content_type = res.headers.get("content-type", "")
        content_encoding = res.headers.get("content-encoding", "")
        body, body_truncated = _decode_body(res.content, content_encoding, content_type)

        record.update({
            "status": res.status_code,
            "duration_ms": duration_ms,
            "response": {
                "status": res.status_code,
                "reason": res.reason,
                "headers": dict(res.headers),
                "body": body,
                "bodyTruncated": body_truncated,
                "contentType": content_type,
            },
        })

        self.queue.put(record)

    def error(self, flow: http.HTTPFlow):
        fid = flow.id
        if fid in self._pending:
            record = self._pending.pop(fid)
            record.update({
                "status": 0,
                "error": str(flow.error),
                "response": None,
            })
            self.queue.put(record)
