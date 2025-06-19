import { animateSeq } from "./midiEvent.js";
import { modeNum, portOpen, sampleNum } from "./Controll/blockControll.js"

export const audioCtx = new (window.AudioContext || window.webkitAudioContext)(); // 創建音頻處理播放
export let soundSample;                                                           // 儲存音色樣本
export let guitarChord = [], pluckNotes = [];                                     // 儲存吉他和弦與挑弦音符

// 預設的樂器列表
export const instruments = [
    "acoustic_guitar_nylon",
    "acoustic_guitar_steel",
    "electric_guitar_clean",
];

// 音高對應數字
export const note7Map = {
    0: '1', 1: '1#', 2: '2', 3: '2#', 4: '3', 5: '4',
    6: '4#', 7: '5', 8: '5#', 9: '6', 10: '6#', 11: '7'
};
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
export const guitarStandard = [40, 45, 50, 55, 59, 64]; // 標準吉他音高（從低音弦到高音弦）
let outport = null;                                     // 儲存 MIDI 輸出端口

// 初始化 MIDI 端口，獲取並設置第一個可用的 MIDI 輸出端口
export async function initMIDIPort() {
    await loadSamples();                                    // 等待音色樣本載入

    try {
        const midiAccess = await navigator.requestMIDIAccess();
        console.log("✅ MIDI ready!");

        const outputs = midiAccess.outputs;

        if (outputs.size > 0) {
            console.log("🎹 MIDI Output Devices:");
            outputs.forEach((outputDevice, key) => {
                console.log(`- [${key}] ${outputDevice.name}`);
            });

            // 取得第一個輸出裝置作為預設 outport
            outport = outputs.values().next().value;
            console.log(`🎵 Using output: ${outport.name}`);
        }
    } catch (error) {
        console.log("⚠️ No MIDI output devices found.");
    }
}

// Load the sound font
export async function loadSamples() {
    // 等待樂器載入完成
    soundSample = await Soundfont.instrument(audioCtx, instruments[sampleNum], {
        soundfont: 'FluidR3_GM',
    });

    if (audioCtx.state === 'suspended') {
        await audioCtx.resume(); // 等待 AudioContext 恢復
        console.log('AudioContext 已啟用');
    }

    console.log(`${instruments[sampleNum]} loaded.`);
}

// 根據手勢創建吉他和弦
export function buildGuitarChord(gesture) {
    const root = gesture[0];            // 取得根音
    const chordType = gesture.slice(1); // 取得和弦類型
    let findRoot = false;

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
    // pluckNotes.length = 4
    pluckNotes.push(guitarChord[0]);                      // 低音弦根音
    pluckNotes.push(guitarChord[guitarChord.length - 3]); // 第四弦音符
    pluckNotes.push(guitarChord[guitarChord.length - 2]); // 第五弦音符
    pluckNotes.push(guitarChord[guitarChord.length - 1]); // 第六弦音符
}

// 延遲函數
function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

// 撥弦函數
export async function plucking(pluck, capo, velocities) {
    let notes = [];

    if (modeNum == 0) {
        pluck.forEach((p, i) => {
            notes.push([pluckNotes[p], velocities[i]]); // 播放的音符與對應的力度
        });
    }

    if (!portOpen) {
        // 沒有 MIDI 設備時，使用 Web Audio 播放音符
        notes.forEach(([note, velocity]) => {
            soundSample.play(note + capo, audioCtx.currentTime, { gain: velocity / 127 * 3, duration: 1.5 });
            console.log(`音符：${note + capo}, 音量：${velocity}`);
            // 加入動畫隊列
            animateSeq(note);
        });

    } else if (outport) {
        // 發送 MIDI 訊號 (如果有 MIDI 設備)
        // note_on
        notes.forEach(([note, velocity]) => {
            outport.send([0x90, note + capo, velocity]);
            animateSeq(note);
        });

        // note_off 
        setTimeout(() => {
            notes.forEach(([note]) => {
                outport.send([0x90, note + capo, 0]);
            });
        }, 1000);  // 持續時間轉換為毫秒
    } else { console.log('midi port no device.') }
}

// 掃弦函數
export async function strumming(direction, capo, duration) {
    if (modeNum == 1) { return }

    let sturmOrder = direction === 'Up' ? guitarChord.slice().reverse() : guitarChord;
    console.log(`方向: ${direction}，持續時間: ${duration}ms`);

    duration = Math.floor(duration) * 4 / sturmOrder.length;

    if (!portOpen) {
        // 沒有 MIDI 設備時，使用 Web Audio 播放音符
        for (let n of sturmOrder) {
            soundSample.play(n + capo, audioCtx.currentTime, { gain: 4, duration: 1 });
            await sleep(duration);
            // 加入動畫隊列
            animateSeq(n);
        }
    } else if (outport) {
        // 如果有 MIDI 設備，發送 MIDI 訊號
        // note_on 
        for (let n of sturmOrder) {
            outport.send([0x90, n + capo, 127]);
            await sleep(duration);
            animateSeq(n);
        }
        // note_off 
        for (let n of sturmOrder) {
            outport.send([0x80, n + capo, 0]); 訊號
            await sleep(duration * 1.5);
        }
    } else { console.log('midi port no device.') }
}

// 範圍映射函數，將數值從一個範圍映射到另一個範圍
export function mapRange(value, inMin, inMax, outMin, outMax) {
    value = Math.max(inMin, Math.min(value, inMax)); // 限制數值在範圍內
    const ratio = (value - inMin) / (inMax - inMin); // 計算比例
    return outMin + (outMax - outMin) * ratio;       // 返回映射後的數值
}
