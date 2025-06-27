// เพิ่มในส่วนต้นของไฟล์ script.js

// เพิ่มฟังก์ชันบันทึกข้อมูลให้แน่นอน
function forceLocalSave() {
    try {
        // บันทึกข้อมูลผู้ใช้
        if (currentUser) {
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            console.log('Saved user:', currentUser);
        }
        
        // บันทึกข้อมูลยา
        if (medications.length > 0) {
            localStorage.setItem('medications', JSON.stringify(medications));
            console.log('Saved medications:', medications.length, 'items');
        }
        
        // บันทึก step ปัจจุบัน
        localStorage.setItem('currentStep', currentStep.toString());
        
        // บันทึก timestamp
        localStorage.setItem('lastSaved', new Date().toISOString());
        
    } catch (error) {
        console.error('Error saving to localStorage:', error);
        alert('ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่');
    }
}

// แก้ไขฟังก์ชัน addMedication เดิม
async function addMedication() {
    try {
        const medicationData = {
            id: Date.now(),
            name: getMedicationName(),
            hours: parseInt(document.getElementById('reminderHours').value) || 0,
            minutes: parseInt(document.getElementById('reminderMinutes').value) || 0,
            firstTime: document.getElementById('firstDoseTime').value,
            note: getNoteText(),
            user_id: currentUser ? currentUser.id : null,
            created_at: new Date().toISOString(),
            is_active: 1
        };

        // ตรวจสอบว่ามียาซ้ำหรือไม่
        const duplicate = medications.find(med => 
            med.name.toLowerCase() === medicationData.name.toLowerCase() && med.is_active
        );
        
        if (duplicate) {
            if (!confirm('มียาชื่อนี้อยู่แล้ว ต้องการเพิ่มอีกครั้งหรือไม่?')) {
                return;
            }
        }

        // เพิ่มยาลงในรายการ
        medications.push(medicationData);
        console.log('Added medication:', medicationData.name);
        
        // บังคับบันทึกลง localStorage ทันที
        forceLocalSave();
        
        // ลองส่งข้อมูลไปยัง server (ถ้าออนไลน์)
        if (isOnline && currentUser) {
            try {
                const response = await apiRequest('POST', API_ENDPOINTS.saveReminder, {
                    action: 'add_medication',
                    user_id: currentUser.id,
                    name: medicationData.name,
                    hours: medicationData.hours,
                    minutes: medicationData.minutes,
                    first_time: medicationData.firstTime,
                    note: medicationData.note
                });
                console.log('Server response:', response);
            } catch (error) {
                console.error('Server error (but saved locally):', error);
                showNotification('บันทึกในเครื่องเรียบร้อย แต่ไม่สามารถส่งข้อมูลไปยังเซิร์ฟเวอร์ได้', 'warning');
            }
        } else {
            showNotification('บันทึกในเครื่องเรียบร้อย (โหมดออฟไลน์)', 'success');
        }

        renderMedicationCards();
        resetForm();
        showNotification('เพิ่มยาเรียบร้อยแล้ว!', 'success');
        
        // เปิดใช้งานปุ่มเริ่มใช้งาน
        document.getElementById('startBtn').disabled = false;
        
    } catch (error) {
        console.error('Error adding medication:', error);
        showNotification('เกิดข้อผิดพลาดในการเพิ่มยา', 'error');
    }
}

// แก้ไขฟังก์ชัน initializeApp เดิม
function initializeApp() {
    console.log('Initializing app...');
    
    updateStepIndicator(1);
    requestNotificationPermission();
    
    // โหลดข้อมูลจาก localStorage
    try {
        // โหลดผู้ใช้
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
            currentUser = JSON.parse(savedUser);
            document.getElementById('userName').value = currentUser.name;
            console.log('Loaded user:', currentUser.name);
        }
        
        // โหลดยา
        const savedMedications = localStorage.getItem('medications');
        if (savedMedications) {
            medications = JSON.parse(savedMedications);
            console.log('Loaded medications:', medications.length, 'items');
            
            if (medications.length > 0) {
                document.getElementById('startBtn').disabled = false;
            }
        }
        
        // โหลด step
        const savedStep = localStorage.getItem('currentStep');
        if (savedStep) {
            const stepNum = parseInt(savedStep);
            if (stepNum > 1 && stepNum <= 5) {
                // ถามว่าต้องการดำเนินการต่อไหม
                if (confirm('พบข้อมูลการใช้งานก่อนหน้า ต้องการดำเนินการต่อหรือไม่?')) {
                    currentStep = stepNum;
                    hideStep(1);
                    showStep(currentStep);
                    updateStepIndicator(currentStep);
                }
            }
        }
        
        console.log('App initialized successfully');
        
    } catch (error) {
        console.error('Error loading saved data:', error);
        // ถ้าโหลดไม่ได้ ให้เริ่มใหม่
        localStorage.clear();
        showNotification('เริ่มใช้งานใหม่', 'warning');
    }
}

// แก้ไขฟังก์ชัน createOrUpdateUser เดิม
async function createOrUpdateUser(name) {
    try {
        // สร้างข้อมูลผู้ใช้ทันที
        currentUser = {
            id: Date.now(),
            name: name,
            created_at: new Date().toISOString()
        };
        
        // บันทึกทันที
        forceLocalSave();
        console.log('Created user:', currentUser.name);
        
        // ลองส่งไปยัง server
        if (isOnline) {
            try {
                const response = await apiRequest('POST', API_ENDPOINTS.saveReminder, {
                    action: 'create_user',
                    name: name
                });
                
                if (response.success && response.user) {
                    currentUser = response.user;
                    forceLocalSave();
                    console.log('Server confirmed user:', currentUser);
                }
            } catch (error) {
                console.error('Server error (but user created locally):', error);
            }
        }
        
    } catch (error) {
        console.error('Error creating user:', error);
        showNotification('เกิดข้อผิดพลาดในการสร้างผู้ใช้', 'error');
    }
}

// เพิ่มปุ่มทดสอบ (เพิ่มในหน้า HTML ถ้าต้องการ)
function testLocalStorage() {
    console.log('=== Testing localStorage ===');
    console.log('currentUser:', localStorage.getItem('currentUser'));
    console.log('medications:', localStorage.getItem('medications'));
    console.log('currentStep:', localStorage.getItem('currentStep'));
    console.log('lastSaved:', localStorage.getItem('lastSaved'));
    
    alert('ดูข้อมูลใน Console (F12)');
}

// Auto-save ทุก 30 วินาที
setInterval(function() {
    if (medications.length > 0 || currentUser) {
        forceLocalSave();
        console.log('Auto-saved at', new Date().toLocaleTimeString());
    }
}, 30000);

// บันทึกก่อนปิดหน้าต่าง
window.addEventListener('beforeunload', function(e) {
    forceLocalSave();
});




/**
 * ไฟล์ JavaScript หลักสำหรับระบบแจ้งเตือนการกินยา
 * รองรับการทำงานร่วมกับ Backend PHP
 */

// ตัวแปรสำหรับเก็บข้อมูล
let currentStep = 1;
let medications = [];
let currentUser = null;
let reminderTimers = [];
let isOnline = navigator.onLine;

// การตั้งค่า API endpoints
const API_BASE_URL = window.location.origin + window.location.pathname.replace('index.html', '');
const API_ENDPOINTS = {
    saveReminder: 'save_reminder.php',
    getReminders: 'get_reminders.php'
};

// เริ่มต้นระบบเมื่อหน้าเว็บโหลดเสร็จ
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    checkOnlineStatus();
});

/**
 * ฟังก์ชันเริ่มต้นแอปพลิเคชัน
 */
function initializeApp() {
    updateStepIndicator(1);
    loadUserFromStorage();
    requestNotificationPermission();
    
    // โหลดข้อมูลยาจาก localStorage หากมี
    const savedMedications = localStorage.getItem('medications');
    if (savedMedications) {
        try {
            medications = JSON.parse(savedMedications);
            if (medications.length > 0) {
                document.getElementById('startBtn').disabled = false;
            }
        } catch (e) {
            console.error('Error loading saved medications:', e);
            medications = [];
        }
    }
}

/**
 * ตั้งค่า Event Listeners
 */
function setupEventListeners() {
    // ฟัง online/offline events
    window.addEventListener('online', () => {
        isOnline = true;
        showNotification('เชื่อมต่ออินเทอร์เน็ตแล้ว', 'success');
        syncDataWithServer();
    });
    
    window.addEventListener('offline', () => {
        isOnline = false;
        showNotification('ไม่มีการเชื่อมต่ออินเทอร์เน็ต กำลังทำงานแบบออฟไลน์', 'warning');
    });

    // ฟัง keyboard events
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            const activeInput = document.activeElement;
            if (activeInput.tagName === 'INPUT' || activeInput.tagName === 'SELECT') {
                e.preventDefault();
                handleEnterKey();
            }
        }
    });
}

/**
 * จัดการเมื่อกด Enter
 */
function handleEnterKey() {
    const nextButton = document.querySelector(`#step-${currentStep} .btn-primary`);
    if (nextButton && !nextButton.disabled) {
        nextButton.click();
    }
}

/**
 * ตรวจสอบสถานะการเชื่อมต่อ
 */
function checkOnlineStatus() {
    isOnline = navigator.onLine;
    if (!isOnline) {
        showNotification('ไม่มีการเชื่อมต่ออินเทอร์เน็ต ระบบจะทำงานแบบออฟไลน์', 'warning');
    }
}

/**
 * โหลดข้อมูลผู้ใช้จาก localStorage
 */
function loadUserFromStorage() {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            document.getElementById('userName').value = currentUser.name;
        } catch (e) {
            console.error('Error loading saved user:', e);
        }
    }
}

/**
 * ขอสิทธิ์แสดง notification
 */
function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                showNotification('การแจ้งเตือนถูกเปิดใช้งานแล้ว!', 'success');
            }
        });
    }
}

// ฟังก์ชันจัดการขั้นตอน
function nextStep(step) {
    if (validateStep(step)) {
        if (step < 5) {
            hideStep(step);
            showStep(step + 1);
            updateStepIndicator(step + 1);
            currentStep = step + 1;
            
            // บันทึกความคืบหน้า
            saveProgress();
        }
    }
}

function previousStep(step) {
    if (step > 1) {
        hideStep(step);
        showStep(step - 1);
        updateStepIndicator(step - 1);
        currentStep = step - 1;
    }
}

function hideStep(step) {
    const stepElement = document.getElementById(`step-${step}`);
    stepElement.classList.add('fade-out');
    setTimeout(() => {
        stepElement.classList.add('hidden');
        stepElement.classList.remove('fade-out');
    }, 300);
}

function showStep(step) {
    const stepElement = document.getElementById(`step-${step}`);
    stepElement.classList.remove('hidden');
    stepElement.classList.add('fade-in');
    
    if (step === 5) {
        updateCurrentMedicationInfo();
        renderMedicationCards();
    }
    
    setTimeout(() => {
        stepElement.classList.remove('fade-in');
    }, 500);
}

function updateStepIndicator(activeStep) {
    for (let i = 1; i <= 5; i++) {
        const stepElement = document.getElementById(`step${i}`);
        stepElement.classList.remove('active', 'completed');
        
        if (i < activeStep) {
            stepElement.classList.add('completed');
        } else if (i === activeStep) {
            stepElement.classList.add('active');
        }
    }
}

/**
 * ตรวจสอบข้อมูลในแต่ละขั้นตอน
 */
function validateStep(step) {
    switch(step) {
        case 1:
            return validateUserName();
        case 2:
            return validateMedicationName();
        case 3:
            return validateReminderTime();
        case 4:
            return true; // หมายเหตุไม่จำเป็น
        default:
            return true;
    }
}

function validateUserName() {
    const name = document.getElementById('userName').value.trim();
    if (!name) {
        showValidationError('กรุณากรอกชื่อเล่นของคุณ');
        return false;
    }
    if (name.length < 2) {
        showValidationError('ชื่อเล่นต้องมีอย่างน้อย 2 ตัวอักษร');
        return false;
    }
    
    // สร้างหรืออัพเดทผู้ใช้
    createOrUpdateUser(name);
    return true;
}

function validateMedicationName() {
    const medication = getMedicationName();
    if (!medication) {
        showValidationError('กรุณาเลือกหรือกรอกชื่อยา');
        return false;
    }
    if (medication.length < 2) {
        showValidationError('ชื่อยาต้องมีอย่างน้อย 2 ตัวอักษร');
        return false;
    }
    return true;
}

function validateReminderTime() {
    const hours = parseInt(document.getElementById('reminderHours').value) || 0;
    const minutes = parseInt(document.getElementById('reminderMinutes').value) || 0;
    
    if (hours === 0 && minutes === 0) {
        showValidationError('กรุณากำหนดระยะเวลาแจ้งเตือน');
        return false;
    }
    if (hours < 0 || hours > 23) {
        showValidationError('ชั่วโมงต้องอยู่ระหว่าง 0-23');
        return false;
    }
    if (minutes < 0 || minutes > 59) {
        showValidationError('นาทีต้องอยู่ระหว่าง 0-59');
        return false;
    }
    
    return true;
}

function showValidationError(message) {
    showNotification(message, 'error');
}

/**
 * สร้างหรืออัพเดทผู้ใช้
 */
async function createOrUpdateUser(name) {
    try {
        if (isOnline) {
            const response = await apiRequest('POST', API_ENDPOINTS.saveReminder, {
                action: 'create_user',
                name: name
            });
            
            if (response.success) {
                currentUser = response.user;
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
            }
        } else {
            // ทำงานแบบออฟไลน์
            currentUser = {
                id: Date.now(),
                name: name,
                created_at: new Date().toISOString()
            };
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
        }
    } catch (error) {
        console.error('Error creating user:', error);
        // Fallback ให้ทำงานแบบออฟไลน์
        currentUser = {
            id: Date.now(),
            name: name,
            created_at: new Date().toISOString()
        };
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
    }
}

// ฟังก์ชันจัดการการเลือกยา
function handleMedicationSelect() {
    const select = document.getElementById('medicationSelect');
    const customDiv = document.getElementById('customMedicationDiv');
    
    if (select.value === 'custom') {
        customDiv.classList.remove('hidden');
        customDiv.classList.add('fade-in');
        document.getElementById('customMedication').focus();
    } else {
        customDiv.classList.add('hidden');
        customDiv.classList.remove('fade-in');
    }
}

function getMedicationName() {
    const select = document.getElementById('medicationSelect').value;
    if (select === 'custom') {
        return document.getElementById('customMedication').value.trim();
    }
    return select;
}

// ฟังก์ชันจัดการหมายเหตุ
function handleNoteSelect() {
    const select = document.getElementById('noteSelect');
    const customDiv = document.getElementById('customNoteDiv');
    
    if (select.value === 'custom') {
        customDiv.classList.remove('hidden');
        customDiv.classList.add('fade-in');
        document.getElementById('customNote').focus();
    } else {
        customDiv.classList.add('hidden');
        customDiv.classList.remove('fade-in');
    }
}

function getNoteText() {
    const select = document.getElementById('noteSelect').value;
    if (select === 'custom') {
        return document.getElementById('customNote').value.trim();
    }
    return select;
}

/**
 * อัพเดทข้อมูลยาปัจจุบัน
 */
function updateCurrentMedicationInfo() {
    const medication = getMedicationName();
    const hours = parseInt(document.getElementById('reminderHours').value) || 0;
    const minutes = parseInt(document.getElementById('reminderMinutes').value) || 0;
    const firstTime = document.getElementById('firstDoseTime').value;
    const note = getNoteText();

    let intervalText = formatInterval(hours, minutes);

    const info = `
        <div class="d-flex align-items-center mb-3">
            <i class="fas fa-info-circle me-2 text-primary"></i>
            <h5 class="mb-0">ข้อมูลยาที่กำลังจะเพิ่ม</h5>
        </div>
        <div class="row">
            <div class="col-md-6">
                <strong><i class="fas fa-pills me-2"></i>ชื่อยา:</strong> ${medication}
            </div>
            <div class="col-md-6">
                <strong><i class="fas fa-clock me-2"></i>แจ้งเตือนทุก:</strong> ${intervalText}
            </div>
        </div>
        <div class="row mt-2">
            <div class="col-md-6">
                <strong><i class="fas fa-play me-2"></i>เวลาแรก:</strong> ${firstTime}
            </div>
            <div class="col-md-6">
                <strong><i class="fas fa-sticky-note me-2"></i>หมายเหตุ:</strong> ${note || 'ไม่มี'}
            </div>
        </div>
    `;
    
    document.getElementById('currentMedicationInfo').innerHTML = info;
}

/**
 * เพิ่มยาใหม่
 */
async function addMedication() {
    try {
        const medicationData = {
            id: Date.now(),
            name: getMedicationName(),
            hours: parseInt(document.getElementById('reminderHours').value) || 0,
            minutes: parseInt(document.getElementById('reminderMinutes').value) || 0,
            firstTime: document.getElementById('firstDoseTime').value,
            note: getNoteText(),
            user_id: currentUser ? currentUser.id : null,
            created_at: new Date().toISOString(),
            is_active: 1
        };

        // ตรวจสอบว่ามียาซ้ำหรือไม่
        const duplicate = medications.find(med => 
            med.name.toLowerCase() === medicationData.name.toLowerCase() && med.is_active
        );
        
        if (duplicate) {
            if (!confirm('มียาชื่อนี้อยู่แล้ว ต้องการเพิ่มอีกครั้งหรือไม่?')) {
                return;
            }
        }

        // เพิ่มยาลงในรายการ
        medications.push(medicationData);
        
        // บันทึกลง localStorage
        localStorage.setItem('medications', JSON.stringify(medications));
        
        // ส่งข้อมูลไปยัง server หากออนไลน์
        if (isOnline && currentUser) {
            try {
                await apiRequest('POST', API_ENDPOINTS.saveReminder, {
                    action: 'add_medication',
                    user_id: currentUser.id,
                    name: medicationData.name,
                    hours: medicationData.hours,
                    minutes: medicationData.minutes,
                    first_time: medicationData.firstTime,
                    note: medicationData.note
                });
            } catch (error) {
                console.error('Error saving to server:', error);
                showNotification('บันทึกในเครื่องเรียบร้อย แต่ไม่สามารถส่งข้อมูลไปยังเซิร์ฟเวอร์ได้', 'warning');
            }
        }

        renderMedicationCards();
        resetForm();
        showNotification('เพิ่มยาเรียบร้อยแล้ว!', 'success');
        
        // เปิดใช้งานปุ่มเริ่มใช้งาน
        document.getElementById('startBtn').disabled = false;
        
    } catch (error) {
        console.error('Error adding medication:', error);
        showNotification('เกิดข้อผิดพลาดในการเพิ่มยา', 'error');
    }
}

/**
 * แสดงรายการยา
 */
function renderMedicationCards() {
    const container = document.getElementById('medicationCards');
    container.innerHTML = '';

    const activeMedications = medications.filter(med => med.is_active);
    
    if (activeMedications.length === 0) {
        container.innerHTML = `
            <div class="text-center py-4">
                <i class="fas fa-prescription-bottle-alt fa-3x text-muted mb-3"></i>
                <p class="text-muted">ยังไม่มีรายการยา</p>
            </div>
        `;
        return;
    }

    activeMedications.forEach(med => {
        const intervalText = formatInterval(med.hours, med.minutes);
        const nextReminder = calculateNextReminder(med);

        const card = document.createElement('div');
        card.className = 'medication-card fade-in';
        card.innerHTML = `
            <div class="d-flex justify-content-between align-items-start">
                <div class="flex-grow-1">
                    <h5 class="mb-2">
                        <i class="fas fa-pills me-2"></i>${med.name}
                    </h5>
                    <div class="row">
                        <div class="col-md-6">
                            <p class="mb-1">
                                <i class="fas fa-clock text-primary"></i> 
                                ทุก ${intervalText}
                            </p>
                            <p class="mb-1">
                                <i class="fas fa-play text-success"></i> 
                                เริ่ม: ${med.firstTime}
                            </p>
                        </div>
                        <div class="col-md-6">
                            ${med.note ? `<p class="mb-1"><i class="fas fa-sticky-note text-warning"></i> ${med.note}</p>` : ''}
                            ${nextReminder ? `<p class="mb-1 text-info"><i class="fas fa-bell"></i> ครั้งถัดไป: ${nextReminder}</p>` : ''}
                        </div>
                    </div>
                </div>
                <div class="d-flex flex-column gap-2">
                    <button class="btn btn-sm btn-outline-primary" onclick="editMedication(${med.id})" title="แก้ไข">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteMedication(${med.id})" title="ลบ">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

/**
 * แก้ไขยา
 */
function editMedication(id) {
    const medication = medications.find(med => med.id === id);
    if (!medication) return;

    // เติมข้อมูลในฟอร์ม
    if (medication.name === 'พาราเซตามอล' || medication.name === 'ไอบูโปรเฟน' || 
        medication.name === 'แอสไพริน' || medication.name === 'เซทิริซีน' || 
        medication.name === 'โลราทาดีน' || medication.name === 'อะม็อกซี่ซิลลิน' || 
        medication.name === 'วิตามินซี' || medication.name === 'วิตามินดี' || medication.name === 'แคลเซียม') {
        document.getElementById('medicationSelect').value = medication.name;
        document.getElementById('customMedicationDiv').classList.add('hidden');
    } else {
        document.getElementById('medicationSelect').value = 'custom';
        document.getElementById('customMedication').value = medication.name;
        document.getElementById('customMedicationDiv').classList.remove('hidden');
    }

    document.getElementById('reminderHours').value = medication.hours;
    document.getElementById('reminderMinutes').value = medication.minutes;
    document.getElementById('firstDoseTime').value = medication.firstTime;
    
    if (medication.note) {
        if (['หลังอาหารเช้า', 'หลังอาหารกลางวัน', 'หลังอาหารเย็น', 'ก่อนนอน', 'ก่อนอาหาร', 'ระหว่างอาหาร'].includes(medication.note)) {
            document.getElementById('noteSelect').value = medication.note;
            document.getElementById('customNoteDiv').classList.add('hidden');
        } else {
            document.getElementById('noteSelect').value = 'custom';
            document.getElementById('customNote').value = medication.note;
            document.getElementById('customNoteDiv').classList.remove('hidden');
        }
    }

    // ลบยาเก่า
    deleteMedication(id, false);
    
    // ย้อนกลับไปขั้นตอนที่ 2
    currentStep = 2;
    hideStep(5);
    showStep(2);
    updateStepIndicator(2);
    
    showNotification('โหลดข้อมูลยาเพื่อแก้ไขเรียบร้อย', 'success');
}

/**
 * ลบยา
 */
async function deleteMedication(id, showConfirm = true) {
    if (showConfirm && !confirm('ต้องการลบยานี้หรือไม่?')) {
        return;
    }

    try {
        const medicationIndex = medications.findIndex(med => med.id === id);
        if (medicationIndex === -1) return;

        // Soft delete
        medications[medicationIndex].is_active = 0;
        medications[medicationIndex].updated_at = new Date().toISOString();
        
        // บันทึกลง localStorage
        localStorage.setItem('medications', JSON.stringify(medications));
        
        // ส่งข้อมูลไปยัง server หากออนไลน์
        if (isOnline) {
            try {
                await apiRequest('DELETE', API_ENDPOINTS.saveReminder + `?id=${id}`);
            } catch (error) {
                console.error('Error deleting from server:', error);
            }
        }

        renderMedicationCards();
        
        if (showConfirm) {
            showNotification('ลบยาเรียบร้อยแล้ว!', 'success');
        }
        
        // ตรวจสอบว่ายังมียาหรือไม่
        const activeMedications = medications.filter(med => med.is_active);
        if (activeMedications.length === 0) {
            document.getElementById('startBtn').disabled = true;
        }
        
    } catch (error) {
        console.error('Error deleting medication:', error);
        showNotification('เกิดข้อผิดพลาดในการลบยา', 'error');
    }
}

/**
 * รีเซ็ตฟอร์ม
 */
function resetForm() {
    document.getElementById('medicationSelect').value = '';
    document.getElementById('customMedication').value = '';
    document.getElementById('reminderHours').value = '6';
    document.getElementById('reminderMinutes').value = '0';
    document.getElementById('firstDoseTime').value = '08:00';
    document.getElementById('noteSelect').value = '';
    document.getElementById('customNote').value = '';
    document.getElementById('customMedicationDiv').classList.add('hidden');
    document.getElementById('customNoteDiv').classList.add('hidden');
}

/**
 * คำนวณเวลาแจ้งเตือนครั้งถัดไป
 */
function calculateNextReminder(medication) {
    try {
        const now = new Date();
        const [hours, minutes] = medication.firstTime.split(':');
        const firstTime = new Date();
        firstTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        
        // คำนวณ interval ในมิลลิวินาที
        const intervalMs = (medication.hours * 60 + medication.minutes) * 60 * 1000;
        
        let nextTime = new Date(firstTime);
        
        // ถ้าเวลาแรกผ่านไปแล้ววันนี้
        if (nextTime <= now) {
            // คำนวณจำนวนครั้งที่ผ่านไปแล้ว
            const timePassed = now.getTime() - firstTime.getTime();
            const intervalsPassed = Math.floor(timePassed / intervalMs) + 1;
            nextTime = new Date(firstTime.getTime() + (intervalsPassed * intervalMs));
        }
        
        return nextTime.toLocaleTimeString('th-TH', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
    } catch (error) {
        console.error('Error calculating next reminder:', error);
        return null;
    }
}

/**
 * จัดรูปแบบข้อความ interval
 */
function formatInterval(hours, minutes) {
    const parts = [];
    
    if (hours > 0) {
        parts.push(hours + ' ชั่วโมง');
    }
    
    if (minutes > 0) {
        parts.push(minutes + ' นาที');
    }
    
    return parts.join(' ');
}

/**
 * แสดงการแจ้งเตือน
 */
function showNotification(message, type = 'success') {
    const popup = document.getElementById('notificationPopup');
    const text = document.getElementById('notificationText');
    
    text.textContent = message;
    
    // ลบ class เก่า
    popup.classList.remove('warning', 'error');
    
    if (type === 'warning') {
        popup.classList.add('warning');
    } else if (type === 'error') {
        popup.classList.add('error');
    }
    
    popup.classList.add('show');
    
    setTimeout(() => {
        popup.classList.remove('show');
    }, 4000);
}

/**
 * เริ่มใช้งานระบบแจ้งเตือน
 */
function startReminders() {
    const activeMedications = medications.filter(med => med.is_active);
    
    if (activeMedications.length === 0) {
        showNotification('กรุณาเพิ่มยาอย่างน้อย 1 รายการ', 'warning');
        return;
    }

    // ล้าง timer เก่า
    reminderTimers.forEach(timer => clearInterval(timer));
    reminderTimers = [];

    // สร้าง timer ใหม่สำหรับแต่ละยา
    activeMedications.forEach(med => {
        const intervalMs = (med.hours * 60 + med.minutes) * 60 * 1000;
        
        // คำนวณเวลาแจ้งเตือนครั้งแรก
        const now = new Date();
        const [hours, minutes] = med.firstTime.split(':');
        const firstReminder = new Date();
        firstReminder.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        
        // ถ้าเวลาแรกผ่านไปแล้ววันนี้ ให้เลื่อนไปครั้งถัดไป
        if (firstReminder <= now) {
            const timePassed = now.getTime() - firstReminder.getTime();
            const intervalsPassed = Math.ceil(timePassed / intervalMs);
            firstReminder.setTime(firstReminder.getTime() + (intervalsPassed * intervalMs));
        }

        // ตั้ง timeout สำหรับการแจ้งเตือนครั้งแรก
        const timeToFirst = firstReminder.getTime() - now.getTime();
        
        if (timeToFirst > 0) {
            setTimeout(() => {
                showMedicationReminder(med);
                
                // ตั้ง interval สำหรับการแจ้งเตือนครั้งต่อๆ ไป
                const timer = setInterval(() => {
                    showMedicationReminder(med);
                }, intervalMs);
                
                reminderTimers.push(timer);
            }, timeToFirst);
        } else {
            // ถ้าถึงเวลาแล้ว ให้แจ้งเตือนทันที
            showMedicationReminder(med);
            
            const timer = setInterval(() => {
                showMedicationReminder(med);
            }, intervalMs);
            
            reminderTimers.push(timer);
        }
    });

    const userName = currentUser ? currentUser.name : 'คุณ';
    showNotification(`เริ่มใช้งานระบบแจ้งเตือนสำหรับ ${userName} แล้ว!`, 'success');
    
    // แสดงข้อมูลสรุป
    updateSummaryDisplay();
    
    // บันทึกความคืบหน้า
    saveProgress();
}

/**
 * แสดงการแจ้งเตือนกินยา
 */
function showMedicationReminder(medication) {
    const message = `⏰ ถึงเวลากิน ${medication.name} แล้ว! ${medication.note ? `(${medication.note})` : ''}`;
    showNotification(message, 'warning');
    
    // แสดง browser notification ถ้าได้รับอนุญาต
    if (Notification.permission === 'granted') {
        const notification = new Notification('แจ้งเตือนการกินยา', {
            body: message,
            icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="%23007bff" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM13 17h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>',
            badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="%23007bff" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM13 17h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>',
            tag: 'medication-reminder',
            requireInteraction: true
        });
        
        // เล่นเสียงแจ้งเตือน (ถ้าเบราว์เซอร์รองรับ)
        try {
            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcHwqGhmuLdJOQeIiQ...');
            audio.volume = 0.3;
            audio.play().catch(e => console.log('Cannot play audio:', e));
        } catch (e) {
            console.log('Audio not supported');
        }
        
        // Auto-close notification after 10 seconds
        setTimeout(() => {
            notification.close();
        }, 10000);
    }
    
    // บันทึก log การแจ้งเตือน
    logReminder(medication);
}

/**
 * บันทึก log การแจ้งเตือน
 */
function logReminder(medication) {
    try {
        const logs = JSON.parse(localStorage.getItem('reminderLogs') || '[]');
        logs.push({
            id: Date.now(),
            medication_id: medication.id,
            medication_name: medication.name,
            reminder_time: new Date().toISOString(),
            status: 'sent'
        });
        
        // เก็บ log ล่าสุด 100 รายการ
        if (logs.length > 100) {
            logs.splice(0, logs.length - 100);
        }
        
        localStorage.setItem('reminderLogs', JSON.stringify(logs));
    } catch (error) {
        console.error('Error logging reminder:', error);
    }
}

/**
 * อัพเดทหน้าจอสรุป
 */
function updateSummaryDisplay() {
    const activeMedications = medications.filter(med => med.is_active);
    const userName = currentUser ? currentUser.name : 'คุณ';
    
    const summary = document.createElement('div');
    summary.className = 'alert alert-success alert-custom mt-4';
    summary.innerHTML = `
        <div class="d-flex align-items-center mb-3">
            <i class="fas fa-check-circle fa-2x me-3 text-success"></i>
            <div>
                <h5 class="mb-1">ระบบแจ้งเตือนเริ่มทำงานแล้ว!</h5>
                <p class="mb-0">สวัสดี ${userName}! ระบบจะแจ้งเตือนคุณเมื่อถึงเวลากินยา</p>
            </div>
        </div>
        <div class="row">
            <div class="col-md-4">
                <div class="text-center">
                    <i class="fas fa-pills fa-2x text-primary mb-2"></i>
                    <h6>จำนวนยาที่ติดตาม</h6>
                    <h4 class="text-primary">${activeMedications.length}</h4>
                </div>
            </div>
            <div class="col-md-4">
                <div class="text-center">
                    <i class="fas fa-clock fa-2x text-info mb-2"></i>
                    <h6>เวลาแจ้งเตือนถัดไป</h6>
                    <h6 class="text-info">${getNextReminderTime()}</h6>
                </div>
            </div>
            <div class="col-md-4">
                <div class="text-center">
                    <i class="fas fa-bell fa-2x text-warning mb-2"></i>
                    <h6>สถานะการแจ้งเตือน</h6>
                    <h6 class="text-success">เปิดใช้งาน</h6>
                </div>
            </div>
        </div>
        <div class="mt-3 text-center">
            <button class="btn btn-outline-primary btn-custom me-2" onclick="showReminderLogs()">
                <i class="fas fa-history"></i> ดูประวัติการแจ้งเตือน
            </button>
            <button class="btn btn-outline-danger btn-custom" onclick="stopReminders()">
                <i class="fas fa-stop"></i> หยุดการแจ้งเตือน
            </button>
        </div>
    `;
    
    const step5 = document.getElementById('step-5');
    const existingSummary = step5.querySelector('.alert-success');
    if (existingSummary) {
        existingSummary.remove();
    }
    step5.appendChild(summary);
}

/**
 * หาเวลาแจ้งเตือนถัดไป
 */
function getNextReminderTime() {
    const activeMedications = medications.filter(med => med.is_active);
    if (activeMedications.length === 0) return 'ไม่มี';
    
    let nextTime = null;
    
    activeMedications.forEach(med => {
        const medNextTime = calculateNextReminderDate(med);
        if (medNextTime && (!nextTime || medNextTime < nextTime)) {
            nextTime = medNextTime;
        }
    });
    
    if (nextTime) {
        return nextTime.toLocaleTimeString('th-TH', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    return 'ไม่ทราบ';
}

/**
 * คำนวณวันที่เวลาแจ้งเตือนครั้งถัดไป
 */
function calculateNextReminderDate(medication) {
    try {
        const now = new Date();
        const [hours, minutes] = medication.firstTime.split(':');
        const firstTime = new Date();
        firstTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        
        const intervalMs = (medication.hours * 60 + medication.minutes) * 60 * 1000;
        let nextTime = new Date(firstTime);
        
        while (nextTime <= now) {
            nextTime = new Date(nextTime.getTime() + intervalMs);
        }
        
        return nextTime;
    } catch (error) {
        console.error('Error calculating next reminder date:', error);
        return null;
    }
}

/**
 * หยุดการแจ้งเตือน
 */
function stopReminders() {
    if (confirm('ต้องการหยุดการแจ้งเตือนทั้งหมดหรือไม่?')) {
        reminderTimers.forEach(timer => clearInterval(timer));
        reminderTimers = [];
        showNotification('หยุดการแจ้งเตือนแล้ว', 'warning');
        
        // อัพเดทการแสดงผล
        const step5 = document.getElementById('step-5');
        const existingSummary = step5.querySelector('.alert-success');
        if (existingSummary) {
            existingSummary.remove();
        }
        
        document.getElementById('startBtn').disabled = false;
        document.getElementById('startBtn').innerHTML = '<i class="fas fa-play"></i> เริ่มใช้งานระบบแจ้งเตือนอีกครั้ง';
    }
}

/**
 * แสดงประวัติการแจ้งเตือน
 */
function showReminderLogs() {
    const logs = JSON.parse(localStorage.getItem('reminderLogs') || '[]');
    const recentLogs = logs.slice(-20).reverse(); // 20 รายการล่าสุด
    
    let logHtml = `
        <div class="modal fade" id="reminderLogsModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <i class="fas fa-history me-2"></i>ประวัติการแจ้งเตือน
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
    `;
    
    if (recentLogs.length === 0) {
        logHtml += `
            <div class="text-center py-4">
                <i class="fas fa-inbox fa-3x text-muted mb-3"></i>
                <p class="text-muted">ยังไม่มีประวัติการแจ้งเตือน</p>
            </div>
        `;
    } else {
        logHtml += '<div class="list-group">';
        recentLogs.forEach(log => {
            const date = new Date(log.reminder_time);
            logHtml += `
                <div class="list-group-item">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h6 class="mb-1">${log.medication_name}</h6>
                            <small class="text-muted">
                                <i class="fas fa-clock me-1"></i>
                                ${date.toLocaleString('th-TH')}
                            </small>
                        </div>
                        <span class="badge bg-success">ส่งแล้ว</span>
                    </div>
                </div>
            `;
        });
        logHtml += '</div>';
    }
    
    logHtml += `
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">ปิด</button>
                        <button type="button" class="btn btn-danger" onclick="clearReminderLogs()">ล้างประวัติ</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // ลบ modal เก่าถ้ามี
    const existingModal = document.getElementById('reminderLogsModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // เพิ่ม modal ใหม่
    document.body.insertAdjacentHTML('beforeend', logHtml);
    
    // แสดง modal
    const modal = new bootstrap.Modal(document.getElementById('reminderLogsModal'));
    modal.show();
}

/**
 * ล้างประวัติการแจ้งเตือน
 */
function clearReminderLogs() {
    if (confirm('ต้องการล้างประวัติการแจ้งเตือนทั้งหมดหรือไม่?')) {
        localStorage.removeItem('reminderLogs');
        showNotification('ล้างประวัติเรียบร้อยแล้ว', 'success');
        
        // ปิด modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('reminderLogsModal'));
        modal.hide();
    }
}

/**
 * บันทึกความคืบหน้า
 */
function saveProgress() {
    const progress = {
        currentStep,
        currentUser,
        medications,
        lastUpdated: new Date().toISOString()
    };
    localStorage.setItem('appProgress', JSON.stringify(progress));
}

/**
 * โหลดความคืบหน้า
 */
function loadProgress() {
    try {
        const progress = JSON.parse(localStorage.getItem('appProgress') || '{}');
        if (progress.currentStep && progress.currentStep > 1) {
            // ถามว่าต้องการดำเนินการต่อหรือไม่
            if (confirm('พบข้อมูลการใช้งานก่อนหน้า ต้องการดำเนินการต่อหรือไม่?')) {
                currentStep = Math.min(progress.currentStep, 5);
                currentUser = progress.currentUser;
                medications = progress.medications || [];
                
                // อัพเดทหน้าจอ
                hideStep(1);
                showStep(currentStep);
                updateStepIndicator(currentStep);
                
                if (currentUser) {
                    document.getElementById('userName').value = currentUser.name;
                }
                
                return true;
            }
        }
    } catch (error) {
        console.error('Error loading progress:', error);
    }
    return false;
}

/**
 * ซิงค์ข้อมูลกับเซิร์ฟเวอร์
 */
async function syncDataWithServer() {
    if (!isOnline || !currentUser) return;
    
    try {
        showNotification('กำลังซิงค์ข้อมูล...', 'warning');
        
        // ดึงข้อมูลจากเซิร์ฟเวอร์
        const response = await apiRequest('GET', `${API_ENDPOINTS.getReminders}?action=get_medications&user_id=${currentUser.id}`);
        
        if (response.success) {
            const serverMedications = response.medications || [];
            
            // เปรียบเทียบข้อมูลและอัพเดท
            const localMedications = medications.filter(med => med.is_active);
            
            // หายาที่ไม่มีในเซิร์ฟเวอร์แล้วส่งไป
            for (const localMed of localMedications) {
                const existsOnServer = serverMedications.find(serverMed => 
                    serverMed.name === localMed.name && 
                    serverMed.first_time === localMed.firstTime
                );
                
                if (!existsOnServer) {
                    await apiRequest('POST', API_ENDPOINTS.saveReminder, {
                        action: 'add_medication',
                        user_id: currentUser.id,
                        name: localMed.name,
                        hours: localMed.hours,
                        minutes: localMed.minutes,
                        first_time: localMed.firstTime,
                        note: localMed.note
                    });
                }
            }
            
            showNotification('ซิงค์ข้อมูลเรียบร้อย', 'success');
        }
    } catch (error) {
        console.error('Error syncing data:', error);
        showNotification('ไม่สามารถซิงค์ข้อมูลได้', 'error');
    }
}

/**
 * ฟังก์ชันเรียก API
 */
async function apiRequest(method, endpoint, data = null) {
    const url = API_BASE_URL + endpoint;
    const options = {
        method: method,
        headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
        }
    };
    
    if (data && (method === 'POST' || method === 'PUT')) {
        options.body = JSON.stringify(data);
    }
    
    const response = await fetch(url, options);
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
}

/**
 * ฟังก์ชันเสริม: Export ข้อมูล
 */
function exportData() {
    const data = {
        user: currentUser,
        medications: medications.filter(med => med.is_active),
        logs: JSON.parse(localStorage.getItem('reminderLogs') || '[]'),
        exportDate: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `medication_data_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    showNotification('ส่งออกข้อมูลเรียบร้อย', 'success');
}

/**
 * ฟังก์ชันเสริม: Import ข้อมูล
 */
function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            if (data.user && data.medications) {
                if (confirm('ต้องการนำเข้าข้อมูลนี้หรือไม่? ข้อมูลปัจจุบันจะถูกแทนที่')) {
                    currentUser = data.user;
                    medications = data.medications;
                    
                    localStorage.setItem('currentUser', JSON.stringify(currentUser));
                    localStorage.setItem('medications', JSON.stringify(medications));
                    
                    if (data.logs) {
                        localStorage.setItem('reminderLogs', JSON.stringify(data.logs));
                    }
                    
                    // รีเฟรชหน้าจอ
                    location.reload();
                }
            } else {
                showNotification('ไฟล์ข้อมูลไม่ถูกต้อง', 'error');
            }
        } catch (error) {
            console.error('Error importing data:', error);
            showNotification('เกิดข้อผิดพลาดในการนำเข้าข้อมูล', 'error');
        }
    };
    reader.readAsText(file);
}

/**
 * โหลดความคืบหน้าเมื่อเริ่มต้น
 */
window.addEventListener('load', function() {
    loadProgress();
});