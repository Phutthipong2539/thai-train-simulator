/**
 * loginSystem.js - ระบบล็อกอิน (Accessible HTML Popup)
 */

window.LoginSystem = {
    isOpen: false,
    savedName: "",
    savedPin: "",
    tempName: "",
    activeButtons: [],
    focusedButtonIndex: 0,
    
    init: function() {
        const storedName = localStorage.getItem('thaitrain_driver_name_v2');
        const storedPin = localStorage.getItem('thaitrain_driver_pin_v2');
        if (storedName) {
            this.savedName = storedName;
            this.savedPin = storedPin || "001";
            this.syncWithManagement();
            return; // ข้ามหน้าต่างล็อคอินหากเคยลงทะเบียนแล้ว
        }
        
        setTimeout(() => this.open(), 1200);
    },
    
    syncWithManagement: function() {
        if (window.ManagementSystem) {
            window.ManagementSystem.driverName = this.savedName;
            window.ManagementSystem.driverPin = this.savedPin;
            window.ManagementSystem.isCheckedIn = true;
            window.isCheckedIn = true; 
            window.ManagementSystem.save();
        }
        if (window.MultiplayerSystem) {
            window.MultiplayerSystem.playerName = this.savedName;
            window.MultiplayerSystem.emitData(); // Update remote players immediately
        }
        
        // Auto-register to ensure server has this driver in drivers.json
        fetch("http://119.59.103.185:45000/api/drivers/register", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: this.savedName })
        }).then(res => res.json())
          .then(data => {
              if (data.success && data.driver) {
                  this.savedPin = data.driver.id;
                  localStorage.setItem('thaitrain_driver_pin_v2', this.savedPin);
                  if (window.ManagementSystem) {
                      window.ManagementSystem.driverPin = this.savedPin;
                      window.ManagementSystem.save();
                  }
              }
          }).catch(err => console.error("Auto-register failed:", err));
    },
    
    open: function() {
        this.isOpen = true;
        window.isAnyMenuOpen = true;
        
        const pop = document.getElementById('login-popup');
        if (pop) {
            pop.style.display = 'block';
            pop.style.position = 'fixed';
            pop.style.top = '50%';
            pop.style.left = '50%';
            pop.style.transform = 'translate(-50%, -50%)';
            pop.style.backgroundColor = 'rgba(0, 0, 0, 0.95)';
            pop.style.color = 'white';
            pop.style.padding = '30px';
            pop.style.border = '2px solid #ffcc00';
            pop.style.borderRadius = '10px';
            pop.style.zIndex = '10000';
            pop.style.textAlign = 'center';
            pop.style.boxShadow = '0 0 30px rgba(0,0,0,0.9)';
            pop.style.minWidth = '450px';
        }
        
        if (window.speak) window.speak("ระบบลงทะเบียนพนักงานขับรถ เลื่อนลูกศรลงเพื่อไปที่ช่องกรอกชื่อครับ หากพิมพ์เสร็จแล้วให้กด Enter เพื่อยืนยัน");
        
        this.renderInputStep();
    },
    
    close: function() {
        this.isOpen = false;
        window.isAnyMenuOpen = false;
        const pop = document.getElementById('login-popup');
        if (pop) pop.style.display = 'none';
        if (window.forceAccessibilityFocus) window.forceAccessibilityFocus();
    },
    
    renderInputStep: function() {
        const list = document.getElementById('login-content');
        if (!list) return;
        
        list.innerHTML = `<h2 style="margin-top:0; color: #ffcc00;">ลงทะเบียนพนักงานขับรถ</h2>`;
        
        const input = document.createElement('input');
        input.type = "search";
        input.setAttribute('role', 'searchbox');
        input.placeholder = "พิมพ์ชื่อของคุณที่นี่ (ไทยหรืออังกฤษก็ได้)";
        input.style.width = '90%';
        input.style.padding = '15px';
        input.style.margin = '10px auto';
        input.style.display = 'block';
        input.style.border = '2px solid transparent';
        input.style.borderRadius = '5px';
        input.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
        input.style.color = '#000';
        input.style.fontSize = '20px';
        input.style.textAlign = 'center';
        input.style.cursor = 'text';
        input.style.outline = 'none';
        input.setAttribute('aria-label', "ช่องกรอกชื่อพนักงานขับรถ พิมพ์ชื่อแล้วกด Enter เพื่อยืนยัน");
        
        input.addEventListener('keydown', (e) => {
            // หยุดการส่งต่อ event ไปยังเกม (ป้องกันเสียงเตือนกุญแจ)
            e.stopPropagation(); 
            
            if (e.key === 'Enter') {
                e.preventDefault();
                this.submitName(input.value);
            } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                // ให้พิมพ์ลูกศรซ้ายขวาได้ แต่ลูกศรขึ้นลงไม่ส่งต่อ
                e.stopImmediatePropagation();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                if (window.speak) window.speak("จำเป็นต้องระบุชื่อพนักงานก่อนเริ่มเกมครับ");
            }
        });
        list.appendChild(input);

        const btnSubmit = document.createElement('button');
        btnSubmit.innerText = "> ยืนยันชื่อ (Enter) <";
        btnSubmit.style.width = '90%';
        btnSubmit.style.padding = '15px';
        btnSubmit.style.margin = '10px auto';
        btnSubmit.style.display = 'block';
        btnSubmit.style.backgroundColor = 'transparent';
        btnSubmit.style.color = 'white';
        btnSubmit.style.border = '2px solid transparent';
        btnSubmit.style.borderRadius = '5px';
        btnSubmit.style.fontSize = '22px';
        btnSubmit.style.cursor = 'pointer';
        
        btnSubmit.onclick = () => {
            this.submitName(input.value);
        };
        list.appendChild(btnSubmit);

        this.setupKeyboard(list, input);
    },

    submitName: function(val) {
        val = val.trim();
        if (val !== "") {
            this.tempName = val;
            this.renderConfirmStep();
        } else {
            if (window.speak) window.speak("คุณยังไม่ได้พิมพ์ชื่อครับ กรุณาพิมพ์ชื่อก่อนกดยืนยัน");
        }
    },
    
    renderConfirmStep: function() {
        const list = document.getElementById('login-content');
        if (!list) return;
        
        list.innerHTML = `<h2 style="margin-top:0; color: #ffcc00;">ยืนยันชื่อพนักงาน: ${this.tempName}</h2>`;
        if (window.speak) window.speak(`คุณชื่อ ${this.tempName} ใช่หรือไม่? เลื่อนลูกศรเพื่อเลือกยืนยันหรือแก้ไข`);
        
        const btnStyle = "width: 90%; padding: 15px; margin: 10px auto; display: block; background-color: transparent; color: white; border: 2px solid transparent; border-radius: 5px; font-size: 22px; cursor: pointer;";
        
        const btnConfirm = document.createElement('button');
        btnConfirm.style.cssText = btnStyle;
        btnConfirm.innerText = "> ตกลง (บันทึกชื่อ) <";
        btnConfirm.onclick = async () => {
            if (window.speak) window.speak("กำลังบันทึกข้อมูลและออกรหัสพนักงานกับเซิร์ฟเวอร์ออนไลน์...");
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            try {
                const res = await fetch("http://119.59.103.185:45000/api/drivers/register", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name: this.tempName }),
                    signal: controller.signal
                });
                clearTimeout(timeoutId);
                const result = await res.json();
                
                if (result.success) {
                    this.savedName = result.name;
                    this.savedPin = result.id;
                    localStorage.setItem('thaitrain_driver_name_v2', this.savedName);
                    localStorage.setItem('thaitrain_driver_pin_v2', this.savedPin);
                    
                    this.syncWithManagement();
                    this.close();
                    
                    if (window.speak) window.speak(`ลงทะเบียนและเช็คอินสำเร็จ ยินดีต้อนรับคุณ ${this.savedName} รหัสพนักงานของคุณคือ ${this.savedPin} ขอให้เดินทางปลอดภัยและขับรถด้วยความสุภาพครับ`);
                } else {
                    if (window.speak) window.speak(`เกิดข้อผิดพลาดจากเซิร์ฟเวอร์: ${result.message || 'ไม่ทราบสาเหตุ'}`);
                    this.renderInputStep();
                }
            } catch (err) {
                clearTimeout(timeoutId);
                console.warn("Online registration failed or timed out:", err);
                
                // --- OFFLINE FALLBACK ---
                if (window.speak) window.speak("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ ระบบจะออกรหัสชั่วคราวให้ก่อนครับ และจะเชื่อมต่อใหม่อัตโนมัติในภายหลัง");
                
                this.savedName = this.tempName;
                this.savedPin = "999"; // Temporary ID
                window.needsOnlineRegistration = true; // Flag for auto-reconnect
                
                // ไม่เซฟลง localStorage เพื่อให้ต้องขอรหัสจริงในอนาคต
                this.syncWithManagement();
                this.close();
            }
        };
        list.appendChild(btnConfirm);
        
        const btnEdit = document.createElement('button');
        btnEdit.style.cssText = btnStyle;
        btnEdit.innerText = "> เปลี่ยนใจ (แก้ไขใหม่) <";
        btnEdit.onclick = () => {
            this.renderInputStep();
        };
        list.appendChild(btnEdit);
        
        this.setupKeyboard(list, btnConfirm);
    },

    setupKeyboard: function(list, defaultFocusElem) {
        this.activeButtons = Array.from(list.querySelectorAll('input, button'));
        this.focusedButtonIndex = 0;
        
        if (defaultFocusElem) {
            const idx = this.activeButtons.indexOf(defaultFocusElem);
            if (idx >= 0) this.focusedButtonIndex = idx;
        }

        if (this._keyHandler) {
            document.removeEventListener('keydown', this._keyHandler);
        }

        this._keyHandler = (e) => {
            if (!this.isOpen) return;

            // บล็อคไม่ให้ event วิ่งไปถึง manualControl.js (ล็อคปุ่มเกมทั้งหมด)
            e.stopPropagation();

            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                const activeEl = document.activeElement;
                if (activeEl && activeEl.tagName.toLowerCase() === 'input') {
                    return; 
                }

                e.preventDefault();
                e.stopImmediatePropagation();
                if (e.key === 'ArrowDown') {
                    this.focusedButtonIndex = (this.focusedButtonIndex + 1) % this.activeButtons.length;
                } else {
                    this.focusedButtonIndex = (this.focusedButtonIndex - 1 + this.activeButtons.length) % this.activeButtons.length;
                }
                this.updateFocus();
            }
        };

        document.addEventListener('keydown', this._keyHandler);
        // Add a slight delay to ensure the browser has completely rendered before focusing.
        setTimeout(() => this.updateFocus(), 50);
    },

    updateFocus: function() {
        if (!this.activeButtons || this.activeButtons.length === 0) return;

        this.activeButtons.forEach((el, i) => {
            if (i === this.focusedButtonIndex) {
                el.classList.add('focused-menu-item');
                if (el.tagName.toLowerCase() === 'input') {
                    el.style.border = '2px solid #ffcc00';
                    el.style.backgroundColor = '#fff';
                    el.style.color = '#000';
                } else {
                    el.style.border = '2px solid #ffcc00';
                    el.style.color = '#ffcc00';
                    el.style.backgroundColor = 'rgba(255, 204, 0, 0.2)';
                }
                el.focus();
            } else {
                el.classList.remove('focused-menu-item');
                if (el.tagName.toLowerCase() === 'input') {
                    el.style.border = '2px solid transparent';
                    el.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
                    el.style.color = '#000';
                } else {
                    el.style.border = '2px solid transparent';
                    el.style.color = 'white';
                    el.style.backgroundColor = 'transparent';
                }
            }
        });

        const focusedEl = this.activeButtons[this.focusedButtonIndex];
        if (focusedEl && window.speak) {
            if (focusedEl.tagName.toLowerCase() === 'input') {
                window.speak("ช่องกรอกชื่อพนักงาน คุณสามารถพิมพ์ชื่อได้เลย กดลูกศรขึ้นลงเพื่อเปลี่ยนเมนู");
            } else {
                window.speak(focusedEl.innerText || "ปุ่ม");
            }
        }
    }
};

window.addEventListener('load', () => {
    if (window.LoginSystem && window.LoginSystem.init) {
        window.LoginSystem.init();
    }
});
