import { noteSeq, stringSeq, lyricSeq, resetSeq } from "./Draw/drawMIDI.js";
import { midiApp } from "./main.js";
import { mapRange, guitarStandard } from "./sound.js";

export let tempo = 0, songName = "";

let noteData, aryBuffer, tPerQuarter;

export async function midiProcess(file) {
    resetSeq();
    if (file != undefined) {
        if (!file.name.toLowerCase().endsWith(".mid") && !file.name.toLowerCase().endsWith(".midi")) {
            alert("請上傳 MIDI 檔案！");
            return;
        }

        songName = file.name.replace(/\.mid(i)?$/i, "");
        console.log("檔案名稱:", songName);


        aryBuffer = await file.arrayBuffer();
        const blob = new Blob([aryBuffer], { type: "audio/midi" });
        noteData = await mm.blobToNoteSequence(blob);
        noteData.notes.sort((a, b) => a.startTime - b.startTime);

        tempo = noteData.tempos?.[0]?.qpm || 120;
        tPerQuarter = noteData.ticksPerQuarter || 480;

        console.log(tempo)
    }

    renderNotes(noteData);
    renderLyrics(aryBuffer, tPerQuarter, tempo);
}

// 新增音符 / 歌詞 / 琴弦
export function animateSeq(context, velocity = 0, duration = 1.5, posX = midiApp.canvas.width * 0.8) {
    if (typeof context === 'number') {
        // 加入音符資料
        if (velocity > 0) {
            noteSeq.push({
                note: context, v: velocity, d: duration,
                x: posX, targetX: posX, vx: 0,
                y: mapRange(context, 24, 84, midiApp.canvas.height - 100, 100),
                r: mapRange(velocity, 60, 127, 10, 25),
                scale: 1, hit: false, hitTime: 0,
            });
        } else {
            // 琴弦擊打事件
            const validIndices = guitarStandard
                .map((note, idx) => ({ note, idx }))
                .filter(item => context >= item.note); // 只保留 context >= note

            if (validIndices.length > 0) {
                const closestIndex = validIndices.reduce((closest, curr) =>
                    Math.abs(curr.note - context) < Math.abs(closest.note - context) ? curr : closest
                ).idx;

                stringSeq[closestIndex] = { note: context, alpha: 1 };
            }
        }
    } else if (typeof context === 'string') {
        // 加入歌詞
        lyricSeq.push({ t: context, x: posX });
    }
}

function renderNotes(noteSeq) {
    if (!noteSeq || !Array.isArray(noteSeq.notes) || noteSeq.notes.length === 0) return;

    const pixelPerBeat = 200;               // 每拍的水平距離
    const secondsPerBeat = 60 / tempo;      // tempo 是 BPM
    const pixelPerSecond = pixelPerBeat / secondsPerBeat;
    const minSpacing = 50;

    const initTime = noteSeq.notes[0].startTime || 0;
    const timeToX = new Map();
    let prevX = 185;

    for (const note of noteSeq.notes) {
        const { pitch, velocity, startTime, endTime, isDrum } = note;

        if (pitch < 21 || pitch > 108 || isDrum) continue;
        if (typeof startTime !== 'number' || isNaN(startTime)) continue;

        // 取得該 startTime 對應的 x（若尚未紀錄，則計算新的）
        let x;
        if (timeToX.has(startTime)) {
            x = timeToX.get(startTime);
        } else {
            const rawX = 185 + (startTime - initTime) * pixelPerSecond;
            x = Math.max(prevX + minSpacing, rawX);  // 保證最小間距
            timeToX.set(startTime, x);               // 記錄下來供其他相同 startTime 使用
            prevX = x;                                // 更新上一個 X
        }

        const duration = endTime - startTime;
        if (duration <= 0) continue;

        animateSeq(pitch, velocity, duration, x);
    }
}



// 解析並顯示歌詞（使用 midi-parser-js）
function renderLyrics(arrayBuffer, ticksPerQuarter, tempo) {
    const midi = MidiParser.parse(new Uint8Array(arrayBuffer));
    const lyrics = [];

    midi.track.forEach(track => {
        let ticks = 0;
        track.event.forEach(event => {
            ticks += event.deltaTime;

            if (event.type === 0xFF && event.metaType === 0x05) {
                const text = typeof event.data === "string"
                    ? event.data
                    : new TextDecoder("utf-8").decode(new Uint8Array(event.data));

                const time = (ticks / ticksPerQuarter) * (60 / tempo);
                const last = lyrics[lyrics.length - 1];

                if (last && time - last.time < 0.3) {
                    last.text += text;
                    last.time = time;
                } else {
                    lyrics.push({ text, time });
                }
            }
        });
    });

    for (let i = 0; i < lyrics.length; i++) {
        const { text, time } = lyrics[i];
        console.log(`Lyric #${i}: ${text} at ${time.toFixed(3)}s`);
        animateSeq(text, 0, 0, time * 50); // 可根據需求調整 time scaling
    }
}
