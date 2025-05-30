import { animateSeq, resetSeq } from "./Draw/drawMIDI.js";

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

    const tempo = noteSeq.tempos?.[0]?.qpm || 120;
    const ticksPerQuarter = noteSeq.ticksPerQuarter || 480;

    renderNotes(noteSeq);
    renderLyrics(arrayBuffer, ticksPerQuarter, tempo);
}

// 根據 NoteSequence 繪製音符動畫
function renderNotes(noteSeq) {
    const xMap = new Map();
    let i = 0;
    const initX = noteSeq.notes[0]?.startTime || 0;
    const baseSpacing = 200;
    const timeScale = 100;
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
