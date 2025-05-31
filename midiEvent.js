import { noteSeq, stringSeq, lyricSeq, resetSeq } from "./Draw/drawMIDI.js";
import { midiApp } from "./main.js";
import { mapRange, guitarStandard } from "./sound.js";

export let tempo = 0;

export async function midiProcess(file) {
    if (!file.name.toLowerCase().endsWith(".mid") && !file.name.toLowerCase().endsWith(".midi")) {
        alert("請上傳 MIDI 檔案！");
        return;
    }

    const songName = file.name.replace(/\.mid(i)?$/i, "");
    console.log("檔案名稱:", songName);
    resetSeq();

    const arrayBuffer = await file.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type: "audio/midi" });
    const noteSeq = await mm.blobToNoteSequence(blob);
    noteSeq.notes.sort((a, b) => a.startTime - b.startTime);

    tempo = noteSeq.tempos?.[0]?.qpm || 120;
    const ticksPerQuarter = noteSeq.ticksPerQuarter || 480;

    console.log(tempo)

    renderNotes(noteSeq);
    renderLyrics(arrayBuffer, ticksPerQuarter, tempo);
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

// 根據 NoteSequence 繪製音符動畫
function renderNotes(noteSeq) {
    const xMap = new Map();
    let i = 0;
    const initX = noteSeq.notes[0]?.startTime || 0;
    const baseSpacing = 200;
    const timeScale = 80;
    let prevStartTime = initX;

    for (const note of noteSeq.notes) {
        const { pitch, velocity, startTime, endTime, isDrum } = note;
        if (pitch < 21 || pitch > 108 || isDrum) continue;

        if (!xMap.has(startTime)) {
            const offset = (startTime - prevStartTime) * timeScale;
            const xPos = 185 + i * baseSpacing + offset;
            xMap.set(startTime, xPos);
            prevStartTime = startTime;
            i++;
        }

        animateSeq(
            pitch,
            velocity,
            endTime - startTime,
            xMap.get(startTime)
        );
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
