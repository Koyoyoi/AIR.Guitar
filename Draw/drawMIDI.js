import { video, canvas, noteSequence } from "../main.js";
import { drawCircle } from "./drawGraph.js";
import { mapRange, soundSample, audioContext } from "../sound.js";

export async function draw_midiAnimation() {
    if (!noteSequence || !noteSequence.notes || noteSequence.notes.length === 0) {
        console.warn("⚠️ 沒有 MIDI 音符可顯示！");
        return;
    }

    const startTime = performance.now(); // 動畫起始時間
    const pixelsPerSecond = 100; // 控制滑動速度

    const notes = noteSequence.notes.map(note => ({
        pitch: note.pitch,
        v: note.velocity,
        start: note.startTime,
        end: note.endTime,
        x: canvas.width, // 起始 X 座標（畫面右側）
        y: mapRange(note.pitch, 24, 96, video.videoHeight, 0),
        w: (note.endTime - note.startTime) * pixelsPerSecond,
        h: 20
    }));

    const currentTime = audioContext.currentTime;

    notes.forEach(note => {
        soundSample.play(
            note.pitch,
            currentTime + note.start,  // 延後播放
            { gain: 2, velocity: note.v, duration: note.end - note.start }
        );
    });

    function drawFrame(now) {
        const elapsed = (now - startTime) / 1000; // 秒為單位

        // 每個 note 檢查是否應該出現
        notes.forEach(note => {
            if (elapsed >= note.start) {
                // 計算 X 位置，從畫布右側開始移動
                note.x = canvas.width - (elapsed - note.start) * pixelsPerSecond; // X 位置向左移動
                drawCircle(note.x, note.y, note.h / 2, "#EE9A9A");
            }
        });

        // 停止條件（超過所有音符的時間）
        if (elapsed < Math.max(...notes.map(n => n.end)) + 2) {
            requestAnimationFrame(drawFrame);
        } else {
            console.log("✅ 動畫播放完畢");
        }
    }

    requestAnimationFrame(drawFrame);
}

export async function draw_singleMIDI(note, velocity, duration) {
    const startTime = performance.now();
    const pixelsPerSecond = 100;

    const n = {
        pitch: note,
        v: velocity,
        start: 0,
        end: duration,
        x: canvas.width,
        y: mapRange(note, 24, 96, video.videoHeight, 0),
        w: duration * pixelsPerSecond,
        h: 20
    };

    function drawFrame(now) {
        const elapsed = (now - startTime) / 1000;
        n.x = canvas.width - (elapsed - n.start) * pixelsPerSecond;
        drawCircle(n.x, n.y, n.h / 2, "#EE9A9A");

        if (n.x > canvas.width / 2) {
            requestAnimationFrame(drawFrame);
        } else {
            console.log("✅ 單一音符動畫播放完畢");
        }
    }

    requestAnimationFrame(drawFrame);
}
