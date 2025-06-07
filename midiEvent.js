import { noteSeq, stringSeq, resetSeq } from "./Draw/drawMIDI.js";
import { midiApp } from "./main.js";
import { mapRange, guitarStandard } from "./sound.js";

export let tempo = 0, songName = "";

let noteData, aryBuffer, tPerQuarter, groupMap, offset;

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
export function animateSeq(context) {
    if (context instanceof Map) {
        for (const value of context.values()) {
            noteSeq.push(value)
        }
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

    }
}

function renderNotes(noteSeq) {
    if (!noteSeq || !Array.isArray(noteSeq.notes)) return [];

    groupMap = new Map();

    // 插入前4個預備拍
    offset = 0
    for (let i = 0; i < 4; i++) {
        const t = offset;
        if (!groupMap.has(t)) groupMap.set(t, []);
        groupMap.get(t).push({
            note: 84,
            v: 100,
            d: 60 / tempo,
            r: 25,
            startTime: offset,
            isReady: i == 3 ? '唱' : i + 1
        });
        offset += 60 / tempo;
    }


    // 根據 startTime 分組
    for (const note of noteSeq.notes) {
        if (note.isDrum || typeof note.startTime !== 'number') continue;
        const t = note.startTime + offset;

        if (!groupMap.has(t)) groupMap.set(t, []);
        groupMap.get(t).push({
            note: note.pitch,
            v: note.velocity,
            d: note.endTime - note.startTime,
            r: mapRange(note.velocity, 60, 127, 10, 25),
            startTime: note.startTime,
            isReady: false
        });
    }

    // 依照 startTime 排序，然後加入拍數間距資訊
    const sortedTimes = [...groupMap.keys()].sort((a, b) => a - b);

    // 計算相鄰時間的差值
    let minDelta = Infinity;
    for (let i = 1; i < sortedTimes.length; i++) {
        const delta = sortedTimes[i] - sortedTimes[i - 1];
        if (delta > 0 && delta < minDelta) {
            minDelta = delta;
        }
    }

    let rawN = 50 / minDelta;
    if (rawN > 1000) rawN = 1000

    let dx = 0
    for (let i = 0; i < sortedTimes.length; i++) {
        const group = groupMap.get(sortedTimes[i]);
        const nextTime = sortedTimes[i + 1];
        const currentTime = sortedTimes[i];
        const deltaBeats = nextTime !== undefined ? nextTime - currentTime : 0;

        group.sort((a, b) => b.note - a.note);

        // 插入 ctrl 物件，只包含 yList
        group.unshift({
            dltB: deltaBeats,
            scale: 1,
            hit: false,
            x: 185 + sortedTimes[i] * rawN,
            vx: 0,
            targetX: 185 + sortedTimes[i] * rawN,
            lyric: group[0].isReady ? `${group[0].isReady}` : ""
        });

        dx = deltaBeats * 80;
    }
}

// 解析並顯示歌詞（使用 midi-parser-js）
function renderLyrics(arrayBuffer, ticksPerQuarter, tempo) {
    const midi = MidiParser.parse(new Uint8Array(arrayBuffer));
    midi.track.forEach(track => {
        let ticks = 0;

        track.event.forEach(event => {
            ticks += event.deltaTime;

            if (event.type === 0xFF && event.metaType === 0x05) {
                let text = "";

                try {
                    if (typeof event.data === "string") {
                        // 可能已是錯誤編碼字串
                        text = decodeURIComponent(escape(event.data));
                    } else {
                        const bytes = new Uint8Array(event.data);

                        // 使用 Encoding.js
                        text = Encoding.convert(bytes, {
                            to: 'UNICODE',
                            from: 'AUTO',
                            type: 'string'
                        });

                        // 如果沒有 Encoding.js，可以嘗試以下替代解法（僅適用 UTF-8）
                        // text = new TextDecoder('utf-8').decode(bytes);
                    }
                } catch (err) {
                    console.warn("歌詞解碼失敗，略過該段文字：", err);
                    return;
                }

                const time = (ticks / ticksPerQuarter) * (60 / tempo) + offset;

                if (groupMap.get(time) != undefined && text != '\r') {
                    groupMap.get(time)[0].lyric = text
                }
            }
        });
    });

    animateSeq(groupMap)
}

