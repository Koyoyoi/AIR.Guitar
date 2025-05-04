import { ctx, canvas, noteSequence } from "../main.js";
import { drawRect } from "./drawGraph.js";

export async function draw_midiAnimation() {
    if (!noteSequence || !noteSequence.notes || noteSequence.notes.length === 0) {
        console.warn("⚠️ 沒有 MIDI 音符可顯示！");
        return;
    }

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
    const canvasHeight = canvas.height; // 畫布高度
    const pitchRange = [21, 108]; // MIDI 音高範圍
    const noteHeight = 20; // 音符的高度

    // 將音高映射到畫布的高度範圍，並反轉 Y 座標
    function pitchToY(pitch) {
        const minPitch = pitchRange[0];
        const maxPitch = pitchRange[1];
        const yPosition = ((pitch - minPitch) / (maxPitch - minPitch)) * canvasHeight;
        return canvasHeight - yPosition; // 高度反轉，使得低音符在底部，高音符在頂部
    }

    // 保證音符不重疊
    function avoidOverlap(y, index) {
        const overlapThreshold = 10; // 設定最小間距為 10 像素
        let newY = y;
        for (let i = 0; i < index; i++) {
            const prevNote = notes[i];
            if (Math.abs(prevNote.y - newY) < overlapThreshold) {
                newY = prevNote.y + noteHeight + overlapThreshold; // 調整到不重疊的位置
            }
        }
        return newY;
    }

    function drawFrame(now) {
        const elapsed = (now - startTime) / 1000; // 秒為單位

        // 每個 note 檢查是否應該出現
        notes.forEach((note, index) => {
            if (elapsed >= note.start) {
                // 計算 X 位置，從畫布右側開始移動
                note.x = canvas.width - (elapsed - note.start) * pixelsPerSecond; // X 位置向左移動

                // 計算 Y 位置，根據音高來設置
                const y = pitchToY(note.pitch); // 使用音高計算 Y 位置

                // 確保音符不會重疊
                note.y = avoidOverlap(y, index);

                // 計算音符寬度（根據持續時間設置）
                const duration = note.end - note.start;
                const width = duration * pixelsPerSecond;

                // 使用 drawRect 函數繪製圓角矩形作為音符
                const area = {
                    x: note.x - width / 2,
                    y: note.y,
                    w: width,
                    h: noteHeight
                };
                drawRect(area, 5, "#EEA9A9"); // 圓角半徑為 5，顏色為 #4caf50
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

