-- ไฟล์ข้อมูลตัวอย่างสำหรับระบบแจ้งเตือนการกินยา
-- สามารถรันคำสั่ง SQL นี้เพื่อเพิ่มข้อมูลทดสอบ

-- เพิ่มผู้ใช้ตัวอย่าง
INSERT INTO users (name, created_at, updated_at) VALUES 
('สมชาย', datetime('now'), datetime('now')),
('สมหญิง', datetime('now'), datetime('now')),
('นพ.สมศักดิ์', datetime('now'), datetime('now'));

-- เพิ่มยาตัวอย่างสำหรับผู้ใช้คนแรก (สมชาย - user_id = 1)
INSERT INTO medications (user_id, name, hours, minutes, first_time, note, is_active, created_at, updated_at) VALUES 
-- ยาลดความดันโลหิต กินเช้า-เย็น
(1, 'พาราเซตามอล', 6, 0, '08:00', 'หลังอาหารเช้า', 1, datetime('now'), datetime('now')),

-- วิตามินซี กินทุกวันตอนเช้า
(1, 'วิตามินซี', 24, 0, '07:30', 'ก่อนอาหารเช้า', 1, datetime('now'), datetime('now')),

-- ยาแก้แพ้ กินเมื่อมีอาการ
(1, 'เซทิริซีน', 12, 0, '20:00', 'ก่อนนอน', 1, datetime('now'), datetime('now'));

-- เพิ่มยาตัวอย่างสำหรับผู้ใช้คนที่สอง (สมหญิง - user_id = 2)
INSERT INTO medications (user_id, name, hours, minutes, first_time, note, is_active, created_at, updated_at) VALUES 
-- ยาคุมกำเนิด กินทุกวันเวลาเดียวกัน
(2, 'ยาคุมกำเนิด', 24, 0, '21:00', 'ก่อนนอนทุกวัน', 1, datetime('now'), datetime('now')),

-- แคลเซียม เสริมกระดูก
(2, 'แคลเซียม', 12, 0, '08:00', 'หลังอาหารเช้า', 1, datetime('now'), datetime('now')),

-- ไอบูโปรเฟน ยาแก้ปวด
(2, 'ไอบูโปรเฟน', 8, 0, '09:00', 'หลังอาหาร', 1, datetime('now'), datetime('now'));

-- เพิ่มยาตัวอย่างสำหรับผู้ใช้คนที่สาม (นพ.สมศักดิ์ - user_id = 3)
INSERT INTO medications (user_id, name, hours, minutes, first_time, note, is_active, created_at, updated_at) VALUES 
-- วิตามินดี สำหรับแพทย์ที่ทำงานในอาคาร
(3, 'วิตามินดี', 24, 0, '07:00', 'หลังอาหารเช้า', 1, datetime('now'), datetime('now')),

-- ยาบำรุงสมอง
(3, 'โอเมก้า 3', 12, 0, '08:00', 'หลังอาหาร', 1, datetime('now'), datetime('now')),

-- ยาลดกรด สำหรับคนที่กินไม่ตรงเวลา
(3, 'ยาลดกรด', 6, 0, '12:00', 'ก่อนอาหารกลางวัน', 1, datetime('now'), datetime('now'));

-- เพิ่มตัวอย่าง reminder logs (ประวัติการแจ้งเตือน)
INSERT INTO reminder_logs (medication_id, reminder_time, status, created_at) VALUES 
-- สำหรับยา พาราเซตามอล (medication_id = 1)
(1, datetime('now', '-6 hours'), 'completed', datetime('now', '-6 hours')),
(1, datetime('now'), 'pending', datetime('now')),

-- สำหรับยา วิตามินซี (medication_id = 2)
(2, datetime('now', '-1 day'), 'completed', datetime('now', '-1 day')),
(2, datetime('now'), 'pending', datetime('now')),

-- สำหรับยา เซทิริซีน (medication_id = 3)
(3, datetime('now', '-12 hours'), 'completed', datetime('now', '-12 hours')),

-- สำหรับยา ยาคุมกำเนิด (medication_id = 4)
(4, datetime('now', '-1 day'), 'completed', datetime('now', '-1 day')),

-- สำหรับยา แคลเซียม (medication_id = 5)
(5, datetime('now', '-12 hours'), 'completed', datetime('now', '-12 hours')),

-- สำหรับยา ไอบูโปรเฟน (medication_id = 6)
(6, datetime('now', '-8 hours'), 'completed', datetime('now', '-8 hours'));

-- สร้าง View สำหรับดูข้อมูลสรุป
CREATE VIEW IF NOT EXISTS medication_summary AS
SELECT 
    u.name as user_name,
    m.name as medication_name,
    m.hours,
    m.minutes,
    m.first_time,
    m.note,
    m.is_active,
    CASE 
        WHEN m.hours > 0 AND m.minutes > 0 THEN m.hours || ' ชั่วโมง ' || m.minutes || ' นาที'
        WHEN m.hours > 0 THEN m.hours || ' ชั่วโมง'
        WHEN m.minutes > 0 THEN m.minutes || ' นาที'
        ELSE 'ไม่ระบุ'
    END as interval_text,
    COUNT(rl.id) as reminder_count,
    MAX(rl.reminder_time) as last_reminder
FROM users u
LEFT JOIN medications m ON u.id = m.user_id
LEFT JOIN reminder_logs rl ON m.id = rl.medication_id
WHERE m.is_active = 1
GROUP BY u.id, m.id
ORDER BY u.name, m.name;

-- คำสั่ง SQL ที่มีประโยชน์สำหรับการจัดการข้อมูล

-- 1. ดูรายการยาของผู้ใช้ทั้งหมด
-- SELECT * FROM medication_summary;

-- 2. ดูยาที่ต้องกินวันนี้
-- SELECT user_name, medication_name, first_time, note 
-- FROM medication_summary 
-- WHERE is_active = 1 
-- ORDER BY first_time;

-- 3. นับจำนวนยาแต่ละประเภท
-- SELECT medication_name, COUNT(*) as user_count 
-- FROM medication_summary 
-- GROUP BY medication_name 
-- ORDER BY user_count DESC;

-- 4. ดูประวัติการแจ้งเตือนล่าสุด
-- SELECT 
--     u.name as user_name,
--     m.name as medication_name,
--     rl.reminder_time,
--     rl.status
-- FROM reminder_logs rl
-- JOIN medications m ON rl.medication_id = m.id
-- JOIN users u ON m.user_id = u.id
-- ORDER BY rl.reminder_time DESC
-- LIMIT 10;

-- 5. ลบข้อมูลทดสอบ (ใช้เมื่อต้องการเริ่มต้นใหม่)
-- DELETE FROM reminder_logs;
-- DELETE FROM medications;
-- DELETE FROM users;
-- UPDATE sqlite_sequence SET seq = 0 WHERE name IN ('users', 'medications', 'reminder_logs');