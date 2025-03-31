
const chordTab = {
    "": [0, 4, 7],   // Major
    "m": [0, 3, 7],  // minor
    "dim": [0, 3, 6] // Dim
};

const rootTab = {
    "C": 0, "C#": 1, "D": 2, "D#": 3, "E": 4, "F": 5,
    "F#": 6, "G": 7, "G#": 8, "A": 9, "A#": 10, "B": 11
};

const guitarStandard = [40, 45, 50, 55, 59, 64]; 
let outport = null;
let guitarChord = [], pluckNotes = []

// 初始化 MIDI
export function initMIDI() {
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

    console.log(guitarChord);
    console.log(pluckNotes)
}

// 發送 MIDI 訊號
// Plucking (playing notes) function
export async function plucking(pluck, capo, duration = 0.5) {
    
    let notes = []
    console.log(pluck)
    pluck.forEach(p => {
        notes.push(pluckNotes[p])
    })

    // 發送 note_on 訊號
    notes.forEach(n => {
        outport.send([0x90, n + capo, 127]);  // 0x90 表示 Note On 訊號，127 是音量
    });

    // 使用 setTimeout 模擬 sleep 時間，控制 note_off 時間
    setTimeout(() => {
         // 發送 note_off 訊號
        notes.forEach(n => {
            outport.send([0x80, n + capo, 0]);  // 0x80 表示 Note Off 訊號
        });
    }, duration * 2000);  // 持續時間轉換為毫秒
}


// Swapping (strumming) function
function strumming(direction, capo, duration = 0.1) {

    console.log(direction);
    let swapOrder = direction === 'Up' ? guitarChord.slice().reverse() : guitarChord;
        
    // note_on
    swapOrder.forEach(n => {
        outport.send([0x90, n + capo, 127]);
        setTimeout(() => {}, 75);  // Sleep for 75ms between notes
    });
        
    // note_off
    swapOrder.forEach(n => {
        outport.send([0x80, n + capo, 0]);
        setTimeout(() => {}, 200);  // Sleep for 200ms between notes
    });
}
