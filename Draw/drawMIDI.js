import { video, canvas, noteSequence } from "../main.js";
import { drawRect } from "./drawGraph.js";
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
        h: 9
    }));

    const currentTime = audioContext.currentTime;

    notes.forEach(note => {
        soundSample.play(
            note.pitch,
            currentTime + note.start,  // 延後播放
            { velocity: note.v, duration: note.end - note.start }
        );
    });

    function drawFrame(now) {
        const elapsed = (now - startTime) / 1000; // 秒為單位

        // 每個 note 檢查是否應該出現
        notes.forEach(note => {
            if (elapsed >= note.start) {
                // 計算 X 位置，從畫布右側開始移動
                note.x = canvas.width - (elapsed - note.start) * pixelsPerSecond; // X 位置向左移動

                // 使用 drawRect 函數繪製圓角矩形作為音符
                const area = {
                    x: note.x - note.w / 2,
                    y: note.y,
                    w: note.w,
                    h: note.h
                };

                drawRect(area, 5, "#EE9A9A"); // 圓角半徑為 5，顏色為 #EE9A9A
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
