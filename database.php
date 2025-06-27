<?php
/**
 * ไฟล์การตั้งค่าฐานข้อมูล SQLite
 * สำหรับระบบแจ้งเตือนการกินยา
 */

// กำหนดชื่อไฟล์ฐานข้อมูล
define('DB_FILE', 'medication_reminders.db');

/**
 * ฟังก์ชันเชื่อมต่อฐานข้อมูล
 * @return PDO|null
 */
function connectDatabase() {
    try {
        // สร้างการเชื่อมต่อ PDO กับ SQLite
        $pdo = new PDO('sqlite:' . DB_FILE);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        
        return $pdo;
    } catch (PDOException $e) {
        error_log("Database connection error: " . $e->getMessage());
        return null;
    }
}

/**
 * ฟังก์ชันสร้างตารางฐานข้อมูล
 * @return bool
 */
function initializeDatabase() {
    try {
        $pdo = connectDatabase();
        if (!$pdo) {
            return false;
        }

        // สร้างตาราง users สำหรับเก็บข้อมูลผู้ใช้
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ");

        // สร้างตาราง medications สำหรับเก็บข้อมูลยา
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS medications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                hours INTEGER NOT NULL DEFAULT 0,
                minutes INTEGER NOT NULL DEFAULT 0,
                first_time TIME NOT NULL,
                note TEXT,
                is_active INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        ");

        // สร้างตาราง reminder_logs สำหรับเก็บประวัติการแจ้งเตือน
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS reminder_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                medication_id INTEGER NOT NULL,
                reminder_time DATETIME NOT NULL,
                status TEXT DEFAULT 'pending',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (medication_id) REFERENCES medications (id)
            )
        ");

        // สร้าง index เพื่อเพิ่มประสิทธิภาพ
        $pdo->exec("CREATE INDEX IF NOT EXISTS idx_medications_user_id ON medications (user_id)");
        $pdo->exec("CREATE INDEX IF NOT EXISTS idx_medications_active ON medications (is_active)");
        $pdo->exec("CREATE INDEX IF NOT EXISTS idx_reminder_logs_medication_id ON reminder_logs (medication_id)");

        return true;
    } catch (PDOException $e) {
        error_log("Database initialization error: " . $e->getMessage());
        return false;
    }
}

/**
 * ฟังก์ชันสำหรับส่งผลลัพธ์ JSON
 * @param array $data
 * @param int $statusCode
 */
function sendJsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * ฟังก์ชันตรวจสอบและทำความสะอาดข้อมูล input
 * @param string $input
 * @return string
 */
function sanitizeInput($input) {
    return trim(htmlspecialchars($input, ENT_QUOTES, 'UTF-8'));
}

/**
 * ฟังก์ชันตรวจสอบว่าเป็น AJAX request หรือไม่
 * @return bool
 */
function isAjaxRequest() {
    return isset($_SERVER['HTTP_X_REQUESTED_WITH']) && 
           strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest';
}

// เริ่มต้นฐานข้อมูลเมื่อไฟล์นี้ถูกเรียกใช้
if (!file_exists(DB_FILE)) {
    initializeDatabase();
}

// ตั้งค่า timezone เป็น Asia/Bangkok
date_default_timezone_set('Asia/Bangkok');

// เปิดใช้งาน CORS สำหรับการทดสอบ
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');

// จัดการ OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}
?>