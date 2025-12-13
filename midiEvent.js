import { noteSeq, stringSeq, resetSeq } from "./Draw/drawMIDI.js";
import { mapRange, guitarStandard, rootTab } from "./sound.js";
import { midiApp } from "./main.js";
import { closeSet } from "./Controll/blockControll.js";

export let tempo = 0, songName = "", key = 0;

let midiBfr, tickPQtr, groupMap, noteData, initTime = 0;
const PREBEATS = 4;
const DEFAULT_NOTE = 84;
const DEFAULT_VELOCITY = 100;
const initLyric = ['預', '備', '起', '唱'];

// ------------------- MIDI 處理 -------------------
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
            songName = title || "Unknown";
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

// ------------------- 音符渲染 -------------------
async function renderNotes() {
    if (!noteData?.notes?.length) return;

    groupMap = new Map();
    const notes = noteData.notes.filter(n => !n.isDrum && typeof n.startTime === 'number');

    const maxPitch = Math.max(...notes.map(n => n.pitch));
    const minPitch = Math.min(...notes.map(n => n.pitch));
    initTime = notes[0].startTime;

    /* 插入預備拍
    for (let i = 0; i < PREBEATS; i++) {
        const time = initTime - (PREBEATS - i) * (60 / tempo);
        groupMap.set(time, [{
            note: DEFAULT_NOTE,
            v: DEFAULT_VELOCITY,
            d: 60 / tempo,
            y: midiApp.canvas.height / 2,
            r: 40,
            startTime: time,
            isReady: initLyric[i],
            color: 0xBDC0BA,
            noteType: 0.25,
            readyNote: i + 1
        }]);
    }*/

    // 將音符加入 groupMap
    for (const note of notes) {
        const start = note.startTime;
        if (!groupMap.has(start)) groupMap.set(start, []);
        groupMap.get(start).push({
            note: note.pitch,
            v: note.velocity,
            d: note.endTime - note.startTime,
            y: mapRange(note.pitch, minPitch, maxPitch, midiApp.canvas.height - 300, 200),
            r: mapRange(note.velocity, 60, 127, 15, 40),
            startTime: note.startTime,
            isReady: false,
            lyric: "",
            color: 0xffffff
        });
    }

    // 依時間排序，計算 pixel 位置
    const sortedTimes = [...groupMap.keys()].sort((a, b) => a - b);
    let posX = 185;
    for (let i = 0; i < sortedTimes.length; i++) {
        const time = sortedTimes[i];
        const group = groupMap.get(time);
        const nextTime = sortedTimes[i + 1];
        const deltaSec = nextTime ? nextTime - time : 0;

        group.sort((a, b) => b.note - a.note);

        // 控制資訊
        group.unshift({
            dltB: deltaSec,
            scale: 1,
            x: posX,
            targetX: 185 + time * 200, // pixelPerSec = 200
            lyric: group[0].isReady ? `${group[0].isReady}` : "",
            vx: 18
        });

        posX += deltaSec > 2 ? 400 :
            deltaSec >= 0.5 ? deltaSec * 200 : 100;

        // 設置顏色
        for (let j = 1; j < group.length; j++) {
            group[j].color = pitchToColor(group[j].note,
                deltaSec <= 0.5 ? 'M' :
                    deltaSec <= 1 ? 'Y' :
                        deltaSec <= 1.5 ? 'G' :
                            deltaSec <= 2 ? 'B' : 'C'
            );
        }
    }
}

// ------------------- 歌詞與調性 -------------------
async function renderMetaData() {
    const midi = MidiParser.parse(new Uint8Array(midiBfr));

    midi.track.forEach(track => {
        let ticks = 0;

        track.event.forEach(event => {
            ticks += event.deltaTime;

            // 歌詞
            if (event.type === 0xFF && event.metaType === 0x05) {
                let text = "";
                try {
                    text = typeof event.data === "string"
                        ? decodeURIComponent(escape(event.data))
                        : Encoding.convert(new Uint8Array(event.data), { to: 'UNICODE', from: 'AUTO', type: 'string' });
                } catch (err) {
                    console.warn("歌詞解碼失敗：", err);
                    return;
                }

                const timeInSec = (ticks / tickPQtr) * (60 / tempo);
                const sortedTimes = [...groupMap.keys()].sort((a, b) => a - b);

                // 找最接近的時間點
                const closestTime = sortedTimes.reduce((prev, curr) =>
                    Math.abs(curr - timeInSec) < Math.abs(prev - timeInSec) ? curr : prev
                    , sortedTimes[0]);

                let assigned = false;

                // 從 closestTime 往後找第一個可用時間點
                for (let i = sortedTimes.indexOf(closestTime); i < sortedTimes.length; i++) {
                    const t = sortedTimes[i];

                    // 只考慮比事件時間大的 note
                    if (t < timeInSec) continue;

                    const notes = groupMap.get(t);

                    // 只使用第一個 note，確保同一時間不重複
                    if (notes[0] && !notes[0].lyric) {
                        notes[0].lyric = text;
                        assigned = true;
                        console.log("Assigned to next available time:", {
                            text,
                            timeInSec: timeInSec.toFixed(3),
                            closestTime: closestTime.toFixed(3),
                            assignedTime: t.toFixed(3),
                            indexUsed: 0
                        });
                        break;
                    }
                    // 如果 notes[0] 已有歌詞，直接跳到下一個時間點
                }

                if (!assigned) {
                    console.warn("No available note to assign lyric:", text, timeInSec.toFixed(3), "closestTime:", closestTime.toFixed(3));
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
                const MajKey = majorKeys[highByte + 7];

                key = MajKey[1] == undefined ? rootTab[MajKey[0]] :
                    MajKey[1] == '♭' ? rootTab[MajKey[0]] - 1 : rootTab[MajKey[0]] + 1;
            }
        });
    });

    animateSeq(groupMap);
}

// ------------------- 音符顏色 -------------------
export function pitchToColor(pitch, tone = 'G', range = 120) {
    let hue = (pitch / 127) * range;
    const toneOffsetMap = { G: 0, B: 120, R: 240, Y: 60, C: 180, M: 300 };
    if (toneOffsetMap[tone]) hue += toneOffsetMap[tone];
    hue %= 360;
    const saturation = 1;
    const lightness = 0.6;
    const k = n => (n + hue / 30) % 12;
    const a = saturation * Math.min(lightness, 1 - lightness);
    const f = n => lightness - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    const r = Math.round(f(0) * 255);
    const g = Math.round(f(8) * 255);
    const b = Math.round(f(4) * 255);
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
}

// ------------------- 播放動畫 -------------------
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
