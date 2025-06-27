<?php
/**
 * ไฟล์บันทึกข้อมูลการแจ้งเตือนการกินยา
 * รองรับการเพิ่ม แก้ไข และลบข้อมูล
 */

require_once 'database.php';

// ตรวจสอบ HTTP Method
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'POST':
        handleCreateOrUpdate();
        break;
    case 'PUT':
        handleUpdate();
        break;
    case 'DELETE':
        handleDelete();
        break;
    default:
        sendJsonResponse(['error' => 'Method not allowed'], 405);
}

/**
 * ฟังก์ชันจัดการการสร้างหรืออัพเดทข้อมูล
 */
function handleCreateOrUpdate() {
    try {
        // รับข้อมูล JSON จาก request body
        $input = json_decode(file_get_contents('php://input'), true);
        
        // ตรวจสอบข้อมูลที่จำเป็น
        if (!$input) {
            sendJsonResponse(['error' => 'Invalid JSON data'], 400);
        }

        $action = isset($input['action']) ? $input['action'] : 'create';

        if ($action === 'create_user') {
            createUser($input);
        } elseif ($action === 'add_medication') {
            addMedication($input);
        } elseif ($action === 'update_medication') {
            updateMedication($input);
        } else {
            sendJsonResponse(['error' => 'Invalid action'], 400);
        }

    } catch (Exception $e) {
        error_log("Error in handleCreateOrUpdate: " . $e->getMessage());
        sendJsonResponse(['error' => 'Internal server error'], 500);
    }
}

/**
 * ฟังก์ชันสร้างผู้ใช้ใหม่
 * @param array $data
 */
function createUser($data) {
    // ตรวจสอบข้อมูลที่จำเป็น
    if (empty($data['name'])) {
        sendJsonResponse(['error' => 'Name is required'], 400);
    }

    try {
        $pdo = connectDatabase();
        if (!$pdo) {
            sendJsonResponse(['error' => 'Database connection failed'], 500);
        }

        $name = sanitizeInput($data['name']);

        // ตรวจสอบว่ามีชื่อนี้แล้วหรือไม่
        $checkStmt = $pdo->prepare("SELECT id FROM users WHERE name = ?");
        $checkStmt->execute([$name]);
        
        if ($checkStmt->fetch()) {
            // ถ้ามีแล้วให้ส่งข้อมูลผู้ใช้กลับไป
            $userStmt = $pdo->prepare("SELECT * FROM users WHERE name = ?");
            $userStmt->execute([$name]);
            $user = $userStmt->fetch();
            
            sendJsonResponse([
                'success' => true,
                'message' => 'User already exists',
                'user' => $user
            ]);
        }

        // เพิ่มผู้ใช้ใหม่
        $stmt = $pdo->prepare("
            INSERT INTO users (name, created_at, updated_at) 
            VALUES (?, datetime('now'), datetime('now'))
        ");
        $stmt->execute([$name]);

        $userId = $pdo->lastInsertId();

        // ดึงข้อมูลผู้ใช้ที่เพิ่งสร้าง
        $userStmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");
        $userStmt->execute([$userId]);
        $user = $userStmt->fetch();

        sendJsonResponse([
            'success' => true,
            'message' => 'User created successfully',
            'user' => $user
        ]);

    } catch (PDOException $e) {
        error_log("Database error in createUser: " . $e->getMessage());
        sendJsonResponse(['error' => 'Database error'], 500);
    }
}

/**
 * ฟังก์ชันเพิ่มยาใหม่
 * @param array $data
 */
function addMedication($data) {
    // ตรวจสอบข้อมูลที่จำเป็น
    $required = ['user_id', 'name', 'hours', 'minutes', 'first_time'];
    foreach ($required as $field) {
        if (!isset($data[$field])) {
            sendJsonResponse(['error' => "Field '$field' is required"], 400);
        }
    }

    try {
        $pdo = connectDatabase();
        if (!$pdo) {
            sendJsonResponse(['error' => 'Database connection failed'], 500);
        }

        // ทำความสะอาดข้อมูล
        $userId = (int)$data['user_id'];
        $name = sanitizeInput($data['name']);
        $hours = (int)$data['hours'];
        $minutes = (int)$data['minutes'];
        $firstTime = sanitizeInput($data['first_time']);
        $note = isset($data['note']) ? sanitizeInput($data['note']) : '';

        // ตรวจสอบความถูกต้องของข้อมูล
        if ($hours < 0 || $hours > 23) {
            sendJsonResponse(['error' => 'Hours must be between 0-23'], 400);
        }
        if ($minutes < 0 || $minutes > 59) {
            sendJsonResponse(['error' => 'Minutes must be between 0-59'], 400);
        }
        if ($hours == 0 && $minutes == 0) {
            sendJsonResponse(['error' => 'Reminder interval cannot be zero'], 400);
        }

        // เพิ่มยาใหม่
        $stmt = $pdo->prepare("
            INSERT INTO medications (user_id, name, hours, minutes, first_time, note, created_at, updated_at) 
            VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        ");
        $stmt->execute([$userId, $name, $hours, $minutes, $firstTime, $note]);

        $medicationId = $pdo->lastInsertId();

        // ดึงข้อมูลยาที่เพิ่งเพิ่ม
        $medicationStmt = $pdo->prepare("SELECT * FROM medications WHERE id = ?");
        $medicationStmt->execute([$medicationId]);
        $medication = $medicationStmt->fetch();

        sendJsonResponse([
            'success' => true,
            'message' => 'Medication added successfully',
            'medication' => $medication
        ]);

    } catch (PDOException $e) {
        error_log("Database error in addMedication: " . $e->getMessage());
        sendJsonResponse(['error' => 'Database error'], 500);
    }
}

/**
 * ฟังก์ชันอัพเดทข้อมูลยา
 * @param array $data
 */
function updateMedication($data) {
    // ตรวจสอบข้อมูลที่จำเป็น
    if (!isset($data['id'])) {
        sendJsonResponse(['error' => 'Medication ID is required'], 400);
    }

    try {
        $pdo = connectDatabase();
        if (!$pdo) {
            sendJsonResponse(['error' => 'Database connection failed'], 500);
        }

        $id = (int)$data['id'];
        
        // ตรวจสอบว่ายานี้มีอยู่จริง
        $checkStmt = $pdo->prepare("SELECT id FROM medications WHERE id = ?");
        $checkStmt->execute([$id]);
        if (!$checkStmt->fetch()) {
            sendJsonResponse(['error' => 'Medication not found'], 404);
        }

        // เตรียมข้อมูลสำหรับอัพเดท
        $updateFields = [];
        $params = [];

        if (isset($data['name'])) {
            $updateFields[] = "name = ?";
            $params[] = sanitizeInput($data['name']);
        }
        if (isset($data['hours'])) {
            $hours = (int)$data['hours'];
            if ($hours < 0 || $hours > 23) {
                sendJsonResponse(['error' => 'Hours must be between 0-23'], 400);
            }
            $updateFields[] = "hours = ?";
            $params[] = $hours;
        }
        if (isset($data['minutes'])) {
            $minutes = (int)$data['minutes'];
            if ($minutes < 0 || $minutes > 59) {
                sendJsonResponse(['error' => 'Minutes must be between 0-59'], 400);
            }
            $updateFields[] = "minutes = ?";
            $params[] = $minutes;
        }
        if (isset($data['first_time'])) {
            $updateFields[] = "first_time = ?";
            $params[] = sanitizeInput($data['first_time']);
        }
        if (isset($data['note'])) {
            $updateFields[] = "note = ?";
            $params[] = sanitizeInput($data['note']);
        }
        if (isset($data['is_active'])) {
            $updateFields[] = "is_active = ?";
            $params[] = (int)$data['is_active'];
        }

        if (empty($updateFields)) {
            sendJsonResponse(['error' => 'No fields to update'], 400);
        }

        // เพิ่ม updated_at
        $updateFields[] = "updated_at = datetime('now')";
        $params[] = $id;

        $sql = "UPDATE medications SET " . implode(', ', $updateFields) . " WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        // ดึงข้อมูลยาที่อัพเดท
        $medicationStmt = $pdo->prepare("SELECT * FROM medications WHERE id = ?");
        $medicationStmt->execute([$id]);
        $medication = $medicationStmt->fetch();

        sendJsonResponse([
            'success' => true,
            'message' => 'Medication updated successfully',
            'medication' => $medication
        ]);

    } catch (PDOException $e) {
        error_log("Database error in updateMedication: " . $e->getMessage());
        sendJsonResponse(['error' => 'Database error'], 500);
    }
}

/**
 * ฟังก์ชันจัดการการลบ
 */
function handleDelete() {
    try {
        // รับ ID จาก URL parameter
        $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
        
        if ($id <= 0) {
            sendJsonResponse(['error' => 'Valid medication ID is required'], 400);
        }

        $pdo = connectDatabase();
        if (!$pdo) {
            sendJsonResponse(['error' => 'Database connection failed'], 500);
        }

        // ตรวจสอบว่ายานี้มีอยู่จริง
        $checkStmt = $pdo->prepare("SELECT id FROM medications WHERE id = ?");
        $checkStmt->execute([$id]);
        if (!$checkStmt->fetch()) {
            sendJsonResponse(['error' => 'Medication not found'], 404);
        }

        // ลบข้อมูล (Soft delete)
        $stmt = $pdo->prepare("UPDATE medications SET is_active = 0, updated_at = datetime('now') WHERE id = ?");
        $stmt->execute([$id]);

        sendJsonResponse([
            'success' => true,
            'message' => 'Medication deleted successfully'
        ]);

    } catch (PDOException $e) {
        error_log("Database error in handleDelete: " . $e->getMessage());
        sendJsonResponse(['error' => 'Database error'], 500);
    }
}

/**
 * ฟังก์ชันจัดการการอัพเดท (PUT request)
 */
function handleUpdate() {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input) {
            sendJsonResponse(['error' => 'Invalid JSON data'], 400);
        }

        updateMedication($input);

    } catch (Exception $e) {
        error_log("Error in handleUpdate: " . $e->getMessage());
        sendJsonResponse(['error' => 'Internal server error'], 500);
    }
}
?>