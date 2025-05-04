import { video, canvas, noteSequence } from "../main.js";
import { drawRect } from "./drawGraph.js";
import { mapRange } from "../sound.js";

export async function draw_midiAnimation() {
    if (!noteSequence || !noteSequence.notes || noteSequence.notes.length === 0) {
        console.warn("⚠️ 沒有 MIDI 音符可顯示！");
        return;
    }
    console.log(video.videoHeight, canvas.height)

    const notes = noteSequence.notes.map(note => ({
        pitch: note.pitch,
        start: note.startTime,
        end: note.endTime,
        x: canvas.width, // 起始 X 座標（畫面右側）
        y: -50,  // 初始 Y 座標，畫面頂端外
        shown: false,
    }));

    const startTime = performance.now(); // 動畫起始時間
    const pixelsPerSecond = 100; // 控制滑動速度
    const videoHeight = video.videoHeight; // 使用影片的高度
    const noteHeight = 9; // 音符的高度

    function drawFrame(now) {
        const elapsed = (now - startTime) / 1000; // 秒為單位

        // 每個 note 檢查是否應該出現
        notes.forEach(note => {
            if (elapsed >= note.start) {
                // 計算 X 位置，從畫布右側開始移動
                note.x = canvas.width - (elapsed - note.start) * pixelsPerSecond; // X 位置向左移動

                // 計算 Y 位置，根據音高來設置
                const y = mapRange(note.pitch, 24, 96, 720, 0); // 使用音高計算 Y 位置

                // 計算音符寬度（根據持續時間設置）
                const duration = note.end - note.start;
                const width = duration * pixelsPerSecond;

                // 使用 drawRect 函數繪製圓角矩形作為音符
                const area = {
                    x: note.x - width / 2,
                    y: y,
                    w: width,
                    h: noteHeight
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
