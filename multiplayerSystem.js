/**
 * multiplayerSystem.js - ระบบผู้เล่นหลายคน (Online Multiplayer)
 * ซิงค์ตำแหน่ง ความเร็ว และเสียงแตรระหว่างผู้เล่นแบบเรียลไทม์
 */

window.MultiplayerSystem = {
    socket: null,
    remotePlayers: {},
    lastEmitTime: 0,
    emitInterval: 200, // ส่งข้อมูล 5 ครั้งต่อวินาที
    isHonking: false,
    playerName: "ผู้เล่นไม่ระบุชื่อ",
    
    // สถานะสำหรับการแจ้งเตือนเพื่อนขับผ่าน
    announcedPlayers: {},

    init: function() {
        if (typeof io === 'undefined') {
            console.warn("Socket.io not loaded. Multiplayer disabled.");
            return;
        }

        // ดึงชื่อผู้เล่นจาก localStorage หรือให้ตั้งใหม่
        let savedName = localStorage.getItem('thaiTrainPlayerName');
        if (!savedName) {
            savedName = prompt("กรุณาตั้งชื่อพนักงานขับรถของคุณ (เช่น พนักงาน ก.):", "");
            if (savedName && savedName.trim() !== "") {
                localStorage.setItem('thaiTrainPlayerName', savedName.trim());
                this.playerName = savedName.trim();
            }
        } else {
            this.playerName = savedName;
        }

        // เชื่อมต่อไปที่ Server
        this.socket = io("https://thai-train-ai-server.onrender.com");

        this.socket.on('connect', () => {
            console.log("Connected to Multiplayer Server! ID: " + this.socket.id);
            if (window.speak) window.speak("เชื่อมต่อระบบผู้เล่นหลายคนสำเร็จ");
        });

        this.socket.on('players_state', (playersData) => {
            const now = Date.now();
            playersData.forEach(p => {
                // อัปเดตข้อมูลผู้เล่นคนอื่น
                if (!this.remotePlayers[p.id]) {
                    this.remotePlayers[p.id] = { id: p.id, announced: false, passed: false, lastHonkTime: 0 };
                }
                
                // ถ้ารถสวนกันหรืออยู่ใกล้มาก
                const state = window.TrainState;
                const job = window.JobSystem;
                if (!state || !job) return;

                const localOdo = job.odo || 0;
                const remoteOdo = p.odo || 0;
                const distMeters = Math.abs(localOdo - remoteOdo) * 1000;

                // การประกาศเตือนเมื่อมีเพื่อนกำลังสวนมา (ห่าง 500 เมตร)
                if (distMeters <= 500 && p.dir !== job.selectedDir) {
                    if (!this.remotePlayers[p.id].announced) {
                        this.remotePlayers[p.id].announced = true;
                        if (window.speak) window.speak(`มีขบวนรถของเพื่อนกำลังสวนมาในระยะ 500 เมตรครับ`);
                    }
                }

                // เล่นเสียงเครื่องยนต์ตอนรถสวนกัน (ระยะประชิด 50 เมตร)
                if (distMeters <= 50 && p.dir !== job.selectedDir) {
                    if (!this.remotePlayers[p.id].passed) {
                        this.remotePlayers[p.id].passed = true;
                        if (window.playPassingTrain) {
                            // คำนวณทิศทางเสียงอิงจากชานชาลาปัจจุบัน
                            let panDirection = 1.0; // ค่าเริ่มต้น เสียงมาทางขวา
                            const stnSystem = window.StationSystem;
                            if (stnSystem && stnSystem.currentRouteList) {
                                const currentStn = stnSystem.currentRouteList[stnSystem.currentIndex];
                                if (currentStn && currentStn.doorSide === 'right') {
                                    panDirection = -1.0; // ถ้าเราจอดชานชาลาขวา เสียงสวนต้องมาทางซ้าย
                                }
                            }
                            window.playPassingTrain("passing", panDirection, 0.5, () => {}, state.currentSpeed + p.speed, true);
                        }
                    }
                }

                // การได้ยินเสียงแตรของเพื่อน
                if (p.isHonking && distMeters <= 2000) { // ได้ยินในระยะ 2 กม.
                    if (now - this.remotePlayers[p.id].lastHonkTime > 1000) { // หน่วงกันสแปมแตร
                        this.remotePlayers[p.id].lastHonkTime = now;
                        this.playRemoteHorn(distMeters, p.dir === job.selectedDir ? 0 : 1);
                    }
                }
                
                // รีเซ็ตการประกาศถ้าวิ่งห่างออกไปเกิน 1 กม.
                if (distMeters > 1000) {
                    this.remotePlayers[p.id].announced = false;
                    this.remotePlayers[p.id].passed = false;
                }
            });
        });

        this.socket.on('disconnect', () => {
            console.log("Disconnected from Multiplayer Server.");
        });
    },

    setHonking: function(honking) {
        this.isHonking = honking;
        // บังคับส่งข้อมูลทันทีที่มีการกดหรือปล่อยแตร
        this.forceEmit();
    },

    forceEmit: function() {
        if (!this.socket || !this.socket.connected) return;
        const state = window.TrainState;
        const job = window.JobSystem;
        
        if (!state || !job || !job.selectedLine) return;

        this.socket.emit('update_state', {
            playerName: this.playerName,
            trainNumber: job.currentTrain ? job.currentTrain.name : 'Unknown',
            line: job.selectedLine,
            dir: job.selectedDir,
            odo: job.odo,
            speed: state.currentSpeed,
            isHonking: this.isHonking
        });
        this.lastEmitTime = Date.now();
    },

    update: function(state, t, jobState) {
        if (!this.socket || !this.socket.connected) return;
        if (!jobState || !jobState.selectedLine) return;

        const now = Date.now();
        // ส่งข้อมูลเป็นระยะตามรอบ (5 ครั้งต่อวินาที)
        if (now - this.lastEmitTime > this.emitInterval) {
            this.forceEmit();
        }
    },

    playRemoteHorn: function(distMeters, panDirection) {
        if (!window.audioContext) return;
        const ctx = window.audioContext;
        
        // คำนวณความดังตามระยะทาง (ใกล้ = ดัง, ไกล = เบา)
        // สูงสุดที่ระยะ 0 เมตร = 1.0, ต่ำสุดที่ 2000 เมตร = 0.05
        let vol = 1.0 - (distMeters / 2000);
        if (vol < 0.05) vol = 0.05;
        if (vol > 1.0) vol = 1.0;

        // คำนวณทิศทางเสียงอิงจากชานชาลาปัจจุบัน
        let pan = 0.0;
        if (panDirection === 1) { // ถ้ารถสวน
            pan = 0.8; // ค่าเริ่มต้น เสียงมาทางขวา
            const stnSystem = window.StationSystem;
            if (stnSystem && stnSystem.currentRouteList) {
                const currentStn = stnSystem.currentRouteList[stnSystem.currentIndex];
                if (currentStn && currentStn.doorSide === 'right') {
                    pan = -0.8; // ถ้าเราจอดชานชาลาขวา เสียงสวนต้องมาทางซ้าย
                }
            }
        }

        // ใช้ระบบสร้างเสียงแตรจำลอง (หรือเล่นไฟล์แตรถ้ามีฟังก์ชัน)
        if (window.playOneShot) {
            // ถ้าระบบเกมมีไฟล์เสียง horn ให้ใช้
            // แต่เนื่องจากมันต้องคำนวณ Pan/Volume เราจะใช้ Web Audio API โดยตรงหรือฟังก์ชันที่เกมรองรับ
        }

        // สร้างเสียงแตรแบบ Panning
        const sys = window.AudioSystem;
        if (!sys || !sys.buffers || !sys.buffers['horn']) return;

        const source = ctx.createBufferSource();
        source.buffer = sys.buffers['horn'];
        
        const gainNode = ctx.createGain();
        gainNode.gain.value = vol * (window.AudioSystem.volume || 1.0);

        const panner = ctx.createStereoPanner();
        panner.pan.value = pan;

        // สร้าง Lowpass filter สำหรับเสียงที่อยู่ไกล (ยิ่งไกลยิ่งทึบ)
        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 4000 - (distMeters * 1.5); // ไกลสุดเหลือประมาณ 1000Hz
        if (filter.frequency.value < 500) filter.frequency.value = 500;

        source.connect(filter).connect(panner).connect(gainNode).connect(ctx.destination);
        source.start(0);
    }
};
