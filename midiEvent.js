import { noteSeq, stringSeq, resetSeq } from "./Draw/drawMIDI.js";
import { mapRange, guitarStandard, rootTab } from "./sound.js";
import { midiApp } from "./main.js";
import { closeSet } from "./Controll/blockControll.js";

export let tempo = 0, songName = "", key = 0;

let midiBfr, tickPQtr, groupMap, offset, noteData, initTime = 0;
const PREBEATS = 4;
const DEFAULT_NOTE = 84;
const DEFAULT_VELOCITY = 100;

const initLyric = ['預', '備', '起', '唱'];

/* ===================== */
/* MIDI 主流程            */
/* ===================== */

export async function midiProcess(file, title) {
    if (!file) {
        alert("尚未載入 MIDI 檔案！");
        return;
    }

    if (file !== 'reload') {
        if (file instanceof File) {
            songName = file.name.replace(/\.mid(i)?$/i, "");
            midiBfr = await file.arrayBuffer();
        } else if (file instanceof ArrayBuffer) {
            songName = title;
            midiBfr = file;
        } else {
            console.error("未知的 MIDI 輸入型態", file);
            return;
        }

        const blob = new Blob([midiBfr], { type: "audio/midi" });
        noteData = await mm.blobToNoteSequence(blob);
        noteData.notes.sort((a, b) => a.startTime - b.startTime);

        tempo = noteData.tempos?.[0]?.qpm || 60;
        tickPQtr = noteData.ticksPerQuarter || 480;

        closeSet();
        await renderNotes();
        await renderMetaData();
    } else {
        animateSeq(groupMap);
    }
}

/* ===================== */
/* 動畫資料注入            */
/* ===================== */

export async function animateSeq(context) {
    await resetSeq();

    if (context instanceof Map) {
        for (const values of context.values()) {
            noteSeq.push(values.map(v => ({ ...v })));
        }
    } else if (typeof context === 'number') {
        const closest = guitarStandard
            .map((note, idx) => ({ note, idx }))
            .filter(item => context >= item.note)
            .reduce((a, b) =>
                Math.abs(context - a.note) < Math.abs(context - b.note) ? a : b,
                { note: Infinity }
            );

        if (closest.idx !== undefined) {
            stringSeq[closest.idx] = { note: context, alpha: 1 };
        }
    }
}

/* ===================== */
/* pitch → color          */
/* ===================== */

export function pitchToColor(pitch, tone = 'G', range = 120) {
    let hue = (pitch / 127) * range;

    const toneOffsetMap = { G: 0, Y: 60, B: 120, C: 180, R: 240, M: 300 };
    if (toneOffsetMap[tone] !== undefined) hue += toneOffsetMap[tone];
    hue %= 360;

    const s = 1, l = 0.6;
    const k = n => (n + hue / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));

    const r = Math.round(f(0) * 255);
    const g = Math.round(f(8) * 255);
    const b = Math.round(f(4) * 255);

    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
}

/* ===================== */
/* Note 建立               */
/* ===================== */

async function renderNotes() {
    if (!noteData?.notes?.length) return;

    groupMap = new Map();
    offset = 0;

    const maxPitch = Math.max(...noteData.notes.map(n => n.pitch));
    const minPitch = Math.min(...noteData.notes.map(n => n.pitch));

    initTime = noteData.notes[0].startTime;

    for (const note of noteData.notes) {
        if (note.isDrum) continue;

        const start = note.startTime + offset;
        if (!groupMap.has(start)) groupMap.set(start, []);

        groupMap.get(start).push({
            note: note.pitch,
            v: note.velocity,
            d: note.endTime - note.startTime,
            y: mapRange(note.pitch, minPitch, maxPitch, midiApp.canvas.height - 300, 200),
            r: mapRange(note.velocity, 60, 127, 15, 40),
            startTime: note.startTime,
            lyric: "",
            color: 0xffffff
        });
    }

    const sortedTimes = [...groupMap.keys()].sort((a, b) => a - b);

    let posX = 185;
    sortedTimes.forEach((time, i) => {
        const group = groupMap.get(time);
        const nextTime = sortedTimes[i + 1];
        const deltaBeats = nextTime ? (nextTime - time) / 60 * tempo : 0;

        group.sort((a, b) => b.note - a.note);

        group.unshift({
            dltB: deltaBeats,
            x: posX,
            targetX: 185 + time * 120,
            lyric: "",
            vx: 18
        });

        posX += deltaBeats > 2 ? 400 :
            deltaBeats >= 0.5 ? deltaBeats * 200 : 100;
    });
}

/* ===================== */
/* 🔥 關鍵：歌詞對齊修正   */
/* ===================== */

function findClosestTime(target, times, tolerance = 0.08) {
    let closest = null;
    let minDiff = Infinity;

    for (const t of times) {
        const diff = Math.abs(t - target);
        if (diff < minDiff && diff <= tolerance) {
            minDiff = diff;
            closest = t;
        }
    }
    return closest;
}

async function renderMetaData() {
    const midi = MidiParser.parse(new Uint8Array(midiBfr));
    const groupTimes = [...groupMap.keys()].sort((a, b) => a - b);

    midi.track.forEach(track => {
        let ticks = 0;

        track.event.forEach(event => {
            ticks += event.deltaTime;

            /* === 歌詞 === */
            if (event.type === 0xFF && event.metaType === 0x05) {
                let text = "";
                try {
                    text = typeof event.data === "string"
                        ? decodeURIComponent(escape(event.data))
                        : Encoding.convert(new Uint8Array(event.data), {
                            to: 'UNICODE',
                            from: 'AUTO',
                            type: 'string'
                        });
                } catch {
                    return;
                }

                if (text === '\r') return;

                const time = (ticks / tickPQtr) * (60 / tempo) + offset;
                const closest = findClosestTime(time, groupTimes);

                if (closest !== null) {
                    groupMap.get(closest)[0].lyric = text;
                }
            }

            /* === Key === */
            if (event.type === 0xFF && event.metaType === 0x59) {
                const majorKeys = ["C♭","G♭","D♭","A♭","E♭","B♭","F","C","G","D","A","E","B","F♯","C♯"];
                const sf = new Int8Array([(event.data >> 8) & 0xFF])[0];
                const MajKey = majorKeys[sf + 7];

                key = MajKey[1] === '♭' ? rootTab[MajKey[0]] - 1 :
                      MajKey[1] === '♯' ? rootTab[MajKey[0]] + 1 :
                      rootTab[MajKey[0]];
            }
        });
    });

    animateSeq(groupMap);
}
