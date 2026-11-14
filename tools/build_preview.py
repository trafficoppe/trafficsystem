#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""รวมทุกไฟล์เป็น dist/preview.html ไฟล์เดียว (ฝัง CSS/JS/ข้อมูลสถิติรวม) สำหรับเปิดดูตัวอย่างโดยไม่ต้องมีเซิร์ฟเวอร์"""
import json, pathlib, re
root = pathlib.Path(__file__).resolve().parent.parent
html = (root / "index.html").read_text(encoding="utf-8")
css = (root / "assets/hub.css").read_text(encoding="utf-8")
js = (root / "assets/hub.js").read_text(encoding="utf-8")
cfg = (root / "config.js").read_text(encoding="utf-8")
data = {"stats": json.loads((root / "data/stats.json").read_text(encoding="utf-8")),
        "systems": json.loads((root / "data/systems.json").read_text(encoding="utf-8"))}
blob = json.dumps(data, ensure_ascii=False).replace("</", "<\\/")
html = html.replace('<link rel="stylesheet" href="assets/hub.css">', "<style>\n" + css + "\n</style>")
html = html.replace('<script src="config.js"></script>', "<script>\n" + cfg + "\nwindow.__HUB_PREVIEW__ = true;\nwindow.__HUB_DATA__ = " + blob + ";\n</script>")
html = html.replace('<script src="assets/hub.js"></script>', "<script>\n" + js + "\n</script>")
assert "assets/hub" not in html and "__HUB_DATA__" in html
(root / "dist").mkdir(exist_ok=True)
(root / "dist/preview.html").write_text(html, encoding="utf-8")
print("dist/preview.html", len(html.encode("utf-8")), "bytes")
