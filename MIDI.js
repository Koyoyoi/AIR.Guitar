import { capo } from "./musicControll.js";

const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const soundMap = {};  // 儲存每個音高對應的 AudioBuffer

// 載入吉他音色樣本 (即 MIDI 音符範圍)
export async function loadSamples() {
    const notesToLoad = Array.from({ length: 56 }, (_, i) => i + 28); // 28~83

    // 使用 Promise.all 同時載入所有音色樣本
    await Promise.all(notesToLoad.map(async (note) => {
        const response = await fetch(`./Sounds_m4a/guitar/${note}.m4a`);
        const arrayBuffer = await response.arrayBuffer();
        soundMap[note] = await audioContext.decodeAudioData(arrayBuffer);
    }));

    console.log("Guitar samples loaded.");
}

// 吉他和弦的基本結構（大調、小調、減調）
const chordTab = {
    "": [0, 4, 7],   // Major (大調)
    "m": [0, 3, 7],  // minor (小調)
    "dim": [0, 3, 6] // Dim (減七調)
};

// 根音對應的 MIDI 音符
export const rootTab = {
    "C": 0, "C#": 1, "D": 2, "D#": 3, "E": 4, "F": 5,
    "F#": 6, "G": 7, "G#": 8, "A": 9, "A#": 10, "B": 11
};

// 反向根音表：將數字對應的音符名稱轉換回來
export const revRootTab = Object.fromEntries(
    Object.entries(rootTab).map(([k, v]) => [v, k])
);

// 吉他標準調音的 MIDI 音符
const guitarStandard = [40, 45, 50, 55, 59, 64];
let outport = null;  // MIDI 輸出端口
let guitarChord = [], pluckNotes = [];

// 初始化 MIDI
export async function initMIDI() {
    return navigator.requestMIDIAccess()  // 請求 MIDI 訪問權限
        .then((midiAccess) => {
            console.log("MIDI ready!");

            let outputs = midiAccess.outputs;
            if (outputs.size > 0) {
                console.log("MIDI Output Devices:");
                outputs.forEach((outputDevice, key) => {
                    console.log(key, outputDevice.name);  // 顯示所有可用的 MIDI 輸出設備
                });
                outport = outputs.values().next().value; // 設定為第一個 MIDI 輸出設備
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

// 根據手勢建構吉他和弦 (例如 "C", "Cm" 等)
export function buildGuitarChord(gesture) {
    const root = gesture[0];  // 根音
    const chordType = gesture.slice(1);  // 和弦類型（例如 "m" 代表小調）
    let findRoot = false;

    // 計算和弦的音符
    let chord = chordTab[chordType].map(i => (i + rootTab[root]) % 12);
    guitarChord = [];
    pluckNotes = [];

    // 根據吉他的標準調音，找出與和弦匹配的音符
    for (let note of guitarStandard) {
        let n = note % 12;

        // 計算每根弦最接近和弦音符的音高
        let closest = Math.min(...chord.map(i => {
            let diff = i - n;
            return diff < 0 ? diff + 12 : diff;
        })) + note;

        if (closest % 12 === rootTab[root]) {
            findRoot = true;
        }

        if (findRoot) {
            guitarChord.push(closest);
        }
    }

    // 確定Pluck需要彈奏的音符(Strumming 為全部)
    pluckNotes.push(guitarChord[0]);
    pluckNotes.push(guitarChord[guitarChord.length - 3]);
    pluckNotes.push(guitarChord[guitarChord.length - 2]);
    pluckNotes.push(guitarChord[guitarChord.length - 1]);

    // note array
    // console.log(guitarChord);
    // console.log(pluckNotes);
}

// 延遲函數
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// 播放sample
async function playSample(note, velocity, duration = 1000) {
    const sample = soundMap[note];
    if (sample) {
        const source = audioContext.createBufferSource();
        source.buffer = sample;
        const gainNode = audioContext.createGain();
        gainNode.gain.value = velocity / 127;  // 設置音量，範圍為 0 到 1
        source.connect(gainNode);
        gainNode.connect(audioContext.destination);

        source.start();
        setTimeout(() => {
            source.stop();
        }, duration);
    } else {
        console.log(`Sample for note ${note} not found.`);
    }
}

// 撥弦功能：根據撥弦的音符來播放
export async function plucking(pluck, velocities) {
    let notes = [];
    console.log("Plucking: ", pluck, "Velocities: ", velocities);
    pluck.forEach((p, i) => {
        notes.push([pluckNotes[p], velocities[i]]);
    });

    // 如果沒有 MIDI 設備 (outport 沒有設定)，使用 Web Audio 播放音檔
    if (!outport) {
        for (let [note, velocity] of notes) {
            await playSample(note + capo, velocity);
        }
    } else {
        // note_on 
        notes.forEach(([note, velocity]) => {
            outport.send([0x90, note + capo, velocity]);
        });

        // note_off
        setTimeout(() => {
            notes.forEach(([note]) => {
                outport.send([0x90, note + capo, 0]);
            });
        }, 1000);  // 控制音符結束時間
    }
}

// 掃弦功能：根據掃弦方向播放音符
export async function strumming(direction, diffAngle) {
  
    let strumOrder = direction === 'Up' ? guitarChord.slice().reverse() : guitarChord;
    let duration = Math.floor(await mapRange(Math.abs(diffAngle), 3, 15, 125, 1)) * 4 / strumOrder.length; // 計算撥弦的持續時間
   
    console.log(`Strumming in direction: ${direction} with duration: ${duration}ms`);

    // 如果沒有 MIDI 設備 (outport 沒有設定)，使用 Web Audio 播放音檔
    if (!outport) {
        for (let n of strumOrder) {
            await playSample(n + capo, 127);
            await sleep(duration);
        }
    } else {
        // note_on
        for (let n of strumOrder) {
            outport.send([0x90, n + capo, 127]);
            await sleep(duration);
        }

        // note_off 
        for (let n of strumOrder) {
            outport.send([0x80, n + capo, 0]);
            await sleep(duration * 1.5);
        }
    }
}

// 數值範圍映射函數
export function mapRange(value, inMin, inMax, outMin, outMax) {
    value = Math.max(inMin, Math.min(value, inMax));  // 限制在範圍內

    const ratio = (value - inMin) / (inMax - inMin);
    return outMin + (outMax - outMin) * ratio;  // 返回映射後的數值
}