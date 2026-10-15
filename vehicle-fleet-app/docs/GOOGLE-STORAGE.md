# Smart Fleet Care: Google storage

The Next.js server calls a secret-protected Apps Script web app. Nine Google Sheets tabs replace the Prisma tables; Drive holds images. Keep the spreadsheet and image folder restricted. Never expose `GOOGLE_STORAGE_SECRET` as a `NEXT_PUBLIC_` variable or commit `.env`/`backups`.

## Configuration

See `.env.example`. Production uses `DATA_BACKEND=google-sheets`, `PHOTO_BACKEND=google-drive`, `GOOGLE_APPS_SCRIPT_URL` and `GOOGLE_STORAGE_SECRET`. `NEXT_PUBLIC_APP_URL=https://pea-fleet-management.vercel.app` is the public origin printed in QR labels. PostgreSQL remains available with `DATA_BACKEND=postgres` until cutover.

Apps Script properties: `SPREADSHEET_ID`, `IMAGE_FOLDER_ID`, and `STORAGE_SECRET` (same secret as the server). Enable the advanced Google Sheets service. Run `npm run google:bundle`, copy Schema.gs and Code.gs into the bound script, run `setupSheets` once, and deploy a Web app executing as the owner. Requests may reach the endpoint without Google sign-in, but `doPost` checks the secret before every operation. Updating code requires updating the deployment version.

## Migration and verification

1. Save the Google configuration on the hosting provider. Set `FLEET_READ_ONLY=true` and deploy this app version while still using PostgreSQL. Confirm mutations return 503. Pause direct database writers too.
2. Run `npm run migrate:google` to validate and back up a consistent source snapshot. Backups contain private business data; store securely.
3. Run `npm run migrate:google -- --apply`. The destination must be empty. Images are copied to Drive with content-based deduplication, preserving source data. All nine tables are committed atomically and every scalar field is read back and compared.
4. Set `DATA_BACKEND=google-sheets`, set `FLEET_READ_ONLY=false`, redeploy, and verify dashboard, reservations, vehicle QR links, photos and forms.
5. Retain the original database and backup. Once new writes exist in Sheets, switching back to PostgreSQL requires reconciling those writes first; an old deployment alone is not a safe data rollback.

On an uncertain timeout, inspect the destination before retrying. The migration refuses nonempty destinations rather than overwriting them. Do not edit sheet headers or rows directly while app writes are enabled. Concurrent app mutations use a lock and version check; Sheets edits made outside the app bypass that protocol.

## QR labels

In Admin > Vehicles, print a new QR for each vehicle. New labels encode `/vehicle/{vehicleId}` and open the matching receive/return page from the phone camera. The stable ID survives plate/name edits. Existing text-only labels continue to work with the in-app scanner, but must be reprinted for native phone-camera links. Keep the public domain stable.

## Performance and analytics

Server reads share a 10-second snapshot cache. Writes use fresh snapshots and atomic changed-table commits. The receive/return page requests only one vehicle's active queue; dashboard queries omit photo payloads. Uploaded images are resized before transfer.

Dashboard metrics include monthly fuel amount/liters, weighted price per liter, completed-trip distance, repair costs, six-month trends and per-vehicle comparisons. Fuel cost/km is an estimate based on the month's recorded expenses and trips, not measured fuel efficiency. Repair costs use request month. Invalid trip mileages are excluded and counted. Empty denominators show no value rather than zero.

Google Sheets/Apps Script has quotas and latency; it is suitable for this small fleet, not an unlimited database. The migration does not add a new end-user authentication system to the existing app.

## Checks

`npm test`, `npm run typecheck`, `npm run build`. The build fetches the configured Google font and needs network access.

## เลขไมล์และการแจ้งเตือน (6 ตุลาคม 2026)

- หน้าจัดการรถ หน้ารับ–คืน และการแจ้งเตือนอ่านเลขไมล์ปัจจุบันจากตัวรถ เพื่อให้การแก้ค่าผิดโดยแอดมินมีผลถาวร
- รับ–คืนรถ แจ้งซ่อม/แก้ไขใบซ่อม และแอดมินบันทึกเลขไมล์ไปยังตัวรถ ตั้งแต่ 6 ตุลาคม 2026 แอดมินแก้เลขไมล์เพิ่มหรือลดได้ และใช้ค่า Vehicle.currentMileage เป็นค่าปัจจุบันโดยไม่ดึงค่าสูงสุดจากประวัติมาทับอีก
- หน้าแรกและอีเมลใช้เกณฑ์ร่วมกัน: ภาษี 30 วัน เช็คระยะตามวัน 15 วัน และเลขไมล์เหลือไม่เกิน 1,000 กม. คำนวณวันตามเวลาไทย
- ตารางค่าใช้จ่ายรายคันถูกซ่อนจากหน้าแรก ส่วนกราฟและยอดรวมยังแสดงตามเดิม

การบันทึกสถานะใบซ่อมโดยไม่แก้เลขไมล์จะไม่อัปเดตเลขไมล์ตัวรถจากใบซ่อมเก่า การรับ–คืนรถยังตรวจไม่ให้เลขไมล์ย้อนกลับตามเดิม

สถานะใบซ่อม “เบิกจ่าย” ปลดรถให้พร้อมใช้งานได้ทันทีเช่นเดียวกับปิดใบซ่อม โดยไม่เปลี่ยนรถที่กำลังถูกใช้งาน (IN_USE) ให้เป็นรถว่าง

## Teams และการยกเลิกคิวอัตโนมัติ

FleetScheduler.gs ทำงานด้วย trigger ทุก 5 นาทีใน Apps Script ใช้ TEAMS_WORKFLOW_URL ใน Script Properties ไม่มีลิงก์นี้ในโค้ดเว็บ แจ้งจองใหม่ รับรถถึงเวลา คืนรถถึงเวลา และรถเลยกำหนดคืน 30 นาที (เตือนครั้งละวัน) สรุปคิววันนี้รอบแรกตั้งแต่ 08:30 ถึงก่อน 09:00 ตามเวลาไทย

คิว BOOKED ที่เลยเวลาเริ่ม 30 นาทีและไม่มี log รับรถจะถูกเปลี่ยนเป็น CANCELLED การจองใหม่ตรวจและปลดช่วงเวลาเหล่านี้ก่อนตรวจคิวซ้ำ การรับรถจากคิวหมดอายุถูกปฏิเสธ รถที่มีการรับรถแล้วหรือกำลังซ่อมจะไม่ถูกเปลี่ยนสถานะโดยตัวตรวจคิว

ข้อความมีบันทึก pending/sending/sent กันส่งซ้ำ หาก Workflow ตอบปฏิเสธจะเก็บไว้ลองใหม่ หากผลส่งไม่แน่นอนเพราะ transport error จะเก็บ sending ให้เจ้าของตรวจ Execution log ก่อนส่งซ้ำ สคริปต์ต้องได้รับสิทธิ์ external requests และ ScriptApp triggers ผ่าน enableFleetScheduler ก่อนทำงาน

## ปฏิทินและการบันทึกล่าช้า (15 ตุลาคม 2026)

ปฏิทินแยกสี BOOKED แดง, CHECKED_IN น้ำเงิน, COMPLETED เขียว, EXPIRED ส้ม, CANCELLED เทา สถานะ EXPIRED แยกการหลุดคิวอัตโนมัติจากการยกเลิกเอง โดยตัวตั้งเวลาและเว็บใช้สถานะเดียวกัน (PostgreSQL ต้องใช้ migration เพิ่มค่า enum ก่อนเปลี่ยน backend กลับไป PostgreSQL)

หน้ารับ–คืนเปิดไฟล์ image/* โดยไม่บังคับ capture จึงเลือกรูปจากอัลบั้มหรือกล้องได้ รูปยังถูกย่อและตรวจชนิดเดิม

คิวของวันที่ปัจจุบันตามเวลาไทยที่หมดอายุหรือยกเลิกไปแล้ว และยังไม่เคยมี log รับรถ มีปุ่มบันทึกการใช้รถจริงย้อนหลัง ผู้จองต้องกรอกรหัสตรงกับใบจอง เวลาเริ่มและจบจริงต้องอยู่ในวันนี้และไม่เป็นอนาคต หากคืนแล้วใส่เลขไมล์ทั้งสองและบันทึก COMPLETED หากยังใช้รถอยู่บันทึก CHECKED_IN และคืนตามขั้นตอนปกติ ตรวจไม่ให้ทับ log หรือคิวใช้งานอื่น เก็บเวลาแจ้งระบบกับสถานะเดิมไว้ในหมายเหตุ ไม่ลดเลขไมล์ตัวรถและไม่แก้สถานะของรถจากประวัติที่คืนไปแล้ว

คิว CANCELLED รุ่นเก่าไม่มีเหตุผลการยกเลิกในตาราง จึงแสดงสีเทา การหลุดคิวที่เกิดใหม่หลังอัปเดตนี้จะมีสถานะ EXPIRED สีส้ม

## รับรถต่อเมื่อคิวเดิมลืมบันทึกคืน

คิวถัดไปที่ยังใช้รับรถได้ สามารถรับรถต่อได้เมื่อรายการเก่าทั้งหมดเลยกำหนดคืนแล้ว ผู้รับต้องยืนยันว่าได้รับรถคืนมาจริง ระบบสร้าง log ของคิวใหม่และเก็บ log เก่าที่ยังไม่คืนไว้ตามเดิม พร้อมหมายเหตุ HANDOVER ทั้งสองฝั่ง รถซ่อมหรือรายการก่อนหน้าที่ยังไม่ถึงกำหนดคืนจะยังถูกปฏิเสธ ไม่สร้างเวลาคืนสมมติให้คิวเก่า

เมื่อบันทึกคืนคิวเก่าที่มีผู้รับรถต่อแล้ว ต้องระบุเวลาคืนจริงก่อนคิวถัดไปเริ่มและเลขไมล์ไม่เกินเลขไมล์รับรถของคิวถัดไป ไม่ลดเลขไมล์ตัวรถ ไม่ปล่อยรถที่คิวใหม่กำลังใช้ให้เป็นรถว่าง ส่วนคิวใหม่คืนรถได้ตามปกติแม้คิวเก่ายังรอแก้ข้อมูล รองรับการยืนยันรับรถต่อในแบบฟอร์มบันทึกย้อนหลังของวันนี้ด้วย
