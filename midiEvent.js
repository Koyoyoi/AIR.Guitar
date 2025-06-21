import { noteSeq, stringSeq, resetSeq } from "./Draw/drawMIDI.js";
import { mapRange, guitarStandard } from "./sound.js";
import { midiApp } from "./main.js";
import { closeSet } from "./Controll/blockControll.js";

export let tempo = 0, songName = "";

let arrayBuffer, ticksPerQuarter, groupMap, offset, noteData, initTime = 0;
const PREBEATS = 4;
const DEFAULT_NOTE = 84;
const DEFAULT_VELOCITY = 100;

const initLyric = ['預', '備', '起', '唱']

export async function midiProcess(file) {
    resetSeq();

    if (file == undefined) {
        alert("尚未載入 MIDI 檔案！");
    }
    else {
        if (file != 'reload') {
            songName = file.name.replace(/\.mid(i)?$/i, "");
            console.log("檔案名稱:", songName);
            arrayBuffer = await file.arrayBuffer();
        }

        const blob = new Blob([arrayBuffer], { type: "audio/midi" });
        noteData = await mm.blobToNoteSequence(blob);
        noteData.notes.sort((a, b) => a.startTime - b.startTime);

        tempo = noteData.tempos?.[0]?.qpm || 60;
        ticksPerQuarter = noteData.ticksPerQuarter || 480;

        console.log("Tempo:", tempo);
        closeSet()
        await renderNotes();
        await renderMetaData();
    }
}

export async function animateSeq(context) {
    if (context instanceof Map) {
        for (const values of context.values()) {
            noteSeq.push([...values]);  // 推入 noteSeq 中保留整組
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
    }

    initTime = noteData.notes[0].startTime
    for (const note of noteData.notes) {
        if (note.isDrum || typeof note.startTime !== 'number') continue;
        const start = note.startTime + offset;

        if (!groupMap.has(start)) groupMap.set(start, []);
        groupMap.get(start).push({
            note: note.pitch,
            v: note.velocity,
            d: note.endTime - note.startTime,
            y: mapRange(note.pitch, 48, 84, midiApp.canvas.height - 150, 150),
            r: mapRange(note.velocity, 60, 127, 20, 50),
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

    sortedTimes.forEach((time, i) => {
        const group = groupMap.get(time);
        const nextTime = sortedTimes[i + 1];
        const deltaBeats = nextTime ? (nextTime - time) / 60 * tempo : 0;

        group.sort((a, b) => b.note - a.note);

        group.unshift({
            dltB: deltaBeats,
            scale: 1,
            x: 185 + (time - (time > offset ? initTime : 0)) * pixelPerSec,
            targetX: 185 + time * pixelPerSec,
            lyric: group[0].isReady ? `${group[0].isReady}` : "",
            vx: 12
        });

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
    const midi = MidiParser.parse(new Uint8Array(arrayBuffer));

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

                const time = (ticks / ticksPerQuarter) * (60 / tempo) + offset;

                if (text !== '\r' && groupMap.has(time)) {
                    groupMap.get(time)[0].lyric = text;
                }
            }
            // Key Signature
            if (event.type === 0xFF && event.metaType === 0x59) {


                const highByte = (event.data >> 8) & 0xFF;
                const lowByte = event.data & 0xFF;

                // 有號整數表示的五度圈偏移量 (-7 ~ 7)
                const keyByte = new Int8Array([highByte])[0];

                // 大小調判斷 0 = major, 1 = minor
                const scaleByte = lowByte;

                // 五度圈調名對應（升號）
                const sharpKeys = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#'];
                // 五度圈調名對應（降號）
                const flatKeys = ['C', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb'];

                let keyName = 'Unknown';

                if (keyByte >= 0 && keyByte <= 7) {
                    keyName = sharpKeys[keyByte];
                } else if (keyByte >= -7 && keyByte < 0) {
                    keyName = flatKeys[-keyByte];
                }

                const modeName = scaleByte === 0 ? 'major' : 'minor';

                console.log(`${keyName} ${modeName}`)

            }
        });
    });

    animateSeq(groupMap);
}

