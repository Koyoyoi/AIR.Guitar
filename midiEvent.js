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
export function animateSeq(context, posX = midiApp.canvas.width * 0.8) {
    if (Array.isArray(context)) {
        noteSeq.push(context)
    }
    else if (typeof context === 'number') {
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

    } else if (typeof context === 'string') {
        // 加入歌詞
        lyricSeq.push({ t: context, x: posX });
    }
}

function renderNotes(noteSeq) {
    if (!noteSeq || !Array.isArray(noteSeq.notes)) return [];

    const grouped = [];
    const groupMap = new Map();

    // 根據 startTime 分組
    for (const note of noteSeq.notes) {
        if (note.isDrum || typeof note.startTime !== 'number') continue;
        const t = note.startTime;

        if (!groupMap.has(t)) groupMap.set(t, []);
        groupMap.get(t).push({
            note: note.pitch,
            v: note.velocity,
            d: note.endTime - note.startTime,
            //y: mapRange(context, 24, 84, midiApp.canvas.height - 100, 100),
            r: mapRange(note.velocity, 60, 127, 10, 25),
        });
    }

    // 依照 startTime 排序，然後加入拍數間距資訊
    const sortedTimes = [...groupMap.keys()].sort((a, b) => a - b);
    let dx = 0
    for (let i = 0; i < sortedTimes.length; i++) {
        const group = groupMap.get(sortedTimes[i]);
        const nextTime = sortedTimes[i + 1];
        const currentTime = sortedTimes[i];

        const deltaBeats = nextTime !== undefined ? nextTime - currentTime : 0;

        // 插入時間資訊與動畫屬性到 group 最前面
        group.unshift({
            dltB: deltaBeats,
            scale: 1,
            hit: false,
            x: 185 + i * 150 + dx,
            vx: 0,
            targetX: 185 + i * 150 + dx,
        });

        dx = deltaBeats * 50
        animateSeq(group)
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
