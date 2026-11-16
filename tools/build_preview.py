#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""รวมทุกไฟล์เป็น dist/preview.html ไฟล์เดียว (ฝัง CSS/JS/ข้อมูลสถิติรวม) สำหรับเปิดดูตัวอย่างโดยไม่ต้องมีเซิร์ฟเวอร์"""
import base64, json, pathlib, re
root = pathlib.Path(__file__).resolve().parent.parent
html = (root / "index.html").read_text(encoding="utf-8")
css = (root / "assets/hub.css").read_text(encoding="utf-8")
js = (root / "assets/hub.js").read_text(encoding="utf-8")
cfg = (root / "config.js").read_text(encoding="utf-8")
data = {"stats": json.loads((root / "data/stats.json").read_text(encoding="utf-8")),
        "systems": json.loads((root / "data/systems.json").read_text(encoding="utf-8")),
        "extra": json.loads((root / "data/extra.json").read_text(encoding="utf-8"))}
blob = json.dumps(data, ensure_ascii=False).replace("</", "<\\/")
html = html.replace('<link rel="stylesheet" href="assets/hub.css">', "<style>\n" + css + "\n</style>")
robot = "data:image/png;base64," + base64.b64encode((root / "assets/images/ai-assistant.png").read_bytes()).decode()   # รูปหุ่นยนต์ผู้ช่วย AI ฝังในไฟล์เดียว
html = html.replace('<script src="config.js"></script>', "<script>\n" + cfg + "\nwindow.__HUB_PREVIEW__ = true;\nwindow.__HUB_ROBOT__ = \"" + robot + "\";\nwindow.__HUB_DATA__ = " + blob + ";\n</script>")
# Leaflet (แผนที่ OpenStreetMap) ฝังไว้ในไฟล์เดียวกัน เพื่อให้ไฟล์ Preview เปิดได้โดยไม่ต้องมีโฟลเดอร์ assets
lcss = (root / "assets/vendor/leaflet.css").read_text(encoding="utf-8")
ljs = (root / "assets/vendor/leaflet.js").read_text(encoding="utf-8").replace("</script", "<\\/script")
html = html.replace("</style>", "</style>\n<style>\n" + lcss + "\n</style>", 1)
html = html.replace('<script src="assets/hub.js"></script>', "<script>\n" + ljs + "\n</script>\n<script>\n" + js + "\n</script>")
assert "assets/hub." not in html and "__HUB_DATA__" in html
(root / "dist").mkdir(exist_ok=True)
(root / "dist/preview.html").write_text(html, encoding="utf-8")
print("dist/preview.html", len(html.encode("utf-8")), "bytes")
