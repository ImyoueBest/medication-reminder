<?php
/**
 * ไฟล์ดึงข้อมูลการแจ้งเตือนการกินยา
 * รองรับการดึงข้อมูลผู้ใช้และรายการยา
 */

require_once 'database.php';

// ตรวจสอบ HTTP Method (อนุญาตเฉพาะ GET)
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendJsonResponse(['error' => 'Method not allowed'], 405);
}

// ดึงพารามิเตอร์จาก URL
$action = isset($_GET['action']) ? $_GET['action'] : '';

switch ($action) {
    case 'get_user':
        getUser();
        break;
    case 'get_medications':
        getMedications();
        break;
    case 'get_medication':
        getMedication();
        break;
    case 'get_reminder_logs':
        getReminderLogs();
        break;
    case 'search_medications':
        searchMedications();
        break;
    default:
        sendJsonResponse(['error' => 'Invalid action'], 400);
}

/**
 * ฟังก์ชันดึงข้อมูลผู้ใช้
 */
function getUser() {
    try {
        $pdo = connectDatabase();
        if (!$pdo) {
            sendJsonResponse(['error' => 'Database connection failed'], 500);
        }

        // ดึงข้อมูลตาม ID หรือชื่อ
        if (isset($_GET['id'])) {
            $id = (int)$_GET['id'];
            $stmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");
            $stmt->execute([$id]);
            $user = $stmt->fetch();
            
            if (!$user) {
                sendJsonResponse(['error' => 'User not found'], 404);
            }
            
            sendJsonResponse([
                'success' => true,
                'user' => $user
            ]);
        } elseif (isset($_GET['name'])) {
            $name = sanitizeInput($_GET['name']);
            $stmt = $pdo->prepare("SELECT * FROM users WHERE name = ?");
            $stmt->execute([$name]);
            $user = $stmt->fetch();
            
            if (!$user) {
                sendJsonResponse(['error' => 'User not found'], 404);
            }
            
            sendJsonResponse([
                'success' => true,
                'user' => $user
            ]);
        } else {
            // ดึงผู้ใช้ทั้งหมด
            $stmt = $pdo->query("SELECT * FROM users ORDER BY created_at DESC");
            $users = $stmt->fetchAll();
            
            sendJsonResponse([
                'success' => true,
                'users' => $users
            ]);
        }

    } catch (PDOException $e) {
        error_log("Database error in getUser: " . $e->getMessage());
        sendJsonResponse(['error' => 'Database error'], 500);
    }
}

/**
 * ฟังก์ชันดึงรายการยาทั้งหมดของผู้ใช้
 */
function getMedications() {
    try {
        $pdo = connectDatabase();
        if (!$pdo) {
            sendJsonResponse(['error' => 'Database connection failed'], 500);
        }

        // ตรวจสอบว่ามี user_id หรือไม่
        if (!isset($_GET['user_id'])) {
            sendJsonResponse(['error' => 'User ID is required'], 400);
        }

        $userId = (int)$_GET['user_id'];
        $activeOnly = isset($_GET['active_only']) ? (bool)$_GET['active_only'] : true;

        // สร้าง SQL query
        $sql = "
            SELECT m.*, u.name as user_name 
            FROM medications m 
            LEFT JOIN users u ON m.user_id = u.id 
            WHERE m.user_id = ?
        ";
        
        $params = [$userId];
        
        if ($activeOnly) {
            $sql .= " AND m.is_active = 1";
        }
        
        $sql .= " ORDER BY m.created_at DESC";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $medications = $stmt->fetchAll();

        // คำนวณเวลาแจ้งเตือนถัดไป
        foreach ($medications as &$medication) {
            $medication['next_reminder'] = calculateNextReminder($medication);
            $medication['interval_text'] = formatInterval($medication['hours'], $medication['minutes']);
        }

        sendJsonResponse([
            'success' => true,
            'medications' => $medications,
            'total' => count($medications)
        ]);

    } catch (PDOException $e) {
        error_log("Database error in getMedications: " . $e->getMessage());
        sendJsonResponse(['error' => 'Database error'], 500);
    }
}

/**
 * ฟังก์ชันดึงข้อมูลยาเฉพาะตัว
 */
function getMedication() {
    try {
        $pdo = connectDatabase();
        if (!$pdo) {
            sendJsonResponse(['error' => 'Database connection failed'], 500);
        }

        if (!isset($_GET['id'])) {
            sendJsonResponse(['error' => 'Medication ID is required'], 400);
        }

        $id = (int)$_GET['id'];

        $stmt = $pdo->prepare("
            SELECT m.*, u.name as user_name 
            FROM medications m 
            LEFT JOIN users u ON m.user_id = u.id 
            WHERE m.id = ?
        ");
        $stmt->execute([$id]);
        $medication = $stmt->fetch();

        if (!$medication) {
            sendJsonResponse(['error' => 'Medication not found'], 404);
        }

        // เพิ่มข้อมูลเสริม
        $medication['next_reminder'] = calculateNextReminder($medication);
        $medication['interval_text'] = formatInterval($medication['hours'], $medication['minutes']);

        sendJsonResponse([
            'success' => true,
            'medication' => $medication
        ]);

    } catch (PDOException $e) {
        error_log("Database error in getMedication: " . $e->getMessage());
        sendJsonResponse(['error' => 'Database error'], 500);
    }
}

/**
 * ฟังก์ชันดึงประวัติการแจ้งเตือน
 */
function getReminderLogs() {
    try {
        $pdo = connectDatabase();
        if (!$pdo) {
            sendJsonResponse(['error' => 'Database connection failed'], 500);
        }

        $medicationId = isset($_GET['medication_id']) ? (int)$_GET['medication_id'] : 0;
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
        $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;

        $sql = "
            SELECT rl.*, m.name as medication_name, u.name as user_name
            FROM reminder_logs rl
            LEFT JOIN medications m ON rl.medication_id = m.id
            LEFT JOIN users u ON m.user_id = u.id
        ";
        
        $params = [];
        
        if ($medicationId > 0) {
            $sql .= " WHERE rl.medication_id = ?";
            $params[] = $medicationId;
        }
        
        $sql .= " ORDER BY rl.reminder_time DESC LIMIT ? OFFSET ?";
        $params[] = $limit;
        $params[] = $offset;

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $logs = $stmt->fetchAll();

        // นับจำนวนทั้งหมด
        $countSql = "SELECT COUNT(*) as total FROM reminder_logs rl";
        if ($medicationId > 0) {
            $countSql .= " WHERE rl.medication_id = ?";
            $countStmt = $pdo->prepare($countSql);
            $countStmt->execute([$medicationId]);
        } else {
            $countStmt = $pdo->query($countSql);
        }
        $total = $countStmt->fetch()['total'];

        sendJsonResponse([
            'success' => true,
            'logs' => $logs,
            'total' => $total,
            'limit' => $limit,
            'offset' => $offset
        ]);

    } catch (PDOException $e) {
        error_log("Database error in getReminderLogs: " . $e->getMessage());
        sendJsonResponse(['error' => 'Database error'], 500);
    }
}

/**
 * ฟังก์ชันค้นหายา
 */
function searchMedications() {
    try {
        $pdo = connectDatabase();
        if (!$pdo) {
            sendJsonResponse(['error' => 'Database connection failed'], 500);
        }

        $query = isset($_GET['q']) ? sanitizeInput($_GET['q']) : '';
        $userId = isset($_GET['user_id']) ? (int)$_GET['user_id'] : 0;

        if (empty($query)) {
            sendJsonResponse(['error' => 'Search query is required'], 400);
        }

        $sql = "
            SELECT m.*, u.name as user_name 
            FROM medications m 
            LEFT JOIN users u ON m.user_id = u.id 
            WHERE m.name LIKE ? AND m.is_active = 1
        ";
        
        $params = ['%' . $query . '%'];
        
        if ($userId > 0) {
            $sql .= " AND m.user_id = ?";
            $params[] = $userId;
        }
        
        $sql .= " ORDER BY m.name ASC";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $medications = $stmt->fetchAll();

        sendJsonResponse([
            'success' => true,
            'medications' => $medications,
            'query' => $query,
            'total' => count($medications)
        ]);

    } catch (PDOException $e) {
        error_log("Database error in searchMedications: " . $e->getMessage());
        sendJsonResponse(['error' => 'Database error'], 500);
    }
}

/**
 * ฟังก์ชันคำนวณเวลาแจ้งเตือนครั้งถัดไป
 * @param array $medication
 * @return string
 */
function calculateNextReminder($medication) {
    try {
        $now = new DateTime();
        $firstTime = new DateTime($medication['first_time']);
        
        // ตั้งเวลาวันนี้
        $today = new DateTime();
        $today->setTime($firstTime->format('H'), $firstTime->format('i'), 0);
        
        // คำนวณ interval ในหน่วยนาที
        $intervalMinutes = ($medication['hours'] * 60) + $medication['minutes'];
        
        // หาเวลาแจ้งเตือนครั้งถัดไป
        $nextReminder = clone $today;
        
        while ($nextReminder <= $now) {
            $nextReminder->add(new DateInterval('PT' . $intervalMinutes . 'M'));
        }
        
        return $nextReminder->format('Y-m-d H:i:s');
        
    } catch (Exception $e) {
        error_log("Error calculating next reminder: " . $e->getMessage());
        return null;
    }
}

/**
 * ฟังก์ชันจัดรูปแบบข้อความ interval
 * @param int $hours
 * @param int $minutes
 * @return string
 */
function formatInterval($hours, $minutes) {
    $parts = [];
    
    if ($hours > 0) {
        $parts[] = $hours . ' ชั่วโมง';
    }
    
    if ($minutes > 0) {
        $parts[] = $minutes . ' นาที';
    }
    
    return implode(' ', $parts);
}

/**
 * ฟังก์ชันสำหรับสร้างรายงานสถิติ (เสริม)
 */
function getStatistics() {
    try {
        $pdo = connectDatabase();
        if (!$pdo) {
            sendJsonResponse(['error' => 'Database connection failed'], 500);
        }

        // สถิติผู้ใช้
        $userStats = $pdo->query("SELECT COUNT(*) as total_users FROM users")->fetch();
        
        // สถิติยา
        $medicationStats = $pdo->query("
            SELECT 
                COUNT(*) as total_medications,
                COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_medications,
                COUNT(CASE WHEN is_active = 0 THEN 1 END) as inactive_medications
            FROM medications
        ")->fetch();
        
        // สถิติการแจ้งเตือน
        $reminderStats = $pdo->query("
            SELECT 
                COUNT(*) as total_reminders,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_reminders,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_reminders
            FROM reminder_logs
        ")->fetch();

        sendJsonResponse([
            'success' => true,
            'statistics' => [
                'users' => $userStats,
                'medications' => $medicationStats,
                'reminders' => $reminderStats
            ]
        ]);

    } catch (PDOException $e) {
        error_log("Database error in getStatistics: " . $e->getMessage());
        sendJsonResponse(['error' => 'Database error'], 500);
    }
}
?>