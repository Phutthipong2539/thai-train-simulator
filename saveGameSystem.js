(function() {
let ipcRenderer = null;
let fs = null;
let path = null;
let os = null;

try {
    if (typeof require !== 'undefined') {
        const electron = require('electron');
        ipcRenderer = electron.ipcRenderer;
        fs = require('fs');
        path = require('path');
        os = require('os');
    }
} catch (e) {
    console.warn("Failed to load Node/Electron modules in saveGameSystem:", e);
}

window.SaveGameSystem = {
    getSavePath: function() {
        try {
            const saveDir = path.join(os.homedir(), 'Documents', 'ThaiTrainSimulator');
            if (!fs.existsSync(saveDir)) {
                fs.mkdirSync(saveDir, { recursive: true });
            }
            return path.join(saveDir, 'savegame_v1.json');
        } catch (e) {
            return null;
        }
    },
    SAVE_KEY: 'thaitrain_savegame_v1',
    isPopupOpen: false,
    selectedOption: 0, // 0 = OK, 1 = Cancel
    isLoadPopupOpen: false,
    selectedLoadOption: 0, // 0 = Continue, 1 = New Game

    init: function() {
        this.createPopupUI();
        this.createLoadPopupUI();

        ipcRenderer.on('request-save-exit', () => {
            if (!this.isPopupOpen) {
                this.openPopup();
            }
        });

        // setTimeout to ensure other systems are ready before loading popup
        setTimeout(() => {
            if (this.hasSaveGame()) {
                this.openLoadPopup();
            }
        }, 1200);
    },

    createPopupUI: function() {
        const popup = document.createElement('div');
        popup.id = 'save-exit-popup';
        popup.style.display = 'none';
        popup.style.position = 'fixed';
        popup.style.top = '50%';
        popup.style.left = '50%';
        popup.style.transform = 'translate(-50%, -50%)';
        popup.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
        popup.style.color = 'white';
        popup.style.padding = '30px';
        popup.style.border = '2px solid #555';
        popup.style.borderRadius = '10px';
        popup.style.zIndex = '10000';
        popup.style.textAlign = 'center';
        popup.style.fontSize = '24px';
        popup.style.boxShadow = '0 0 20px rgba(0,0,0,0.8)';
        popup.innerHTML = `
            <h2 style="margin-top:0; color: #ffcc00;">ต้องการเซฟเกมก่อนออกหรือไม่?</h2>
            <div id="save-option-0" style="padding: 15px; margin: 10px; border: 2px solid transparent; border-radius: 5px;">> ตกลง (เซฟและออก) <</div>
            <div id="save-option-1" style="padding: 15px; margin: 10px; border: 2px solid transparent; border-radius: 5px;">> ยกเลิก (ออกโดยไม่เซฟ) <</div>
            <div id="save-option-2" style="padding: 15px; margin: 10px; border: 2px solid transparent; border-radius: 5px;">> เปลี่ยนใจเล่นต่อ <</div>
        `;
        document.body.appendChild(popup);
    },

    createLoadPopupUI: function() {
        const popup = document.createElement('div');
        popup.id = 'load-game-popup';
        popup.style.display = 'none';
        popup.style.position = 'fixed';
        popup.style.top = '50%';
        popup.style.left = '50%';
        popup.style.transform = 'translate(-50%, -50%)';
        popup.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
        popup.style.color = 'white';
        popup.style.padding = '30px';
        popup.style.border = '2px solid #555';
        popup.style.borderRadius = '10px';
        popup.style.zIndex = '10000';
        popup.style.textAlign = 'center';
        popup.style.fontSize = '24px';
        popup.style.boxShadow = '0 0 20px rgba(0,0,0,0.8)';
        popup.innerHTML = `
            <h2 style="margin-top:0; color: #ffcc00;">พบข้อมูลเซฟเกมเดิม</h2>
            <div id="load-option-0" style="padding: 15px; margin: 10px; border: 2px solid transparent; border-radius: 5px;">> เล่นต่อจากเดิม <</div>
            <div id="load-option-1" style="padding: 15px; margin: 10px; border: 2px solid transparent; border-radius: 5px;">> เริ่มเกมใหม่ (ลบเซฟเดิม) <</div>
        `;
        document.body.appendChild(popup);
    },

    openPopup: function() {
        if (this.isPopupOpen) return;
        this.isPopupOpen = true;
        window.isAnyMenuOpen = true; // Lock controls
        this.selectedOption = 0;
        document.getElementById('save-exit-popup').style.display = 'block';
        this.updateUI();
        if (window.speak) window.speak("คุณต้องการเซฟเกมก่อนออกหรือไม่? กดลูกศรขึ้นลงเพื่อเลือก แล้วกด Enter เพื่อตกลง หรือ ยกเลิก");
    },

    updateUI: function() {
        const opt0 = document.getElementById('save-option-0');
        const opt1 = document.getElementById('save-option-1');
        const opt2 = document.getElementById('save-option-2');
        
        if (opt0 && opt1 && opt2) {
            opt0.style.border = this.selectedOption === 0 ? '2px solid yellow' : '2px solid transparent';
            opt0.style.color = this.selectedOption === 0 ? 'yellow' : 'white';
            opt0.style.backgroundColor = this.selectedOption === 0 ? 'rgba(255, 204, 0, 0.2)' : 'transparent';
            
            opt1.style.border = this.selectedOption === 1 ? '2px solid yellow' : '2px solid transparent';
            opt1.style.color = this.selectedOption === 1 ? 'yellow' : 'white';
            opt1.style.backgroundColor = this.selectedOption === 1 ? 'rgba(255, 204, 0, 0.2)' : 'transparent';

            opt2.style.border = this.selectedOption === 2 ? '2px solid yellow' : '2px solid transparent';
            opt2.style.color = this.selectedOption === 2 ? 'yellow' : 'white';
            opt2.style.backgroundColor = this.selectedOption === 2 ? 'rgba(255, 204, 0, 0.2)' : 'transparent';
        }
    },

    openLoadPopup: function() {
        if (this.isLoadPopupOpen) return;
        this.isLoadPopupOpen = true;
        window.isAnyMenuOpen = true; // Lock controls
        this.selectedLoadOption = 0;
        document.getElementById('load-game-popup').style.display = 'block';
        this.updateLoadUI();
        if (window.speak) window.speak("พบข้อมูลเซฟเกมเดิม กดลูกศรขึ้นลงเพื่อเลือกว่าจะ เล่นต่อจากเดิม หรือ เริ่มเกมใหม่ แล้วกดปุ่ม Enter เพื่อยืนยันครับ");
    },

    updateLoadUI: function() {
        const opt0 = document.getElementById('load-option-0');
        const opt1 = document.getElementById('load-option-1');
        
        if (opt0 && opt1) {
            opt0.style.border = this.selectedLoadOption === 0 ? '2px solid yellow' : '2px solid transparent';
            opt0.style.color = this.selectedLoadOption === 0 ? 'yellow' : 'white';
            opt0.style.backgroundColor = this.selectedLoadOption === 0 ? 'rgba(255, 204, 0, 0.2)' : 'transparent';
            
            opt1.style.border = this.selectedLoadOption === 1 ? '2px solid yellow' : '2px solid transparent';
            opt1.style.color = this.selectedLoadOption === 1 ? 'yellow' : 'white';
            opt1.style.backgroundColor = this.selectedLoadOption === 1 ? 'rgba(255, 204, 0, 0.2)' : 'transparent';
        }
    },

    handleKeys: function(key) {
        if (this.isLoadPopupOpen) {
            if (key === 'arrowup' || key === 'arrowdown') {
                this.selectedLoadOption = this.selectedLoadOption === 0 ? 1 : 0;
                this.updateLoadUI();
                if (window.speak) {
                    window.speak(this.selectedLoadOption === 0 ? "เล่นต่อจากเดิม" : "เริ่มเกมใหม่");
                }
                return true;
            }

            if (key === 'enter') {
                this.isLoadPopupOpen = false;
                window.isAnyMenuOpen = false;
                document.getElementById('load-game-popup').style.display = 'none';
                
                if (this.selectedLoadOption === 0) {
                    this.loadGame();
                } else {
                    this.deleteSave();
                    if (window.speak) window.speak("เริ่มเกมใหม่ ยินดีต้อนรับสู่ ไทย เทรน ซิมูเลเตอร์ กรุณาไปรับกุญแจที่ห้องช่างโดยกด W");
                }
                return true;
            }
            return true;
        }

        if (!this.isPopupOpen) return false;

        if (key === 'arrowup') {
            this.selectedOption = (this.selectedOption > 0) ? this.selectedOption - 1 : 2;
            this.updateUI();
            if (window.speak) {
                if (this.selectedOption === 0) window.speak("ตกลง เซฟและออก");
                else if (this.selectedOption === 1) window.speak("ยกเลิก ออกโดยไม่เซฟ");
                else window.speak("เปลี่ยนใจเล่นต่อ");
            }
            return true;
        }

        if (key === 'arrowdown') {
            this.selectedOption = (this.selectedOption < 2) ? this.selectedOption + 1 : 0;
            this.updateUI();
            if (window.speak) {
                if (this.selectedOption === 0) window.speak("ตกลง เซฟและออก");
                else if (this.selectedOption === 1) window.speak("ยกเลิก ออกโดยไม่เซฟ");
                else window.speak("เปลี่ยนใจเล่นต่อ");
            }
            return true;
        }

        if (key === 'enter') {
            if (this.selectedOption === 0) {
                this.saveGame();
                if (window.speak) window.speak("เซฟเกมเรียบร้อยแล้ว กำลังปิดเกม");
                setTimeout(() => {
                    ipcRenderer.send('confirm-exit');
                }, 1500);
            } else if (this.selectedOption === 1) {
                this.deleteSave();
                if (window.speak) window.speak("ยกเลิกการเซฟ ลบข้อมูลเดิมทิ้ง และกำลังปิดเกม");
                setTimeout(() => {
                    ipcRenderer.send('confirm-exit');
                }, 1000);
            } else {
                this.isPopupOpen = false;
                window.isAnyMenuOpen = false;
                document.getElementById('save-exit-popup').style.display = 'none';
                if (window.speak) window.speak("เปลี่ยนใจเล่นต่อ กลับเข้าสู่ระบบเกมตามปกติแล้วครับ");
            }
            return true;
        }

        return true; 
    },

    saveGame: function() {
        const job = window.JobSystem;
        const state = window.TrainState;
        const stn = window.StationSystem;

        if (!job || !job.currentTrain || !state || !stn) return;

        const saveData = {
            timestamp: Date.now(),
            job: {
                selectedLine: job.selectedLine,
                selectedDir: job.selectedDir,
                currentTrainNumber: job.currentTrain.number,
                odo: job.odo,
                passengersOnBoard: job.passengersOnBoard,
                passengerStatus: job.passengerStatus,
                isAtOrigin: job.isAtOrigin,
                atStopStation: job.atStopStation,
                exchangeFinished: job.exchangeFinished,
                isPassengerExchanging: job.isPassengerExchanging,
                arrivalAnnounced: job.arrivalAnnounced,
                departureAnnounced: job.departureAnnounced,
                atStationAnnounced: job.atStationAnnounced,
                isCoupled: job.isCoupled,
                carriages: job.carriages,
                couplingKm: job.couplingKm,
                couplingTimer: job.couplingTimer
            },
            train: {
                currentSpeed: state.currentSpeed,
                targetSpeed: state.targetSpeed,
                manualTargetSpeed: state.manualTargetSpeed,
                reverser: state.reverser,
                isBrakeApplied: state.isBrakeApplied,
                isLeftDoorOpen: state.isLeftDoorOpen,
                isRightDoorOpen: state.isRightDoorOpen,
                isDoorOpen: state.isDoorOpen,
                fuel: state.fuel,
                backupFuel: state.backupFuel,
                engineTemp: state.engineTemp,
                airPressure: state.airPressure,
                brakeLock: state.brakeLock,
                isEngineRunning: state.isEngineRunning,
                isBatteryKnifeSwitchOn: state.isBatteryKnifeSwitchOn,
                hasTools: state.hasTools,
                batteryCharge: state.batteryCharge,
                isCabLightOn: state.isCabLightOn,
                isPassengerLightOn: state.isPassengerLightOn,
                headlightMode: state.headlightMode,
                markerLightMode: state.markerLightMode,
                isATOEnabled: state.isATOEnabled,
                handbrakes: state.handbrakes,
                batteryBrand: state.batteryBrand || "Yuasa Heavy Duty",
                batteryHealth: state.batteryHealth !== undefined ? state.batteryHealth : 100,
                lightBulbHealth: state.lightBulbHealth !== undefined ? state.lightBulbHealth : 100,
                acFanHealth: state.acFanHealth !== undefined ? state.acFanHealth : 100,
                brakeHealth: state.brakeHealth !== undefined ? state.brakeHealth : 100,
                engineOilHealth: state.engineOilHealth !== undefined ? state.engineOilHealth : 100
            },
            station: {
                fullKey: stn.fullKey,
                currentIndex: stn.currentIndex
            },
            management: {
                wallet: window.ManagementSystem ? window.ManagementSystem.wallet : 200000,
                inventory: window.ManagementSystem ? JSON.parse(JSON.stringify(window.ManagementSystem.inventory)) : {},
                totalTripRevenue: job.totalTripRevenue || 0,
                lastStationRevenue: job.lastStationRevenue || 0
            }
        };

        localStorage.setItem(this.SAVE_KEY, JSON.stringify(saveData));
        
        // --- Sync with Server ---
        const driverId = localStorage.getItem('thaitrain_driver_pin_v2');
        if (driverId) {
            fetch("http://119.59.103.185:45000/api/save", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ driverId, saveData })
            }).catch(e => console.error("Cloud save failed:", e));
        }
        
        const savePath = this.getSavePath();
        if (savePath) {
            try {
                fs.writeFileSync(savePath, JSON.stringify(saveData, null, 2), 'utf-8');
            } catch (e) {
                console.error("Failed to write physical save file:", e);
            }
        }
    },

    hasSaveGame: function() {
        const savePath = this.getSavePath();
        if (savePath && fs.existsSync(savePath)) {
            return true;
        }
        return localStorage.getItem(this.SAVE_KEY) !== null;
    },

    loadGame: async function() {
        if (window.speak) window.speak("กำลังดึงข้อมูลเซฟเกมจากระบบ กรุณารอสักครู่");
        
        let savedStr = null;
        const driverId = localStorage.getItem('thaitrain_driver_pin_v2');
        
        // 1. Try server fetch first
        if (driverId) {
            try {
                const res = await fetch(`http://119.59.103.185:45000/api/save/${driverId}`);
                const data = await res.json();
                if (data.success && data.saveData) {
                    savedStr = JSON.stringify(data.saveData);
                    localStorage.setItem(this.SAVE_KEY, savedStr); // Sync local
                }
            } catch(e) {
                console.error("Cloud load failed:", e);
            }
        }
        
        // 2. Fallback to local
        if (!savedStr) {
            const savePath = this.getSavePath();
            if (savePath && fs.existsSync(savePath)) {
                try {
                    savedStr = fs.readFileSync(savePath, 'utf-8');
                } catch (e) {
                    console.error("Failed to read physical save file:", e);
                }
            }
            if (!savedStr) {
                savedStr = localStorage.getItem(this.SAVE_KEY);
            }
        }

        if (!savedStr) {
            if (window.speak) window.speak("ไม่พบข้อมูลเซฟเกมในระบบครับ");
            return false;
        }

        try {
            const data = JSON.parse(savedStr);
            const job = window.JobSystem;
            const state = window.TrainState;
            const stn = window.StationSystem;

            let lookupKey = data.station.fullKey;
            if (lookupKey.includes("สายตะวันออก")) {
                lookupKey = (lookupKey.includes("ขาขึ้น") ? "ขาขึ้น" : "ขาล่อง") + "สายตะวันออก";
            } else if (lookupKey.includes("สายอีสาน")) {
                lookupKey = (lookupKey.includes("ขาขึ้น") ? "ขาขึ้น" : "ขาล่อง") + "สายอีสาน";
            }

            if (stn.setTrain(data.station.fullKey, data.job.currentTrainNumber)) {
                const trainList = window.TrainDefinitions[lookupKey] || [];
                job.currentTrain = trainList.find(t => t.number === data.job.currentTrainNumber);
                stn.currentIndex = data.station.currentIndex;
                
                job.selectedLine = data.job.selectedLine;
                job.selectedDir = data.job.selectedDir;
                job.odo = data.job.odo;
                job.passengersOnBoard = data.job.passengersOnBoard;
                job.passengerStatus = data.job.passengerStatus;
                job.isAtOrigin = data.job.isAtOrigin;
                job.atStopStation = data.job.atStopStation;
                // ป้องกันโกงเงิน: ถ้ากำลังรับผู้โดยสารอยู่ตอนเซฟ ให้ถือว่ารับเสร็จแล้ว
                job.exchangeFinished = data.job.exchangeFinished || data.job.isPassengerExchanging || false;
                job.isPassengerExchanging = false;
                job.arrivalAnnounced = data.job.arrivalAnnounced;
                job.departureAnnounced = data.job.departureAnnounced;
                job.atStationAnnounced = data.job.atStationAnnounced;
                job.isCoupled = data.job.isCoupled !== undefined ? data.job.isCoupled : true;
                job.carriages = data.job.carriages || 5;
                job.couplingKm = data.job.couplingKm || 0;
                job.couplingTimer = data.job.couplingTimer || 0;

                // Restore wallet and inventory safely
                if (data.management && window.ManagementSystem) {
                    if (data.management.wallet !== undefined) {
                        window.ManagementSystem.wallet = data.management.wallet;
                        // ระบบช่วยอัปเกรดเงินตั้งต้นสำหรับเซฟเก่า
                        if (window.ManagementSystem.wallet < 200000 && !localStorage.getItem('thaitrain_save_200k_update')) {
                            window.ManagementSystem.wallet = 200000;
                            localStorage.setItem('thaitrain_save_200k_update', 'true');
                        }
                    }
                    if (data.management.inventory !== undefined) {
                        window.ManagementSystem.inventory = data.management.inventory;
                    }
                    window.ManagementSystem.save();
                }
                
                // Restore trip revenue statistics
                if (data.management) {
                    job.totalTripRevenue = data.management.totalTripRevenue || 0;
                    job.lastStationRevenue = data.management.lastStationRevenue || 0;
                }

                window.lastStationKm = stn.currentRouteList[stn.currentIndex].km;
                window.lastStationName = stn.currentRouteList[stn.currentIndex].name;

                state.currentSpeed = 0;
                state.targetSpeed = 0;
                state.manualTargetSpeed = 0;
                state.reverser = data.train.reverser || "N";
                state.isBrakeApplied = true; // Brake applied when load
                
                state.isLeftDoorOpen = data.train.isLeftDoorOpen || false;
                state.isRightDoorOpen = data.train.isRightDoorOpen || false;
                // Since trainState.js uses a setter, setting isDoorOpen after will overwrite our explicit left/right.
                // So we do not set isDoorOpen here; the getter calculates it correctly.

                state.fuel = data.train.fuel;
                state.backupFuel = data.train.backupFuel;
                
                // Requirement: Load exact state instead of forcing off
                state.hasTools = data.train.hasTools !== undefined ? data.train.hasTools : true;
                state.isEngineRunning = data.train.isEngineRunning || false;
                state.isBatteryKnifeSwitchOn = data.train.isBatteryKnifeSwitchOn || false;
                state.airPressure = data.train.airPressure !== undefined ? data.train.airPressure : 0;
                state.brakeLock = data.train.brakeLock !== undefined ? data.train.brakeLock : true;
                
                state.engineTemp = data.train.engineTemp || 40;
                state.batteryCharge = data.train.batteryCharge || 0;
                state.isCabLightOn = data.train.isCabLightOn || false;
                state.isPassengerLightOn = data.train.isPassengerLightOn || false;
                state.headlightMode = data.train.headlightMode || 0;
                state.markerLightMode = data.train.markerLightMode || 0;
                state.isATOEnabled = false; // ATO should be off on load
                state.handbrakes = data.train.handbrakes || [true, true];
                
                state.batteryBrand = data.train.batteryBrand || "Yuasa Heavy Duty";
                state.batteryHealth = data.train.batteryHealth !== undefined ? data.train.batteryHealth : 100;
                state.lightBulbHealth = data.train.lightBulbHealth !== undefined ? data.train.lightBulbHealth : 100;
                state.acFanHealth = data.train.acFanHealth !== undefined ? data.train.acFanHealth : 100;
                state.brakeHealth = data.train.brakeHealth !== undefined ? data.train.brakeHealth : 100;
                state.engineOilHealth = data.train.engineOilHealth !== undefined ? data.train.engineOilHealth : 100;

                if (window.speak) {
                    if (!state.isEngineRunning) {
                        window.speak(`โหลดเซฟเกมสำเร็จ ขบวนที่ ${job.currentTrain.number} กลับสู่สถานะเดิมที่ ${window.lastStationName} กรุณาสับสะพานไฟและสตาร์ทเครื่องยนต์เพื่อเดินทางต่อ`);
                    } else {
                        window.speak(`โหลดเซฟเกมสำเร็จ ขบวนที่ ${job.currentTrain.number} พร้อมเดินทางต่อจาก ${window.lastStationName} ครับ`);
                        // Setup engine sound if it was running
                        if (window.audioContext && window.soundBuffers && window.soundBuffers['engine']) {
                            window.engineSource = window.audioContext.createBufferSource(); 
                            window.engineSource.buffer = window.soundBuffers['engine']; 
                            window.engineSource.loop = true;
                            
                            window.engineGain = window.audioContext.createGain(); 
                            window.engineGain.gain.value = 0.2;
                            
                            window.engineFilter = window.audioContext.createBiquadFilter();
                            window.engineFilter.type = "lowpass"; 
                            window.engineFilter.frequency.value = 1000;
                            
                            window.engineSource.connect(window.engineFilter).connect(window.engineGain).connect(window.audioContext.destination); 
                            
                            if (window.tunnelReverbBuffer) {
                                window.engineTunnelGain = window.audioContext.createGain();
                                window.engineTunnelGain.gain.value = 0;
                                window.engineTunnelConvolver = window.audioContext.createConvolver();
                                window.engineTunnelConvolver.buffer = window.tunnelReverbBuffer;
                                window.engineFilter.connect(window.engineTunnelConvolver).connect(window.engineTunnelGain).connect(window.audioContext.destination);
                            }
                            window.engineSource.start(0);
                        }
                    }
                }
                
                // Requirement: Play station sounds
                if (stn.checkIsStop()) {
                    if (window.playLoop && window.soundBuffers && window.soundBuffers['station_ambience']) {
                        if (!window.ambientSource) {
                            window.ambientSource = window.playLoop('station_ambience', 0.5);
                        }
                    }
                }

                console.log("SaveGameSystem: Game Loaded Successfully.");
                return true;
            }
            // If we reach here, setTrain failed
            this.deleteSave();
        } catch (e) {
            console.error("SaveGameSystem: Error loading game", e);
            if (window.speak) window.speak("เกิดข้อผิดพลาดในการโหลดเซฟเกมครับ");
            this.deleteSave();
        }
        return false;
    },

    deleteSave: function() {
        localStorage.removeItem(this.SAVE_KEY);
        const savePath = this.getSavePath();
        if (savePath && fs.existsSync(savePath)) {
            try {
                fs.unlinkSync(savePath);
            } catch (e) {}
        }
    }
};

window.addEventListener('load', () => {
    window.SaveGameSystem.init();
});

// Capture key events for popup
window.addEventListener('keydown', (e) => {
    // ไม่บล็อก Alt+F4 ทุกกรณี เพื่อให้ผู้เล่นสามารถกดปิดเกมได้เสมือนปกติ
    if (e.altKey && (e.key === 'F4' || e.key === 'f4')) return;

    if (document.activeElement) {
        const tag = document.activeElement.tagName.toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'iframe') {
            return;
        }
    }
    if (window.SaveGameSystem && (window.SaveGameSystem.isPopupOpen || window.SaveGameSystem.isLoadPopupOpen)) {
        if (window.SaveGameSystem.handleKeys(e.key.toLowerCase())) {
            e.stopImmediatePropagation();
            e.preventDefault();
        }
    }
}, true);

})();
