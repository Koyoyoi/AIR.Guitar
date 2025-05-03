import { portOpen } from "./musicControll.js";

const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const soundMap = {};  // 儲存每個音高對應的 AudioBuffer

let soundSample;

// 載入 sample 音色
export async function loadSamples() {
    Soundfont.instrument(audioContext, 'acoustic_guitar_steel', {
        soundfont: 'FluidR3_GM',
    }).then(function (loadedPiano) {
        soundSample = loadedPiano;
    });

    console.log("Guitar samples loaded.");
}

const chordTab = {
    "": [0, 4, 7],   // Major
    "m": [0, 3, 7],  // minor
    "dim": [0, 3, 6] // Dim
};

export const rootTab = {
    "C": 0, "C#": 1, "D": 2, "D#": 3, "E": 4, "F": 5,
    "F#": 6, "G": 7, "G#": 8, "A": 9, "A#": 10, "B": 11
};
export const revRootTab = Object.fromEntries(
    Object.entries(rootTab).map(([k, v]) => [v, k])
);

const guitarStandard = [40, 45, 50, 55, 59, 64];
let outport = null;
let guitarChord = [], pluckNotes = []

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

// Build the guitar chord based on gesture (e.g., "C", "Cm", etc.)
export function buildGuitarChord(gesture) {
    const root = gesture[0];
    const chordType = gesture.slice(1);
    let findRoot = false;
    // Calculate the chord's notes based on root and chord type
    let chord = chordTab[chordType].map(i => (i + rootTab[root]) % 12);
    guitarChord = [];
    pluckNotes = [];
    // Iterate over each note in guitar standard tuning
    for (let note of guitarStandard) {
        let n = note % 12;

        // Calculate closest note to the current guitar string's note
        let closest = Math.min(...chord.map(i => {
            let diff = i - n;
            return diff < 0 ? diff + 12 : diff;
        })) + note;

        // Check if the closest note matches the root note
        if (closest % 12 === rootTab[root]) {
            findRoot = true;
        }

        if (findRoot) {
            guitarChord.push(closest);
        }
    }
    pluckNotes.push(guitarChord[0])
    pluckNotes.push(guitarChord[guitarChord.length - 3])
    pluckNotes.push(guitarChord[guitarChord.length - 2])
    pluckNotes.push(guitarChord[guitarChord.length - 1])

    //console.log(guitarChord);
    //console.log(pluckNotes)
}


function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Plucking (playing notes) function
export async function plucking(pluck, capo, velocities) {
    let notes = [];
    const noteSequence = { notes: [], totalTime: 0 }
    console.log("Plucking notes:", pluck);
    pluck.forEach((p, i) => {
        notes.push([pluckNotes[p], velocities[i]]);
    });
    if (audioContext.state === 'suspended') {
        audioContext.resume(); // 恢復 AudioContext（瀏覽器的音頻政策要求）
        console.log('AudioContext 已恢復');
    }

    // 如果沒有 MIDI 設備 (outport 沒有設定)，使用 Web Audio 播放音檔
    if (!portOpen) {
        for (let [note, velocity] of notes) {
            const midiNote = note + capo;

            try {
                // 播放音符（立即播放，持續 1 秒）
                soundSample.play(midiNote, audioContext.currentTime, { gain: velocity / 127 * 2, duration: 1 });
                console.log(`播放音符：${midiNote}, 音量：${velocity}`);
            } catch (err) {
                console.error("播放音符時發生錯誤:", err);
            }
        }
    } else if (outport) {
        // 發送 MIDI 訊號 (如果有 MIDI 設備)
        notes.forEach(([note, velocity]) => {
            outport.send([0x90, note + capo, velocity]); // 發送 note_on 訊號
        });

        // 使用 setTimeout 模擬 sleep 時間，控制 note_off 時間
        setTimeout(() => {
            notes.forEach(([note]) => {
                outport.send([0x90, note + capo, 0]); // 發送 note_off 訊號
            });
        }, 1000);  // 持續時間轉換為毫秒
    } else { console.log('midi port no device.') }
}

// Strumming function
export async function strumming(direction, capo, duration) {
    let sturmOrder = direction === 'Up' ? guitarChord.slice().reverse() : guitarChord;
    console.log(`direction: ${direction} with duration: ${duration}ms`);

    duration = Math.floor(duration) * 4 / sturmOrder.length;

    // 如果沒有 MIDI 設備 (outport 沒有設定)，使用 Web Audio 播放音檔
    if (!portOpen) {
        for (let n of sturmOrder) {
            piano.play(n + capo, audioContext.currentTime, { gain: 1.5 }); 
            await sleep(duration); 
        }
    } else if (outport) {
        // 如果有 MIDI 設備，發送 MIDI 訊號
        for (let n of sturmOrder) {
            outport.send([0x90, n + capo, 127]); // note_on
            await sleep(duration);
        }

        // note_off with delay
        for (let n of sturmOrder) {
            outport.send([0x80, n + capo, 0]); // note_off
            await sleep(duration * 1.5);
        }
    } else { console.log('midi port no device.') }
}


export function mapRange(value, inMin, inMax, outMin, outMax) {
    value = Math.max(inMin, Math.min(value, inMax)); // 限制在範圍內

    const ratio = (value - inMin) / (inMax - inMin);
    return outMin + (outMax - outMin) * ratio;
}
