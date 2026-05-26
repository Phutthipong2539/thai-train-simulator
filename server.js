require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const WebSocket = require('ws');
const https = require('https');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const cron = require('node-cron');
const nodemailer = require('nodemailer');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());
const port = process.env.PORT || 3000;

// Initialize Gemini
let genAI = null;
if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'ใส่_API_KEY_ของคุณที่นี่') {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
}

// Data for Northern Line (สายเหนือ)
const northernLine = {
    id: 'northern',
    name: 'สายเหนือ',
    stations: [
        { id: 'hua_lamphong', name: 'กรุงเทพ (หัวลำโพง)', distance: 0, audio: 'audio_hua_lamphong.mp3' },
        { id: 'ayutthaya', name: 'อยุธยา', distance: 71, audio: 'audio_ayutthaya.mp3' },
        { id: 'lopburi', name: 'ลพบุรี', distance: 133, audio: 'audio_lopburi.mp3' },
        { id: 'nakhon_sawan', name: 'นครสวรรค์', distance: 246, audio: 'audio_nakhon_sawan.mp3' },
        { id: 'phichit', name: 'พิจิตร', distance: 340, audio: 'audio_phichit.mp3' },
        { id: 'phitsanulok', name: 'พิษณุโลก', distance: 389, audio: 'audio_phitsanulok.mp3' },
        { id: 'uttaradit', name: 'อุตรดิตถ์', distance: 485, audio: 'audio_uttaradit.mp3' },
        { id: 'den_chai', name: 'เด่นชัย', distance: 533, audio: 'audio_den_chai.mp3' },
        { id: 'lampang', name: 'ลำปาง', distance: 642, audio: 'audio_lampang.mp3' },
        { id: 'lamphun', name: 'ลำพูน', distance: 729, audio: 'audio_lamphun.mp3' },
        { id: 'chiang_mai', name: 'เชียงใหม่', distance: 751, audio: 'audio_chiang_mai.mp3' }
    ],
    routes: [
        { id: 'bkk_cm', name: 'เที่ยวไป: กรุงเทพ - เชียงใหม่', station_ids: ['hua_lamphong', 'ayutthaya', 'lopburi', 'nakhon_sawan', 'phichit', 'phitsanulok', 'uttaradit', 'den_chai', 'lampang', 'lamphun', 'chiang_mai'] },
        { id: 'cm_bkk', name: 'เที่ยวกลับ: เชียงใหม่ - กรุงเทพ', station_ids: ['chiang_mai', 'lamphun', 'lampang', 'den_chai', 'uttaradit', 'phitsanulok', 'phichit', 'nakhon_sawan', 'lopburi', 'ayutthaya', 'hua_lamphong'] }
    ],
    schedule: [
        { train_no: '9', route_id: 'bkk_cm', departure_time: '18:10', arrival_time: '07:15', stations: [
            { station_id: 'hua_lamphong', departure: '18:10' },
            { station_id: 'ayutthaya', arrival: '19:25', departure: '19:27' },
            { station_id: 'lopburi', arrival: '20:42', departure: '20:44' },
            { station_id: 'nakhon_sawan', arrival: '22:15', departure: '22:18' },
            { station_id: 'phitsanulok', arrival: '00:30', departure: '00:35' },
            { station_id: 'uttaradit', arrival: '02:00', departure: '02:03' },
            { station_id: 'den_chai', arrival: '03:10', departure: '03:13' },
            { station_id: 'lampang', arrival: '04:55', departure: '05:00' },
            { station_id: 'lamphun', arrival: '06:45', departure: '06:47' },
            { station_id: 'chiang_mai', arrival: '07:15' }
        ]},
        { train_no: '10', route_id: 'cm_bkk', departure_time: '18:00', arrival_time: '06:50', stations: [
            { station_id: 'chiang_mai', departure: '18:00' },
            { station_id: 'lamphun', arrival: '18:25', departure: '18:27' },
            { station_id: 'lampang', arrival: '20:10', departure: '20:15' },
            { station_id: 'den_chai', arrival: '22:00', departure: '22:03' },
            { station_id: 'uttaradit', arrival: '23:10', departure: '23:13' },
            { station_id: 'phitsanulok', arrival: '00:40', departure: '00:45' },
            { station_id: 'nakhon_sawan', arrival: '02:50', departure: '02:53' },
            { station_id: 'lopburi', arrival: '04:20', departure: '04:22' },
            { station_id: 'ayutthaya', arrival: '05:35', departure: '05:37' },
            { station_id: 'hua_lamphong', arrival: '06:50' }
        ]}
    ]
};

// Data for Northeastern Line (สายอีสาน)
const northeasternLine = {
    id: 'northeastern',
    name: 'สายอีสาน',
    stations: [
        { id: 'hua_lamphong', name: 'กรุงเทพ (หัวลำโพง)', distance: 0, audio: 'audio_hua_lamphong.mp3' },
        { id: 'ayutthaya', name: 'อยุธยา', distance: 71, audio: 'audio_ayutthaya.mp3' },
        { id: 'saraburi', name: 'สระบุรี', distance: 113, audio: 'audio_saraburi.mp3' },
        { id: 'kaeng_khoi', name: 'ชุมทางแก่งคอย', distance: 125, audio: 'audio_kaeng_khoi.mp3' },
        { id: 'pak_chong', name: 'ปากช่อง', distance: 180, audio: 'audio_pak_chong.mp3' },
        { id: 'nakhon_ratchasima', name: 'นครราชสีมา', distance: 264, audio: 'audio_nakhon_ratchasima.mp3' },
        { id: 'buri_ram', name: 'บุรีรัมย์', distance: 376, audio: 'audio_buri_ram.mp3' },
        { id: 'surin', name: 'สุรินทร์', distance: 420, audio: 'audio_surin.mp3' },
        { id: 'si_sa_ket', name: 'ศรีสะเกษ', distance: 515, audio: 'audio_si_sa_ket.mp3' },
        { id: 'ubon_ratchathani', name: 'อุบลราชธานี', distance: 575, audio: 'audio_ubon_ratchathani.mp3' }
    ],
    routes: [
        { id: 'bkk_ubon', name: 'เที่ยวไป: กรุงเทพ - อุบลราชธานี', station_ids: ['hua_lamphong', 'ayutthaya', 'saraburi', 'kaeng_khoi', 'pak_chong', 'nakhon_ratchasima', 'buri_ram', 'surin', 'si_sa_ket', 'ubon_ratchathani'] },
        { id: 'ubon_bkk', name: 'เที่ยวกลับ: อุบลราชธานี - กรุงเทพ', station_ids: ['ubon_ratchathani', 'si_sa_ket', 'surin', 'buri_ram', 'nakhon_ratchasima', 'pak_chong', 'kaeng_khoi', 'saraburi', 'ayutthaya', 'hua_lamphong'] }
    ],
    schedule: [
        { train_no: '21', route_id: 'bkk_ubon', departure_time: '05:45', arrival_time: '14:00', stations: [
            { station_id: 'hua_lamphong', departure: '05:45' },
            { station_id: 'ayutthaya', arrival: '07:15', departure: '07:17' },
            { station_id: 'saraburi', arrival: '08:00', departure: '08:02' },
            { station_id: 'kaeng_khoi', arrival: '08:15', departure: '08:18' },
            { station_id: 'pak_chong', arrival: '09:20', departure: '09:23' },
            { station_id: 'nakhon_ratchasima', arrival: '10:45', departure: '10:55' },
            { station_id: 'buri_ram', arrival: '12:10', departure: '12:12' },
            { station_id: 'surin', arrival: '12:45', departure: '12:47' },
            { station_id: 'si_sa_ket', arrival: '13:25', departure: '13:27' },
            { station_id: 'ubon_ratchathani', arrival: '14:00' }
        ]},
        { train_no: '22', route_id: 'ubon_bkk', departure_time: '14:50', arrival_time: '22:35', stations: [
            { station_id: 'ubon_ratchathani', departure: '14:50' },
            { station_id: 'si_sa_ket', arrival: '15:25', departure: '15:27' },
            { station_id: 'surin', arrival: '16:05', departure: '16:07' },
            { station_id: 'buri_ram', arrival: '16:40', departure: '16:42' },
            { station_id: 'nakhon_ratchasima', arrival: '17:55', departure: '18:05' },
            { station_id: 'pak_chong', arrival: '19:25', departure: '19:28' },
            { station_id: 'kaeng_khoi', arrival: '20:30', departure: '20:33' },
            { station_id: 'saraburi', arrival: '20:45', departure: '20:47' },
            { station_id: 'ayutthaya', arrival: '21:30', departure: '21:32' },
            { station_id: 'hua_lamphong', arrival: '22:35' }
        ]}
    ]
};

// Data for Eastern Line (สายตะวันออก)
const easternLine = {
    id: 'eastern',
    name: 'สายตะวันออก',
    stations: [
        { id: 'hua_lamphong', name: 'กรุงเทพ (หัวลำโพง)', distance: 0, audio: 'audio_hua_lamphong.mp3' },
        { id: 'makkasan', name: 'มักกะสัน', distance: 5, audio: 'audio_makkasan.mp3' },
        { id: 'hua_mak', name: 'หัวหมาก', distance: 15, audio: 'audio_hua_mak.mp3' },
        { id: 'lat_krabang', name: 'ลาดกระบัง', distance: 28, audio: 'audio_lat_krabang.mp3' },
        { id: 'chachoengsao', name: 'ชุมทางฉะเชิงเทรา', distance: 61, audio: 'audio_chachoengsao.mp3' },
        { id: 'chonburi', name: 'ชลบุรี', distance: 107, audio: 'audio_chonburi.mp3' },
        { id: 'si_racha', name: 'ชุมทางศรีราชา', distance: 131, audio: 'audio_si_racha.mp3' },
        { id: 'pattaya', name: 'พัทยา', distance: 155, audio: 'audio_pattaya.mp3' },
        { id: 'ban_phlu_ta_luang', name: 'บ้านพลูตาหลวง', distance: 184, audio: 'audio_ban_phlu_ta_luang.mp3' }
    ],
    routes: [
        { id: 'bkk_plu', name: 'เที่ยวไป: กรุงเทพ - บ้านพลูตาหลวง', station_ids: ['hua_lamphong', 'makkasan', 'hua_mak', 'lat_krabang', 'chachoengsao', 'chonburi', 'si_racha', 'pattaya', 'ban_phlu_ta_luang'] },
        { id: 'plu_bkk', name: 'เที่ยวกลับ: บ้านพลูตาหลวง - กรุงเทพ', station_ids: ['ban_phlu_ta_luang', 'pattaya', 'si_racha', 'chonburi', 'chachoengsao', 'lat_krabang', 'hua_mak', 'makkasan', 'hua_lamphong'] }
    ],
    schedule: [
        { train_no: '283', route_id: 'bkk_plu', departure_time: '06:55', arrival_time: '11:20', stations: [
            { station_id: 'hua_lamphong', departure: '06:55' },
            { station_id: 'makkasan', arrival: '07:10', departure: '07:12' },
            { station_id: 'hua_mak', arrival: '07:25', departure: '07:27' },
            { station_id: 'lat_krabang', arrival: '07:45', departure: '07:47' },
            { station_id: 'chachoengsao', arrival: '08:30', departure: '08:35' },
            { station_id: 'chonburi', arrival: '09:40', departure: '09:42' },
            { station_id: 'si_racha', arrival: '10:10', departure: '10:12' },
            { station_id: 'pattaya', arrival: '10:40', departure: '10:42' },
            { station_id: 'ban_phlu_ta_luang', arrival: '11:20' }
        ]},
        { train_no: '284', route_id: 'plu_bkk', departure_time: '13:35', arrival_time: '18:15', stations: [
            { station_id: 'ban_phlu_ta_luang', departure: '13:35' },
            { station_id: 'pattaya', arrival: '14:15', departure: '14:17' },
            { station_id: 'si_racha', arrival: '14:45', departure: '14:47' },
            { station_id: 'chonburi', arrival: '15:15', departure: '15:17' },
            { station_id: 'chachoengsao', arrival: '16:20', departure: '16:25' },
            { station_id: 'lat_krabang', arrival: '17:05', departure: '17:07' },
            { station_id: 'hua_mak', arrival: '17:25', departure: '17:27' },
            { station_id: 'makkasan', arrival: '17:40', departure: '17:42' },
            { station_id: 'hua_lamphong', arrival: '18:15' }
        ]}
    ]
};

const lines = [northernLine, northeasternLine, easternLine];

// API Endpoints
app.get('/api/lines', (req, res) => {
    res.json(lines.map(line => ({ id: line.id, name: line.name })));
});

app.get('/api/stations/:lineId', (req, res) => {
    const line = lines.find(l => l.id === req.params.lineId);
    if (line) {
        res.json(line.stations);
    } else {
        res.status(404).send('Line not found');
    }
});

app.get('/api/routes/:lineId', (req, res) => {
    const line = lines.find(l => l.id === req.params.lineId);
    if (line) {
        res.json(line.routes);
    } else {
        res.status(404).send('Line not found');
    }
});

app.get('/api/schedule/:lineId', (req, res) => {
    const line = lines.find(l => l.id === req.params.lineId);
    if (line) {
        res.json(line.schedule);
    } else {
        res.status(404).send('Line not found');
    }
});

// Placeholder for audio version and specific station audio
// In a real application, these would serve actual audio files or metadata
app.get('/api/audio/version', (req, res) => {
    res.json({ version: '1.0.0' }); // Example audio version
});

app.get('/api/audio/:stationId', (req, res) => {
    // In a real application, this would return the audio file for the station
    // For now, we'll just return a placeholder indicating the audio file name
    const stationId = req.params.stationId;
    let audioFileName = null;
    for (const line of lines) {
        const station = line.stations.find(s => s.id === stationId);
        if (station) {
            audioFileName = station.audio;
            break;
        }
    }

    if (audioFileName) {
        res.json({ stationId: stationId, audioFile: audioFileName });
    } else {
        res.status(404).send('Station audio not found');
    }
});

// AI Radio Endpoint
app.post('/api/radio/chat', async (req, res) => {
    try {
        if (!genAI) {
            return res.json({ reply: "ศูนย์ควบคุมขัดข้อง ไม่สามารถเชื่อมต่อระบบปัญญาประดิษฐ์ได้ กรุณาตรวจสอบ API Key วอสอง เปลี่ยน" });
        }
        
        const { text, trainNumber, speed, location, channel } = req.body;
        
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        const prompt = `คุณคือพนักงานศูนย์ควบคุมการเดินรถไฟไทย (Control Center) ชื่อ "ศูนย์ควบคุม"
คุณกำลังติดต่อกับพนักงานขับรถไฟผ่านวิทยุสื่อสารช่อง ${channel}
ข้อมูลปัจจุบันของขบวนรถที่ติดต่อมา:
- ขบวนที่: ${trainNumber || 'ไม่ระบุ'}
- ความเร็วปัจจุบัน: ${speed || 0} กม./ชม.
- ตำแหน่ง/สถานะ: ${location || 'ไม่ระบุ'}

ข้อความที่คนขับ (ผู้เล่น) ส่งมา (อาจมีการสะกดผิดจากเสียงพูด เช่น "วอ" แทนคำว่า "ว."): "${text}"

คำแนะนำในการตอบ:
1. คุณต้องตอบกลับให้ตรงกับที่คนขับแจ้งมา ตอบให้สั้น กระชับ (ไม่เกิน 2-3 ประโยค) แบบวิทยุสื่อสาร ห้ามเยิ่นเย้อ
2. ใช้ภาษาและคำศัพท์การเดินรถไฟ (เช่น ทางสะดวก, รอสับหลีก, รับทราบ, วอสอง)
3. เข้าใจรหัสวิทยุ (ว.) แม้จะพิมพ์มาว่า "วอ" เช่น:
   - ว.1 (วอ 1) = อยู่ไหน / ขอทราบตำแหน่ง
   - ว.2 (วอ 2) = ได้ยินไหม / ตอบรับว่าได้ยิน
   - ว.4 (วอ 4) = ออกปฏิบัติหน้าที่ / ขับรถ
   - ว.8 (วอ 8) = รายงานข้อความ / ขอรายงาน
   - ว.9 (วอ 9) = มีเหตุฉุกเฉิน
   - ว.16 (วอ 16) = ทดสอบสัญญาณวิทยุ
   - ว.61 (วอ 61) = ขอบคุณ
   - ว.601 (วอ 601) = มาพบ / ขอพบ
4. หากคนขับรายงานว่าถึงสถานี หรือผ่านสถานี ให้ตอบรับเช่น "ศูนย์ควบคุมรับทราบ ทางสะดวก เปลี่ยน" หรือ "รับทราบ แจ้งสถานีต่อไปเมื่อถึง เปลี่ยน"
5. หากคนขับขอทาง หรือขอสับหลีก ให้ตอบว่า "ทางสะดวก เดินรถได้ เปลี่ยน" หรือ "รอสับหลีกสักครู่ เปลี่ยน"
6. ลงท้ายประโยคด้วยคำว่า "เปลี่ยน" เสมอ
7. ห้ามพิมพ์อิโมจิหรือคำทักทายที่ไม่จำเป็น (ห้าม สวัสดี, ห้าม ครับ/ค่ะ พร่ำเพรื่อ)
8. สมมติบทบาทให้สมจริงที่สุด ถ้าคนขับพูดอะไรไม่รู้เรื่อง ให้ตอบว่า "สัญญาณขาดหาย ขอ ว.3 ทวนข้อความอีกครั้ง เปลี่ยน"`;
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const textResponse = response.text().trim();
        
        res.json({ reply: textResponse });
    } catch (error) {
        console.error("AI Error:", error);
        res.json({ reply: "สัญญาณวิทยุขัดข้อง ศูนย์ควบคุมไม่สามารถประมวลผลได้ สัญญาณขาดหาย เปลี่ยน" });
    }
});

// ====== SERVER-SIDE TTS ENDPOINT ======
// สังเคราะห์เสียงผ่าน Microsoft Edge Neural TTS (ใช้ wss:// และ ws package)
// รองรับการปรับโทนเสียง (pitch) ความเร็ว (rate) และโปรไฟล์เสียงอย่างสมบูรณ์แบบ
// เสียงผู้ชาย: th-TH-PremwutNeural
// เสียงผู้หญิง: th-TH-AcharaNeural

const crypto = require('crypto');

function fetchEdgeTTS(text, voice, pitch, rate) {
    return new Promise((resolve, reject) => {
        const reqId = crypto.randomBytes(16).toString('hex').toLowerCase();
        const connectId = reqId;
        const wsUrl = `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=6A5AA1D4EAFF4E9FB3F2207D6D8EC96F&ConnectionId=${connectId}`;
        
        const ws = new WebSocket(wsUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
                'Pragma': 'no-cache',
                'Cache-Control': 'no-cache'
            }
        });

        let audioChunks = [];
        let isFinished = false;

        const timeout = setTimeout(() => {
            if (!isFinished) {
                isFinished = true;
                ws.close();
                reject(new Error('Edge TTS request timeout (10s)'));
            }
        }, 10000);

        ws.on('open', () => {
            const configMsg = `Content-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n{"context":{"system":{"name":"SpeechSDK","version":"1.30.0","build":"JavaScript","lang":"JavaScript","os":{"platform":"Browser/Web"}}}}`;
            ws.send(configMsg);

            const finalPitch = pitch || '+0Hz';
            const finalRate = rate || '+0%';

            const ssmlMsg = `Path:ssml\r\nContent-Type:application/ssml+xml\r\nX-RequestId:${reqId}\r\n\r\n<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='th-TH'><voice name='${voice}'><prosody pitch='${finalPitch}' rate='${finalRate}'><p><s xml:lang='th-TH'><t><text>${text}</t></s></p></prosody></voice></speak>`;
            ws.send(ssmlMsg);
        });

        ws.on('message', (data, isBinary) => {
            if (isBinary) {
                try {
                    if (data.length > 12) {
                        const headerLength = data.readUInt16BE(0);
                        const audioData = data.subarray(12 + headerLength);
                        if (audioData.length > 0) {
                            audioChunks.push(audioData);
                        }
                    }
                } catch (err) {
                    console.error("Error parsing binary frame:", err);
                }
            } else {
                const textStr = data.toString('utf8');
                if (textStr.includes('Path:turn.end')) {
                    isFinished = true;
                    clearTimeout(timeout);
                    ws.close();
                    if (audioChunks.length > 0) {
                        resolve(Buffer.concat(audioChunks));
                    } else {
                        reject(new Error('No audio chunks received from Edge TTS'));
                    }
                }
            }
        });

        ws.on('error', (err) => {
            if (!isFinished) {
                isFinished = true;
                clearTimeout(timeout);
                reject(err);
            }
        });

        ws.on('close', () => {
            if (!isFinished) {
                isFinished = true;
                clearTimeout(timeout);
                if (audioChunks.length > 0) {
                    resolve(Buffer.concat(audioChunks));
                } else {
                    reject(new Error('WebSocket closed without receiving audio'));
                }
            }
        });
    });
}

// TTS endpoint - รับ POST จาก client และคืนไฟล์เสียง MP3
app.post('/api/tts', async (req, res) => {
    try {
        const { text, voice, pitch, rate } = req.body;
        if (!text) return res.status(400).json({ error: 'text required' });

        const voiceName = voice || 'th-TH-PremwutNeural';
        let mp3Buffer;
        
        try {
            console.log(`[TTS] Requesting Edge TTS: "${text}" with voice "${voiceName}", pitch "${pitch}", rate "${rate}"`);
            mp3Buffer = await fetchEdgeTTS(text, voiceName, pitch, rate);
        } catch (edgeErr) {
            console.error('[TTS] Edge TTS failed:', edgeErr.message);
            return res.status(500).json({ error: 'TTS failed', message: edgeErr.message });
        }

        res.set('Content-Type', 'audio/mpeg');
        res.set('Content-Length', mp3Buffer.length);
        res.send(mp3Buffer);
    } catch (err) {
        console.error('[TTS] Server-side TTS failed completely:', err);
        res.status(500).json({ error: 'TTS failed', message: err.message });
    }
});

// ====== SOCKET.IO MULTIPLAYER & ANALYTICS SYSTEM ======
const activePlayers = {};
const analyticsFile = 'analytics.json';

// โหลดสถิติปัจจุบัน (ถ้ามี)
let dailyAnalytics = {
    totalLogins: 0,
    peakConcurrent: 0,
    date: new Date().toLocaleDateString()
};

// ฟังก์ชันส่งอีเมล
async function sendAnalyticsEmail(analyticsData, isMissedReport = false) {
    const { GMAIL_USER, GMAIL_PASS, REPORT_RECEIVER } = process.env;
    if (!GMAIL_USER || !GMAIL_PASS || !REPORT_RECEIVER) {
        console.log("[Analytics] Email sending skipped: Missing Gmail config in .env");
        return;
    }
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: GMAIL_USER, pass: GMAIL_PASS }
        });
        const dateStr = analyticsData.date;
        const subjectPrefix = isMissedReport ? "[ส่งย้อนหลัง] " : "";
        const mailOptions = {
            from: `"Thai Train Simulator" <${GMAIL_USER}>`,
            to: REPORT_RECEIVER,
            subject: `${subjectPrefix}รายงานสถิติผู้เล่นเกม Thai Train ประจำวันที่ ${dateStr}`,
            html: `
                <h2>สถิติผู้เล่นประจำวันที่ ${dateStr}</h2>
                <ul>
                    <li><strong>ยอดเข้าเล่นเกมทั้งหมด (Total Logins):</strong> ${analyticsData.totalLogins} ครั้ง</li>
                    <li><strong>จำนวนผู้เล่นออนไลน์พร้อมกันสูงสุด (Peak CCU):</strong> ${analyticsData.peakConcurrent} คน</li>
                </ul>
                <p>ขอบคุณที่สร้างสรรค์เกมดีๆ ออกมาให้ทุกคนเล่นครับ! 🚂</p>
                <br>
                <small>รายงานสร้างอัตโนมัติจากเซิร์ฟเวอร์หลักของเกม</small>
            `
        };
        await transporter.sendMail(mailOptions);
        console.log(`[Analytics] Email sent successfully for ${dateStr}!`);
    } catch (err) {
        console.error("[Analytics] Error sending email:", err);
    }
}

try {
    if (fs.existsSync(analyticsFile)) {
        dailyAnalytics = JSON.parse(fs.readFileSync(analyticsFile, 'utf8'));
        // ถ้าระบบพึ่งเปิดแล้ววันที่เปลี่ยนไปแล้ว
        if (dailyAnalytics.date !== new Date().toLocaleDateString()) {
            // ถ้าเมื่อวานมีคนเล่น แต่ไม่ได้เปิดคอมตอน 2 ทุ่ม ให้ส่งย้อนหลังทันที
            if (dailyAnalytics.totalLogins > 0 || dailyAnalytics.peakConcurrent > 0) {
                console.log("[Analytics] Detected missed report from previous day. Sending now...");
                sendAnalyticsEmail(dailyAnalytics, true);
            }
            // รีเซ็ตยอดเป็นของวันใหม่
            dailyAnalytics = { totalLogins: 0, peakConcurrent: 0, date: new Date().toLocaleDateString() };
        }
    }
} catch (e) {
    console.error("Error loading analytics:", e);
}

function saveAnalytics() {
    fs.writeFileSync(analyticsFile, JSON.stringify(dailyAnalytics, null, 2));
}

io.on('connection', (socket) => {
    console.log(`[Multiplayer] Player connected: ${socket.id}`);
    
    // อัปเดตสถิติ
    dailyAnalytics.totalLogins += 1;
    const currentCCU = Object.keys(activePlayers).length + 1;
    if (currentCCU > dailyAnalytics.peakConcurrent) {
        dailyAnalytics.peakConcurrent = currentCCU;
    }
    saveAnalytics();
    
    socket.on('update_state', (data) => {
        activePlayers[socket.id] = {
            id: socket.id,
            ...data,
            lastUpdate: Date.now()
        };
        
        // Join line room
        if (data.line) socket.join(data.line);
        
        // Send other players' states back
        const others = Object.values(activePlayers).filter(p => p.id !== socket.id && p.line === data.line);
        if (others.length > 0) {
            socket.emit('players_state', others);
        }
    });

    socket.on('disconnect', () => {
        console.log(`[Multiplayer] Player disconnected: ${socket.id}`);
        delete activePlayers[socket.id];
    });
});

// Clean up stale players
setInterval(() => {
    const now = Date.now();
    for (const id in activePlayers) {
        if (now - activePlayers[id].lastUpdate > 5000) {
            delete activePlayers[id];
        }
    }
}, 5000);

// ====== GMAIL ANALYTICS REPORTER ======
// ส่งรายงานทุกๆ 20:00 น. ของทุกวัน (0 20 * * *)
cron.schedule('0 20 * * *', async () => {
    console.log("[Analytics] Preparing to send daily email report...");
    await sendAnalyticsEmail(dailyAnalytics, false);
    
    // รีเซ็ตยอดรายวันหลังจากส่งเสร็จ
    dailyAnalytics = { totalLogins: 0, peakConcurrent: 0, date: new Date().toLocaleDateString() };
    saveAnalytics();
});

server.listen(port, () => {
    console.log(`Server listening at port ${port} with Socket.io Multiplayer`);
});
