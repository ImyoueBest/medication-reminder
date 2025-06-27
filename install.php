<?php
/**
 * ไฟล์ติดตั้งระบบแจ้งเตือนการกินยาอัตโนมัติ
 * ตรวจสอบความพร้อมของระบบและติดตั้งฐานข้อมูล
 */

// ตั้งค่า timezone
date_default_timezone_set('Asia/Bangkok');

// ข้อมูลการติดตั้ง
$installationInfo = [
    'app_name' => 'ระบบแจ้งเตือนการกินยา',
    'version' => '1.0.0',
    'author' => 'Claude AI',
    'database_file' => 'medication_reminders.db'
];

?>
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ติดตั้ง - <?php echo $installationInfo['app_name']; ?></title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.0/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    <style>
        body {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            font-family: 'Sarabun', Arial, sans-serif;
        }
        .install-container {
            background: white;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            margin: 30px auto;
            max-width: 800px;
            overflow: hidden;
        }
        .install-header {
            background: linear-gradient(135deg, #007bff, #0056b3);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .install-body {
            padding: 40px;
        }
        .check-item {
            display: flex;
            align-items: center;
            padding: 15px;
            margin-bottom: 10px;
            border-radius: 10px;
            background: #f8f9fa;
        }
        .check-item.success {
            background: #d4edda;
            border-left: 4px solid #28a745;
        }
        .check-item.warning {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
        }
        .check-item.error {
            background: #f8d7da;
            border-left: 4px solid #dc3545;
        }
        .check-icon {
            font-size: 1.5rem;
            margin-right: 15px;
            width: 30px;
        }
        .progress-step {
            margin-bottom: 30px;
        }
        .btn-install {
            background: linear-gradient(135deg, #28a745, #20c997);
            border: none;
            color: white;
            padding: 15px 30px;
            font-size: 1.1rem;
            border-radius: 25px;
            transition: all 0.3s ease;
        }
        .btn-install:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(40,167,69,0.4);
        }
        .installation-log {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 10px;
            padding: 20px;
            max-height: 300px;
            overflow-y: auto;
            font-family: 'Courier New', monospace;
            font-size: 0.9rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="install-container">
            <div class="install-header">
                <h1><i class="fas fa-pills"></i> <?php echo $installationInfo['app_name']; ?></h1>
                <p class="mb-0">ระบบติดตั้งและตรวจสอบความพร้อม</p>
                <small>เวอร์ชัน <?php echo $installationInfo['version']; ?></small>
            </div>
            
            <div class="install-body">
                <?php if (!isset($_POST['action'])): ?>
                    <!-- ขั้นตอนตรวจสอบความพร้อม -->
                    <div class="progress-step">
                        <h3><i class="fas fa-check-circle text-primary"></i> ตรวจสอบความพร้อมของระบบ</h3>
                        
                        <?php
                        $systemReady = true;
                        $checks = [];
                        
                        // ตรวจสอบ PHP Version
                        $phpVersion = PHP_VERSION;
                        $phpOk = version_compare($phpVersion, '7.0.0', '>=');
                        $checks[] = [
                            'name' => 'เวอร์ชัน PHP',
                            'status' => $phpOk ? 'success' : 'error',
                            'message' => $phpOk ? "PHP {$phpVersion} (เวอร์ชันใช้งานได้)" : "PHP {$phpVersion} (ต้องการ PHP 7.0+)",
                            'icon' => $phpOk ? 'fa-check text-success' : 'fa-times text-danger'
                        ];
                        if (!$phpOk) $systemReady = false;
                        
                        // ตรวจสอบ PDO SQLite Extension
                        $pdoSqlite = extension_loaded('pdo_sqlite');
                        $checks[] = [
                            'name' => 'PDO SQLite Extension',
                            'status' => $pdoSqlite ? 'success' : 'error',
                            'message' => $pdoSqlite ? 'พร้อมใช้งาน' : 'ไม่พบ PDO SQLite Extension',
                            'icon' => $pdoSqlite ? 'fa-check text-success' : 'fa-times text-danger'
                        ];
                        if (!$pdoSqlite) $systemReady = false;
                        
                        // ตรวจสอบสิทธิ์การเขียนไฟล์
                        $writable = is_writable(dirname(__FILE__));
                        $checks[] = [
                            'name' => 'สิทธิ์การเขียนไฟล์',
                            'status' => $writable ? 'success' : 'error',
                            'message' => $writable ? 'สามารถเขียนไฟล์ได้' : 'ไม่สามารถเขียนไฟล์ในโฟลเดอร์นี้ได้',
                            'icon' => $writable ? 'fa-check text-success' : 'fa-times text-danger'
                        ];
                        if (!$writable) $systemReady = false;
                        
                        // ตรวจสอบไฟล์ที่จำเป็น
                        $requiredFiles = ['index.html', 'style.css', 'script.js', 'database.php', 'save_reminder.php', 'get_reminders.php'];
                        $missingFiles = [];
                        foreach ($requiredFiles as $file) {
                            if (!file_exists($file)) {
                                $missingFiles[] = $file;
                            }
                        }
                        
                        $filesOk = empty($missingFiles);
                        $checks[] = [
                            'name' => 'ไฟล์ที่จำเป็น',
                            'status' => $filesOk ? 'success' : 'warning',
                            'message' => $filesOk ? 'ไฟล์ครบถ้วน' : 'ไฟล์ที่หายไป: ' . implode(', ', $missingFiles),
                            'icon' => $filesOk ? 'fa-check text-success' : 'fa-exclamation-triangle text-warning'
                        ];
                        
                        // ตรวจสอบฐานข้อมูลที่มีอยู่
                        $dbExists = file_exists($installationInfo['database_file']);
                        $checks[] = [
                            'name' => 'ฐานข้อมูล',
                            'status' => $dbExists ? 'warning' : 'success',
                            'message' => $dbExists ? 'พบฐานข้อมูลเดิม (จะสำรองก่อนติดตั้งใหม่)' : 'ยังไม่มีฐานข้อมูล (จะสร้างใหม่)',
                            'icon' => $dbExists ? 'fa-exclamation-triangle text-warning' : 'fa-plus text-success'
                        ];
                        
                        foreach ($checks as $check): ?>
                            <div class="check-item <?php echo $check['status']; ?>">
                                <div class="check-icon">
                                    <i class="fas <?php echo $check['icon']; ?>"></i>
                                </div>
                                <div class="flex-grow-1">
                                    <strong><?php echo $check['name']; ?>:</strong>
                                    <?php echo $check['message']; ?>
                                </div>
                            </div>
                        <?php endforeach; ?>
                        
                        <?php if ($systemReady): ?>
                            <div class="text-center mt-4">
                                <form method="post">
                                    <input type="hidden" name="action" value="install">
                                    <button type="submit" class="btn btn-install">
                                        <i class="fas fa-rocket me-2"></i>เริ่มติดตั้งระบบ
                                    </button>
                                </form>
                            </div>
                        <?php else: ?>
                            <div class="alert alert-danger mt-4">
                                <h5><i class="fas fa-exclamation-triangle"></i> ระบบไม่พร้อมสำหรับการติดตั้ง</h5>
                                <p>กรุณาแก้ไขปัญหาที่ระบุข้างต้นก่อนทำการติดตั้ง</p>
                            </div>
                        <?php endif; ?>
                    </div>
                    
                <?php elseif ($_POST['action'] === 'install'): ?>
                    <!-- ขั้นตอนติดตั้ง -->
                    <div class="progress-step">
                        <h3><i class="fas fa-cog text-primary"></i> กำลังติดตั้งระบบ</h3>
                        
                        <div class="installation-log" id="installLog">
                            <?php
                            $installSuccess = true;
                            $installLog = [];
                            
                            function addLog($message) {
                                global $installLog;
                                $installLog[] = '[' . date('H:i:s') . '] ' . $message;
                                echo '[' . date('H:i:s') . '] ' . $message . "\n";
                                if (ob_get_level()) ob_flush();
                                flush();
                            }
                            
                            try {
                                addLog('เริ่มต้นการติดตั้ง...');
                                
                                // สำรองฐานข้อมูลเดิม
                                if (file_exists($installationInfo['database_file'])) {
                                    $backupFile = $installationInfo['database_file'] . '.backup.' . date('Y-m-d_H-i-s');
                                    if (copy($installationInfo['database_file'], $backupFile)) {
                                        addLog("สำรองฐานข้อมูลเดิมเป็น: {$backupFile}");
                                    } else {
                                        addLog("ไม่สามารถสำรองฐานข้อมูลเดิมได้");
                                    }
                                }
                                
                                // โหลดและเรียกใช้ database.php
                                addLog('กำลังเตรียมฐานข้อมูล...');
                                require_once 'database.php';
                                
                                // ตรวจสอบการเชื่อมต่อฐานข้อมูล
                                $pdo = connectDatabase();
                                if (!$pdo) {
                                    throw new Exception('ไม่สามารถเชื่อมต่อฐานข้อมูลได้');
                                }
                                addLog('เชื่อมต่อฐานข้อมูลสำเร็จ');
                                
                                // สร้างตารางฐานข้อมูล
                                if (initializeDatabase()) {
                                    addLog('สร้างตารางฐานข้อมูลสำเร็จ');
                                } else {
                                    throw new Exception('ไม่สามารถสร้างตารางฐานข้อมูลได้');
                                }
                                
                                // เพิ่มข้อมูลตัวอย่าง (ถ้าต้องการ)
                                if (isset($_POST['sample_data']) && $_POST['sample_data'] === '1') {
                                    addLog('กำลังเพิ่มข้อมูลตัวอย่าง...');
                                    // อ่านและเรียกใช้ sample_data.sql
                                    if (file_exists('sample_data.sql')) {
                                        $sampleSql = file_get_contents('sample_data.sql');
                                        $statements = explode(';', $sampleSql);
                                        foreach ($statements as $statement) {
                                            $statement = trim($statement);
                                            if (!empty($statement) && !str_starts_with($statement, '--')) {
                                                try {
                                                    $pdo->exec($statement);
                                                } catch (PDOException $e) {
                                                    // ข้ามคำสั่งที่ error (เช่น CREATE VIEW ที่มีอยู่แล้ว)
                                                    continue;
                                                }
                                            }
                                        }
                                        addLog('เพิ่มข้อมูลตัวอย่างสำเร็จ');
                                    }
                                }
                                
                                // ตรวจสอบการติดตั้ง
                                $userCount = $pdo->query("SELECT COUNT(*) FROM users")->fetchColumn();
                                $medicationCount = $pdo->query("SELECT COUNT(*) FROM medications")->fetchColumn();
                                addLog("พบผู้ใช้: {$userCount} คน");
                                addLog("พบยา: {$medicationCount} รายการ");
                                
                                addLog('ติดตั้งระบบเสร็จสิ้น!');
                                
                            } catch (Exception $e) {
                                $installSuccess = false;
                                addLog('เกิดข้อผิดพลาด: ' . $e->getMessage());
                            }
                            ?>
                        </div>
                        
                        <?php if ($installSuccess): ?>
                            <div class="alert alert-success mt-4">
                                <h5><i class="fas fa-check-circle"></i> ติดตั้งสำเร็จ!</h5>
                                <p>ระบบแจ้งเตือนการกินยาพร้อมใช้งานแล้ว</p>
                                <div class="mt-3">
                                    <a href="index.html" class="btn btn-primary me-2">
                                        <i class="fas fa-play"></i> เริ่มใช้งานระบบ
                                    </a>
                                    <button onclick="window.location.reload()" class="btn btn-outline-secondary">
                                        <i class="fas fa-redo"></i> ติดตั้งใหม่
                                    </button>
                                </div>
                            </div>
                        <?php else: ?>
                            <div class="alert alert-danger mt-4">
                                <h5><i class="fas fa-exclamation-triangle"></i> การติดตั้งล้มเหลว</h5>
                                <p>กรุณาตรวจสอบข้อผิดพลาดในล็อกข้างต้น</p>
                                <button onclick="window.location.reload()" class="btn btn-warning">
                                    <i class="fas fa-redo"></i> ลองติดตั้งใหม่
                                </button>
                            </div>
                        <?php endif; ?>
                    </div>
                <?php endif; ?>
                
                <!-- ข้อมูลเพิ่มเติม -->
                <div class="mt-5">
                    <h4><i class="fas fa-info-circle text-info"></i> ข้อมูลระบบ</h4>
                    <div class="row">
                        <div class="col-md-6">
                            <ul class="list-unstyled">
                                <li><strong>ชื่อระบบ:</strong> <?php echo $installationInfo['app_name']; ?></li>
                                <li><strong>เวอร์ชัน:</strong> <?php echo $installationInfo['version']; ?></li>
                                <li><strong>PHP Version:</strong> <?php echo PHP_VERSION; ?></li>
                                <li><strong>ฐานข้อมูล:</strong> SQLite</li>
                            </ul>
                        </div>
                        <div class="col-md-6">
                            <ul class="list-unstyled">
                                <li><strong>ไฟล์ฐานข้อมูล:</strong> <?php echo $installationInfo['database_file']; ?></li>
                                <li><strong>Timezone:</strong> <?php echo date_default_timezone_get(); ?></li>
                                <li><strong>เวลาปัจจุบัน:</strong> <?php echo date('Y-m-d H:i:s'); ?></li>
                                <li><strong>โฟลเดอร์:</strong> <?php echo realpath('.'); ?></li>
                            </ul>
                        </div>
                    </div>
                </div>
                
                <!-- คำแนะนำ -->
                <div class="mt-4">
                    <h5><i class="fas fa-lightbulb text-warning"></i> คำแนะนำ</h5>
                    <ul>
                        <li>หลังจากติดตั้งเสร็จ ควรลบไฟล์ <code>install.php</code> เพื่อความปลอดภัย</li>
                        <li>สำรองฐานข้อมูลเป็นประจำโดยคัดลอกไฟล์ <code><?php echo $installationInfo['database_file']; ?></code></li>
                        <li>ตรวจสอบสิทธิ์การเข้าถึงไฟล์ให้เหมาะสม (644 สำหรับไฟล์, 755 สำหรับโฟลเดอร์)</li>
                        <li>อ่านไฟล์ <code>README.md</code> สำหรับคำแนะนำการใช้งานเพิ่มเติม</li>
                    </ul>
                </div>
            </div>
        </div>
    </div>
    
    <script src="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.0/js/bootstrap.bundle.min.js"></script>
    <script>
        // Auto-scroll installation log
        const logElement = document.getElementById('installLog');
        if (logElement) {
            logElement.scrollTop = logElement.scrollHeight;
        }
    </script>
</body>
</html>