# server/ — บริการข้อมูลภายในของหน้ารวม (ยังไม่ได้ Deploy)

โค้ดในโฟลเดอร์นี้ **ยังไม่ถูกใช้งานที่ใด**: ไม่ได้ Deploy ไม่มีค่าลับ และไม่ถูกเรียกจากหน้าเว็บ (ค่า `dataApiUrl`, `formApiUrl`, `aiApiUrl`, `rosterApiUrl` ใน `config.js` ยังว่าง)
วางไว้ใน `server/` (ไม่ใช่ `functions/` ที่รากของ Repository) เพื่อไม่ให้ระบบใดหยิบไป Deploy เอง

| ไฟล์ | หน้าที่ |
|---|---|
| `lib/auth.js` | ตรวจ JWT ของ Cloudflare Access: ลายเซ็น RS256 กับกุญแจของทีม, `iss`, `aud`, `exp`, `nbf`, ต้องมีอีเมล · ตรวจรายชื่อผู้มีสิทธิ์ · ถ้ายังไม่ตั้งค่า = ปฏิเสธทั้งหมด |
| `lib/upstream.js` | เรียก Apps Script (`apps-script/HubData.gs`) ด้วยค่าลับร่วมใน body |
| `lib/ratelimit.js` | จำกัดจำนวนคำขอต่อผู้ใช้ (KV ถ้าผูก `RATE_KV`, ไม่งั้นนับในหน่วยความจำ) |
| `lib/facts.js` | สร้างข้อเท็จจริงสำหรับ AI จาก `data/stats.json` + `data/extra.json` (สถิติรวมเท่านั้น) และตรวจตัวเลขในคำตอบ |
| `functions/api/data.js` | `GET /api/data?dataset=staff|areaPhotos|radio` → `{ ok, rows, asOf }` |
| `functions/api/form.js` | `POST /api/form` (multipart) → `{ ok, ref }` · ปิดการเขียนเป็นค่าเริ่มต้น |
| `functions/api/chat.js` | `POST /api/chat` `{ action:'chat', userMessage, chatHistory, context }` → `{ status, reply, sources, asOf }` |
| `functions/api/roster.js` | `GET /api/roster` → `{ teams }` (รายชื่อเวรจาก KV `ROSTER`) |
| `tests/server.test.mjs` | ทดสอบ local ด้วยกุญแจและบริการจำลอง: `node server/tests/server.test.mjs` |

## สิ่งที่ผู้ดูแลต้องตั้งค่าเมื่ออนุมัติให้ Deploy (ไม่มีค่าใดอยู่ใน Repository)

1. **Cloudflare Pages โครงการใหม่** (แยกจากเว็บไซต์เดิม) — นำ `server/functions` ไปเป็น `functions` ของโครงการ และไฟล์หน้าเว็บ (`index.html`, `assets/`, `config.js`, `data/`) เป็น static
2. **Cloudflare Access** ครอบทั้งโครงการ (หน้าเว็บและ `/api/*`) — จำกัดอีเมล/โดเมนของหน่วยงาน
3. ตัวแปรของบริการ

| ชื่อ | ชนิด | ความหมาย |
|---|---|---|
| `ACCESS_TEAM_DOMAIN` | ตัวแปร | `<ทีม>.cloudflareaccess.com` |
| `ACCESS_AUD` | ตัวแปร | Application Audience (AUD) Tag ของแอปใน Access |
| `HUB_ALLOW_DATA` | ตัวแปร | ผู้มีสิทธิ์ดูบุคลากร/ภาพตรวจพื้นที่/วิทยุ/รายชื่อเวร — อีเมลเต็มหรือ `@โดเมน` คั่นด้วยจุลภาค |
| `HUB_ALLOW_FORM` | ตัวแปร | ผู้มีสิทธิ์บันทึกแบบฟอร์ม |
| `HUB_ALLOW_CHAT` | ตัวแปร | ผู้มีสิทธิ์ใช้ผู้ช่วย AI |
| `HUB_GS_URL` | **ค่าลับ** | URL `/exec` ของ `apps-script/HubData.gs` ที่ Deploy แล้ว |
| `HUB_SHARED_SECRET` | **ค่าลับ** | สุ่มยาว ≥ 32 ตัวอักษร ค่าเดียวกับ Script Property `HUB_SHARED_SECRET` |
| `FORMS_WRITE_ENABLED` | ตัวแปร | `true` เมื่อพร้อมเขียนจริง (ค่าเริ่มต้นปิด) |
| `LLM_API_URL`, `LLM_MODEL` | ตัวแปร | ปลายทางและชื่อรุ่นของบริการ AI ที่หน่วยงานเลือก (โค้ดส่งรูปแบบ Messages API: `x-api-key`, `system`, `messages`) |
| `LLM_API_KEY` | **ค่าลับ** | คีย์ของบริการ AI |
| `RATE_KV`, `ROSTER` | KV binding | ตัวนับจำกัดคำขอ / รายชื่อเวร (คีย์ `teams`) |
| `ALLOWED_ORIGIN` | ตัวแปร | ใส่เฉพาะเมื่อหน้าเว็บอยู่คนละโดเมนกับบริการ |
| `STATS_BASE_URL` | ตัวแปร | ใส่เฉพาะเมื่อไฟล์ `data/*.json` ไม่ได้อยู่ในโครงการเดียวกัน |

4. **Apps Script ใหม่** จาก `apps-script/HubData.gs` (ไม่แก้สคริปต์เดิม) + Script Properties ตามหัวไฟล์ · บัญชีที่ Deploy ต้องอ่าน Sheet “ข้อมูลงานจราจรออนไลน์” ได้ (สิทธิ์อ่านพอสำหรับ `read`)
5. ใส่ URL ใน `config.js`: `dataApiUrl: "/api/data"`, `formApiUrl: "/api/form"`, `aiApiUrl: "/api/chat"`, `rosterApiUrl: "/api/roster"` แล้วตั้ง `internalMode: true`

## สถานะการทดสอบ

- ทดสอบแล้ว (local, จำลอง): ตรรกะตรวจ JWT ทุกกรณีปฏิเสธ, สิทธิ์, CORS/Origin, การกรองคอลัมน์, แบบฟอร์ม, ข้อเท็จจริงและตัวตรวจตัวเลข, จำกัดจำนวนคำถาม — 60 ข้อ
- **ยังไม่ได้ทดสอบ**: Cloudflare Access จริง, Apps Script `HubData.gs` (ยังไม่เคยรัน), การเขียนแบบฟอร์มลง Sheet, บริการ AI จริง, KV จริง
