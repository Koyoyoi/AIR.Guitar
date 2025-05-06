import { portOpen, sampleName } from "./musicControll.js";  // 載入 MIDI 端口狀態與音色樣本名稱
import { animateSeq } from "./Draw/drawMIDI.js";

// 創建音頻上下文，處理音頻的播放
export const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
export let soundSample; // 儲存音色樣本
// 預設的樂器列表
export const instruments = [
    "acoustic_guitar_nylon", 
    "acoustic_guitar_steel", 
    "electric_guitar_jazz",
    "electric_guitar_clean", 
    "electric_guitar_muted", 
    "overdriven_guitar",
    "distortion_guitar", 
    "guitar_harmonics"
];
// 根音對應表
export const rootTab = {
    "C": 0, "C#": 1, "D": 2, "D#": 3, "E": 4, "F": 5,
    "F#": 6, "G": 7, "G#": 8, "A": 9, "A#": 10, "B": 11
};
// 反向根音對應表
export const revRootTab = Object.fromEntries(
    Object.entries(rootTab).map(([k, v]) => [v, k])
);
// 和弦類型表
const chordTab = {
    "": [0, 4, 7],   // Major 大調
    "m": [0, 3, 7],  // minor 小調
    "dim": [0, 3, 6] // Dim 減和弦
};

// 標準吉他音高（從低音弦到高音弦）
const guitarStandard = [40, 45, 50, 55, 59, 64];

let outport = null; // 儲存 MIDI 輸出端口
let guitarChord = [], pluckNotes = []; // 儲存吉他和弦與挑弦音符

// 初始化 MIDI 端口，獲取並設置第一個可用的 MIDI 輸出端口
export async function initMIDIPort() {
    loadSamples();
    return navigator.requestMIDIAccess()
        .then((midiAccess) => {
            // 確認 MIDI 訪問權限
            console.log("MIDI ready!");

            // 查找所有 MIDI 輸出裝置
            let outputs = midiAccess.outputs;
            if (outputs.size > 0) {
                console.log("MIDI Output Devices:");
                outputs.forEach((outputDevice, key) => {
                    console.log(key, outputDevice.name);  // 顯示每個輸出裝置的名稱
                });
                outport = outputs.values().next().value; // 設置為第一個輸出裝置
                return true;
            } else {
                console.log("No MIDI output devices found.");
                return false;
            }
        })
        .catch((err) => {
            console.error("MIDI access failed", err);
            return false;
        });
}

// Load the sound font
export async function loadSamples() {
    if (audioCtx.state === 'suspended') {
        await audioCtx.resume(); // 等待 AudioContext 恢復
        console.log('AudioContext 已啟用');
    }

    // 等待樂器載入完成
    soundSample = await Soundfont.instrument(audioCtx, instruments[sampleName], {
        soundfont: 'FluidR3_GM',
    });

    console.log(`${instruments[sampleName]} loaded.`);
}

// 根據手勢創建吉他和弦
export function buildGuitarChord(gesture) {
    const root = gesture[0]; // 取得根音
    const chordType = gesture.slice(1); // 取得和弦類型
    let findRoot = false;
    // 計算和弦的音符根據根音與和弦類型
    let chord = chordTab[chordType].map(i => (i + rootTab[root]) % 12);
    guitarChord = [];
    pluckNotes = [];
    // 遍歷每根吉他弦上的音符
    for (let note of guitarStandard) {
        let n = note % 12;

        // 計算與當前吉他弦音符最接近的音符
        let closest = Math.min(...chord.map(i => {
            let diff = i - n;
            return diff < 0 ? diff + 12 : diff;
        })) + note;

        // 檢查最接近的音符是否與根音匹配
        if (closest % 12 === rootTab[root]) {
            findRoot = true;
        }

        if (findRoot) {
            guitarChord.push(closest); // 記錄所有音符
        }
    }
    // 記錄挑弦音符（特定的吉他弦音符）
    pluckNotes.push(guitarChord[0]);  // 第一根弦音符
    pluckNotes.push(guitarChord[guitarChord.length - 3]); // 第三根弦音符
    pluckNotes.push(guitarChord[guitarChord.length - 2]); // 第二根弦音符
    pluckNotes.push(guitarChord[guitarChord.length - 1]); // 第四根弦音符
}

// 延遲函數，使用 Promise 模擬延遲時間
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// 撥弦函數，根據指定的音符與力度來播放音符
export async function plucking(pluck, capo, velocities) {
    let notes = [];

    const now = performance.now();
    pluck.forEach((p, i) => {
        notes.push([pluckNotes[p], velocities[i]]); // 播放的音符與對應的力度
    });

    if (!portOpen) {
        // 沒有 MIDI 設備時，使用 Web Audio 播放音符
        notes.forEach(([note, velocity]) => {
            const midiNote = note + capo; // 計算實際的 MIDI 音符
            soundSample.play(midiNote, audioCtx.currentTime, { gain: velocity / 127 * 3, duration: 1.5 });
            console.log(`音符：${midiNote}, 音量：${velocity}`);
           
            animateSeq(midiNote);

        });

    } else if (outport) {
        // 發送 MIDI 訊號 (如果有 MIDI 設備)
        notes.forEach(([note, velocity]) => {
            outport.send([0x90, note + capo, velocity]); // note_on 訊號
        });

        // note_off 信號
        setTimeout(() => {
            notes.forEach(([note]) => {
                outport.send([0x90, note + capo, 0]); // 停止音符
            });
        }, 1000);  // 持續時間轉換為毫秒
    } else { console.log('midi port no device.') }
}

// 掃弦函數，根據方向來掃弦並調整持續時間
export async function strumming(direction, capo, duration) {
    let sturmOrder = direction === 'Up' ? guitarChord.slice().reverse() : guitarChord;
    console.log(`方向: ${direction}，持續時間: ${duration}ms`);

    duration = Math.floor(duration) * 4 / sturmOrder.length;

    if (!portOpen) {
        // 沒有 MIDI 設備時，使用 Web Audio 播放音符
        for (let n of sturmOrder) {
            soundSample.play(n + capo, audioCtx.currentTime, { gain: 4, duration: 1 });
            await sleep(duration);
        }
    } else if (outport) {
        // 如果有 MIDI 設備，發送 MIDI 訊號
        for (let n of sturmOrder) {
            outport.send([0x90, n + capo, 127]); // note_on 訊號
            await sleep(duration);
        }

        for (let n of sturmOrder) {
            outport.send([0x80, n + capo, 0]); // note_off 訊號
            await sleep(duration * 1.5); // 音符的結束時間
        }
    } else { console.log('midi port no device.') }
}

// 範圍映射函數，將數值從一個範圍映射到另一個範圍
export function mapRange(value, inMin, inMax, outMin, outMax) {
    value = Math.max(inMin, Math.min(value, inMax)); // 限制數值在範圍內
    const ratio = (value - inMin) / (inMax - inMin); // 計算比例
    return outMin + (outMax - outMin) * ratio;       // 返回映射後的數值
}
