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
cp worker/dist/worker.js site/_worker.js
echo "site/ พร้อม: $(find site -type f | wc -l) ไฟล์"
