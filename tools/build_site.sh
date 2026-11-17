#!/bin/sh
# tools/build_site.sh — ประกอบโฟลเดอร์ site/ สำหรับ Cloudflare Pages ของ “ระบบภายใน” (โครงการใหม่ แยกจากเว็บไซต์เดิม)
# site/_worker.js = บริการกลาง (worker/dist/worker.js) รับทุกคำขอ: ด่านเครือข่าย → session → ข้อมูล · ไฟล์หน้าเว็บไม่มีข้อมูลบุคคล
set -e
cd "$(dirname "$0")/.."
test -f worker/dist/worker.js || { echo "ไม่พบ worker/dist/worker.js — รัน: (cd worker && npm run build)"; exit 1; }
rm -rf site && mkdir -p site
cp index.html site/index.html
cp -r assets data site/
cat config.js > site/config.js
printf '\n;window.HUB_CONFIG=Object.assign(window.HUB_CONFIG||{},{auth:"session",apiBase:"/api",dataApiUrl:"/api/data",rosterApiUrl:"/api/roster",aiApiUrl:"/api/chat",liveStatsUrl:"/api/stats",imgApiUrl:"/api/img",formApiUrl:"",internalMode:false,buildRef:"%s"});\n' "${CF_PAGES_COMMIT_SHA:-local}" >> site/config.js
# รอบ 12: ใส่รุ่นของไฟล์ (จากเนื้อไฟล์) ต่อท้าย hub.css / hub.js ใน index.html — เปลี่ยนไฟล์แล้วเบราว์เซอร์โหลดรุ่นใหม่ทันที (index.html/config.js ไม่แคช)
vcss=$(cksum < assets/hub.css | cut -d' ' -f1); vjs=$(cksum < assets/hub.js | cut -d' ' -f1)
sed -e "s|href=\"assets/hub.css\"|href=\"assets/hub.css?v=$vcss\"|" -e "s|src=\"assets/hub.js\"|src=\"assets/hub.js?v=$vjs\"|" index.html > site/index.html
grep -q "hub.js?v=$vjs" site/index.html || { echo "ใส่รุ่นไฟล์ใน index.html ไม่สำเร็จ"; exit 1; }
cp worker/dist/worker.js site/_worker.js
echo "site/ พร้อม: $(find site -type f | wc -l) ไฟล์"
