/**
 * managementSystem.js - ระบบบริหารจัดการบริษัทรถไฟเชิงพาณิชย์ (V14.0 - Transactions & Detailed Repairs)
 */
(function() {
const fs = typeof require !== 'undefined' ? require('fs') : null;
const path = typeof require !== 'undefined' ? require('path') : null;
const os = typeof require !== 'undefined' ? require('os') : null;

window.ManagementSystem = {
    wallet: 200000,
    totalIncome: 0,
    totalExpense: 0,
    transactions: [], // { desc, type, amount, date }
    unlockedEastern: false,
    unlockedIsan: false,
    unlockedTrainTypes: {
        ordinary: true,
        express_rapid: false,
        express: false,
        special_express: false
    },
    // แยก 4 ชิ้นส่วน: [Engine, Brakes, Wheels, Electrical]
    partConditions: [100, 100, 100, 100], 
    isOpen: false,
    activeButtons: [],
    focusedButtonIndex: 0,
    currentMenu: "root", // "root", "driver", "financials", "repairs", "concessions", "donate"

    // KK Money System State
    kkLoanLimit: 200000,
    kkLoanDebt: 0,
    kkRepayHistory: 0,

    // Driver System State
    driverName: "",
    driverId: "",
    driverPin: "",
    isCheckedIn: false,
    checkInTime: null,
    shiftIncome: 0,
    inventory: {
        lightBulbs: 0,
        acFans: 0,
        brakePads: 0,
        engineOil: 0,
        gsBatteries: 0,
        yuasaBatteries: 0,
        saftBatteries: 0,
        coolant: 0,
        airFilter: 0,
        fuelFilter: 0,
        transmissionFluid: 0,
        hydraulicFluid: 0,
        tractionMotorBrushes: 0,
        couplingGrease: 0,
        sandingSand: 0,
        suspensionSprings: 0,
        compressorBelt: 0,
        generatorBelt: 0,
        wiperBlades: 0,
        headlightBulbs: 0,
        cabinLights: 0,
        hornCompressor: 0,
        fireExtinguisher: 0,
        firstAidKit: 0,
        toiletChemicals: 0,
        doorMechanism: 0,
        glassWindow: 0,
        passengerSeats: 0
    },
    init: function() {
        let data = null;
        if (fs && path && os) {
            try {
                const saveDir = path.join(os.homedir(), 'Documents', 'ThaiTrainSimulator');
                const filePath = path.join(saveDir, 'management_v3.json');
                if (fs.existsSync(filePath)) {
                    data = fs.readFileSync(filePath, 'utf8');
                }
            } catch (e) {
                console.error("Failed to read physical save", e);
            }
        }
        
        if (!data) {
            data = localStorage.getItem('thaitrain_management_v3');
        }

        if (data) {
            try {
                const parsed = JSON.parse(data);
                this.wallet = Number(parsed.wallet);
                if (isNaN(this.wallet) || this.wallet < 0) this.wallet = 200000;
                // ถ้ามีเงินน้อยกว่า 200,000 และยังไม่ได้โบนัสตั้งต้นใหม่ ให้ปรับเป็น 200,000
                if (this.wallet < 200000 && !localStorage.getItem('thaitrain_200k_update')) {
                    this.wallet = 200000;
                    localStorage.setItem('thaitrain_200k_update', 'true');
                }
                this.totalIncome = Number(parsed.totalIncome) || 0;
                this.totalExpense = Number(parsed.totalExpense) || 0;
                this.transactions = parsed.transactions || [];
                this.unlockedEastern = parsed.unlockedEastern !== undefined ? parsed.unlockedEastern : false;
                this.unlockedIsan = parsed.unlockedIsan !== undefined ? parsed.unlockedIsan : false;
                this.hasLocomotive = parsed.hasLocomotive !== undefined ? parsed.hasLocomotive : true; // ค่าเริ่มต้นคือมีรถไฟอยู่แล้ว
                this.unlockedTrainTypes = parsed.unlockedTrainTypes !== undefined ? parsed.unlockedTrainTypes : {
                    ordinary: true, express_rapid: false, express: false, special_express: false
                };
                this.partConditions = parsed.partConditions || [100, 100, 100, 100];
                this.driverName = parsed.driverName || "";
                this.driverId = parsed.driverId || "";
                this.driverPin = parsed.driverPin || "";
                this.isCheckedIn = this.driverName ? true : false;
                this.checkInTime = parsed.checkInTime || null;
                this.shiftIncome = parsed.shiftIncome || 0;
                this.inventory = parsed.inventory || {};
                const defaultItems = ["lightBulbs", "acFans", "brakePads", "engineOil", "gsBatteries", "yuasaBatteries", "saftBatteries", "coolant", "airFilter", "fuelFilter", "transmissionFluid", "hydraulicFluid", "tractionMotorBrushes", "couplingGrease", "sandingSand", "suspensionSprings", "compressorBelt", "generatorBelt", "wiperBlades", "headlightBulbs", "cabinLights", "hornCompressor", "fireExtinguisher", "firstAidKit", "toiletChemicals", "doorMechanism", "glassWindow", "passengerSeats"];
                defaultItems.forEach(item => {
                    if (this.inventory[item] === undefined) this.inventory[item] = 0;
                });
                
                // KK Money Loan System State
                this.kkLoanLimit = parsed.kkLoanLimit || 200000;
                this.kkLoanDebt = parsed.kkLoanDebt || 0;
                this.kkRepayHistory = parsed.kkRepayHistory || 0;
                
                this.nameChangeCount = parsed.nameChangeCount || 0;
                this.lastNameChangeMonth = parsed.lastNameChangeMonth || "";
            } catch (e) {
                console.error("Error loading management data:", e);
            }
        }
        
        // ปิดระบบเช็คอินพนักงานขับรถชั่วคราวตามคำขอผู้ใช้
        window.isDrivingBlocked = false;
        
        this.save();
        this.setupKeyboardEvents();
    },

    save: function() {
        const state = {
            wallet: this.wallet,
            totalIncome: this.totalIncome,
            totalExpense: this.totalExpense,
            transactions: this.transactions,
            unlockedEastern: this.unlockedEastern,
            unlockedIsan: this.unlockedIsan,
            hasLocomotive: this.hasLocomotive !== undefined ? this.hasLocomotive : true,
            unlockedTrainTypes: this.unlockedTrainTypes,
            partConditions: this.partConditions,
            driverName: this.driverName,
            driverId: this.driverId,
            driverPin: this.driverPin,
            isCheckedIn: this.isCheckedIn,
            checkInTime: this.checkInTime,
            shiftIncome: this.shiftIncome,
            inventory: this.inventory,
            kkLoanLimit: this.kkLoanLimit,
            kkLoanDebt: this.kkLoanDebt,
            kkRepayHistory: this.kkRepayHistory,
            nameChangeCount: this.nameChangeCount,
            lastNameChangeMonth: this.lastNameChangeMonth
        };
        const stateStr = JSON.stringify(state);
        localStorage.setItem('thaitrain_management_v3', stateStr);
        
        if (fs && path && os) {
            try {
                const saveDir = path.join(os.homedir(), 'Documents', 'ThaiTrainSimulator');
                if (!fs.existsSync(saveDir)) {
                    fs.mkdirSync(saveDir, { recursive: true });
                }
                const filePath = path.join(saveDir, 'management_v3.json');
                fs.writeFileSync(filePath, JSON.stringify(state, null, 2), 'utf8');
            } catch (e) {
                console.error("Failed to save to Documents folder:", e);
            }
        }
    },

    getOverallCondition: function() {
        const state = window.TrainState;
        if (!state) return 100;
        const healths = [
            state.batteryHealth !== undefined ? state.batteryHealth : 100,
            state.lightBulbHealth !== undefined ? state.lightBulbHealth : 100,
            state.acFanHealth !== undefined ? state.acFanHealth : 100,
            state.brakeHealth !== undefined ? state.brakeHealth : 100,
            state.engineOilHealth !== undefined ? state.engineOilHealth : 100
        ];
        return healths.reduce((a, b) => a + b, 0) / healths.length;
    },

    addTransaction: function(desc, type, amount) {
        this.transactions.unshift({
            desc: desc,
            type: type, // "income" or "expense"
            amount: amount,
            date: new Date().toLocaleTimeString('th-TH')
        });
        if (this.transactions.length > 50) {
            this.transactions.pop();
        }
    },

    addIncome: function(amount, desc = "รายรับทั่วไป") {
        amount = Number(amount) || 0;
        if (amount <= 0) return;
        
        if (isNaN(this.wallet) || this.wallet < 0) this.wallet = 0; // Reset bugged wallet
        
        this.wallet += amount;
        this.totalIncome += amount;
        if (this.isCheckedIn) {
            this.shiftIncome += amount;
        }
        this.addTransaction(desc, "income", amount);
        this.save();
        
        // เล่นเสียงรับเงิน (ถ้ามี)
        if (window.playOneShot) {
            window.playOneShot('money', 1.0);
        }
    },

    addExpense: function(amount, desc = "รายจ่ายทั่วไป") {
        amount = Number(amount) || 0;
        if (amount <= 0) return;
        
        if (isNaN(this.wallet)) this.wallet = 0;
        this.wallet -= amount;
        if (this.wallet < 0) this.wallet = 0; // ห้ามเงินติดลบ
        
        this.totalExpense += amount;
        this.addTransaction(desc, "expense", amount);
        this.save();
        
        // เล่นเสียงเงินเข้า 2 ครั้งตามคำขอ (แทนเสียงเงินออก)
        if (window.playOneShot) {
            window.playOneShot('money', 1.0);
            setTimeout(() => {
                if (window.playOneShot) window.playOneShot('money', 1.0);
            }, 300);
        }
    },

    toggle: function() {
        if (window.JobSystem && window.JobSystem.isOpen) {
            window.JobSystem.closePopup();
        }
        if (window.SettingsSystem && window.SettingsSystem.isOpen) {
            window.SettingsSystem.close();
        }
        
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    },

    toggleFuelMenu: function() {
        if (window.JobSystem && window.JobSystem.isOpen) {
            window.JobSystem.closePopup();
        }
        if (window.SettingsSystem && window.SettingsSystem.isOpen) {
            window.SettingsSystem.close();
        }
        
        if (this.isOpen) {
            if (this.currentMenu === "fuel") {
                this.close();
            } else {
                this.renderFuelMenu();
            }
        } else {
            this.isOpen = true;
            window.isAnyMenuOpen = true;
            this.currentMenu = "fuel";
            const pop = document.getElementById('management-popup');
            if (pop) pop.style.display = 'block';
            this.renderFuelMenu();
        }
    },

    open: function() {
        this.isOpen = true;
        window.isAnyMenuOpen = true;
        this.currentMenu = "root";
        const pop = document.getElementById('management-popup');
        if (pop) pop.style.display = 'block';
        if (window.speak) window.speak("เปิดเมนูบริหารจัดการบริษัทรถไฟ");
        this.renderRootMenu();
    },

    close: function() {
        this.isOpen = false;
        window.isAnyMenuOpen = false;
        const pop = document.getElementById('management-popup');
        if (pop) pop.style.display = 'none';
        if (window.forceAccessibilityFocus) window.forceAccessibilityFocus();
    },

    renderRootMenu: function() {
        const list = document.getElementById('management-list');
        if (!list) return;
        this.currentMenu = "root";
        
        const netProfit = this.totalIncome - this.totalExpense;
        const profitColor = netProfit >= 0 ? 'var(--success)' : '#ff4444';
        const avgCondition = this.getOverallCondition().toFixed(1);
        
        list.innerHTML = `
            <h3>บริหารจัดการบริษัท</h3>
            <div class="stat-card" style="margin-bottom:15px; border: 1px solid var(--accent-color); background: rgba(0, 242, 255, 0.05); padding: 15px; border-radius:12px;">
                <div style="font-size:18px; font-weight:bold; color:var(--success);"> ยอดเงินคงเหลือ: ${this.wallet.toLocaleString()} บาท</div>
                <div style="font-size:16px; margin-top:5px; color:var(--text-primary);"> สภาพเฉลี่ย: ${avgCondition}%</div>
                <hr style="border: 0; height: 1px; background: rgba(255,255,255,0.2); margin: 10px 0;">
                <div style="font-size:14px; display:flex; justify-content:space-between; font-weight:bold;">
                    <span style="color:${profitColor};">ผลประกอบการสุทธิ:</span> 
                    <span style="color:${profitColor};">${netProfit >= 0 ? '+' : ''}${netProfit.toLocaleString()} บาท</span>
                </div>
            </div>
        `;

        // 0. Driver Menu (ระบบพนักงานขับรถและเช็คอิน)
        const btnDriver = document.createElement('button');
        btnDriver.className = 'job-card';
        btnDriver.innerText = "ระบบข้อมูลและเช็คอินพนักงานขับรถ";
        btnDriver.style.borderColor = "#00ffcc";
        btnDriver.style.backgroundColor = "rgba(0, 255, 204, 0.1)";
        btnDriver.onclick = () => this.renderDriverMenu();
        list.appendChild(btnDriver);

        // 1. Financials (ศูนย์บัญชีบริษัท)
        const btnFin = document.createElement('button');
        btnFin.className = 'job-card';
        btnFin.innerText = "ศูนย์บัญชีบริษัท";
        btnFin.onclick = () => this.renderFinancialRoot();
        list.appendChild(btnFin);

        // 2. Repairs (On-train Equipment Room)
        const btnRep = document.createElement('button');
        btnRep.className = 'job-card';
        btnRep.innerText = "ห้องเก็บอุปกรณ์บนรถไฟ (ซ่อมระหว่างทาง)";
        btnRep.onclick = () => this.renderRepairMenu();
        list.appendChild(btnRep);

        // 3. Store
        const btnStore = document.createElement('button');
        btnStore.className = 'job-card';
        btnStore.innerText = "ศูนย์สั่งซื้ออะไหล่รถไฟ (Store)";
        btnStore.onclick = () => this.renderStoreMenu();
        list.appendChild(btnStore);

        // 4. Concessions & Unlocks
        const btnConcessions = document.createElement('button');
        btnConcessions.className = 'job-card';
        btnConcessions.innerText = "ศูนย์จัดซื้อและสัมปทาน (ซื้อเส้นทางและขบวนรถ)";
        btnConcessions.onclick = () => this.renderConcessionsMenu();
        list.appendChild(btnConcessions);



        // 5. KK Money
        const btnKKMoney = document.createElement('button');
        btnKKMoney.className = 'job-card';
        btnKKMoney.innerText = "สถาบันการเงิน KK Money (บริการเงินกู้ฉุกเฉิน)";
        btnKKMoney.style.borderColor = "#ffd700";
        btnKKMoney.style.backgroundColor = "rgba(255, 215, 0, 0.1)";
        btnKKMoney.onclick = () => {
            this.renderKKMoneyMenu();
        };
        list.appendChild(btnKKMoney);

        // 6. Donate
        const btnDonate = document.createElement('button');
        btnDonate.className = 'job-card';
        btnDonate.innerText = "สนับสนุนผู้พัฒนาเกม (บริจาค)";
        btnDonate.style.borderColor = "#ff4da6";
        btnDonate.style.backgroundColor = "rgba(255, 77, 166, 0.1)";
        btnDonate.onclick = () => this.renderDonateMenu();
        list.appendChild(btnDonate);
        
        // 7. Newsletter (สมัครรับข่าวสาร)
        const btnNewsletter = document.createElement('button');
        btnNewsletter.className = 'job-card';
        btnNewsletter.innerText = "สมัครรับข่าวสารอัปเดตเกมผ่านอีเมล";
        btnNewsletter.style.borderColor = "#4CAF50";
        btnNewsletter.style.backgroundColor = "rgba(76, 175, 80, 0.1)";
        btnNewsletter.onclick = () => this.renderNewsletterPrompt();
        list.appendChild(btnNewsletter);

        // 8. Report Issue (แจ้งปัญหา)
        const btnReport = document.createElement('button');
        btnReport.className = 'job-card';
        btnReport.innerText = "ศูนย์รับเรื่องร้องเรียน (แจ้งปัญหา / ส่ง Feedback)";
        btnReport.style.borderColor = "#ff9800";
        btnReport.style.backgroundColor = "rgba(255, 152, 0, 0.1)";
        btnReport.onclick = () => this.renderReportPrompt();
        list.appendChild(btnReport);

        // 9. How to play
        const btnHowToPlay = document.createElement('button');
        btnHowToPlay.className = 'job-card';
        btnHowToPlay.innerText = "คู่มือการเล่น (How to Play)";
        btnHowToPlay.style.borderColor = "#00bcd4";
        btnHowToPlay.style.backgroundColor = "rgba(0, 188, 212, 0.1)";
        btnHowToPlay.onclick = () => this.renderHowToPlayRoot();
        list.appendChild(btnHowToPlay);

        // Exit Button
        const btnClose = document.createElement('button');
        btnClose.className = 'btn-close';
        btnClose.innerText = "ปิดหน้าต่าง (Escape)";
        btnClose.onclick = () => this.close();
        list.appendChild(btnClose);

        this.setupKeyboard(list);
    },

    renderInputPrompt: function(title, label, isPassword, onConfirm, onCancel) {
        const list = document.getElementById('management-list');
        if (!list) return;
        this.currentMenu = "input_prompt";
        
        list.innerHTML = `<h3>${title}</h3>`;
        if (window.speak) window.speak(label + " พิมพ์เสร็จแล้วกด Enter เพื่อยืนยัน หรือกด Escape เพื่อยกเลิกครับ");

        const input = document.createElement('input');
        input.type = isPassword ? "password" : "search";
        input.setAttribute('role', 'searchbox');
        input.placeholder = label;
        input.className = 'job-card';
        input.style.backgroundColor = '#fff';
        input.style.color = '#000';
        input.style.cursor = 'text';
        input.style.outline = 'none';
        input.setAttribute('aria-label', label);
        
        input.addEventListener('keydown', (e) => {
            e.stopPropagation(); // ล็อคปุ่มเกม 100% ไม่ให้หลุดไปเตือนรับกุญแจ
            if (e.key === 'Enter') {
                e.preventDefault();
                if (input.value.trim() !== "") {
                    onConfirm(input.value.trim());
                } else {
                    if (window.speak) window.speak("คุณยังไม่ได้พิมพ์ข้อมูลครับ");
                }
            } else if (e.key === 'Escape') {
                e.preventDefault();
                onCancel();
            }
        });
        list.appendChild(input);

        // Add visible Cancel button
        const btnCancel = document.createElement('button');
        btnCancel.className = 'btn-close';
        btnCancel.style.backgroundColor = "#555";
        btnCancel.innerText = "ยกเลิก (Escape)";
        btnCancel.onclick = () => onCancel();
        list.appendChild(btnCancel);

        this.activeButtons = [input, btnCancel];
        this.focusedButtonIndex = 0;
        this.focusButton(0);
        setTimeout(() => input.focus(), 50);
    },

    renderNewsletterPrompt: function() {
        if (window.speak) window.speak("ระบบสมัครรับข่าวสาร ข้อมูลของคุณจะถูกเก็บรักษาด้วยความปลอดภัยสูงสุดตามนโยบายของผู้พัฒนา");
        this.renderInputPrompt(
            "สมัครรับข่าวสารอัปเดตเกม",
            "กรุณาพิมพ์อีเมลของคุณที่นี่",
            false,
            async (email) => {
                if (!email.includes('@')) {
                    if (window.speak) window.speak("รูปแบบอีเมลไม่ถูกต้อง กรุณาตรวจสอบอีกครั้งครับ");
                    setTimeout(() => this.renderNewsletterPrompt(), 1500);
                    return;
                }
                
                if (window.speak) window.speak("กำลังส่งข้อมูลไปยังเซิร์ฟเวอร์ กรุณารอสักครู่ครับ");
                
                try {
                    const response = await fetch("http://119.59.103.185:45000/api/subscribe", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ email: email })
                    });
                    
                    const result = await response.json();
                    if (result.success && result.message === 'Email already subscribed') {
                        if (window.speak) window.speak("อีเมลนี้ได้ลงทะเบียนไว้แล้วครับ ขอบคุณที่ติดตามครับ");
                        setTimeout(() => this.renderRootMenu(), 2500);
                    } else if (result.success) {
                        if (window.speak) window.speak("บันทึกอีเมลสำเร็จ! ระบบได้ส่งอีเมลต้อนรับเพื่อยืนยันความปลอดภัยสูงสุดไปยังกล่องจดหมายของคุณแล้วครับ");
                        setTimeout(() => this.renderRootMenu(), 4000);
                    } else {
                        if (window.speak) window.speak("เกิดข้อผิดพลาดในการบันทึกอีเมล กรุณาลองใหม่ภายหลังครับ");
                        setTimeout(() => this.renderRootMenu(), 2500);
                    }
                } catch (err) {
                    if (window.speak) window.speak("ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ในขณะนี้ กรุณาตรวจสอบอินเทอร์เน็ตครับ");
                    setTimeout(() => this.renderRootMenu(), 2500);
                }
            },
            () => this.close()
        );
    },

    renderReportPrompt: function() {
        if (window.speak) window.speak("ศูนย์รับเรื่องร้องเรียน กรุณาพิมพ์รายละเอียดปัญหาที่คุณพบ");
        this.renderInputPrompt(
            "แจ้งปัญหา / Feedback",
            "พิมพ์รายละเอียดปัญหา...",
            false,
            async (issueText) => {
                if (issueText.trim().length < 5) {
                    if (window.speak) window.speak("ข้อความสั้นเกินไป กรุณาอธิบายปัญหาให้ชัดเจนขึ้นครับ");
                    setTimeout(() => this.renderReportPrompt(), 1500);
                    return;
                }
                
                if (window.speak) window.speak("กำลังส่งข้อความไปยังเซิร์ฟเวอร์ กรุณารอสักครู่...");
                
                try {
                    const playerName = this.driverName || "ไม่ระบุชื่อ";
                    const response = await fetch("http://119.59.103.185:45000/api/report-issue", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ playerName, issueText })
                    });
                    
                    const result = await response.json();
                    if (result.success) {
                        if (window.speak) window.speak("ส่งข้อมูลไปยังอีเมลผู้พัฒนาเรียบร้อยแล้ว ขอบคุณสำหรับความคิดเห็นครับ!");
                        setTimeout(() => this.renderRootMenu(), 3000);
                    } else {
                        if (window.speak) window.speak("เกิดข้อผิดพลาดในการส่งข้อมูล: " + (result.message || "ไม่ทราบสาเหตุ"));
                        setTimeout(() => this.renderRootMenu(), 3000);
                    }
                } catch (err) {
                    if (window.speak) window.speak("ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ในขณะนี้ กรุณาลองใหม่ภายหลัง");
                    setTimeout(() => this.renderRootMenu(), 3000);
                }
            },
            () => this.renderRootMenu()
        );
    },

    renderHowToPlayRoot: function() {
        const list = document.getElementById('management-list');
        if (!list) return;
        this.currentMenu = "how_to_play";
        
        if (window.speak) window.speak("คู่มือการเล่นเกม มีหลายหัวข้อให้เลือกอ่านครับ");
        
        list.innerHTML = `<h3> คู่มือการเล่น (How to Play)</h3>
        <p style="color:var(--text-primary); font-size:14px; margin-bottom:15px;">เลือกหัวข้อที่คุณต้องการศึกษาเพื่อดูรายละเอียดการเล่นในแต่ละส่วน</p>`;

        const topics = [
            { id: 'controls', name: "1. การควบคุมพื้นฐานและการขับขี่" },
            { id: 'radio', name: "2. ระบบวิทยุสื่อสารและ AI ควบคุม" },
            { id: 'management', name: "3. ระบบบริษัท การเงิน และการซื้อของ" },
            { id: 'passengers', name: "4. การรับส่งผู้โดยสารและเปลี่ยนป้าย" },
            { id: 'emergency', name: "5. เหตุฉุกเฉินและการซ่อมบำรุง" }
        ];

        topics.forEach(topic => {
            const btn = document.createElement('button');
            btn.className = 'job-card';
            btn.innerText = topic.name;
            btn.style.borderColor = "#00bcd4";
            btn.onclick = () => this.renderHowToTopic(topic.id, topic.name);
            list.appendChild(btn);
        });

        const btnBack = document.createElement('button');
        btnBack.className = 'btn-close';
        btnBack.innerText = "ย้อนกลับ (Escape)";
        btnBack.onclick = () => this.renderRootMenu();
        list.appendChild(btnBack);
        
        this.setupKeyboard(list);
    },

    renderHowToTopic: function(topicId, topicName) {
        const list = document.getElementById('management-list');
        if (!list) return;
        this.currentMenu = "how_to_topic";
        
        if (window.speak) window.speak("กำลังอ่านหัวข้อ " + topicName.replace(/[0-9.]/g, ''));
        
        let content = [];
        switch(topicId) {
            case 'controls':
                content = [
                    "W / S: เร่งเครื่อง / ลดคันเร่ง",
                    "A / D: เพิ่มเบรก / ลดเบรก",
                    "Spacebar: ลงเบรกฉุกเฉิน (Emergency Brake) ทันที",
                    "E: สตาร์ท / ดับเครื่องยนต์",
                    "Q: กดปุ่ม Deadman สลับไปมาเพื่อป้องกันรถเบรกฉุกเฉิน"
                ];
                break;
            case 'radio':
                content = [
                    "[ และ ]: เปลี่ยนช่องวิทยุ (1 - 20)",
                    "ระบบเป็นแบบ Open Mic สามารถพูดคุยโต้ตอบกับผู้เล่นอื่นในช่องเดียวกันได้ตลอดเวลา",
                    "ช่อง 1 (ศูนย์ควบคุม): AI จะคอยแจ้งเตือนระยะทางก่อนถึงสถานีและทางหลีกแบบเจาะจงรายขบวน",
                    "ระบบวิทยุสามารถรับฟังเสียงประกาศเหตุฉุกเฉิน (ว.9) แบบสมจริงได้"
                ];
                break;
            case 'management':
                content = [
                    "เมนู M: เปิดหน้าต่างการจัดการบริษัท",
                    "คุณต้องตั้งชื่อพนักงานและ 'เช็คอิน' ก่อนเริ่มขับเพื่อให้ได้เงิน",
                    "เมื่อเช็คเอาท์เงินจะเข้าสู่บัญชีบริษัทตามระยะทางที่วิ่ง",
                    "บริษัทมีค่าเสื่อมสภาพของขบวนรถ คุณต้องกดเข้ามาในเมนู ห้องเก็บอุปกรณ์ เพื่อซื้ออะไหล่ซ่อมบำรุง",
                    "หากเงินหมด สามารถกู้เงินฉุกเฉินได้ที่ สถาบันการเงิน KK Money"
                ];
                break;
            case 'passengers':
                content = [
                    "P: เปลี่ยนป้ายสถานีปลายทางข้างตู้โดยสารและหัวรถจักร",
                    "K: เปิด-ปิดประตูรถไฟสำหรับรับส่งผู้โดยสาร",
                    "เมื่อเข้าจอดที่สถานี ให้อยู่ในความเร็วต่ำกว่า 5 กม./ชม. ระบบจะบังคับจอดอัตโนมัติให้ตรงป้าย",
                    "หากวิ่งเลยป้ายสถานี ผู้โดยสารจะไม่สามารถขึ้นรถได้ และไม่ได้ค่าโดยสาร"
                ];
                break;
            case 'emergency':
                content = [
                    "หากเกิดอุบัติเหตุชนรถยนต์หรือสัตว์ รถไฟจะเบรกฉุกเฉินโดยอัตโนมัติ",
                    "หากความเร็วเกินกำหนด ระบบจะร้องเตือน หากไม่ลดความเร็วระบบจะหยุดรถทันที",
                    "การใช้เบรกฉุกเฉินบ่อยครั้งจะทำให้ ล้อสึกหรอ ไวขึ้น (ต้องเปลี่ยนอะไหล่ในเมนู)",
                    "ฝนตกหรือทางลื่นจะทำให้ระยะเบรกเพิ่มขึ้น กรุณาเผื่อระยะในการหยุดรถ"
                ];
                break;
        }

        list.innerHTML = `<h3 style="color:#00bcd4;">${topicName}</h3>`;
        
        content.forEach(text => {
            const btn = document.createElement('button');
            btn.className = 'job-card';
            btn.innerText = text;
            btn.style.textAlign = 'left';
            btn.style.cursor = 'default';
            btn.style.backgroundColor = 'rgba(0, 188, 212, 0.05)';
            btn.style.borderColor = 'rgba(0, 188, 212, 0.2)';
            list.appendChild(btn);
        });

        const btnBack = document.createElement('button');
        btnBack.className = 'btn-close';
        btnBack.innerText = "ย้อนกลับ (Escape)";
        btnBack.onclick = () => this.renderHowToPlayRoot();
        list.appendChild(btnBack);
        
        this.setupKeyboard(list);
    },

    renderDriverMenu: function() {
        const list = document.getElementById('management-list');
        if (!list) return;
        this.currentMenu = "driver";
        
        if (window.speak) {
            if (!this.driverName) window.speak("ระบบพนักงานขับรถ กรุณาลงทะเบียนพนักงานใหม่ หรือเข้าสู่ระบบด้วยรหัสพนักงานเดิมครับ");
            else window.speak(`ยินดีต้อนรับคุณ ${this.driverName} รหัสพนักงาน ${this.driverPin} ระบบขับรถไฟพร้อมให้บริการครับ`);
        }

        list.innerHTML = `<h3>ระบบพนักงานขับรถ</h3>`;
        if (this.driverName && this.driverPin) {
            list.innerHTML += `<p style="color: #ffcc00; font-size: 20px; margin: 10px 0;">‍️ พนักงานขับรถ: คุณ ${this.driverName} (รหัสพนักงาน: ${this.driverPin})</p>`;
        }

        // ปุ่มเช็คพนักงานที่กำลังออนไลน์
        const btnCheckOnline = document.createElement('button');
        btnCheckOnline.className = 'job-card';
        btnCheckOnline.innerText = "เช็คพนักงานที่กำลังทำงานอยู่ (ออนไลน์)";
        btnCheckOnline.onclick = async () => {
            if (window.speak) window.speak("กำลังตรวจสอบพนักงานที่กำลังออนไลน์ กรุณารอสักครู่");
            try {
                const res = await fetch("http://119.59.103.185:45000/api/drivers/online");
                const data = await res.json();
                if (data.success) {
                    if (data.drivers.length === 0) {
                        if (window.speak) window.speak("ตอนนี้ยังไม่มีพนักงานท่านอื่นทำงานอยู่ครับ");
                        // อย่าพึ่งรีเทิร์นทันที ให้แสดงข้อความแจ้งเตือนด้วยเพื่อให้โปรแกรมอ่านหน้าจอได้พูดจบ
                    } else {
                        if (window.speak) window.speak(`ตอนนี้มีพนักงานกำลังทำงานอยู่ ${data.drivers.length} ท่านครับ`);
                    }
                    
                    this.currentMenu = "driver_list_online";
                    list.innerHTML = `<h3>พนักงานที่กำลังออนไลน์ (${data.drivers.length} ท่าน)</h3>`;
                    
                    if (data.drivers.length === 0) {
                        const noData = document.createElement('p');
                        noData.innerText = "ไม่มีพนักงานออนไลน์ในขณะนี้";
                        noData.style.color = '#ff9999';
                        list.appendChild(noData);
                    } else {
                        data.drivers.forEach(d => {
                            const btn = document.createElement('button');
                            btn.className = 'job-card';
                            btn.innerText = `รหัสพนักงาน ${d.id}: คุณ ${d.name} (สถานะ: ออนไลน์)`;
                            btn.style.textAlign = 'left';
                            btn.style.cursor = 'default';
                            btn.style.backgroundColor = 'rgba(0, 255, 100, 0.1)';
                            btn.style.borderColor = 'rgba(0, 255, 100, 0.4)';
                            list.appendChild(btn);
                        });
                    }
                    
                    const btnBack = document.createElement('button');
                    btnBack.className = 'btn-close';
                    btnBack.innerText = "ย้อนกลับ (Escape)";
                    btnBack.onclick = () => this.renderDriverMenu();
                    list.appendChild(btnBack);
                    
                    this.setupKeyboard(list);
                } else {
                    if (window.speak) window.speak("ไม่สามารถดึงข้อมูลพนักงานออนไลน์ได้ครับ");
                }
            } catch(e) {
                console.error(e);
                if (window.speak) window.speak("ระบบเครือข่ายมีปัญหา ไม่สามารถดึงข้อมูลได้");
            }
        };
        list.appendChild(btnCheckOnline);

        // ปุ่มเช็ครายชื่อพนักงานทั้งหมดจาก Server
        const btnCheckDrivers = document.createElement('button');
        btnCheckDrivers.className = 'job-card';
        btnCheckDrivers.innerText = "เช็คข้อมูลประวัติพนักงานทั้งหมดในระบบ";
        btnCheckDrivers.onclick = async () => {
            if (window.speak) window.speak("กำลังดึงข้อมูลประวัติพนักงานจากเซิร์ฟเวอร์ กรุณารอสักครู่");
            try {
                const res = await fetch("http://119.59.103.185:45000/api/drivers");
                const data = await res.json();
                if (data.success) {
                    if (data.drivers.length === 0) {
                        if (window.speak) window.speak("ยังไม่มีประวัติพนักงานในระบบครับ");
                    } else {
                        if (window.speak) window.speak(`พบข้อมูลประวัติพนักงานทั้งหมด ${data.drivers.length} ท่าน เลื่อนลูกศรเพื่อฟังรายชื่อได้เลยครับ`);
                    }
                    
                    this.currentMenu = "driver_list_all";
                    list.innerHTML = `<h3>รายชื่อประวัติพนักงานทั้งหมด</h3>`;
                    
                    if (data.drivers.length === 0) {
                        const noData = document.createElement('p');
                        noData.innerText = "ไม่มีประวัติพนักงานในระบบ";
                        noData.style.color = '#ff9999';
                        list.appendChild(noData);
                    } else {
                        data.drivers.forEach(d => {
                            const btn = document.createElement('button');
                            btn.className = 'job-card';
                            btn.innerText = `รหัสพนักงาน ${d.id}: คุณ ${d.name}`;
                            btn.style.textAlign = 'left';
                            btn.style.cursor = 'default';
                            btn.style.backgroundColor = 'rgba(0, 255, 204, 0.05)';
                            btn.style.borderColor = 'rgba(0, 255, 204, 0.2)';
                            list.appendChild(btn);
                        });
                    }
                    
                    const btnBack = document.createElement('button');
                    btnBack.className = 'btn-close';
                    btnBack.innerText = "ย้อนกลับ (Escape)";
                    btnBack.onclick = () => this.renderDriverMenu();
                    list.appendChild(btnBack);
                    
                    this.setupKeyboard(list);
                } else {
                    if (window.speak) window.speak("ไม่สามารถดึงข้อมูลได้ครับ");
                    this.renderDriverMenu();
                }
            } catch(e) {
                if (window.speak) window.speak("เชื่อมต่อเซิร์ฟเวอร์ล้มเหลวครับ");
                this.renderDriverMenu();
            }
        };
        list.appendChild(btnCheckDrivers);

        // ปุ่มเช็คพนักงานที่ออนไลน์อยู่ตอนนี้
        const btnOnlineNow = document.createElement('button');
        btnOnlineNow.className = 'job-card';
        btnOnlineNow.innerText = "ตรวจสอบพนักงานที่กำลังออนไลน์ตอนนี้";
        btnOnlineNow.style.borderColor = "#00ff00";
        btnOnlineNow.style.backgroundColor = "rgba(0, 255, 0, 0.1)";
        btnOnlineNow.onclick = () => {
            if (!window.MultiplayerSystem) {
                if (window.speak) window.speak("ระบบผู้เล่นหลายคนยังไม่พร้อมทำงานครับ");
                return;
            }
            const onlinePlayers = Object.values(window.MultiplayerSystem.remotePlayers);
            if (onlinePlayers.length === 0) {
                if (window.speak) window.speak("ตอนนี้ยังไม่มีพนักงานท่านอื่นออนไลน์อยู่เลยครับ");
                return;
            }
            if (window.speak) window.speak(`ขณะนี้มีพนักงานออนไลน์อยู่ ${onlinePlayers.length} ท่าน เลื่อนลูกศรเพื่อฟังรายชื่อได้เลยครับ`);
            
            this.currentMenu = "driver_list_online_now";
            list.innerHTML = `<h3>พนักงานที่กำลังออนไลน์ (${onlinePlayers.length} ท่าน)</h3>`;
            
            onlinePlayers.forEach(p => {
                const btn = document.createElement('button');
                btn.className = 'job-card';
                // ถ้ามีขบวนรถให้แจ้งด้วย
                const trainInfo = p.trainNumber ? ` ขบวน ${p.trainNumber}` : "";
                btn.innerText = `คุณ ${p.playerName || 'ไม่ทราบชื่อ'}${trainInfo}`;
                btn.style.textAlign = 'left';
                btn.style.cursor = 'default';
                btn.style.backgroundColor = 'rgba(0, 255, 0, 0.05)';
                btn.style.borderColor = 'rgba(0, 255, 0, 0.2)';
                list.appendChild(btn);
            });
            
            const btnBack = document.createElement('button');
            btnBack.className = 'btn-close';
            btnBack.innerText = "ย้อนกลับ (Escape)";
            btnBack.onclick = () => this.renderDriverMenu();
            list.appendChild(btnBack);
            
            this.setupKeyboard(list);
        };
        list.appendChild(btnOnlineNow);

        if (!this.driverName || !this.driverPin) {
            const btnRegister = document.createElement('button');
            btnRegister.className = 'job-card';
            btnRegister.innerText = "ลงทะเบียนพนักงานใหม่ (Online)";
            btnRegister.onclick = () => {
                this.renderInputPrompt("ลงทะเบียนพนักงานขับรถ", "พิมพ์ชื่อที่ต้องการให้แสดง...", false, async (name) => {
                    this.tempName = name.trim();
                    if(this.tempName.length === 0) return this.renderDriverMenu();
                    
                    if (window.speak) window.speak("กำลังลงทะเบียนและรับรหัสพนักงานใหม่...");
                    try {
                        const res = await fetch("http://119.59.103.185:45000/api/drivers/register", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ name: this.tempName })
                        });
                        const result = await res.json();
                        if (result.success) {
                            this.driverName = result.name;
                            this.driverId = result.id;
                            this.driverPin = result.id;
                            this.isCheckedIn = true;
                            this.checkInTime = Date.now();
                            this.shiftIncome = 0;
                            this.save();
                            
                            localStorage.setItem('thaiTrainPlayerName', this.driverName);
                            localStorage.setItem('thaitrain_driver_name_v2', this.driverName);
                            localStorage.setItem('thaitrain_driver_pin_v2', this.driverPin);
                            if (window.MultiplayerSystem) {
                                window.MultiplayerSystem.playerName = this.driverName;
                            }
                            
                            if (window.speak) window.speak(`ลงทะเบียนสำเร็จ ยินดีต้อนรับคุณ ${this.driverName} รหัสพนักงานของคุณคือ ${this.driverPin} ขอให้เดินทางปลอดภัยครับ`);
                            setTimeout(() => this.close(), 1200);
                        } else {
                            if (window.speak) window.speak("เกิดข้อผิดพลาด: " + result.message);
                            this.renderDriverMenu();
                        }
                    } catch (err) {
                        if (window.speak) window.speak("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
                        this.renderDriverMenu();
                    }
                }, () => this.renderDriverMenu());
            };
            list.appendChild(btnRegister);

            const btnLogin = document.createElement('button');
            btnLogin.className = 'job-card';
            btnLogin.innerText = "เข้าสู่ระบบด้วยรหัสพนักงานเดิม";
            btnLogin.onclick = () => {
                this.renderInputPrompt("เข้าสู่ระบบพนักงาน", "กรุณากรอกรหัสพนักงานของคุณ...", false, async (id) => {
                    const enteredId = id.trim();
                    if(enteredId.length === 0) return this.renderDriverMenu();
                    
                    if (window.speak) window.speak("กำลังตรวจสอบข้อมูลกับเซิร์ฟเวอร์...");
                    try {
                        const res = await fetch("http://119.59.103.185:45000/api/drivers/auth", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ id: enteredId })
                        });
                        const result = await res.json();
                        if (result.success) {
                            this.driverName = result.name;
                            this.driverId = enteredId;
                            this.driverPin = enteredId;
                            this.isCheckedIn = true;
                            this.checkInTime = Date.now();
                            this.shiftIncome = 0;
                            this.save();
                            
                            localStorage.setItem('thaiTrainPlayerName', this.driverName);
                            localStorage.setItem('thaitrain_driver_name_v2', this.driverName);
                            localStorage.setItem('thaitrain_driver_pin_v2', this.driverPin);
                            if (window.MultiplayerSystem) {
                                window.MultiplayerSystem.playerName = this.driverName;
                            }
                            
                            if (window.speak) window.speak(`ยินดีต้อนรับคุณ ${this.driverName} เข้าสู่ระบบสำเร็จ ขอให้เดินทางปลอดภัยครับ`);
                            setTimeout(() => this.close(), 1000);
                        } else {
                            if (window.speak) window.speak("ไม่พบรหัสพนักงานนี้ในระบบออนไลน์ครับ");
                            this.renderDriverMenu();
                        }
                    } catch (err) {
                        console.error("Online auth failed:", err);
                        const localName = localStorage.getItem('thaitrain_driver_name_v2');
                        const localPin = localStorage.getItem('thaitrain_driver_pin_v2');
                        if (localName && localPin && enteredId === localPin) {
                            this.driverName = localName;
                            this.driverId = enteredId;
                            this.driverPin = localPin;
                            this.isCheckedIn = true;
                            this.checkInTime = Date.now();
                            this.shiftIncome = 0;
                            this.save();
                            if (window.speak) window.speak("เซิร์ฟเวอร์ออฟไลน์ เข้าสู่ระบบแบบออฟไลน์สำเร็จครับ");
                            setTimeout(() => this.close(), 1000);
                        } else {
                            if (window.speak) window.speak("เซิร์ฟเวอร์ออฟไลน์ และไม่มีข้อมูลแคชพนักงานในเครื่องนี้ครับ");
                            this.renderDriverMenu();
                        }
                    }
                }, () => this.renderDriverMenu());
            };
            list.appendChild(btnLogin);
        } else {
            // ระบบเปลี่ยนชื่อพนักงาน
            const currentMonth = new Date().toISOString().substring(0, 7);
            if (this.lastNameChangeMonth !== currentMonth) {
                this.nameChangeCount = 0;
                this.lastNameChangeMonth = currentMonth;
            }
            const changesLeft = 3 - this.nameChangeCount;
            
            const btnChangeName = document.createElement('button');
            btnChangeName.className = 'job-card';
            btnChangeName.innerText = `เปลี่ยนชื่อพนักงาน (สิทธิ์เหลือ ${changesLeft} ครั้งในเดือนนี้)`;
            btnChangeName.onclick = () => {
                if (changesLeft <= 0) {
                    if (window.speak) window.speak("คุณใช้สิทธิ์เปลี่ยนชื่อครบ 3 ครั้งในเดือนนี้แล้วครับ กรุณารอเดือนถัดไป");
                    return;
                }
                this.renderInputPrompt("เปลี่ยนชื่อพนักงาน", "กรุณาพิมพ์ชื่อพนักงานใหม่ของคุณ", false, (newName) => {
                    const oldName = this.driverName;
                    this.driverName = newName;
                    this.nameChangeCount++;
                    this.lastNameChangeMonth = currentMonth;
                    this.save();
                    
                    localStorage.setItem('thaitrain_driver_name_v2', this.driverName);
                    
                    if (window.speak) window.speak(`เปลี่ยนชื่อสำเร็จ จาก ${oldName} เป็น ${this.driverName} สิทธิ์คงเหลือ ${3 - this.nameChangeCount} ครั้งครับ`);
                    this.renderDriverMenu();
                }, () => this.renderDriverMenu());
            };
            list.appendChild(btnChangeName);

            const btnLogout = document.createElement('button');
            btnLogout.className = 'job-card';
            btnLogout.style.borderColor = '#ff4444';
            btnLogout.innerText = "ลบข้อมูลพนักงานในเครื่อง (ออกจากระบบ)";
            btnLogout.onclick = () => {
                this.driverName = "";
                this.driverId = "";
                this.driverPin = "";
                this.isCheckedIn = false;
                this.save();
                localStorage.removeItem('thaitrain_driver_name_v2');
                localStorage.removeItem('thaitrain_driver_pin_v2');
                if (window.speak) window.speak("ลบข้อมูลพนักงานในเครื่องและออกจากระบบแล้วครับ");
                this.renderDriverMenu();
            };
            list.appendChild(btnLogout);
        }

        const btnBack = document.createElement('button');
        btnBack.className = 'btn-close';
        btnBack.style.backgroundColor = "#555";
        btnBack.innerText = "ย้อนกลับ (Escape)";
        btnBack.onclick = () => this.renderRootMenu();
        list.appendChild(btnBack);

        this.setupKeyboard(list);
    },

    renderFinancialRoot: function() {
        const list = document.getElementById('management-list');
        if (!list) return;
        this.currentMenu = "financial_root";
        
        if (window.speak) window.speak("ศูนย์บัญชีบริษัท เลือกดูรายรับ รายจ่าย หรือยอดเงินคงเหลือ");

        list.innerHTML = `<h3>ศูนย์บัญชีบริษัท</h3>`;

        const btnIncome = document.createElement('button');
        btnIncome.className = 'job-card';
        btnIncome.innerText = "บัญชีรายรับ";
        btnIncome.onclick = () => this.renderIncomeList();
        list.appendChild(btnIncome);

        const btnExpense = document.createElement('button');
        btnExpense.className = 'job-card';
        btnExpense.innerText = "บัญชีรายจ่าย";
        btnExpense.onclick = () => this.renderExpenseList();
        list.appendChild(btnExpense);

        const btnBalance = document.createElement('button');
        btnBalance.className = 'job-card';
        btnBalance.innerText = `ยอดเงินคงเหลือ ณ ปัจจุบัน: ${this.wallet.toLocaleString()} บาท`;
        btnBalance.onclick = () => {
            if (window.speak) window.speak(`ยอดเงินคงเหลือ ณ ปัจจุบัน ${this.wallet} บาท`);
        };
        list.appendChild(btnBalance);

        const btnBack = document.createElement('button');
        btnBack.className = 'btn-close';
        btnBack.style.backgroundColor = "#555";
        btnBack.innerText = "ย้อนกลับ (Escape)";
        btnBack.onclick = () => this.renderRootMenu();
        list.appendChild(btnBack);

        this.setupKeyboard(list);
    },

    renderIncomeList: function() {
        const list = document.getElementById('management-list');
        if (!list) return;
        this.currentMenu = "income_list";
        
        if (window.speak) window.speak("บัญชีรายรับ เลื่อนลูกศรเพื่อฟังรายการรับเงิน");
        list.innerHTML = `<h3>บัญชีรายรับ</h3>`;

        const incomes = this.transactions.filter(t => t.type === 'income');
        if (incomes.length === 0) {
            const btn = document.createElement('button');
            btn.className = 'job-card';
            btn.innerText = "ยังไม่มีประวัติรายรับ";
            list.appendChild(btn);
        } else {
            incomes.forEach((txn) => {
                const btn = document.createElement('button');
                btn.className = 'job-card';
                btn.innerText = `รายรับ: ${txn.desc} จำนวน ${txn.amount.toLocaleString()} บาท`;
                btn.onclick = () => {
                    if (window.speak) window.speak(`รายรับ ${txn.desc} จำนวน ${txn.amount} บาท`);
                };
                list.appendChild(btn);
            });
        }

        const btnBack = document.createElement('button');
        btnBack.className = 'btn-close';
        btnBack.style.backgroundColor = "#555";
        btnBack.innerText = "ย้อนกลับ (Escape)";
        btnBack.onclick = () => this.renderFinancialRoot();
        list.appendChild(btnBack);

        this.setupKeyboard(list);
    },

    renderExpenseList: function() {
        const list = document.getElementById('management-list');
        if (!list) return;
        this.currentMenu = "expense_list";
        
        if (window.speak) window.speak("บัญชีรายจ่าย เลื่อนลูกศรเพื่อฟังรายการจ่ายเงิน");
        list.innerHTML = `<h3>บัญชีรายจ่าย</h3>`;

        const expenses = this.transactions.filter(t => t.type === 'expense');
        if (expenses.length === 0) {
            const btn = document.createElement('button');
            btn.className = 'job-card';
            btn.innerText = "ยังไม่มีประวัติรายจ่าย";
            list.appendChild(btn);
        } else {
            expenses.forEach((txn) => {
                const btn = document.createElement('button');
                btn.className = 'job-card';
                btn.innerText = `รายจ่าย: ${txn.desc} จำนวน ${txn.amount.toLocaleString()} บาท`;
                btn.onclick = () => {
                    if (window.speak) window.speak(`รายจ่าย ${txn.desc} จำนวน ${txn.amount} บาท`);
                };
                list.appendChild(btn);
            });
        }

        const btnBack = document.createElement('button');
        btnBack.className = 'btn-close';
        btnBack.style.backgroundColor = "#555";
        btnBack.innerText = "ย้อนกลับ (Escape)";
        btnBack.onclick = () => this.renderFinancialRoot();
        list.appendChild(btnBack);

        this.setupKeyboard(list);
    },

    renderRepairMenu: function() {
        const list = document.getElementById('management-list');
        if (!list) return;
        this.currentMenu = "repairs";
        
        if (window.speak) window.speak("เข้าสู่ห้องเก็บอุปกรณ์บนรถไฟ");

        list.innerHTML = `<h3> ห้องเก็บอุปกรณ์บนรถไฟ (ซ่อมระหว่างทาง)</h3>
        <div style="font-size:16px; margin-bottom:15px; color:var(--text-primary); background:rgba(255,255,255,0.05); padding:10px; border-radius:8px;">
             อะไหล่ในคลังสำรองของคุณ:<br>
            • หลอดไฟ: ${this.inventory.lightBulbs} ชุด | • พัดลมแอร์: ${this.inventory.acFans} ตัว<br>
            • ผ้าเบรก: ${this.inventory.brakePads} ชุด | • น้ำมันเครื่อง: ${this.inventory.engineOil} แกลลอน | • สารหล่อเย็น: ${this.inventory.coolant || 0} ขวด<br>
            • GS Battery: ${this.inventory.gsBatteries} ลูก | • Yuasa: ${this.inventory.yuasaBatteries} ลูก | • Saft: ${this.inventory.saftBatteries} ลูก
        </div>`;

        const state = window.TrainState;
        if (!state) return;

        // 1. หลอดไฟ
        const btnBulb = document.createElement('button');
        btnBulb.className = 'job-card';
        const bulbH = state.lightBulbHealth !== undefined ? state.lightBulbHealth.toFixed(1) : "100.0";
        btnBulb.innerText = `ซ่อมแซม/เปลี่ยนหลอดไฟ (สภาพ: ${bulbH}%) [ต้องการ: หลอดไฟ 1 ชุด]`;
        btnBulb.onclick = () => {
            if (state.lightBulbHealth >= 100) {
                if (window.speak) window.speak("หลอดไฟยังอยู่ในสภาพดีเต็มร้อยเปอร์เซ็นต์ ไม่ต้องเปลี่ยนครับ");
                return;
            }
            if (this.inventory.lightBulbs <= 0) {
                if (window.speak) window.speak("คุณไม่มีหลอดไฟในคลัง กรุณาไปซื้อจากศูนย์สั่งซื้ออะไหล่ก่อนครับ");
                return;
            }
            this.inventory.lightBulbs--;
            state.lightBulbHealth = 100;
            this.save();
            if (window.speak) window.speak("เปลี่ยนหลอดไฟชุดใหม่เรียบร้อยแล้ว สภาพกลับมาเต็มร้อยเปอร์เซ็นต์ครับ");
            this.renderRepairMenu();
        };
        list.appendChild(btnBulb);

        // 2. พัดลมแอร์
        const btnAc = document.createElement('button');
        btnAc.className = 'job-card';
        const acH = state.acFanHealth !== undefined ? state.acFanHealth.toFixed(1) : "100.0";
        btnAc.innerText = `ซ่อมแซม/เปลี่ยนพัดลมแอร์ (สภาพ: ${acH}%) [ต้องการ: พัดลมแอร์ 1 ตัว]`;
        btnAc.onclick = () => {
            if (state.acFanHealth >= 100) {
                if (window.speak) window.speak("พัดลมแอร์ยังอยู่ในสภาพดีเต็มร้อยเปอร์เซ็นต์ ไม่ต้องเปลี่ยนครับ");
                return;
            }
            if (this.inventory.acFans <= 0) {
                if (window.speak) window.speak("คุณไม่มีพัดลมแอร์ในคลัง กรุณาไปซื้อจากศูนย์สั่งซื้ออะไหล่ก่อนครับ");
                return;
            }
            this.inventory.acFans--;
            state.acFanHealth = 100;
            this.save();
            if (window.speak) window.speak("เปลี่ยนพัดลมแอร์ตัวใหม่เรียบร้อยแล้ว สภาพกลับมาเต็มร้อยเปอร์เซ็นต์ครับ");
            this.renderRepairMenu();
        };
        list.appendChild(btnAc);

        // 3. ผ้าเบรก
        const btnBrake = document.createElement('button');
        btnBrake.className = 'job-card';
        const brakeH = state.brakeHealth !== undefined ? state.brakeHealth.toFixed(1) : "100.0";
        btnBrake.innerText = `ซ่อมแซม/เปลี่ยนผ้าเบรก (สภาพ: ${brakeH}%) [ต้องการ: ผ้าเบรก 1 ชุด]`;
        btnBrake.onclick = () => {
            if (state.brakeHealth >= 100) {
                if (window.speak) window.speak("ผ้าเบรกยังอยู่ในสภาพดีเต็มร้อยเปอร์เซ็นต์ ไม่ต้องเปลี่ยนครับ");
                return;
            }
            if (this.inventory.brakePads <= 0) {
                if (window.speak) window.speak("คุณไม่มีผ้าเบรกในคลัง กรุณาไปซื้อจากศูนย์สั่งซื้ออะไหล่ก่อนครับ");
                return;
            }
            this.inventory.brakePads--;
            state.brakeHealth = 100;
            this.save();
            if (window.speak) window.speak("เปลี่ยนผ้าเบรกชุดใหม่เรียบร้อยแล้ว สภาพกลับมาเต็มร้อยเปอร์เซ็นต์ครับ");
            this.renderRepairMenu();
        };
        list.appendChild(btnBrake);

        // 4. น้ำมันเครื่อง
        const btnOil = document.createElement('button');
        btnOil.className = 'job-card';
        const oilH = state.engineOilHealth !== undefined ? state.engineOilHealth.toFixed(1) : "100.0";
        btnOil.innerText = `เปลี่ยนถ่ายน้ำมันเครื่อง (สภาพ: ${oilH}%) [ต้องการ: น้ำมันเครื่อง 1 แกลลอน]`;
        btnOil.onclick = () => {
            if (state.engineOilHealth >= 100) {
                if (window.speak) window.speak("น้ำมันเครื่องยังอยู่ในสภาพดีเต็มร้อยเปอร์เซ็นต์ ไม่ต้องเปลี่ยนครับ");
                return;
            }
            if (this.inventory.engineOil <= 0) {
                if (window.speak) window.speak("คุณไม่มีน้ำมันเครื่องในคลัง กรุณาไปซื้อจากศูนย์สั่งซื้ออะไหล่ก่อนครับ");
                return;
            }
            this.inventory.engineOil--;
            state.engineOilHealth = 100;
            this.save();
            if (window.speak) window.speak("เปลี่ยนถ่ายน้ำมันเครื่องขวดใหม่เรียบร้อยแล้ว สภาพกลับมาเต็มร้อยเปอร์เซ็นต์ครับ");
            this.renderRepairMenu();
        };
        list.appendChild(btnOil);

        // 4.5. สารหล่อเย็น
        const btnCoolant = document.createElement('button');
        btnCoolant.className = 'job-card';
        const coolantLevel = state.coolantLevel !== undefined ? state.coolantLevel.toFixed(1) : "100.0";
        btnCoolant.innerText = `เติมสารหล่อเย็นหม้อน้ำ (ระดับ: ${coolantLevel}%) [ต้องการ: สารหล่อเย็น 1 ขวด]`;
        btnCoolant.onclick = () => {
            if (state.coolantLevel >= 100) {
                if (window.speak) window.speak("ระดับสารหล่อเย็นเต็มหม้อน้ำอยู่แล้วครับ ไม่ต้องเติมเพิ่ม");
                return;
            }
            if ((this.inventory.coolant || 0) <= 0) {
                if (window.speak) window.speak("คุณไม่มีสารหล่อเย็นในคลัง กรุณาไปซื้อจากศูนย์สั่งซื้ออะไหล่ก่อนครับ");
                return;
            }
            this.inventory.coolant--;
            state.coolantLevel = 100;
            this.save();
            if (window.speak) window.speak("เติมสารหล่อเย็นเรียบร้อยแล้ว หม้อน้ำพร้อมระบายความร้อนเต็มที่ครับ");
            this.renderRepairMenu();
        };
        list.appendChild(btnCoolant);

        // 6. ซ่อมเครื่องยนต์ฉุกเฉิน (Overhaul)
        const btnEngine = document.createElement('button');
        btnEngine.className = 'job-card';
        btnEngine.style.borderColor = '#ff9800';
        btnEngine.innerText = `บริการซ่อมเครื่องยนต์ฉุกเฉิน ลดอุณหภูมิและเติมของเหลว (ค่าบริการ 5,000 บาท)`;
        btnEngine.onclick = () => {
            if (this.wallet < 5000) {
                if (window.speak) window.speak("ยอดเงินบริษัทไม่พอสำหรับค่าซ่อมเครื่องยนต์ฉุกเฉินครับ (ต้องการ 5,000 บาท)");
                return;
            }
            if (state.engineTemp <= 60 && state.engineOilHealth > 50 && state.coolantLevel > 50) {
                if (window.speak) window.speak("เครื่องยนต์ยังอยู่ในสภาพดี อุณหภูมิปกติ ไม่จำเป็นต้องซ่อมฉุกเฉินครับ");
                return;
            }
            
            this.addExpense(5000, "ซ่อมเครื่องยนต์ฉุกเฉิน (ลดอุณหภูมิและเติมของเหลว)");
            state.engineTemp = 40;
            state.engineOilHealth = 100;
            state.coolantLevel = 100;
            this.save();
            
            if (window.speak) window.speak("ช่างเข้าทำการซ่อมแซมฉุกเฉิน ลดอุณหภูมิเครื่องยนต์และเติมของเหลวเต็มระบบเรียบร้อยแล้วครับ สามารถสตาร์ทเครื่องยนต์เดินทางต่อได้ทันที");
            this.renderRepairMenu();
        };
        list.appendChild(btnEngine);

        // 5. แบตเตอรี่ปัจจุบัน
        const btnCurrentBatt = document.createElement('button');
        btnCurrentBatt.className = 'job-card';
        btnCurrentBatt.style.borderColor = 'var(--accent-color)';
        const battBrand = state.batteryBrand || "Yuasa Heavy Duty";
        const battH = state.batteryHealth !== undefined ? state.batteryHealth.toFixed(1) : "100.0";
        const battV = state.batteryVoltage !== undefined ? state.batteryVoltage.toFixed(1) : "74.0";
        btnCurrentBatt.innerText = ` แบตเตอรี่ติดตั้งอยู่: ${battBrand} (สภาพ: ${battH}%, แรงดัน: ${battV}V)`;
        btnCurrentBatt.onclick = () => {
            if (window.speak) window.speak(`ปัจจุบันติดตั้งแบตเตอรี่ ${battBrand} สภาพเหลืออยู่ ${battH} เปอร์เซ็นต์ แรงดัน ${battV} โวลต์ครับ หากต้องการเปลี่ยน ให้กดปุ่มยี่ห้อแบตเตอรี่ในรายการถัดไปครับ`);
        };
        list.appendChild(btnCurrentBatt);

        // ฟังก์ชันช่วยเทิร์นแบตเตอรี่เก่า
        const getBatteryRefund = (brand, health) => {
            let base = 6000;
            if (brand === "GS Battery") base = 4000;
            if (brand === "Saft Ni-Cd Premium") base = 12000;
            return Math.ceil(base * (health / 100));
        };

        // 6. เปลี่ยนเป็น GS Battery (ต้องการจากคลัง)
        if (this.inventory.gsBatteries > 0) {
            const btnGS = document.createElement('button');
            btnGS.className = 'job-card';
            btnGS.style.borderColor = 'var(--success)';
            btnGS.innerText = ` ติดตั้ง GS Battery จากคลัง (คลังมี: ${this.inventory.gsBatteries} ลูก)`;
            btnGS.onclick = () => {
                const refund = getBatteryRefund(state.batteryBrand, state.batteryHealth);
                this.inventory.gsBatteries--;
                this.addIncome(refund, `เทิร์นแบตเตอรี่เก่ายี่ห้อ ${state.batteryBrand}`);
                state.batteryBrand = "GS Battery";
                state.batteryHealth = 100;
                state.batteryCharge = 400.0; // GS capacity is 400
                if (window.PhysicsSystem && window.PhysicsSystem.updateBatteryVoltage) {
                    window.PhysicsSystem.updateBatteryVoltage(state);
                }
                this.save();
                if (window.speak) window.speak(`เปลี่ยนติดตั้งแบตเตอรี่ GS Battery สำเร็จ! ได้รับเงินคืนจากการเทิร์นแบตเตอรี่ลูกเก่าจำนวน ${refund} บาท`);
                this.renderRepairMenu();
            };
            list.appendChild(btnGS);
        }

        // 7. เปลี่ยนเป็น Yuasa (ต้องการจากคลัง)
        if (this.inventory.yuasaBatteries > 0) {
            const btnYuasa = document.createElement('button');
            btnYuasa.className = 'job-card';
            btnYuasa.style.borderColor = 'var(--success)';
            btnYuasa.innerText = ` ติดตั้ง Yuasa Heavy Duty จากคลัง (คลังมี: ${this.inventory.yuasaBatteries} ลูก)`;
            btnYuasa.onclick = () => {
                const refund = getBatteryRefund(state.batteryBrand, state.batteryHealth);
                this.inventory.yuasaBatteries--;
                this.addIncome(refund, `เทิร์นแบตเตอรี่เก่ายี่ห้อ ${state.batteryBrand}`);
                state.batteryBrand = "Yuasa Heavy Duty";
                state.batteryHealth = 100;
                state.batteryCharge = 450.0; // Yuasa capacity is 450
                if (window.PhysicsSystem && window.PhysicsSystem.updateBatteryVoltage) {
                    window.PhysicsSystem.updateBatteryVoltage(state);
                }
                this.save();
                if (window.speak) window.speak(`เปลี่ยนติดตั้งแบตเตอรี่ ยัวซ่า สำเร็จ! ได้รับเงินคืนจากการเทิร์นแบตเตอรี่ลูกเก่าจำนวน ${refund} บาท`);
                this.renderRepairMenu();
            };
            list.appendChild(btnYuasa);
        }

        // 8. เปลี่ยนเป็น Saft (ต้องการจากคลัง)
        if (this.inventory.saftBatteries > 0) {
            const btnSaft = document.createElement('button');
            btnSaft.className = 'job-card';
            btnSaft.style.borderColor = 'var(--success)';
            btnSaft.innerText = ` ติดตั้ง Saft Ni-Cd Premium จากคลัง (คลังมี: ${this.inventory.saftBatteries} ลูก)`;
            btnSaft.onclick = () => {
                const refund = getBatteryRefund(state.batteryBrand, state.batteryHealth);
                this.inventory.saftBatteries--;
                this.addIncome(refund, `เทิร์นแบตเตอรี่เก่ายี่ห้อ ${state.batteryBrand}`);
                state.batteryBrand = "Saft Ni-Cd Premium";
                state.batteryHealth = 100;
                state.batteryCharge = 500.0; // Saft capacity is 500
                if (window.PhysicsSystem && window.PhysicsSystem.updateBatteryVoltage) {
                    window.PhysicsSystem.updateBatteryVoltage(state);
                }
                this.save();
                if (window.speak) window.speak(`เปลี่ยนติดตั้งแบตเตอรี่ แซฟท์ นิกเกิลแคดเมียม พรีเมียม สำเร็จ! ได้รับเงินคืนจากการเทิร์นแบตเตอรี่ลูกเก่าจำนวน ${refund} บาท`);
                this.renderRepairMenu();
            };
            list.appendChild(btnSaft);
        }

        const btnBack = document.createElement('button');
        btnBack.className = 'btn-close';
        btnBack.style.backgroundColor = "#555";
        btnBack.innerText = "ย้อนกลับ (Escape)";
        btnBack.onclick = () => this.renderRootMenu();
        list.appendChild(btnBack);

        this.setupKeyboard(list);
    },

    renderStoreMenu: function() {
        const list = document.getElementById('management-list');
        if (!list) return;
        this.currentMenu = "store";
        
        if (window.speak) window.speak("เข้าสู่ศูนย์สั่งซื้ออะไหล่รถไฟ เลื่อนลูกศรเพื่อเลือกซื้อสินค้า");

        list.innerHTML = `<h3> ศูนย์สั่งซื้ออะไหล่รถไฟ (Store)</h3>
        <div class="stat-card" style="margin-bottom:15px; border: 1px solid var(--accent-color); background: rgba(0, 242, 255, 0.05); padding: 12px; border-radius:12px;">
            <div style="font-size:17px; font-weight:bold; color:var(--success);"> เงินสดบริษัท: ${this.wallet.toLocaleString()} บาท</div>
            <div style="font-size:14px; margin-top:5px; color:var(--text-primary);">
                 ไอเทมทั้งหมด 28 รายการ - เลื่อนดูปุ่มด้านล่างเพื่อเช็คจำนวนในคลังและกดซื้อ
            </div>
        </div>`;

        const storeItems = [
            { id: 'lightBulbs', name: "หลอดไฟห้องโดยสารและไฟหน้า", price: 1500, unit: "ชุด" },
            { id: 'acFans', name: "พัดลมแอร์คอมเพรสเซอร์", price: 8000, unit: "ตัว" },
            { id: 'brakePads', name: "ผ้าเบรกหัวรถจักร", price: 15000, unit: "ชุด" },
            { id: 'engineOil', name: "น้ำมันเครื่อง", price: 5000, unit: "แกลลอน" },
            { id: 'coolant', name: "สารหล่อเย็นหม้อน้ำ", price: 500, unit: "ขวด" },
            { id: 'gsBatteries', name: "GS Battery (400Ah, 72V)", price: 12000, unit: "ลูก" },
            { id: 'yuasaBatteries', name: "Yuasa Heavy Duty (450Ah, 74V)", price: 18000, unit: "ลูก" },
            { id: 'saftBatteries', name: "Saft Ni-Cd Premium (500Ah, 74V)", price: 35000, unit: "ลูก" },
            { id: 'airFilter', name: "ไส้กรองอากาศ", price: 800, unit: "ชิ้น" },
            { id: 'fuelFilter', name: "ไส้กรองน้ำมันเชื้อเพลิง", price: 1200, unit: "ชิ้น" },
            { id: 'transmissionFluid', name: "น้ำมันเกียร์", price: 4500, unit: "แกลลอน" },
            { id: 'hydraulicFluid', name: "น้ำมันไฮดรอลิก", price: 3000, unit: "แกลลอน" },
            { id: 'tractionMotorBrushes', name: "แปรงถ่านมอเตอร์ขับลาก", price: 2500, unit: "ชุด" },
            { id: 'couplingGrease', name: "จาระบีทาขอพ่วง", price: 400, unit: "ถัง" },
            { id: 'sandingSand', name: "ทรายพ่นราง/ทรายกันลื่น", price: 200, unit: "ถุง" },
            { id: 'suspensionSprings', name: "สปริงช่วงล่าง", price: 22000, unit: "ชุด" },
            { id: 'compressorBelt', name: "สายพานปั๊มลม", price: 1800, unit: "เส้น" },
            { id: 'generatorBelt', name: "สายพานไดชาร์จ", price: 1500, unit: "เส้น" },
            { id: 'wiperBlades', name: "ใบปัดน้ำฝน", price: 600, unit: "คู่" },
            { id: 'headlightBulbs', name: "หลอดไฟหน้าแบบ LED", price: 3500, unit: "คู่" },
            { id: 'cabinLights', name: "หลอดไฟห้องโดยสารแบบราง", price: 1200, unit: "ชุด" },
            { id: 'hornCompressor', name: "คอมเพรสเซอร์แตรลม", price: 9500, unit: "ชุด" },
            { id: 'fireExtinguisher', name: "ถังดับเพลิง", price: 1500, unit: "ถัง" },
            { id: 'firstAidKit', name: "ชุดปฐมพยาบาล", price: 800, unit: "ชุด" },
            { id: 'toiletChemicals', name: "น้ำยาเคมีห้องน้ำ", price: 300, unit: "แกลลอน" },
            { id: 'doorMechanism', name: "ชุดกลไกประตูอัตโนมัติ", price: 14000, unit: "ชุด" },
            { id: 'glassWindow', name: "กระจกหน้าต่างตู้โดยสาร", price: 4500, unit: "บาน" },
            { id: 'passengerSeats', name: "เบาะที่นั่งผู้โดยสาร", price: 3000, unit: "ตัว" }
        ];

        storeItems.forEach((item, index) => {
            const btn = document.createElement('button');
            btn.className = 'job-card';
            const count = this.inventory[item.id] || 0;
            btn.innerText = `${index + 1}. ซื้อ${item.name} - ราคา ${item.price.toLocaleString()} บาท (มีในคลัง ${count} ${item.unit})`;
            
            // อ่านชื่อตอนเลื่อนผ่าน
            btn.addEventListener('focus', () => {
                if (window.speak) window.speak(`${index + 1} ซื้อ${item.name} ราคา ${item.price} บาท มีในคลัง ${count} ${item.unit}`);
            });

            btn.onclick = () => {
                if (this.wallet < item.price) {
                    if (window.speak) window.speak(`ยอดเงินคงเหลือไม่พอซื้อ${item.name}ครับ`);
                    return;
                }
                this.addExpense(item.price, `ซื้อ${item.name}`);
                this.inventory[item.id] = (this.inventory[item.id] || 0) + 1;
                this.save();
                if (window.speak) window.speak(`ซื้อ${item.name}สำเร็จ ตอนนี้คุณมีในคลัง ${this.inventory[item.id]} ${item.unit}ครับ`);
                this.renderStoreMenu(); // Refresh UI
            };
            list.appendChild(btn);
        });

        // เมนูขายของเก่า
        const btnSell = document.createElement('button');
        btnSell.className = 'job-card';
        btnSell.style.borderColor = '#ffd700';
        btnSell.innerText = `${storeItems.length + 1}. เมนูขายเศษเหล็กและอะไหล่เก่า (ได้ทุนคืน)`;
        btnSell.onclick = () => {
            this.renderSellPartsMenu();
        };
        list.appendChild(btnSell);

        // (Removed btnSellTrain to prevent duplication with Concessions menu)

        const btnBack = document.createElement('button');
        btnBack.className = 'btn-close';
        btnBack.style.backgroundColor = "#555";
        btnBack.innerText = "ย้อนกลับ (Escape)";
        btnBack.onclick = () => this.renderRootMenu();
        list.appendChild(btnBack);

        this.setupKeyboard(list);
    },

    renderSellPartsMenu: function() {
        const list = document.getElementById('management-list');
        if (!list) return;
        this.currentMenu = "sell_parts";
        
        if (window.speak) window.speak("เมนูขายเศษเหล็กและอะไหล่เก่า");

        list.innerHTML = `<h3> ขายเศษเหล็กและอะไหล่เก่า</h3>
        <div style="font-size:16px; margin-bottom:15px; color:var(--text-primary); background:rgba(0,0,0,0.2); padding:10px; border-radius:8px;">
            กระเป๋าเงินบริษัท: ${this.wallet.toLocaleString()} บาท
        </div>`;

        // 1. ขายหลอดไฟ (ได้ 500)
        if (this.inventory.lightBulbs > 0) {
            const btn = document.createElement('button');
            btn.className = 'job-card';
            btn.innerText = `ขายหลอดไฟ 1 ชุด (ในคลังมี: ${this.inventory.lightBulbs} ชุด) - คืนเงิน 500 บาท`;
            btn.onclick = () => {
                this.inventory.lightBulbs--;
                this.addIncome(500, "ขายเศษเหล็กหลอดไฟเก่า");
                if (window.speak) window.speak("ขายหลอดไฟสำเร็จ ได้รับเงินคืน ห้าร้อยบาท");
                this.renderSellPartsMenu();
            };
            list.appendChild(btn);
        }

        // 2. ขายพัดลมแอร์ (ได้ 2,500)
        if (this.inventory.acFans > 0) {
            const btn = document.createElement('button');
            btn.className = 'job-card';
            btn.innerText = `ขายพัดลมแอร์ 1 ตัว (ในคลังมี: ${this.inventory.acFans} ตัว) - คืนเงิน 2,500 บาท`;
            btn.onclick = () => {
                this.inventory.acFans--;
                this.addIncome(2500, "ขายพัดลมแอร์เก่า");
                if (window.speak) window.speak("ขายพัดลมแอร์สำเร็จ ได้รับเงินคืน สองพันห้าร้อยบาท");
                this.renderSellPartsMenu();
            };
            list.appendChild(btn);
        }

        // 3. ขายผ้าเบรก (ได้ 4,500)
        if (this.inventory.brakePads > 0) {
            const btn = document.createElement('button');
            btn.className = 'job-card';
            btn.innerText = `ขายผ้าเบรก 1 ชุด (ในคลังมี: ${this.inventory.brakePads} ชุด) - คืนเงิน 4,500 บาท`;
            btn.onclick = () => {
                this.inventory.brakePads--;
                this.addIncome(4500, "ขายเศษเหล็กผ้าเบรกเก่า");
                if (window.speak) window.speak("ขายผ้าเบรกสำเร็จ ได้รับเงินคืน สี่พันห้าร้อยบาท");
                this.renderSellPartsMenu();
            };
            list.appendChild(btn);
        }

        // 4. ขายน้ำมันเครื่อง (ได้ 1,500)
        if (this.inventory.engineOil > 0) {
            const btn = document.createElement('button');
            btn.className = 'job-card';
            btn.innerText = `ขายน้ำมันเครื่อง 1 แกลลอน (ในคลังมี: ${this.inventory.engineOil} แกลลอน) - คืนเงิน 1,500 บาท`;
            btn.onclick = () => {
                this.inventory.engineOil--;
                this.addIncome(1500, "ขายน้ำมันเครื่องเก่า");
                if (window.speak) window.speak("ขายน้ำมันเครื่องสำเร็จ ได้รับเงินคืน หนึ่งพันห้าร้อยบาท");
                this.renderSellPartsMenu();
            };
            list.appendChild(btn);
        }

        // 5. GS Battery จากคลัง (ได้ 4,000)
        if (this.inventory.gsBatteries > 0) {
            const btn = document.createElement('button');
            btn.className = 'job-card';
            btn.innerText = `ขาย GS Battery จากคลัง (ในคลังมี: ${this.inventory.gsBatteries} ลูก) - คืนเงิน 4,000 บาท`;
            btn.onclick = () => {
                this.inventory.gsBatteries--;
                this.addIncome(4000, "ขายแบตเตอรี่ GS เก่า");
                if (window.speak) window.speak("ขายแบตเตอรี่สำเร็จ ได้รับเงินคืน สี่พันบาท");
                this.renderSellPartsMenu();
            };
            list.appendChild(btn);
        }

        // 6. ขาย Yuasa Battery จากคลัง (ได้ 6,000)
        if (this.inventory.yuasaBatteries > 0) {
            const btn = document.createElement('button');
            btn.className = 'job-card';
            btn.innerText = `ขาย Yuasa Heavy Duty จากคลัง (ในคลังมี: ${this.inventory.yuasaBatteries} ลูก) - คืนเงิน 6,000 บาท`;
            btn.onclick = () => {
                this.inventory.yuasaBatteries--;
                this.addIncome(6000, "ขายแบตเตอรี่ Yuasa เก่า");
                if (window.speak) window.speak("ขายแบตเตอรี่สำเร็จ ได้รับเงินคืน หกพันบาท");
                this.renderSellPartsMenu();
            };
            list.appendChild(btn);
        }

        // 7. ขาย Saft Battery จากคลัง (ได้ 12,000)
        if (this.inventory.saftBatteries > 0) {
            const btn = document.createElement('button');
            btn.className = 'job-card';
            btn.innerText = `ขาย Saft Premium จากคลัง (ในคลังมี: ${this.inventory.saftBatteries} ลูก) - คืนเงิน 12,000 บาท`;
            btn.onclick = () => {
                this.inventory.saftBatteries--;
                this.addIncome(12000, "ขายแบตเตอรี่ Saft เก่า");
                if (window.speak) window.speak("ขายแบตเตอรี่สำเร็จ ได้รับเงินคืน สิบสองพันบาท");
                this.renderSellPartsMenu();
            };
            list.appendChild(btn);
        }

        // 8. ขายแบตเตอรี่ที่ติดตั้งอยู่ปัจจุบัน
        const state = window.TrainState;
        if (state) {
            const brand = state.batteryBrand || "Yuasa Heavy Duty";
            const health = state.batteryHealth !== undefined ? state.batteryHealth : 100;
            let baseRefund = 6000;
            if (brand === "GS Battery") baseRefund = 4000;
            if (brand === "Saft Ni-Cd Premium") baseRefund = 12000;
            const refund = Math.ceil(baseRefund * (health / 100));

            const btnCurrent = document.createElement('button');
            btnCurrent.className = 'job-card';
            btnCurrent.style.borderColor = '#ff4444';
            btnCurrent.innerText = ` ขายแบตเตอรี่ที่ใช้อยู่ปัจจุบัน [${brand}] (สภาพ: ${health.toFixed(1)}%) - คืนเงินตามสภาพ ${refund.toLocaleString()} บาท`;
            btnCurrent.onclick = () => {
                this.addIncome(refund, `ขายแบตเตอรี่ที่ติดตั้งอยู่ยี่ห้อ ${brand}`);
                // เปลี่ยนเป็นไม่มีแบตเตอรี่ (หรือแบตเดด สภาพ 0% และประจุ 0V)
                state.batteryBrand = "GS Battery"; // fallback
                state.batteryHealth = 0;
                state.batteryCharge = 0;
                if (window.PhysicsSystem && window.PhysicsSystem.updateBatteryVoltage) {
                    window.PhysicsSystem.updateBatteryVoltage(state);
                }
                this.save();
                if (window.speak) window.speak(`ขายแบตเตอรี่ปัจจุบันสำเร็จ! ได้เงินคืนตามสภาพ ${refund} บาท ตอนนี้หัวรถจักรของคุณไม่มีประจุไฟและแรงดันไฟฟ้าเหลืออยู่ กรุณาหาซื้อแบตเตอรี่ลูกใหม่มาใส่เพื่อสตาร์ทรถครับ`);
                this.renderSellPartsMenu();
            };
            list.appendChild(btnCurrent);
        }

        const btnBack = document.createElement('button');
        btnBack.className = 'btn-close';
        btnBack.style.backgroundColor = "#555";
        btnBack.innerText = "ย้อนกลับ (Escape)";
        btnBack.onclick = () => this.renderStoreMenu();
        list.appendChild(btnBack);

        this.setupKeyboard(list);
    },

    renderConcessionsMenu: function() {
        const list = document.getElementById('management-list');
        if (!list) return;
        this.currentMenu = "concessions";
        
        if (window.speak) window.speak("เข้าสู่ศูนย์จัดซื้อและสัมปทาน");

        list.innerHTML = `<h3>ศูนย์จัดซื้อและสัมปทาน</h3>`;

        // 1. Unlock Trains Submenu
        const btnUnlockTrains = document.createElement('button');
        btnUnlockTrains.className = 'job-card';
        btnUnlockTrains.innerText = "ปลดล็อกและอัปเกรดคลาสขบวนรถ (รถเร็ว/รถด่วน/ด่วนพิเศษ)";
        btnUnlockTrains.onclick = () => this.renderUnlockTrainsMenu();
        list.appendChild(btnUnlockTrains);

        // 2. Buy Eastern Line
        const btnUnlockEastern = document.createElement('button');
        btnUnlockEastern.className = 'job-card';
        if (this.unlockedEastern) {
            btnUnlockEastern.innerText = "สัมปทานเส้นทางสายตะวันออก (ปลดล็อกแล้ว)";
        } else {
            btnUnlockEastern.innerText = "ซื้อสัมปทานเส้นทางสายตะวันออก (ราคา 20,000 บาท)";
        }
        btnUnlockEastern.onclick = () => {
            if (this.unlockedEastern) {
                if (window.speak) window.speak("คุณได้ซื้อสัมปทานสายตะวันออกเรียบร้อยแล้วครับ");
                return;
            }
            if (this.wallet < 20000) {
                if (window.speak) window.speak("ยอดเงินในบัญชีไม่พอสำหรับซื้อสัมปทานสายตะวันออกครับ");
                return;
            }
            this.addExpense(20000, "ซื้อสัมปทานสายตะวันออก");
            this.unlockedEastern = true;
            this.save();
            if (window.speak) window.speak("ซื้อสัมปทานสายตะวันออกสำเร็จแล้ว!");
            this.renderConcessionsMenu();
        };
        list.appendChild(btnUnlockEastern);

        // 3. Buy Isan Line
        const btnUnlockIsan = document.createElement('button');
        btnUnlockIsan.className = 'job-card';
        if (this.unlockedIsan) {
            btnUnlockIsan.innerText = "สัมปทานเส้นทางสายอีสาน (ปลดล็อกแล้ว)";
        } else {
            btnUnlockIsan.innerText = "ซื้อสัมปทานเส้นทางสายอีสาน (ราคา 40,000 บาท)";
        }
        btnUnlockIsan.onclick = () => {
            if (this.unlockedIsan) {
                if (window.speak) window.speak("คุณได้ซื้อสัมปทานสายอีสานเรียบร้อยแล้วครับ");
                return;
            }
            if (this.wallet < 40000) {
                if (window.speak) window.speak("ยอดเงินในบัญชีไม่พอสำหรับซื้อสัมปทานสายอีสานครับ");
                return;
            }
            this.addExpense(40000, "ซื้อสัมปทานสายอีสาน");
            this.unlockedIsan = true;
            this.save();
            if (window.speak) window.speak("ซื้อสัมปทานสายอีสานสำเร็จแล้ว!");
            this.renderConcessionsMenu();
        };
        list.appendChild(btnUnlockIsan);

        // 4. Buy Locomotive (if doesn't have one)
        const btnBuyTrain = document.createElement('button');
        btnBuyTrain.className = 'job-card';
        if (this.hasLocomotive) {
            btnBuyTrain.innerText = "ซื้อหัวรถจักรดีเซลไฟฟ้าใหม่ (คุณมีหัวรถจักรอยู่แล้ว)";
            btnBuyTrain.style.opacity = "0.5";
            btnBuyTrain.onclick = () => {
                if (window.speak) window.speak("คุณมีหัวรถจักรประจำบริษัทอยู่แล้วครับ ไม่จำเป็นต้องซื้อเพิ่ม");
            };
        } else {
            btnBuyTrain.innerText = "ซื้อหัวรถจักรดีเซลไฟฟ้าใหม่ (ราคา 350,000 บาท)";
            btnBuyTrain.style.borderColor = "var(--success)";
            btnBuyTrain.onclick = () => {
                if (this.wallet < 350000) {
                    if (window.speak) window.speak("ยอดเงินในบัญชีไม่พอสำหรับซื้อหัวรถจักรใหม่ครับ (ต้องการสามแสนห้าหมื่นบาท)");
                    return;
                }
                this.addExpense(350000, "จัดซื้อหัวรถจักรดีเซลไฟฟ้าใหม่");
                this.hasLocomotive = true;
                this.save();
                if (window.speak) window.speak("ยินดีด้วย! คุณได้ซื้อหัวรถจักรดีเซลไฟฟ้าคันใหม่เข้าประจำการเรียบร้อยแล้ว กรุณากด W ไปที่ห้องช่างเพื่อเบิกกุญแจรถครับ");
                this.renderConcessionsMenu();
            };
        }
        list.appendChild(btnBuyTrain);

        // 5. Sell Locomotive (If truly broken)
        const avgCondition = this.getOverallCondition();
        const btnSellTrain = document.createElement('button');
        btnSellTrain.className = 'job-card';
        if (!this.hasLocomotive) {
            btnSellTrain.innerText = "ขายซากหัวรถจักร (คุณยังไม่มีหัวรถจักร)";
            btnSellTrain.style.opacity = "0.5";
            btnSellTrain.onclick = () => {
                if (window.speak) window.speak("คุณยังไม่มีหัวรถจักรสำหรับขายครับ");
            };
        } else if (avgCondition >= 30) {
            btnSellTrain.innerText = `ขายซากหัวรถจักร (ล็อก: หัวรถจักรต้องพัง สภาพต่ำกว่า 30% ถึงจะขายได้, สภาพปัจจุบัน ${avgCondition.toFixed(1)}%)`;
            btnSellTrain.style.opacity = "0.5";
            btnSellTrain.onclick = () => {
                if (window.speak) window.speak(`หัวรถจักรของคุณยังใช้งานได้ดี สภาพปัจจุบัน ${avgCondition.toFixed(1)} เปอร์เซ็นต์ ถ้าไม่พังจริงๆ จะไม่สามารถขายเป็นเศษเหล็กได้ครับ`);
            };
        } else {
            btnSellTrain.innerText = "ขายซากหัวรถจักร (รับเงินคืน 49,000 บาท)";
            btnSellTrain.style.borderColor = "#ff4444";
            btnSellTrain.style.backgroundColor = "rgba(255, 68, 68, 0.1)";
            btnSellTrain.onclick = () => {
                this.addIncome(49000, "ขายซากหัวรถจักรดีเซลไฟฟ้า");
                this.hasLocomotive = false;
                
                // รีเซ็ตสภาพอะไหล่ต่างๆ เพื่อบังคับให้ซื้อใหม่แล้วได้ของใหม่
                if (window.TrainState) {
                    window.TrainState.batteryHealth = 100;
                    window.TrainState.lightBulbHealth = 100;
                    window.TrainState.acFanHealth = 100;
                    window.TrainState.brakeHealth = 100;
                    window.TrainState.engineOilHealth = 100;
                }
                this.partConditions = [100, 100, 100, 100];
                
                this.save();
                if (window.speak) window.speak("ขายซากหัวรถจักรเก่าทิ้งเรียบร้อย ได้รับเงินทุนคืนมาสี่หมื่นเก้าพันบาทครับ คุณสามารถซื้อหัวรถจักรคันใหม่ได้ทันที");
                this.renderConcessionsMenu();
            };
        }
        list.appendChild(btnSellTrain);

        // 6. Southern Line (Coming Soon)
        const btnUnlockSouth = document.createElement('button');
        btnUnlockSouth.className = 'job-card';
        btnUnlockSouth.innerText = "สัมปทานเส้นทางสายใต้ (เร็วๆ นี้)";
        btnUnlockSouth.style.opacity = "0.7";
        btnUnlockSouth.onclick = () => {
            if (window.speak) window.speak("สายนี้ยังไม่พร้อมให้บริการ ณ ตอนนี้ รอเปิดเส้นทางใหม่ในอนาคต ขอบคุณที่ให้ความสนใจครับ");
        };
        list.appendChild(btnUnlockSouth);

        const btnBack = document.createElement('button');
        btnBack.className = 'btn-close';
        btnBack.style.backgroundColor = "#555";
        btnBack.innerText = "ย้อนกลับ (Escape)";
        btnBack.onclick = () => this.renderRootMenu();
        list.appendChild(btnBack);

        this.setupKeyboard(list);
    },

    renderFuelMenu: function() {
        const list = document.getElementById('management-list');
        if (!list) return;
        this.currentMenu = "fuel";
        
        if (window.speak) window.speak("ศูนย์จัดเตรียมและเติมเชื้อเพลิง เลื่อนลูกศรเพื่อเลือกรายการ");

        list.innerHTML = `<h3>ศูนย์จัดเตรียมและเติมเชื้อเพลิง</h3>`;

        const state = window.TrainState;
        const job = window.JobSystem;
        const maxFuel = window.CONFIG ? window.CONFIG.MAX_FUEL : 5000;
        const maxBackup = window.CONFIG ? window.CONFIG.MAX_BACKUP_FUEL : 5000;
        const currentFuel = state ? Math.floor(state.fuel || 0) : 0;
        const backupFuel = state ? Math.floor(state.backupFuel || 0) : 0;

        const neededMain = Math.max(0, maxFuel - currentFuel);
        const neededBackup = Math.max(0, maxBackup - backupFuel);
        
        const costMain = Math.ceil(neededMain * 35);
        const costBackup = Math.ceil(neededBackup * 35);

        const statusDiv = document.createElement('div');
        statusDiv.style.marginBottom = "15px";
        statusDiv.style.padding = "10px";
        statusDiv.style.backgroundColor = "rgba(0, 0, 0, 0.2)";
        statusDiv.innerHTML = `
            <div style="font-size: 16px; color: var(--text-primary);">ถังหลัก: ${currentFuel} / ${maxFuel} ลิตร</div>
            <div style="font-size: 16px; color: var(--accent-color);">ถังสำรอง: ${backupFuel} / ${maxBackup} ลิตร</div>
        `;
        list.appendChild(statusDiv);

        // สามารถเติมได้ถ้ายังไม่เลือกขบวนรถ (ยังอยู่ที่ศูนย์) หรือเลือกขบวนแล้วแต่อยู่สถานีต้นทาง
        const canRefuelFromOrigin = !job || !job.currentTrain || job.isAtOrigin;

        // 1. เติมถังหลัก
        const btnMain = document.createElement('button');
        btnMain.className = 'job-card';
        if (neededMain === 0) {
            btnMain.innerText = "ถังหลักเต็มแล้ว";
        } else if (!canRefuelFromOrigin) {
            btnMain.innerText = `ซื้อน้ำมันถังหลัก (ล็อก: ซื้อได้เฉพาะสถานีต้นทางเท่านั้น)`;
            btnMain.style.opacity = "0.5";
            btnMain.onclick = () => {
                if (window.speak) window.speak("คุณออกเดินทางแล้ว ไม่สามารถซื้อน้ำมันเพิ่มเติมได้ ต้องซื้อจากสถานีต้นทางเท่านั้นครับ");
            };
        } else {
            btnMain.innerText = `ซื้อน้ำมันถังหลักให้เต็ม (ราคา ${costMain.toLocaleString()} บาท)`;
            btnMain.onclick = () => {
                if (this.wallet < costMain) {
                    if (window.speak) window.speak("ยอดเงินในบัญชีไม่พอครับ");
                    return;
                }
                this.addExpense(costMain, `เติมน้ำมันถังหลัก ${neededMain} ลิตร`);
                state.fuel = maxFuel;
                if (window.speak) window.speak("เติมน้ำมันถังหลักเต็มแล้วครับ");
                this.renderFuelMenu();
            };
        }
        list.appendChild(btnMain);

        // 2. เติมถังสำรอง
        const btnBackup = document.createElement('button');
        btnBackup.className = 'job-card';
        if (neededBackup === 0) {
            btnBackup.innerText = "ถังสำรองเต็มแล้ว";
        } else if (!canRefuelFromOrigin) {
            btnBackup.innerText = `ซื้อน้ำมันสำรอง (ล็อก: ซื้อได้เฉพาะสถานีต้นทางเท่านั้น)`;
            btnBackup.style.opacity = "0.5";
            btnBackup.onclick = () => {
                if (window.speak) window.speak("คุณออกเดินทางแล้ว ไม่สามารถซื้อน้ำมันเพิ่มเติมได้ ต้องซื้อจากสถานีต้นทางเท่านั้นครับ");
            };
        } else {
            btnBackup.innerText = `ซื้อน้ำมันสำรองให้เต็ม (ราคา ${costBackup.toLocaleString()} บาท)`;
            btnBackup.onclick = () => {
                if (this.wallet < costBackup) {
                    if (window.speak) window.speak("ยอดเงินในบัญชีไม่พอครับ");
                    return;
                }
                this.addExpense(costBackup, `เติมน้ำมันสำรอง ${neededBackup} ลิตร`);
                state.backupFuel = maxBackup;
                if (window.speak) window.speak("เติมน้ำมันสำรองเต็มแล้วครับ");
                this.renderFuelMenu();
            };
        }
        list.appendChild(btnBackup);

        // 3. โอนถ่ายน้ำมัน
        const btnTransfer = document.createElement('button');
        btnTransfer.className = 'job-card';
        btnTransfer.style.borderColor = "var(--success)";
        btnTransfer.innerText = `โอนถ่ายน้ำมันสำรองเข้าถังหลัก`;
        btnTransfer.onclick = () => {
            if (backupFuel === 0) {
                if (window.speak) window.speak("ไม่มีน้ำมันในถังสำรองให้โอนถ่ายครับ");
                return;
            }
            if (neededMain === 0) {
                if (window.speak) window.speak("ถังหลักเต็มอยู่แล้ว ไม่จำเป็นต้องโอนถ่ายครับ");
                return;
            }
            const transferAmount = Math.min(backupFuel, neededMain);
            state.backupFuel -= transferAmount;
            state.fuel += transferAmount;
            if (window.speak) window.speak(`โอนถ่ายน้ำมัน ${transferAmount} ลิตร เข้าถังหลักเรียบร้อยแล้ว`);
            this.renderFuelMenu();
        };
        list.appendChild(btnTransfer);

        const btnBack = document.createElement('button');
        btnBack.className = 'btn-close';
        btnBack.style.backgroundColor = "#555";
        btnBack.innerText = "ย้อนกลับ (Escape)";
        btnBack.onclick = () => this.renderRootMenu();
        list.appendChild(btnBack);

        this.setupKeyboard(list);
    },

    renderUnlockTrainsMenu: function() {
        const list = document.getElementById('management-list');
        if (!list) return;
        this.currentMenu = "unlock_trains";
        list.innerHTML = `<h3>ปลดล็อกสิทธิ์ใช้งานขบวนรถใหม่</h3>`;

        const types = [
            { key: "express_rapid", name: "ขบวนรถเร็วทั้งหมด", price: 30000 },
            { key: "express", name: "ขบวนรถด่วนทั้งหมด", price: 60000 },
            { key: "special_express", name: "ขบวนรถด่วนพิเศษทั้งหมด", price: 100000 }
        ];

        types.forEach(t => {
            const btn = document.createElement('button');
            btn.className = 'job-card';
            const isUnlocked = this.unlockedTrainTypes[t.key];
            if (isUnlocked) {
                btn.innerText = `${t.name} (ซื้อแล้ว)`;
            } else {
                btn.innerText = `ซื้อ ${t.name} (ราคา ${t.price.toLocaleString()} บาท)`;
            }
            btn.onclick = () => {
                if (isUnlocked) {
                    if (window.speak) window.speak(`คุณเป็นเจ้าของสิทธิ์ ${t.name} เรียบร้อยแล้วครับ`);
                    return;
                }
                if (this.wallet < t.price) {
                    if (window.speak) window.speak(`ยอดเงินในบัญชีไม่พอสำหรับซื้อสิทธิ์ ${t.name} ครับ`);
                    return;
                }
                this.addExpense(t.price, `ซื้อสิทธิ์ ${t.name}`);
                this.unlockedTrainTypes[t.key] = true;
                this.save();
                if (window.speak) window.speak(`ซื้อสิทธิ์ใช้งาน ${t.name} สำเร็จเรียบร้อยแล้วครับ!`);
                this.renderUnlockTrainsMenu();
            };
            list.appendChild(btn);
        });

        const btnBack = document.createElement('button');
        btnBack.className = 'btn-close';
        btnBack.style.backgroundColor = "#555";
        btnBack.innerText = "ย้อนกลับ (Escape)";
        btnBack.onclick = () => this.renderConcessionsMenu();
        list.appendChild(btnBack);

        this.setupKeyboard(list);
    },

    renderDonateMenu: function() {
        const list = document.getElementById('management-list');
        if (!list) return;
        this.currentMenu = "donate";
        
        if (window.speak) window.speak("เปิดหน้าต่างสนับสนุนผู้พัฒนาเกม");

        list.innerHTML = `
            <h3 style="color: #ff4da6;">️ สนับสนุนผู้พัฒนาเกม (บริจาค)</h3>
            <div style="text-align: center; margin: 20px 0; padding: 15px; border: 1px solid var(--accent-color); border-radius: 12px; background: rgba(255, 255, 255, 0.05);">
                <p style="font-size: 16px; margin-bottom: 15px; color: var(--text-primary);">
                    ขอบคุณที่ชื่นชอบและสนับสนุนเกม Thai Train Simulator นะครับ
                </p>
                <img src="donate_qr.jpg" alt="QR Code สำหรับบริจาค" style="max-width: 250px; border-radius: 10px; border: 3px solid #fff;" onerror="this.style.display='none';">
            </div>
        `;

        const btnPP = document.createElement('button');
        btnPP.className = 'job-card';
        btnPP.style.textAlign = "left";
        btnPP.innerText = "พร้อมเพย์ (PromptPay): 096-396-4163";
        btnPP.onclick = () => { if (window.speak) window.speak("หมายเลขพร้อมเพย์ ศูนย์ เก้า หก, สาม เก้า หก, สี่ หนึ่ง หก สาม"); };
        list.appendChild(btnPP);

        const btnBank = document.createElement('button');
        btnBank.className = 'job-card';
        btnBank.style.textAlign = "left";
        btnBank.innerText = "ธนาคารกสิกรไทย เลขบัญชี: 038-358-1621";
        btnBank.onclick = () => { if (window.speak) window.speak("บัญชีกสิกรไทย เลขที่ ศูนย์ สาม แปด, สาม ห้า แปด, หนึ่ง หก สอง หนึ่ง"); };
        list.appendChild(btnBank);

        const btnName = document.createElement('button');
        btnName.className = 'job-card';
        btnName.style.textAlign = "left";
        btnName.innerText = "ชื่อบัญชี: กิตติพงศ์ อ่องรัก";
        btnName.onclick = () => { if (window.speak) window.speak("ชื่อบัญชี กิตติพงศ์ อ่องรัก"); };
        list.appendChild(btnName);

        const btnSuccess = document.createElement('button');
        btnSuccess.className = 'job-card';
        btnSuccess.style.borderColor = "#4CAF50";
        btnSuccess.style.backgroundColor = "rgba(76, 175, 80, 0.1)";
        btnSuccess.innerText = "เสร็จสิ้นการสนับสนุน (ย้อนกลับ)";
        btnSuccess.onclick = () => {
            if (window.speak) window.speak("ขอบพระคุณสำหรับการสนับสนุนเป็นอย่างยิ่งครับ ขอให้มีความสุขกับการเล่นเกมนะครับ!");
            this.renderRootMenu();
        };
        list.appendChild(btnSuccess);

        this.setupKeyboard(list);
    },

    renderKKMoneyMenu: function() {
        const list = document.getElementById('management-list');
        if (!list) return;
        this.currentMenu = "kk_money";
        
        if (window.speak) window.speak("ยินดีต้อนรับสู่สถาบันการเงิน เคเค มันนี่");

        const availableCredit = this.kkLoanLimit - this.kkLoanDebt;

        list.innerHTML = `
            <h3 style="color: #ffd700;"> สถาบันการเงิน KK Money</h3>
            <div style="margin-bottom:15px; border: 1px solid #ffd700; background: rgba(255, 215, 0, 0.05); padding: 15px; border-radius:12px;">
                <div style="font-size:16px; color:var(--text-primary); margin-bottom:5px;"> ทุนจดทะเบียนบริษัท: 10,000,000,000 บาท</div>
                <hr style="border: 0; height: 1px; background: rgba(255,255,255,0.2); margin: 10px 0;">
                <div style="font-size:18px; font-weight:bold; color:#4CAF50;"> วงเงินอนุมัติสูงสุด: ${this.kkLoanLimit.toLocaleString()} บาท</div>
                <div style="font-size:18px; font-weight:bold; color:#ff9800;"> วงเงินกู้คงเหลือ: ${Math.max(0, availableCredit).toLocaleString()} บาท</div>
                <div style="font-size:18px; font-weight:bold; color:#ff4444;"> ยอดหนี้ค้างชำระ: ${this.kkLoanDebt.toLocaleString()} บาท</div>
                <div style="font-size:14px; color:var(--text-primary); margin-top:10px;">
                     ยอดชำระสะสมเพื่อขยายวงเงิน: ${this.kkRepayHistory.toLocaleString()} / 100,000 บาท
                </div>
            </div>
            <div style="font-size:14px; margin-bottom:15px; color:#aaa;">
                * อัตราดอกเบี้ย 5% (หักล่วงหน้าทันทีเมื่อทำรายการกู้ยืม)<br>
                * ชำระคืนครบทุก 100,000 บาท ระบบจะพิจารณาปรับเพิ่มวงเงินให้ 50,000 บาทอัตโนมัติ
            </div>
        `;

        // 1. กู้เงิน
        const btnBorrow = document.createElement('button');
        btnBorrow.className = 'job-card';
        btnBorrow.innerText = "ขอกู้ยืมเงินฉุกเฉิน (หักดอกเบี้ย 5% ล่วงหน้า)";
        btnBorrow.onclick = () => {
            if (availableCredit <= 0) {
                if (window.speak) window.speak("วงเงินของคุณเต็มแล้ว ไม่สามารถขอกู้เพิ่มได้ครับ");
                return;
            }
            this.renderInputPrompt("ขอกู้ยืมเงินฉุกเฉิน", `ระบุจำนวนเงินที่ต้องการกู้ (ไม่เกิน ${Math.max(0, availableCredit).toLocaleString()} บาท)`, false, (inputStr) => {
                const amount = parseInt(inputStr.replace(/,/g, ''), 10);
                if (isNaN(amount) || amount <= 0) {
                    if (window.speak) window.speak("จำนวนเงินไม่ถูกต้อง กรุณาทำรายการใหม่ครับ");
                    this.renderKKMoneyMenu();
                    return;
                }
                if (amount > availableCredit) {
                    if (window.speak) window.speak(`วงเงินของคุณไม่พอครับ สามารถกู้ได้สูงสุด ${Math.max(0, availableCredit).toLocaleString()} บาท`);
                    this.renderKKMoneyMenu();
                    return;
                }
                
                // คำนวณดอกเบี้ย 5%
                const interest = Math.ceil(amount * 0.05);
                const totalDebtAdded = amount + interest;
                
                this.kkLoanDebt += totalDebtAdded;
                this.addIncome(amount, "เงินกู้ฉุกเฉินจาก KK Money");
                this.save();
                
                if (window.speak) window.speak(`อนุมัติเงินกู้ ${amount.toLocaleString()} บาทเรียบร้อยแล้ว โดยมีดอกเบี้ยล่วงหน้า ${interest.toLocaleString()} บาท ยอดหนี้รวม ${totalDebtAdded.toLocaleString()} บาทครับ`);
                this.renderKKMoneyMenu();
                
            }, () => this.renderKKMoneyMenu());
        };
        list.appendChild(btnBorrow);

        // 2. ชำระคืน
        const btnRepay = document.createElement('button');
        btnRepay.className = 'job-card';
        btnRepay.innerText = "ชำระหนี้คงค้าง";
        btnRepay.onclick = () => {
            if (this.kkLoanDebt <= 0) {
                if (window.speak) window.speak("คุณไม่มียอดหนี้ค้างชำระครับ");
                return;
            }
            if (this.wallet <= 0) {
                if (window.speak) window.speak("กระเป๋าเงินบริษัทของคุณว่างเปล่า ไม่สามารถชำระหนี้ได้ครับ");
                return;
            }
            
            const maxRepay = Math.min(this.kkLoanDebt, this.wallet);
            
            this.renderInputPrompt("ชำระหนี้คงค้าง", `ระบุยอดชำระ (สามารถจ่ายได้สูงสุด ${maxRepay.toLocaleString()} บาท)`, false, (inputStr) => {
                const amount = parseInt(inputStr.replace(/,/g, ''), 10);
                if (isNaN(amount) || amount <= 0) {
                    if (window.speak) window.speak("จำนวนเงินไม่ถูกต้อง กรุณาทำรายการใหม่ครับ");
                    this.renderKKMoneyMenu();
                    return;
                }
                if (amount > this.wallet) {
                    if (window.speak) window.speak("เงินในกระเป๋าบริษัทของคุณไม่พอครับ");
                    this.renderKKMoneyMenu();
                    return;
                }
                if (amount > this.kkLoanDebt) {
                    if (window.speak) window.speak("คุณระบุยอดชำระเกินยอดหนี้คงค้างครับ");
                    this.renderKKMoneyMenu();
                    return;
                }
                
                // ชำระหนี้
                this.addExpense(amount, "ชำระเงินกู้ KK Money");
                this.kkLoanDebt -= amount;
                
                // คำนวณความน่าเชื่อถือ
                this.kkRepayHistory += amount;
                let limitIncreased = 0;
                
                while (this.kkRepayHistory >= 100000) {
                    this.kkRepayHistory -= 100000;
                    this.kkLoanLimit += 50000;
                    limitIncreased += 50000;
                }
                
                this.save();
                
                let speechMsg = `ชำระหนี้จำนวน ${amount.toLocaleString()} บาทเรียบร้อยแล้ว ยอดหนี้คงเหลือ ${this.kkLoanDebt.toLocaleString()} บาท `;
                if (limitIncreased > 0) {
                    speechMsg += `ขอแสดงความยินดี! ประวัติการชำระเงินของคุณอยู่ในเกณฑ์ดีเยี่ยม สถาบันได้ปรับเพิ่มวงเงินให้คุณอีก ${limitIncreased.toLocaleString()} บาทครับ`;
                }
                
                if (window.speak) window.speak(speechMsg);
                this.renderKKMoneyMenu();
                
            }, () => this.renderKKMoneyMenu());
        };
        list.appendChild(btnRepay);

        const btnBack = document.createElement('button');
        btnBack.className = 'btn-close';
        btnBack.style.backgroundColor = "#555";
        btnBack.innerText = "ย้อนกลับ (Escape)";
        btnBack.onclick = () => this.renderRootMenu();
        list.appendChild(btnBack);

        this.setupKeyboard(list);
    },

    setupKeyboard: function(list) {
        this.activeButtons = Array.from(list.querySelectorAll('button'));
        this.focusedButtonIndex = 0;
        this.focusButton(0);
    },

    focusButton: function(index) {
        if (!this.activeButtons || this.activeButtons.length === 0) return;
        
        if (index < 0) index = this.activeButtons.length - 1;
        if (index >= this.activeButtons.length) index = 0;
        
        this.focusedButtonIndex = index;
        
        this.activeButtons.forEach((btn, idx) => {
            if (idx === index) {
                btn.classList.add('focused-menu-item');
                btn.focus();
                btn.scrollIntoView({ block: 'nearest' });
            } else {
                btn.classList.remove('focused-menu-item');
            }
        });
        
        const focusedBtn = this.activeButtons[index];
        if (focusedBtn && window.speak) {
            const textToSpeak = focusedBtn.innerText || focusedBtn.getAttribute('aria-label') || "";
            if (textToSpeak) {
                window.speak(textToSpeak);
            }
        }
    },

    applyWearAndTear: function(speed) {
        if (!window.TrainState || !window.TrainState.isEngineRunning || Math.abs(speed) < 1.0) return;
        
        const kmInThisFrame = (Math.abs(speed) / 3600) * 0.1;
        
        // หมวด 1 เครื่องยนต์ เสื่อม (0.02% ต่อกม. - ลดลงจากเดิม 0.15% เพื่อให้สมจริงและทนทานขึ้น 7.5 เท่า)
        // หมวด 2 ห้ามล้อ เสื่อม (0.01% ต่อกม.) ยกเว้นมีการเบรก (0.05%)
        // หมวด 3 ล้อ เสื่อมน้อย (0.005% ต่อกม.)
        // หมวด 4 ไฟฟ้า เสื่อมน้อย (0.005% ต่อกม.)
        
        this.partConditions[0] = Math.max(0, this.partConditions[0] - (kmInThisFrame * 0.02));
        
        let brakeWear = window.TrainState.isBrakeApplied ? 0.05 : 0.01;
        this.partConditions[1] = Math.max(0, this.partConditions[1] - (kmInThisFrame * brakeWear));
        
        this.partConditions[2] = Math.max(0, this.partConditions[2] - (kmInThisFrame * 0.005));
        this.partConditions[3] = Math.max(0, this.partConditions[3] - (kmInThisFrame * 0.005));
        
        const avgCondition = this.getOverallCondition();
        
        // ระบบขัดข้องสุ่มตามชิ้นส่วนที่เสีย
        if (this.partConditions[0] < 40 && Math.random() < 0.005) {
            if (window.speak) window.speak("เตือนภัย: ระบบเครื่องยนต์ขัดข้อง!");
            window.TrainState.manualTargetSpeed = Math.max(0, window.TrainState.manualTargetSpeed - 20);
        }
        if (this.partConditions[1] < 40 && Math.random() < 0.005) {
            if (window.speak) window.speak("เตือนภัย: แรงดันลมห้ามล้อรั่วไหลเนื่องจากปั๊มลมชำรุด!");
            if (window.playOneShot) window.playOneShot('brake release', 0.5);
            window.TrainState.airPressure = Math.max(0, window.TrainState.airPressure - 1.0);
        }
        
        if (Math.random() < 0.01) this.save();
    },

    setupKeyboardEvents: function() {
        // ไม่ต้องทำอะไรที่นี่ - listener ถูกติดตั้งครั้งเดียวด้านล่าง
    }

};

window.addEventListener('load', () => {
    window.ManagementSystem.init();
});

// === MANAGEMENT TOGGLE KEY LISTENER (M / ท) ===
// แยกออกมาจาก setupKeyboardEvents เพื่อให้ capture phase ทำงานได้ก่อน manualControl.js
window.addEventListener('keydown', (e) => {
    if (document.activeElement) {
        const tag = document.activeElement.tagName.toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'iframe') return;
    }
    if (!e.key) return;
    const key = e.key.toLowerCase();
    
    // ไม่บล็อก Alt+F4
    if (e.altKey && e.key === 'F4') return;
    
    // M หรือ ท = toggle เมนูบริหารจัดการบริษัท
    if (key === 'm' || key === 'ท') {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (window.ManagementSystem) {
            window.ManagementSystem.toggle();
        }
        return;
    }
    
    // F หรือ ด = toggle เมนูเติมน้ำมัน
    if (key === 'f' || key === 'ด') {
        // อนุญาตเฉพาะถ้า ManagementSystem พร้อมและไม่มีเมนูอื่นเปิดอยู่
        if (window.ManagementSystem && !(window.JobSystem && window.JobSystem.isOpen) && !(window.SettingsSystem && window.SettingsSystem.isOpen)) {
            e.preventDefault();
            e.stopImmediatePropagation();
            window.ManagementSystem.toggleFuelMenu();
        }
        return;
    }
}, true); // capture phase ทำงานก่อน listener อื่นทุกตัว
// Navigation ภายในเมนู Management เมื่อเปิดอยู่ (capture phase)
window.addEventListener('keydown', (e) => {
    if (document.activeElement) {
        const tag = document.activeElement.tagName.toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'iframe') {
            return;
        }
    }
    if (!e.key) return;
    const key = e.key.toLowerCase();
    const mgmt = window.ManagementSystem;
    if (!mgmt || !mgmt.isOpen) return;

    const activeEl = document.activeElement;
    if (activeEl && activeEl.tagName.toLowerCase() === 'input') return;

    if (key === 'arrowdown' || key === 'arrowup' || key === 'arrowleft' || key === 'arrowright' || key === 'enter' || key === 'escape') {
        e.preventDefault();
        e.stopImmediatePropagation();

        if (key === 'escape') {
            if (mgmt.currentMenu === 'income_list' || mgmt.currentMenu === 'expense_list') {
                mgmt.renderFinancialRoot();
            } else if (mgmt.currentMenu === 'unlock_trains') {
                mgmt.renderConcessionsMenu();
            } else if (mgmt.currentMenu === 'sell_parts') {
                mgmt.renderStoreMenu();
            } else if (mgmt.currentMenu === 'fuel') {
                mgmt.renderRootMenu();
            } else if (mgmt.currentMenu !== 'root') {
                mgmt.renderRootMenu();
            } else {
                mgmt.close();
            }
        } else if (key === 'arrowdown' || key === 'arrowright') {
            mgmt.focusButton(mgmt.focusedButtonIndex + 1);
        } else if (key === 'arrowup' || key === 'arrowleft') {
            mgmt.focusButton(mgmt.focusedButtonIndex - 1);
        } else if (key === 'enter') {
            if (mgmt.activeButtons && mgmt.activeButtons[mgmt.focusedButtonIndex]) {
                mgmt.activeButtons[mgmt.focusedButtonIndex].click();
            }
        }
    }
}, true);

})();
