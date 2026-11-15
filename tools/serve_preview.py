#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""tools/serve_preview.py — เปิด Preview ผ่าน local HTTP (ไม่ใช่การ Deploy: ฟังเฉพาะเครื่องนี้ที่ 127.0.0.1)

วิธีใช้:   python3 tools/serve_preview.py            (Windows: py tools\\serve_preview.py หรือดับเบิลคลิก START_PREVIEW_WINDOWS.bat)
แล้วเปิด:  http://127.0.0.1:8765/dist/preview.html   (สคริปต์เปิดเบราว์เซอร์ให้เอง ยกเว้นใส่ --no-open)
ตัวเลือก:  --port 8765   --no-open

ทำไมต้องเปิดผ่าน HTTP: แผนที่ OpenStreetMap ต้องการ Referer ซึ่งไฟล์ที่เปิดแบบ file:// ไม่ส่ง
สิ่งที่ยังต้องใช้อินเทอร์เน็ตของเครื่องนี้: tile.openstreetmap.org (แผนที่), docs.google.com (รายการจาก Sheet),
drive.google.com / github.com (รูป), fonts.googleapis.com (แบบอักษร) — ถ้าเครือข่ายบล็อก หน้าเว็บจะแจ้งสาเหตุในส่วนนั้น
"""
import argparse, functools, http.server, os, socket, sys, threading, webbrowser

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGE = "dist/preview.html"


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = dict(http.server.SimpleHTTPRequestHandler.extensions_map, **{".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml"})

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")          # แก้ไฟล์แล้วกดรีเฟรชเห็นผลทันที
        self.send_header("X-Content-Type-Options", "nosniff")
        super().end_headers()

    def log_message(self, fmt, *args):
        if "--quiet" not in sys.argv: sys.stderr.write("  %s\n" % (fmt % args))


def main():
    ap = argparse.ArgumentParser(description="เปิด Preview ผ่าน local HTTP")
    ap.add_argument("--port", type=int, default=8765); ap.add_argument("--no-open", action="store_true"); ap.add_argument("--quiet", action="store_true")
    a = ap.parse_args()
    if not os.path.isfile(os.path.join(ROOT, PAGE)):
        sys.exit("ไม่พบ %s — แตกไฟล์ให้ครบทั้งโฟลเดอร์ หรือรัน python3 tools/build_preview.py ก่อน" % PAGE)
    httpd, port = None, a.port
    for port in range(a.port, a.port + 10):                    # ถ้าพอร์ตไม่ว่าง ลองพอร์ตถัดไป
        try:
            httpd = http.server.ThreadingHTTPServer(("127.0.0.1", port), functools.partial(Handler, directory=ROOT)); break
        except OSError: continue
    if not httpd: sys.exit("พอร์ต %d–%d ไม่ว่าง — ปิดโปรแกรมที่ใช้พอร์ตนี้ หรือระบุ --port อื่น" % (a.port, a.port + 9))
    url = "http://127.0.0.1:%d/%s" % (port, PAGE)
    print("Preview พร้อมที่  %s\n(ฟังเฉพาะเครื่องนี้ · กด Ctrl+C เพื่อปิด)" % url, flush=True)
    if not a.no_open: threading.Timer(0.6, lambda: webbrowser.open(url)).start()
    try: httpd.serve_forever()
    except KeyboardInterrupt: print("\nปิดแล้ว")
    finally: httpd.server_close()


if __name__ == "__main__":
    main()
