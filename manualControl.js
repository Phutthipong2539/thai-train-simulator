/**
 * manualControl.js - ระบบควบคุมรถไฟทางกายภาพ (V12.1 - Separated)
 * ทำหน้าที่ควบคุมเครื่องยนต์, ประตู, เบรก และการเคลื่อนที่เท่านั้น
 */

// =============================================================================
// GLOBAL MENU INTERCEPTOR (N, M, F) - ย้ายมาจาก index.html เพื่อป้องกันปัญหาแคช
// =============================================================================
window.addEventListener('keydown', function(e) {
    if (!e.key) return;
    
    // ล็อคปุ่มลัดทั้งหมด (M, N, F) หากหน้าต่างลงทะเบียนยังเปิดอยู่
    if (window.LoginSystem && window.LoginSystem.isOpen) {
        return;
    }

    const key = e.key.toLowerCase();
    
    if (key === 'n' || key === 'ื') {
        const activeEl = document.activeElement;
        if (!activeEl || activeEl.tagName.toLowerCase() !== 'input') {
            if (window.SettingsSystem) window.SettingsSystem.toggle();
            e.stopImmediatePropagation();
            e.preventDefault();
            return;
        }
    }
    if (key === 'm' || key === 'ท') {
        const activeEl = document.activeElement;
        if (!activeEl || activeEl.tagName.toLowerCase() !== 'input') {
            if (window.ManagementSystem) {
                window.ManagementSystem.toggle();
            } else {
                if (window.speak) window.speak("ระบบบริษัทไม่พร้อมใช้งาน");
            }
            e.stopImmediatePropagation();
            e.preventDefault();
            return;
        }
    }
    if (key === 'f' || key === 'ด') {
        const activeEl = document.activeElement;
        if (!activeEl || activeEl.tagName.toLowerCase() !== 'input') {
            if (window.ManagementSystem) {
                window.ManagementSystem.toggleFuelMenu();
            } else {
                if (window.speak) window.speak("ระบบบริษัทไม่พร้อมใช้งาน");
            }
            e.stopImmediatePropagation();
            e.preventDefault();
            return;
        }
    }
}, true);

window.addEventListener('keydown', (e) => {
    // ปล่อยผ่านการพิมพ์ข้อความทั้งหมดในช่อง input เพื่อไม่ให้ระบบควบคุมเกมไปรบกวน (แก้ปัญหาพิมพ์ชื่อไม่ได้)
    if (document.activeElement && document.activeElement.tagName.toLowerCase() === 'input') {
        return;
    }
    
    // ล็อคระบบควบคุมทั้งหมดหากหน้าต่างลงทะเบียนยังเปิดอยู่ (เหมือนตอนกดออกเกม)
    if (window.LoginSystem && window.LoginSystem.isOpen) {
        return;
    }

    const key = e.key.toLowerCase();

    // --- ระบบวิทยุสื่อสารและช่องสัญญาณ (F1, F2, F3, F4) ---
    if (key === 'f1') {
        e.preventDefault();
        if (window.VoiceChatSystem) {
            const isPowerOn = window.VoiceChatSystem.togglePower();
            if (window.speak) window.speak(isPowerOn ? "เปิดวิทยุสื่อสาร" : "ปิดวิทยุสื่อสาร");
        }
    }
    if (key === 'f4' && !e.altKey) {
        e.preventDefault();
        if (window.VoiceChatSystem) {
            const isTest = window.VoiceChatSystem.toggleTestMode();
            if (window.speak) window.speak(isTest ? "เปิดโหมดทดสอบไมโครโฟน ลองกดพูดผ่านวิทยุเพื่อฟังเสียงตัวเอง" : "ปิดโหมดทดสอบไมโครโฟน กลับสู่ช่องวิทยุปกติ");
        }
    }
    if (key === 'f2') {
        e.preventDefault();
        if (window.VoiceChatSystem) {
            const channel = window.VoiceChatSystem.changeChannel(-1);
            if (window.speak) window.speak(`ช่องวิทยุที่ ${channel}`);
        }
    }
    if (key === 'f3') {
        e.preventDefault();
        if (window.VoiceChatSystem) {
            const channel = window.VoiceChatSystem.changeChannel(1);
            if (window.speak) window.speak(`ช่องวิทยุที่ ${channel}`);
        }
    }
    
    // --- ระบบทวนข้อความวิทยุ (D, H) ---
    if (key === 'd' || key === 'ก') {
        e.preventDefault();
        if (window.RadioSystem && window.RadioSystem.repeatLastMessage) {
            window.RadioSystem.repeatLastMessage();
        }
    }
    if (key === 'h' || key === 'ห') {
        e.preventDefault();
        if (window.RadioSystem && window.RadioSystem.repeatPreviousMessage) {
            window.RadioSystem.repeatPreviousMessage();
        }
    }
    // --- ระบบ Push-to-Talk (Ctrl ซ้าย) สำหรับ Voice Chat ---
    if (e.code === 'ControlLeft' && !e.repeat) {
        if (window.VoiceChatSystem) {
            window.VoiceChatSystem.startPTT();
        }
    }
    
    // --- ระบบกันหลับ Deadman Switch (Ctrl ขวา) ถูกลบออกชั่วคราวตามคำขอ ---
    // if (e.code === 'ControlRight' && !e.repeat) {
    //     if (window.DeadmanSystem) {
    //         window.DeadmanSystem.acknowledge();
    //     }
    // }

    const state = window.TrainState;
    if (!state) return;

    if (window.audioContext && window.audioContext.state === 'suspended') window.audioContext.resume();

    // ละเว้นปุ่ม Modifier เปล่าๆ ไม่ให้เกิด Error แจ้งเตือน (ยกเว้น Shift เพราะใช้เปิด/ปิดประตู)
    if (key === 'control' || key === 'alt' || key === 'meta') {
        return;
    }

    // อนุญาตให้ปุ่ม F4 ทำงานได้เสมอ เพื่อไม่ให้ไปบล็อคคำสั่ง Alt+F4 ของ Windows
    if (key === 'f4') return;

    // อนุญาตให้กด F2 เพื่อตั้งค่า Auto Pilot ทะลุระบบป้องกัน (SettingsSystem จะเป็นคนจัดการต่อ)
    if (key === 'f2') return;

    // เมนูตั้งค่าระดับเสียง (N) - SettingsSystem capture listener จัดการ
    if (key === 'n' || key === 'ื') {
        return; // ปล่อยให้ capture listener ของ settingsSystem จัดการ
    }

    // เมนูบริหารจัดการบริษัท (M) - ManagementSystem capture listener จัดการ
    if (key === 'm' || key === 'ท') {
        return; // ปล่อยให้ capture listener ของ managementSystem จัดการ
    }

    // เมนูเติมน้ำมัน (F) - index.html global interceptor จัดการ
    if (key === 'f' || key === 'ด') {
        return; // ปล่อยให้ global interceptor จัดการ
    }

    // --- กู้ภัย: ถ้ายังไม่ได้รับกุญแจ หากกดปุ่มใดๆ นอกเหนือจาก W และ Enter/M/Settings/Save ปล่อยผ่านไม่ได้ ต้องแจ้งเตือน ---
    if (!state.hasTools) {
        const allowedWithoutTools = ['w', 'ไ', 'enter', 'm', 'ท', 'o', 'น', 'escape', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'f', 'ด', 'f1', 'f4', 'n', 'ื', 'd', 'ก', 'h', 'ห'];
        if (!allowedWithoutTools.includes(key)) {
            e.stopImmediatePropagation();
            e.preventDefault();
            if (window.speak) window.speak("กรุณากด W ไปรับกุญแจก่อนทำงาน");
            return;
        }
    }

    // --- ล็อคปุ่มควบคุมรถไฟเมื่อเมนูต่างๆ เปิดใช้งานอยู่ ---
    if (window.isAnyMenuOpen) {
        // อนุญาตเฉพาะปุ่มลูกศร, Enter, Escape สำหรับเลื่อนเมนู และปุ่มเปิด/ปิดเมนูต่างๆ
        const navigationKeys = ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'enter', 'escape', 'f1', 'f4', 'm', 'ท', 'f', 'ด', 'o', 'น', 'n', 'ื'];
        if (!navigationKeys.includes(key)) {
            e.stopImmediatePropagation();
            e.preventDefault();
            if (key !== ' ') window.speak && window.speak("กรุณากดปุ่ม Escape เพื่อปิดหน้าต่างเมนูก่อนทำการควบคุมรถไฟครับ");
        }
        return;
    }

    // --- ล็อคปุ่มควบคุมหากยังไม่ได้เช็คอิน ---
    if (window.isDrivingBlocked) {
        const blockedKeys = ['p', 'ย', ' ', 'pageup', 'home', 'pagedown', 'arrowup', 'arrowdown', 'o', 'น', 'f', 'ด', 'r', 'พ', 'backspace', 'shift'];
        if (blockedKeys.includes(key) || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
            e.stopImmediatePropagation();
            e.preventDefault();
            if (window.speak) window.speak("กรุณากด M เพื่อเช็คอินเข้างานก่อนครับ");
            return;
        }
    }

    // --- ล็อคปุ่มควบคุมหากยังไม่ได้รับใบงาน ---
    if (!window.JobSystem || !window.JobSystem.currentTrain) {
        // อนุญาตให้กด O (รับงาน), M (เมนู), Q (สถานะ), W (เดิน), Enter (รับกุญแจ/รับของ)
        const allowedWithoutJob = ['o', 'น', 'm', 'ท', 'q', 'ๆ', 'w', 'ไ', 'enter', 'f', 'ด', 'f1', 'f4', 'n', 'ื', 'd', 'ก', 'h', 'ห'];
        if (!allowedWithoutJob.includes(key)) {
            e.stopImmediatePropagation();
            e.preventDefault();
            if (!state.hasTools) {
                if (window.speak) window.speak("กรุณากด W ไปรับกุญแจก่อนทำงาน");
            } else {
                if (window.speak) window.speak("กรุณารับใบงานขบวนรถก่อนทำการควบคุม (กดปุ่ม O)");
            }
            return;
        }
    }

    if ((key === 'r' || key === 'พ') && !e.repeat && !e.shiftKey) {
        // ถ้าระบบไม่ได้อนุญาตให้ใช้ ATO จากเมนูตั้งค่า (allowATO เป็น false) ก็ไม่ต้องทำอะไรเลยตามที่ผู้ใช้ขอ
        if (window.SettingsSystem && window.SettingsSystem.allowATO === false) {
            return;
        }

        if (!state.isATOEnabled && state.fuel <= 0) {
            if (window.speak) window.speak("น้ำมันหมด ไม่สามารถเปิดระบบออโต้ไพล็อตได้ กรุณาเติมน้ำมันด้วยปุ่ม F ก่อนครับ");
            return;
        }
        
        state.isATOEnabled = !state.isATOEnabled;
        if (window.speak) window.speak(state.isATOEnabled ? "เปิดระบบออโต้ไพล็อต" : "ปิดระบบออโต้ไพล็อต");
        if (state.isATOEnabled) {
            if (!state.isBatteryKnifeSwitchOn) { 
                state.isBatteryKnifeSwitchOn = true; 
                if (window.playOneShot) window.playOneShot('battery on'); 
            }
            setTimeout(() => { 
                if (state.isATOEnabled && !state.isEngineRunning && window.startEngine) window.startEngine(); 
            }, 800);
        } else {
            state.manualTargetSpeed = 0;
            state.handbrakes[0] = false; 
            state.handbrakes[1] = false;
        }
        return;
    }

    // --- 2. การป้องกันการควบคุมซ้อนเมื่อเปิด ATO ---
    if (state.isATOEnabled) {
        const controlKeys = ['p', '1', 'shift', ' ', 'space', 'spacebar', 'pageup', 'home', 'pagedown', 'arrowup', 'arrowdown', 'l', 'k', 'i', 'u', 'o', 'f', 'ด'];
        if (controlKeys.includes(key) || e.code === 'Space' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') { 
            e.stopImmediatePropagation(); 
            e.preventDefault();
            if (window.speak) window.speak("ระบบออโต้ยอมรับการควบคุมอยู่ กรุณาปลดออโต้ด้วยปุ่ม R ก่อน");
            return; 
        }
    }

    if ((key === '1' || key === 'ๅ') && !e.repeat) {
        const now = Date.now();
        // ป้องกันการเบิ้ลปุ่ม (Debounce 500ms) ที่ทำให้เปิดแล้วปิดทันที
        if (state.lastBatteryToggleTime && now - state.lastBatteryToggleTime < 500) {
            return; 
        }
        state.lastBatteryToggleTime = now;

        state.isBatteryKnifeSwitchOn = !state.isBatteryKnifeSwitchOn;
        if (window.playOneShot) window.playOneShot(state.isBatteryKnifeSwitchOn ? 'battery on' : 'battery of');
        if (window.speak) window.speak(state.isBatteryKnifeSwitchOn ? "สะพานไฟ ออน" : "สะพานไฟ ออฟ");
        
        if (!state.isBatteryKnifeSwitchOn) {
            // ตัดไฟทั้งหมด
            if (state.isEngineRunning && window.stopEngine) window.stopEngine("ระบบไฟฟ้าถูกตัด เครื่องยนต์ดับ");
            state.headlightMode = 0;
            state.markerLightMode = 0;
            state.isCabLightOn = false;
            state.isPassengerLightOn = false;
            if (state.isATOEnabled) {
                state.isATOEnabled = false;
                state.manualTargetSpeed = 0;
                state.handbrakes[0] = false; 
                state.handbrakes[1] = false;
            }
            if (window.playOneShot) window.playOneShot('headlights of');
        }
        return;
    }



    // --- 3. ระบบควบคุมหลัก (P, D, Space, Arrows) ---
    if ((key === 'p' || key === 'ย') && !e.repeat) {
        if (state.isEngineRunning) { 
            if (window.stopEngine) window.stopEngine("ดับเครื่องยนต์"); 
        } else { 
            if (window.startEngine) window.startEngine(); 
        }
    }

    if (e.code === 'ShiftLeft' && !e.repeat) {
        if (!state.isBatteryKnifeSwitchOn) {
            if (window.speak) window.speak("ไม่มีกระแสไฟฟ้า ไม่สามารถเปิดปิดประตูได้");
            return;
        }
        if (state.isATOEnabled) return;

        // ตรวจสอบความปลอดภัย: หากกำลังจะเปิดประตู (จากสถานะประตูปิดอยู่)
        if (!state.isLeftDoorOpen) {
            const job = window.JobSystem;
            const stn = window.StationSystem;
            if (!job || !stn || !job.atStopStation) {
                if (window.speak) window.speak("ไม่ได้จอดที่ชานชาลาสถานี ไม่สามารถเปิดประตูได้ครับ");
                return;
            }
            const nextStn = stn.currentRouteList[stn.currentIndex];
            const correctSide = nextStn ? (nextStn.doorSide || 'left') : 'left';
            if (correctSide !== 'left') {
                if (window.speak) window.speak("ฝั่งซ้ายไม่มีชานชาลา ไม่สามารถเปิดประตูฝั่งนี้ได้ครับ");
                return;
            }
        }

        if (Math.abs(state.currentSpeed) < 3.0) {
            state.isLeftDoorOpen = !state.isLeftDoorOpen;
            // ซิงค์สถานะประตูรวมโดยอัตโนมัติผ่าน getter ใน trainState.js
            
            if (window.playSpatialOneShot) {
                window.playSpatialOneShot(state.isLeftDoorOpen ? 'dooron' : 'doorof', -0.8, 2.5); // เพิ่มความดังเป็น 2.5
            } else if (window.playOneShot) {
                window.playOneShot(state.isLeftDoorOpen ? 'dooron' : 'doorof', 2.5, -0.8);
            }
            
            if (window.speak) window.speak(state.isLeftDoorOpen ? "เปิดประตูฝั่งซ้าย" : "ปิดประตูฝั่งซ้าย");
            
            // เริ่มต้นระบบเปลี่ยนถ่ายผู้โดยสารเมื่อมีการเปิดประตูที่สถานี
            if (state.isDoorOpen && window.JobSystem && window.JobSystem.startAutomaticExchange) {
                window.JobSystem.startAutomaticExchange();
            }
        } else {
            if (window.speak) window.speak("รถกำลังเคลื่อนที่ ไม่สามารถเปิดหรือปิดประตูได้");
        }
    }

    if (e.code === 'ShiftRight' && !e.repeat) {
        if (!state.isBatteryKnifeSwitchOn) {
            if (window.speak) window.speak("ไม่มีกระแสไฟฟ้า ไม่สามารถเปิดปิดประตูได้");
            return;
        }
        if (state.isATOEnabled) return;

        // ตรวจสอบความปลอดภัย: หากกำลังจะเปิดประตู (จากสถานะประตูปิดอยู่)
        if (!state.isRightDoorOpen) {
            const job = window.JobSystem;
            const stn = window.StationSystem;
            if (!job || !stn || !job.atStopStation) {
                if (window.speak) window.speak("ไม่ได้จอดที่ชานชาลาสถานี ไม่สามารถเปิดประตูได้ครับ");
                return;
            }
            const nextStn = stn.currentRouteList[stn.currentIndex];
            const correctSide = nextStn ? (nextStn.doorSide || 'left') : 'left';
            if (correctSide !== 'right') {
                if (window.speak) window.speak("ฝั่งขวาไม่มีชานชาลา ไม่สามารถเปิดประตูฝั่งนี้ได้ครับ");
                return;
            }
        }

        if (Math.abs(state.currentSpeed) < 3.0) {
            state.isRightDoorOpen = !state.isRightDoorOpen;
            // ซิงค์สถานะประตูรวมโดยอัตโนมัติผ่าน getter ใน trainState.js
            
            if (window.playSpatialOneShot) {
                window.playSpatialOneShot(state.isRightDoorOpen ? 'dooron' : 'doorof', 0.8, 2.5); // เพิ่มความดังเป็น 2.5
            } else if (window.playOneShot) {
                window.playOneShot(state.isRightDoorOpen ? 'dooron' : 'doorof', 2.5, 0.8);
            }
            
            if (window.speak) window.speak(state.isRightDoorOpen ? "เปิดประตูฝั่งขวา" : "ปิดประตูฝั่งขวา");
            
            // เริ่มต้นระบบเปลี่ยนถ่ายผู้โดยสารเมื่อมีการเปิดประตูที่สถานี
            if (state.isDoorOpen && window.JobSystem && window.JobSystem.startAutomaticExchange) {
                window.JobSystem.startAutomaticExchange();
            }
        } else {
            if (window.speak) window.speak("รถกำลังเคลื่อนที่ ไม่สามารถเปิดหรือปิดประตูได้");
        }
    }

    if ((key === ' ' || e.code === 'Space') && !e.repeat) {
        // ล็อคไม่ให้ใช้ Spacebar คายเบรกเมื่อ ATO กำลังทำงานอยู่ (ป้องกันกดโดยไม่ตั้งใจ)
        if (state.isATOEnabled) {
            e.stopImmediatePropagation();
            e.preventDefault();
            if (window.speak) window.speak("ระบบออโต้ควบคุมเบรกอยู่ กรุณาปลดออโต้ด้วยปุ่ม R ก่อนครับ");
            return;
        }
        const minAir = window.CONFIG ? window.CONFIG.MIN_BRAKE_RELEASE_AIR : 4.5;
        if (state.airPressure < minAir && !state.isBrakeApplied) {
            if (window.speak) window.speak("แรงดันลมต่ำเกินไป คลายเบรกไม่ได้");
            state.isBrakeApplied = true;
        } else {
            state.isBrakeApplied = !state.isBrakeApplied;
            if (!state.isBrakeApplied) state.isEmergencyBrake = false;
            if (window.speak) window.speak(state.isBrakeApplied ? "จับเบรก" : "คลายเบรก");
            if (window.playOneShot) {
                window.playOneShot(state.isBrakeApplied ? 'handbrake on' : 'handbrake of', 0.8);
            }
            if (state.isBrakeApplied) state.manualTargetSpeed = 0;
        }
    }

    if ((key === 'b' || key === 'ิ') && !e.repeat) {
        // --- เบรกฉุกเฉิน (Emergency Brake) ---
        if (state.isATOEnabled) {
            state.isATOEnabled = false;
        }
        state.isBrakeApplied = true;
        state.isEmergencyBrake = true; // เปิดโหมดเบรกฉุกเฉิน
        state.manualTargetSpeed = 0;
        state.targetSpeed = 0;
        state.reverser = "N"; 
        state.specialGear = 0;
        
        if (window.JobSystem) {
            window.JobSystem.emergencyBrakeCount = (window.JobSystem.emergencyBrakeCount || 0) + 1;
        }
        
        // เล่นเสียงเบรกทันที
        if (window.playOneShot) {
            window.playOneShot('handbrake on', 1.5);
        }
        if (window.speak) window.speak("ระบบเบรกฉุกเฉินทำงาน ดึงรถเข้าสู่เกียร์ว่าง");
    }

    if (key === 'pageup') { 
        state.reverser = "F"; 
        state.specialGear = 0; 
        if (window.playOneShot) window.playOneShot('signal');
        if (window.reverseAlarmSource) { try { window.reverseAlarmSource.stop(); } catch(e){} window.reverseAlarmSource = null; }
        
        // --- บีบแตรตอนเข้าเกียร์เดินหน้าหลังต่อตู้ ---
        const job = window.JobSystem;
        if (job && job.currentTrain && job.isCoupled && !job.departureHornHonked) {
            if (state.isATOEnabled) {
                // โหมด ATO: บีบแตรอัตโนมัติ
                job.departureHornHonked = true;
                if (window.playATOHorn) {
                    window.playATOHorn(1000, 0.8);
                } else if (window.playOneShot && window.soundBuffers['horn']) {
                    window.playOneShot('horn', 1.0);
                }
            } else {
                // โหมดแมนนวล: แจ้งเตือนให้ชักหวีดเอง
                if (window.speak) window.speak("กรุณาชักหวีด (กดปุ่ม Backspace) ก่อนออกรถครับ");
            }
        }
        
        if (window.speak) window.speak("เดินหน้า"); 
    }

    if (key === 'home') { 
        if (state.reverser === "F") {
            if (!state.specialGear) state.specialGear = 0;
            state.specialGear++;
            if (state.specialGear === 1) {
                if (window.playOneShot) window.playOneShot('signal');
                if (window.speak) window.speak("เกียร์พิเศษ 1 ขึ้นเขา");
            } else if (state.specialGear === 2) {
                if (window.playOneShot) window.playOneShot('signal');
                if (window.speak) window.speak("เกียร์พิเศษ 2 ขึ้นเขา");
            } else if (state.specialGear === 3) {
                if (window.playOneShot) window.playOneShot('signal');
                if (window.speak) window.speak("เกียร์พิเศษ 3 ขึ้นเขา");
            } else {
                state.specialGear = 0;
                if (window.playOneShot) window.playOneShot('signal');
                if (window.speak) window.speak("ปลดเกียร์พิเศษ กลับสู่เกียร์เดินหน้าปกติ"); 
            }
        } else {
            if (window.speak) window.speak("ต้องเข้าเกียร์เดินหน้าก่อน ถึงจะใช้เกียร์พิเศษขึ้นเขาได้ครับ");
        }
    }

    if (key === 'end') {
        state.reverser = "N"; 
        state.specialGear = 0;
        if (window.playOneShot) window.playOneShot('signal');
        if (window.reverseAlarmSource) { try { window.reverseAlarmSource.stop(); } catch(e){} window.reverseAlarmSource = null; }
        if (window.speak) window.speak("เกียร์ว่าง"); 
    }

    if (key === 'pagedown') { 
        state.reverser = "R"; 
        state.specialGear = 0; 
        if (window.playOneShot) window.playOneShot('signal');
        if (!window.reverseAlarmSource && window.playLoopWithOffset) {
            window.reverseAlarmSource = window.playLoopWithOffset('headlights on', 3, 0.5);
        }
        
        // --- บีบแตรตอนเข้าเกียร์ถอยไปต่อตู้ ---
        const jobR = window.JobSystem;
        if (jobR && jobR.currentTrain && !jobR.isCoupled && !jobR.initialReverseHornHonked) {
            if (state.isATOEnabled) {
                // โหมด ATO: บีบแตรอัตโนมัติ
                jobR.initialReverseHornHonked = true;
                if (window.playATOHorn) {
                    window.playATOHorn(500, 0.04);
                } else if (window.playOneShot && window.soundBuffers['horn']) {
                    window.playOneShot('horn', 0.5);
                }
            } else {
                // โหมดแมนนวล: แจ้งเตือนให้ชักหวีดเอง
                if (window.speak) window.speak("กรุณาชักหวีด (กดปุ่ม Backspace) ก่อนถอยต่อตู้โดยสารครับ");
            }
        }
        
        if (window.speak) window.speak("ถอยหลัง"); 
    }
        
    if (key === 'arrowup') { 
        if (state.isEngineRunning) {
            const maxSpd = window.CONFIG ? window.CONFIG.MAX_SPEED || 200 : 200;
            state.manualTargetSpeed = Math.min(maxSpd, state.manualTargetSpeed + 10); 
            const msg = (state.reverser === "N") ? `เร่งรอบเครื่อง ${state.manualTargetSpeed}` : `กำลังเร่งความเร็วไปที่ ${state.manualTargetSpeed}`;
            if (window.speak) window.speak(msg);
        } else {
            if (window.speak) window.speak("เครื่องยนต์ดับอยู่ เร่งไม่ได้");
        }
    }

    if (key === 'arrowdown') { 
        state.manualTargetSpeed = Math.max(0, state.manualTargetSpeed - 10); 
        const msg = (state.reverser === "N") ? `ผ่อนรอบเครื่องเหลือ ${state.manualTargetSpeed}` : `ลดความเร็วเป้าหมายเหลือ ${state.manualTargetSpeed}`;
        if (window.speak) window.speak(msg);
    }

    // --- 4. ระบบควบคุมไฟ (L, K, I, U) ---
    if (key === 'l' && !e.repeat) {
        if (!state.isBatteryKnifeSwitchOn) {
            if (window.speak) window.speak("ไม่มีกระแสไฟฟ้า กรุณาสับสะพานไฟก่อน");
            return;
        }
        if (state.lightBulbHealth <= 0) {
            if (window.speak) window.speak("หลอดไฟขาดเปิดไฟไม่ติด กรุณาซื้อหลอดไฟใหม่มาเปลี่ยนจากเมนู M ศูนย์ซ่อม");
            return;
        }
        state.headlightMode = (state.headlightMode + 1) % 3;
        const modes = ["ปิดไฟหน้า", "ไฟหน้าหรี่", "ไฟหน้าจ้า"];
        if (window.playOneShot) window.playOneShot(state.headlightMode === 0 ? 'headlights of' : 'headlights on');
        if (window.speak) window.speak(modes[state.headlightMode]);
    }

    if (key === 'k' && !e.repeat) {
        if (!state.isBatteryKnifeSwitchOn) {
            if (window.speak) window.speak("ไม่มีกระแสไฟฟ้า กรุณาสับสะพานไฟก่อน");
            return;
        }
        if (state.lightBulbHealth <= 0) {
            if (window.speak) window.speak("หลอดไฟขาดเปิดไฟไม่ติด กรุณาซื้อหลอดไฟใหม่มาเปลี่ยนจากเมนู M ศูนย์ซ่อม");
            return;
        }
        state.markerLightMode = (state.markerLightMode + 1) % 3;
        const modes = ["ปิดไฟท้าย", "ไฟท้ายสีขาว", "ไฟท้ายสีแดง"];
        if (window.playOneShot) window.playOneShot(state.markerLightMode === 0 ? 'headlights of' : 'headlights on');
        if (window.speak) window.speak(modes[state.markerLightMode]);
    }

    if (key === 'i' && !e.repeat) {
        if (!state.isBatteryKnifeSwitchOn) {
            if (window.speak) window.speak("ไม่มีกระแสไฟฟ้า กรุณาสับสะพานไฟก่อน");
            return;
        }
        if (state.lightBulbHealth <= 0) {
            if (window.speak) window.speak("หลอดไฟขาดเปิดไฟไม่ติด กรุณาซื้อหลอดไฟใหม่มาเปลี่ยนจากเมนู M ศูนย์ซ่อม");
            return;
        }
        state.isCabLightOn = !state.isCabLightOn;
        if (window.playOneShot) window.playOneShot(state.isCabLightOn ? 'headlights on' : 'headlights of');
        if (window.speak) window.speak(state.isCabLightOn ? "เปิดไฟห้องคนขับ" : "ปิดไฟห้องคนขับ");
    }

    if (key === 'u' && !e.repeat) {
        if (!state.isBatteryKnifeSwitchOn) {
            if (window.speak) window.speak("ไม่มีกระแสไฟฟ้า กรุณาสับสะพานไฟก่อน");
            return;
        }
        if (state.lightBulbHealth <= 0) {
            if (window.speak) window.speak("หลอดไฟขาดเปิดไฟไม่ติด กรุณาซื้อหลอดไฟใหม่มาเปลี่ยนจากเมนู M ศูนย์ซ่อม");
            return;
        }
        state.isPassengerLightOn = !state.isPassengerLightOn;
        if (window.playOneShot) window.playOneShot(state.isPassengerLightOn ? 'headlights on' : 'headlights of');
        if (window.speak) window.speak(state.isPassengerLightOn ? "เปิดไฟห้องโดยสาร" : "ปิดไฟห้องโดยสาร");
    }

    if (key === 'q' || key === 'ๆ') {
        const job = window.JobSystem;
        const stn = window.StationSystem;
        const trf = window.TrafficSystem;
        if (job && job.currentTrain && stn && stn.currentRouteList[stn.currentIndex]) {
            if (!job.isCoupled) {
                const distToCoupling = Math.abs(job.odo - job.couplingKm);
                const distInMeters = Math.round(distToCoupling * 1000);
                if (window.speak) window.speak(`กำลังทำขบวนถอยหลังไปต่อตู้โดยสาร อีก ${distInMeters} เมตร จะถึงจุดต่อตู้`);
            } else if (trf && trf.waitingForCrossing && trf.crossingTargetKm !== null) {
                const distToCrossing = Math.abs(job.odo - trf.crossingTargetKm);
                const distInMeters = Math.round(distToCrossing * 1000);
                if (window.speak) window.speak(`อีก ${distInMeters} เมตร จะถึงจุดจอดสับหลีก`);
            } else {
                const nextStn = stn.currentRouteList[stn.currentIndex];
                const sName = nextStn.name;
                const isStop = stn.checkIsStop();
                
                if (isStop) {
                    const sideTH = nextStn.doorSide === 'left' ? "ซ้าย" : "ขวา";
                    if (window.speak) window.speak(`สถานีต่อไป ${sName} ชานชาลาอยู่ทางฝั่ง${sideTH}`);
                } else {
                    if (window.speak) window.speak(`สถานีต่อไป ${sName} ขบวนรถวิ่งผ่าน ไม่มีการหยุดรับส่งผู้โดยสาร`);
                }
            }
        }
    }

    if (window.JobSystem && typeof window.JobSystem.handleKeys === 'function') {
        window.JobSystem.handleKeys(key);
    }

    if (key === 'v' || key === 'อ') {
        const job = window.JobSystem;
        if (!job || !job.currentTrain) {
            if (window.ManagementSystem && window.speak) {
                window.speak(`ยอดเงินบริษัทคงเหลือ ${window.ManagementSystem.wallet.toLocaleString()} บาท`);
            }
        }
    }

    // --- 7.5. เดินไปห้องช่าง (W) ---
    if (key === 'w' || key === 'ไ') {
        e.preventDefault();
        e.stopPropagation();
        
        const job = window.JobSystem;
        if (!job) return;
        
        if (state.isWalking) {
            if (window.speak) window.speak("กำลังเดินอยู่ครับ...");
            return;
        }

        if (state.isAtTechnicianRoom) {
            if (window.speak) window.speak("คุณอยู่ที่หน้าห้องช่างแล้วครับ");
            return;
        }

        // เช็คว่าอนุญาตให้เดินได้ไหม
        const isStartGame = (!state.hasTools && !job.currentTrain);
        const isEndGame = (state.hasTools && job.currentTrain && state.isAtDepotBumper);
        
        if (isEndGame) {
            // ต้องดับเครื่องและปิดไฟทั้งหมดก่อนเดินไปห้องช่าง
            if (state.isEngineRunning || state.headlightMode !== 0 || state.isCabLightOn || state.isPassengerLightOn) {
                if (window.speak) window.speak("กรุณาดับเครื่องยนต์ (P) และปิดไฟทุกดวงในขบวนรถ (H, U, L, K) ให้เรียบร้อยก่อนลงไปห้องช่างครับ");
                return;
            }
        }

        if (isStartGame || isEndGame) {
            state.isWalking = true;
            if (window.speak) window.speak("กำลังเดินไปห้องช่าง...");
            
            let walkSound = null;
            if (window.playOneShot) {
                // เพิ่มระดับความเร็วในการเดิน (Pitch) เป็น 1.45 เท่า เพื่อจำลองการเดินปกติที่กระฉับกระเฉงขึ้น
                walkSound = window.playOneShot('walk', 1.0, 0, 1.45);
            }
            
            const onWalkFinished = () => {
                state.isWalking = false;
                state.isAtTechnicianRoom = true;
                if (isStartGame) {
                    if (window.speak) window.speak("ถึงแล้วกรุณารับกุญแจ");
                } else if (isEndGame) {
                    if (window.speak) window.speak("ให้นำกุญแจไปคืนห้องช่าง โดยกดปุ่ม Enter");
                }
            };

            if (walkSound) {
                walkSound.onended = onWalkFinished;
            } else {
                // ปรับลดระยะเวลาดีเลย์ Fallback ลงเหลือ 3500ms ให้สอดคล้องกับจังหวะการก้าวเดินที่เร่งขึ้น
                setTimeout(onWalkFinished, 3500);
            }
        } else {
            if (window.speak) window.speak("คุณไม่ได้อยู่ในโรงจอด หรือไม่ถึงเวลาที่ต้องไปห้องช่างครับ");
        }
    }

    // --- 8. ระบบห้องช่าง เบิก/คืนเครื่องมือ (Enter) ---
    if (key === 'enter') {
        e.preventDefault();
        e.stopPropagation();
        
        const job = window.JobSystem;
        if (!job) return;

        if (state.isWalking) return;

        if (!state.isAtTechnicianRoom) {
            if (!state.hasTools && !job.currentTrain) {
                if (window.speak) window.speak("กรุณากด W ไปรับกุญแจก่อนทำงาน");
            } else if (state.hasTools && job.currentTrain && state.isAtDepotBumper) {
                if (window.speak) window.speak("คุณยังไม่ได้เดินไปที่ห้องช่าง กรุณากดปุ่ม W เพื่อเดินไปก่อนครับ");
            }
            return;
        }

        // เบิกเครื่องมือ (ตอนเริ่มเกม, ยังไม่มีงาน)
        if (!state.hasTools && !job.currentTrain) {
            if (window.ManagementSystem && window.ManagementSystem.hasLocomotive === false) {
                if (window.speak) window.speak("คุณยังไม่มีหัวรถจักรให้ใช้งาน กรุณากดปุ่ม M เพื่อเปิดหน้าจอบริหาร และไปที่ศูนย์จัดซื้อเพื่อซื้อหัวรถจักรใหม่เสียก่อนครับ");
                return;
            }
            state.hasTools = true;
            state.isAtTechnicianRoom = false; // กลับมาอัตโนมัติ
            if (window.playOneShot) window.playOneShot('key', 1.0);
            if (window.speak) window.speak("รับกุญแจและเครื่องมือจากห้องช่างเรียบร้อยแล้ว สามารถกดปุ่ม O เพื่อเริ่มเลือกภารกิจเดินรถได้เลยครับ");
            return;
        }

        // คืนเครื่องมือ (ตอนจบงานที่แป้นปะทะ)
        if (state.hasTools && job.currentTrain && state.isAtDepotBumper) {
            state.hasTools = false;
            state.isAtTechnicianRoom = false;
            job.currentTrain = null;
            job.isAtOrigin = false;
            job.atStopStation = false;
            job.exchangeFinished = false;
            state.isAtDepotBumper = false;
            state.hasCrashedBumper = false;
            job.passengerStatus = "คืนเครื่องมือเรียบร้อย จบภารกิจ";
            
            if (window.playOneShot) window.playOneShot('key', 1.0);
            if (window.speak) window.speak("คืนกุญแจและอุปกรณ์เครื่องมือเรียบร้อย ขอบคุณสำหรับความเหน็ดเหนื่อยในภารกิจนี้ครับ คุณสามารถเบิกเครื่องมือใหม่เพื่อเริ่มงานต่อไปได้");
            return;
        }
    }

    if (key === 'backspace' && !e.repeat && window.audioContext && window.soundBuffers['horn']) {
        if (!state.isBatteryKnifeSwitchOn) {
            // แตรไฟฟ้าไม่ทำงานถ้าสะพานไฟดับ
            return;
        }
        
        if (window.MultiplayerSystem) window.MultiplayerSystem.setHonking(true);

        if (window.hornSource) {
            try { window.hornSource.stop(); } catch (err) {}
        }
        window.hornSource = window.audioContext.createBufferSource();
        window.hornSource.buffer = window.soundBuffers['horn'];
        window.hornSource.loop = true;
        
        window.hornGain = window.audioContext.createGain();
        window.hornGain.gain.value = 0.3; // Master volume set to 0.3
        
        window.hornInputGain = window.audioContext.createGain();
        window.hornInputGain.gain.value = 1.0;
        window.hornSource.connect(window.hornInputGain);
        
        window.hornDryGain = window.audioContext.createGain();
        window.hornDryGain.gain.value = 1.0;
        window.hornInputGain.connect(window.hornDryGain);
        
        // --- Realistic Outdoor Reverb Effect ---
        if (window.hornReverbBuffer) {
            window.hornConvolver = window.audioContext.createConvolver();
            window.hornConvolver.buffer = window.hornReverbBuffer;
            
            window.hornReverbGain = window.audioContext.createGain();
            window.hornReverbGain.gain.value = 1.0; // 100% reverb mix for wetter sound
            
            window.hornReverbFilter = window.audioContext.createBiquadFilter();
            window.hornReverbFilter.type = "lowpass";
            window.hornReverbFilter.frequency.value = 1500;
            
            window.hornInputGain.connect(window.hornConvolver);
            window.hornConvolver.connect(window.hornReverbFilter);
            window.hornReverbFilter.connect(window.hornReverbGain);
            window.hornReverbGain.connect(window.hornGain);
        }
        
        // Mix Dry Signal to Master Gain
        window.hornDryGain.connect(window.hornGain);
        window.hornGain.connect(window.audioContext.destination);
        window.hornSource.start(0);
    }



}, true);

window.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();

    // --- Push-to-Talk ปล่อยไมค์ (Ctrl ซ้าย) ---
    if (e.code === 'ControlLeft') {
        if (window.VoiceChatSystem) {
            window.VoiceChatSystem.stopPTT();
        }
    }
    
    if (key === 'backspace') {
        if (window.MultiplayerSystem) window.MultiplayerSystem.setHonking(false);

        try {
            if (window.hornInputGain && window.audioContext) {
                const t = window.audioContext.currentTime;
                // Fade out INPUT gain so the reverb tail continues naturally
                window.hornInputGain.gain.setValueAtTime(window.hornInputGain.gain.value, t);
                window.hornInputGain.gain.linearRampToValueAtTime(0, t + 0.1);
                window.hornSource.stop(t + 0.15);
            } else if (window.hornSource) {
                window.hornSource.stop();
            }
        } catch (err) {
            try { if (window.hornSource) window.hornSource.stop(); } catch (e) {}
        } finally {
            window.hornDryGain = null;
            window.hornGain = null;
            window.hornInputGain = null;
            window.hornSource = null;
        }
    }
}, true);
