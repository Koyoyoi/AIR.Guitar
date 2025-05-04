import { draw_midiAnimation, draw_singleNote } from "./Draw/drawMIDI.js";
import { portOpen, sampleName } from "./musicControll.js";  // 從 musicControll.js 載入 portOpen 變數
import { noteSequence, canvas } from "./main.js";

export const audioContext = new (window.AudioContext || window.webkitAudioContext)(); // 創建音頻上下文
export let soundSample; // 儲存音色樣本
export const instruments = [
    "acoustic_guitar_nylon",
    "acoustic_guitar_steel",
    "electric_guitar_jazz",
    "electric_guitar_clean",
    "electric_guitar_muted",
    "overdriven_guitar",
    "distortion_guitar",
    "guitar_harmonics",]

// 和弦類型表
const chordTab = {
    "": [0, 4, 7],   // Major 大調
    "m": [0, 3, 7],  // minor 小調
    "dim": [0, 3, 6] // Dim 減和弦
};
// 根音對應表
export const rootTab = {
    "C": 0, "C#": 1, "D": 2, "D#": 3, "E": 4, "F": 5,
    "F#": 6, "G": 7, "G#": 8, "A": 9, "A#": 10, "B": 11
};
// 反向對應表
export const revRootTab = Object.fromEntries(
    Object.entries(rootTab).map(([k, v]) => [v, k])
);

const guitarStandard = [40, 45, 50, 55, 59, 64];  // 吉他標準調音
let outport = null;                               // 儲存 MIDI 輸出端口
let guitarChord = [], pluckNotes = []             // 儲存吉他和弦與挑弦音符

// 初始化 MIDI
export async function initMIDI() {
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

// 載入 sample 音色
export async function loadSamples() {
    Soundfont.instrument(audioContext, instruments[sampleName], {
        soundfont: 'FluidR3_GM', // 使用 FluidR3_GM SoundFont
    }).then(function (loadedPiano) {
        soundSample = loadedPiano; // 載入完成後，將音色樣本儲存
    });

    console.log(`${instruments[sampleName]} loaded.`);

    if (audioContext.state === 'suspended') {
        audioContext.resume(); // 恢復 AudioContext（瀏覽器的音頻政策要求）
        console.log('AudioContext 已啟用');
    }
}

// 根據手勢建立吉他和弦（例如 "C"、"Cm" 等）
export function buildGuitarChord(gesture) {
    const root = gesture[0];
    const chordType = gesture.slice(1);
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
            guitarChord.push(closest);
        }
    }
    pluckNotes.push(guitarChord[0])  // 第一根弦音符
    pluckNotes.push(guitarChord[guitarChord.length - 3]) // 第三根弦音符
    pluckNotes.push(guitarChord[guitarChord.length - 2]) // 第二根弦音符
    pluckNotes.push(guitarChord[guitarChord.length - 1]) // 第四根弦音符
}


// 延遲
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// 撥弦
export async function plucking(pluck, capo, velocities) {
    let notes = [];
   
    pluck.forEach((p, i) => {
        notes.push([pluckNotes[p], velocities[i]]); // 播放的音符與對應的力度
    });
    
    if (!portOpen) {
        for (let [note, velocity] of notes) {
            const midiNote = note + capo;
            
            soundSample.play(midiNote, audioContext.currentTime, { gain: velocity / 127 * 3, duration: 1.5 });
            console.log(`播放音符：${midiNote}, 音量：${velocity}`);
        }

    } else if (outport) {
        // 發送 MIDI 訊號 (如果有 MIDI 設備)
        // note_on
        notes.forEach(([note, velocity]) => {
            outport.send([0x90, note + capo, velocity]);
        });

        //  note_off 
        setTimeout(() => {
            notes.forEach(([note]) => {
                outport.send([0x90, note + capo, 0]);
            });
        }, 1000);  // 持續時間轉換為毫秒
    } else { console.log('midi port no device.') }
}

// 掃弦
export async function strumming(direction, capo, duration) {
    let sturmOrder = direction === 'Up' ? guitarChord.slice().reverse() : guitarChord;
    console.log(`direction: ${direction} with duration: ${duration}ms`);

    duration = Math.floor(duration) * 4 / sturmOrder.length;

    // 如果沒有 MIDI 設備 (outport 沒有設定)，使用 Web Audio 播放音檔
    if (!portOpen) {
        for (let n of sturmOrder) {
            soundSample.play(n + capo, audioContext.currentTime, { gain: 4, duration: 1 });
            await sleep(duration);
        }
    } else if (outport) {
        // 如果有 MIDI 設備，發送 MIDI 訊號
        // note_on
        for (let n of sturmOrder) {
            outport.send([0x90, n + capo, 127]);
            await sleep(duration);
        }

        // note_off 
        for (let n of sturmOrder) {
            outport.send([0x80, n + capo, 0]);
            await sleep(duration * 1.5);
        }
    } else { console.log('midi port no device.') }
}

// 範圍映射函數
export function mapRange(value, inMin, inMax, outMin, outMax) {
    value = Math.max(inMin, Math.min(value, inMax)); // 限制在範圍內

    const ratio = (value - inMin) / (inMax - inMin);
    return outMin + (outMax - outMin) * ratio; // 返回映射結果
}
