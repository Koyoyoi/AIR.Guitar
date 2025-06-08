import { noteSeq, stringSeq, resetSeq, pitchToHexColor } from "./Draw/drawMIDI.js";
import { mapRange, guitarStandard } from "./sound.js";

export let tempo = 0, songName = "";

let noteData, arrayBuffer, ticksPerQuarter, groupMap, offset;
const PREBEATS = 4;
const DEFAULT_NOTE = 84;
const DEFAULT_VELOCITY = 100;

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

        tempo = noteData.tempos?.[0]?.qpm || 120;
        ticksPerQuarter = noteData.ticksPerQuarter || 480;

        console.log("Tempo:", tempo);

        await renderNotes();
        await renderLyrics();
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
            r: 25,
            startTime: offset,
            isReady: i === PREBEATS - 1 ? '唱' : i + 1,
            color: 0x828282,
            noteType: 0.25
        }]);
        offset += 60 / tempo;
    }

    for (const note of noteData.notes) {
        if (note.isDrum || typeof note.startTime !== 'number') continue;
        const start = note.startTime + offset;

        if (!groupMap.has(start)) groupMap.set(start, []);
        groupMap.get(start).push({
            note: note.pitch,
            v: note.velocity,
            d: note.endTime - note.startTime,
            r: mapRange(note.velocity, 60, 127, 10, 25),
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
            return delta > 0 && delta < min ? delta : min;
        }, Infinity);

    const pixelPerSec = Math.min(1000, 50 / minDelta);

    sortedTimes.forEach((time, i) => {
        const group = groupMap.get(time);
        const nextTime = sortedTimes[i + 1];
        const deltaBeats = nextTime ? (nextTime - time) / 60 * tempo : 0;

        group.sort((a, b) => b.note - a.note);

        group.unshift({
            dltB: deltaBeats,
            scale: 1,
            hit: false,
            x: 185 + time * pixelPerSec,
            vx: 0,
            targetX: 185 + time * pixelPerSec,
            lyric: group[1]?.isReady ? `${group[1].isReady}` : ""
        });

        if (time >= offset) {
            for (let j = 1; j < group.length; j++) {
                group[j].color = pitchToHexColor(group[j].note,
                    deltaBeats <= 0.5 ? 'M' :
                        deltaBeats <= 1 ? 'G' :
                            deltaBeats <= 2 ? 'B' : 'C'
                );
            }
        }
    });
}

async function renderLyrics() {
    const midi = MidiParser.parse(new Uint8Array(arrayBuffer));

    midi.track.forEach(track => {
        let ticks = 0;

        track.event.forEach(event => {
            ticks += event.deltaTime;

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
        });
    });

    animateSeq(groupMap);
}
