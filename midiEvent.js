import { noteSeq, stringSeq, resetSeq } from "./Draw/drawMIDI.js";
import { mapRange, guitarStandard, rootTab } from "./sound.js";
import { midiApp } from "./main.js";
import { closeSet } from "./Controll/blockControll.js";
import { midiList } from "./Controll/midList.js";

export let songName = "", key = 0;
let events, lyrics;
let groupMap, bpm = 0, ppq = 0;
const PREBEATS = 4;
const DEFAULT_NOTE = 84;
const DEFAULT_VELOCITY = 100;

export async function midiProcess(title, id) {

    if (title !== 'reload') {

        // 如果 id 沒給，用 title 去找
        if (id == null && typeof title === "string") {
            const mid = midiList.find(m => m.title === title);

            if (!mid) {
                console.error("找不到 MIDI:", title);
                return;
            }

            id = mid.id;
        }
        songName = title;

        const url = `https://imuse.ncnu.edu.tw/Midi-library/api/midis/${id}/events`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        events = json.events;
        lyrics = json.lyrics;
        bpm = json.bpm
        ppq = json.ppq

        closeSet();
        await getKey(id)
        await renderNotes();
        animateSeq(groupMap);

    } else {
        animateSeq(groupMap);
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
    if (!events?.length) return;

    groupMap = new Map();

    // 取得 pitch 範圍，用於計算 Y 軸位置
    const maxPitch = Math.max(...events.map(n => n.midi));
    const minPitch = Math.min(...events.map(n => n.midi));

    // 將每個音符加入 groupMap
    for (const n of events) {
        if (n.isDrum) continue; // 忽略鼓

        // 使用 n.time 作 key，如果 Map 裡沒有就建立陣列
        if (!groupMap.has(n.time)) groupMap.set(n.time, []);

        groupMap.get(n.time).push({
            note: n.midi,
            v: n.velocity,
            d: n.duration,
            y: mapRange(n.midi, minPitch, maxPitch, midiApp.canvas.height - 300, 200),
            r: mapRange(n.velocity, 60, 127, 15, 40),
            startTime: n.time,
            lyric: "",       // 先空，之後 assign lyric
            color: 0xffffff
        });
    }

    // 將 lyrics 按時間匹配到 groupMap
    const sortedTimes = [...groupMap.keys()].sort((a, b) => a - b);
    if (lyrics) {
        lyrics.forEach(l => {
            // 找最接近的 groupMap key
            const closestTime = sortedTimes.reduce((prev, curr) =>
                Math.abs(curr - l.time) < Math.abs(prev - l.time) ? curr : prev,
                sortedTimes[0]
            );

            const notes = groupMap.get(closestTime);
            if (notes && notes[0] && !notes[0].lyric) {
                notes[0].lyric = l.text;
            }
        });
    }

    // 依時間排序，添加控制資料
    let posX = 185;
    sortedTimes.forEach((time, i) => {
        const group = groupMap.get(time);
        const nextTime = sortedTimes[i + 1];
        const deltaBeats = nextTime ? (nextTime - time) / 60 * bpm : 0;

        if (!group) return; // 保險檢查

        group.sort((a, b) => b.note - a.note); // 高音排前面

        // 控制資料，用最接近時間的 note 取得 lyric
        const lyricNote = group.find(n => n.lyric && n.lyric !== "");

        group.unshift({
            dltB: deltaBeats,
            scale: 1,
            x: posX,
            targetX: 185 + time * (Math.min(500, 100 / deltaBeats || 100)), // 安全 pixelPerSec
            lyric: lyricNote ? lyricNote.lyric : "",
            vx: 18
        });

        // 更新 posX
        posX += deltaBeats > 2 ? 400 :
            deltaBeats >= 0.5 ? deltaBeats * 200 : 100;

        // 設置顏色
        for (let j = 1; j < group.length; j++) {
            group[j].color = pitchToColor(group[j].note,
                deltaBeats <= 0.5 ? 'M' :
                    deltaBeats <= 1 ? 'Y' :
                        deltaBeats <= 1.5 ? 'G' :
                            deltaBeats <= 2 ? 'B' : 'C'
            );
        }
    });
}



async function getKey(id) {
    // 1. 下載 MIDI 檔案 ArrayBuffer
    const url = `https://imuse.ncnu.edu.tw/Midi-library/api/midis/${id}/download`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const arrayBuffer = await res.arrayBuffer();

    // 2. 解析 MIDI
    const midi = MidiParser.parse(new Uint8Array(arrayBuffer));

    // 3. 逐 track 掃描 meta event
    midi.track.forEach(track => {
        track.event.forEach(event => {
            // Key Signature (0xFF 0x59)
            if (event.type === 0xFF && event.metaType === 0x59) {
                const data = event.data; // 64768
                const sf = (data & 0xFF00) >> 8;   // 高位: sharps/flats
                const mi = data & 0x00FF;           // 低位: 0=major,1=minor

                // 調號數量可能是負值，需要轉成 Int8
                const sfSigned = (sf << 24) >> 24;  // 將 byte 轉成有號數字
                const majorKeys = [
                    "C♭", "G♭", "D♭", "A♭", "E♭", "B♭", "F", "C",
                    "G", "D", "A", "E", "B", "F♯", "C♯"
                ];

                const MajKey = majorKeys[sfSigned + 7]; // 因為 C = 7
                console.log(MajKey, mi === 0 ? 'major' : 'minor');

                // 計算全域 key
                if (MajKey[1] === undefined) key = rootTab[MajKey[0]];
                else if (MajKey[1] === '♭') key = rootTab[MajKey[0]] - 1;
                else key = rootTab[MajKey[0]] + 1;

                console.log("根音 key =", key);

            }
        });
    });
}
