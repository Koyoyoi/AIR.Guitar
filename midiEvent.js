import { noteSeq, stringSeq, resetSeq } from "./Draw/drawMIDI.js";
import { mapRange, guitarStandard, rootTab } from "./sound.js";
import { midiApp } from "./main.js";
import { closeSet } from "./Controll/blockControll.js";

export let tempo = 0, songName = "", key = 0;

let midiBfr, tickPQtr, groupMap, offset, noteData, initTime = 0;
const PREBEATS = 4;
const DEFAULT_NOTE = 84;
const DEFAULT_VELOCITY = 100;

const initLyric = ['預', '備', '起', '唱']

export async function midiProcess(file) {
    if (file == undefined) {
        alert("尚未載入 MIDI 檔案！");
    }
    else {
        if (file !== 'reload') {
            if (file instanceof File) {
                // 使用者上傳的檔案
                songName = file.name.replace(/\.mid(i)?$/i, "");
                midiBfr = await file.arrayBuffer();
            } else if (file instanceof ArrayBuffer) {
                // 直接給的是 ArrayBuffer
                songName = "望春風";  // 或你可以用其他名稱
                midiBfr = file;
            } else {
                console.error("未知的 MIDI 輸入型態", file);
                return;
            }

            console.log("檔案名稱:", songName);
            const blob = new Blob([midiBfr], { type: "audio/midi" });
            noteData = await mm.blobToNoteSequence(blob);
            noteData.notes.sort((a, b) => a.startTime - b.startTime);

            tempo = noteData.tempos?.[0]?.qpm || 60;
            tickPQtr = noteData.ticksPerQuarter || 480;

            console.log("Tempo:", tempo);
            closeSet();
            await renderNotes();
            await renderMetaData();
        } else {
            animateSeq(groupMap);
        }
    }

}


export async function animateSeq(context) {
    await resetSeq();
    if (context instanceof Map) {
        for (const values of context.values()) {
            const copiedValues = values.map(v => ({ ...v }));
            noteSeq.push(copiedValues);
        }
    } else if (typeof context === 'number') {
        const closest = guitarStandard
            .map((note, idx) => ({ note, idx }))
            .filter(item => context >= item.note)
            .reduce((a, b) => Math.abs(context - a.note) < Math.abs(context - b.note) ? a : b, { note: Infinity });

        if (closest.idx !== undefined) {
            stringSeq[closest.idx] = { note: context, alpha: 1 };
        }
    }
}

// pitch 映射 HEX 色碼
export function pitchToColor(pitch, tone = 'G', range = 120) {
    // pitch 映射到 0~360 度 hue
    let hue = (pitch / 127) * range;

    // 根據 tone 改變色相偏移
    const toneOffsetMap = {
        G: 0,
        B: 120,
        R: 240,
        Y: 60,   // 黃色
        C: 180,  // 青色
        M: 300   // 洋紅
    };
    if (toneOffsetMap[tone]) hue += toneOffsetMap[tone];
    hue %= 360;

    // 固定 HSL 參數
    const saturation = 1;
    const lightness = 0.6;

    // HSL 轉 RGB
    const k = n => (n + hue / 30) % 12;
    const a = saturation * Math.min(lightness, 1 - lightness);
    const f = n => lightness - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));

    const r = Math.round(f(0) * 255);
    const g = Math.round(f(8) * 255);
    const b = Math.round(f(4) * 255);

    // 回傳 HEX 字串（如 "#FFAABB"）
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
}

async function renderNotes() {
    if (!noteData?.notes?.length) return;

    groupMap = new Map();
    offset = 0;

    // 插入預備拍
    /*
    for (let i = 0; i < PREBEATS; i++) {
        const time = offset;
        groupMap.set(time, [{
            note: DEFAULT_NOTE,
            v: DEFAULT_VELOCITY,
            d: 60 / tempo,
            y: midiApp.canvas.height / 2,
            r: 40,
            startTime: offset,
            isReady: initLyric[i],
            color: 0xBDC0BA,
            noteType: 0.25,
            readyNote: i + 1
        }]);
        offset += 60 / tempo;
    }*/


    const maxPitch = Math.max(...noteData.notes.map(n => n.pitch));
    const minPitch = Math.min(...noteData.notes.map(n => n.pitch));

    initTime = noteData.notes[0].startTime
    for (const note of noteData.notes) {
        if (note.isDrum || typeof note.startTime !== 'number') continue;
        const start = note.startTime + offset;

        if (!groupMap.has(start)) groupMap.set(start, []);
        groupMap.get(start).push({
            note: note.pitch,
            v: note.velocity,
            d: note.endTime - note.startTime,
            y: mapRange(note.pitch, minPitch, maxPitch, midiApp.canvas.height - 300, 200),
            r: mapRange(note.velocity, 60, 127, 15, 40),
            startTime: note.startTime,
            isReady: false,
            color: 0xffffff,
        });
    }

    // 依時間排序，添加控制資料
    const sortedTimes = [...groupMap.keys()].sort((a, b) => a - b);
    const minDelta = sortedTimes
        .slice(1)
        .reduce((min, curr, i) => {
            const delta = curr - sortedTimes[i];
            return delta > 0 && delta < min ? delta / 60 * tempo : min;
        }, Infinity);

    const pixelPerSec = Math.min(500, 100 / minDelta);

    let posX = 185
    sortedTimes.forEach((time, i) => {
        const group = groupMap.get(time);
        const nextTime = sortedTimes[i + 1];
        const deltaBeats = nextTime ? (nextTime - time) / 60 * tempo : 0;

        group.sort((a, b) => b.note - a.note);

        group.unshift({
            dltB: deltaBeats,
            scale: 1,
            x: posX,//185 + (time - (time > offset ? initTime : 0)) * pixelPerSec,
            targetX: 185 + time * pixelPerSec,
            lyric: group[0].isReady ? `${group[0].isReady}` : "",
            vx: 18
        });

        posX += deltaBeats > 2 ? 400 :
            deltaBeats >= 0.5 ? deltaBeats * 200 : 100
        if (time >= offset) {
            for (let j = 1; j < group.length; j++) {
                group[j].color = pitchToColor(group[j].note,
                    deltaBeats <= 0.5 ? 'M' :
                        deltaBeats <= 1 ? 'Y' :
                            deltaBeats <= 1.5 ? 'G' :
                                deltaBeats <= 2 ? 'B' : 'C'
                );
            }
        }
    });
}

async function renderMetaData() {
    const midi = MidiParser.parse(new Uint8Array(midiBfr));

    midi.track.forEach(track => {
        let ticks = 0;

        track.event.forEach(event => {
            ticks += event.deltaTime;
            // Lryic
            if (event.type === 0xFF && event.metaType === 0x05) {
                let text = "";

                try {
                    text = typeof event.data === "string"
                        ? decodeURIComponent(escape(event.data))
                        : Encoding.convert(new Uint8Array(event.data), { to: 'UNICODE', from: 'AUTO', type: 'string' });
                } catch (err) {
                    console.warn("歌詞解碼失敗，略過該段文字：", err);
                    return;
                }

                const time = (ticks / tickPQtr) * (60 / tempo) + offset;

                if (text !== '\r' && groupMap.has(time)) {
                    groupMap.get(time)[0].lyric = text;
                }
            }
            // Key Signature
            if (event.type === 0xFF && event.metaType === 0x59) {
                const majorKeys = [
                    "C♭", "G♭", "D♭", "A♭", "E♭", "B♭", "F", "C",
                    "G", "D", "A", "E", "B", "F♯", "C♯"
                ];

                const highByte = new Int8Array([(event.data >> 8) & 0xFF])[0];
                const lowByte = event.data & 0xFF;
                const MajKey = majorKeys[highByte + 7]

                console.log(MajKey, lowByte == 0 ? 'major' : 'minor')
                key = MajKey[1] == undefined ? rootTab[MajKey[0]] :
                    MajKey[1] == '♭' ? rootTab[MajKey[0]] - 1 : rootTab[MajKey[0]] + 1

                console.log(key)
            }
        });
    });

    animateSeq(groupMap);
}

