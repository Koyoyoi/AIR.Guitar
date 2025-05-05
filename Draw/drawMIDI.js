import { noteSequence, canvas } from "../main.js";
import { drawCircle } from "./drawGraph.js";
import { audioContext, soundSample, mapRange } from "../sound.js";

// 繪製整個 MIDI 音符序列的動畫
export async function draw_midiAnimation() {
    if (!noteSequence || noteSequence.length == 0) {
        console.warn("⚠️ 沒有 MIDI 音符可顯示！");
        return;
    }

    const startTime = performance.now(); // 動畫起始時間
    const pixelsPerSecond = 100;         // 控制滑動速度

    const currentTime = audioContext.currentTime;

    // 播放所有音符
    noteSequence.forEach(note => {
        soundSample.play(
            note.pitch,
            currentTime + note.start,    // 延後播放
            { velocity: note.v, duration: note.end - note.start }
        );
    });

    function drawFrame(now) {
        const elapsed = (now - startTime) / 1000; // 已過時間（秒）
        canvas['midi'].ctx.clearRect(0, 0, canvas['midi'].cvs.width, canvas['midi'].cvs.height); 

        // 畫出音符
        noteSequence.forEach(note => {
            if (elapsed >= note.start) {
                let posX = canvas['midi'].cvs.width - (elapsed - note.start) * pixelsPerSecond;

                const area = {
                    x: posX - (note.end - note.start * 100) / 2,
                    y: mapRange(note.pitch, 24, 96, canvas['midi'].cvs.height, 0),
                    w: note.end - note.start,
                    h: 15
                };

                drawCircle(area, "#EE9A9A"); // 使用圓形來表示音符
            }
        });

        const endTime = Math.max(...noteSequence.map(n => n.end));
        if (elapsed < endTime + 2) {
            requestAnimationFrame(drawFrame); // 繼續播放動畫
        } else {
            canvas['midi'].ctx.clearRect(0, 0, canvas['midi'].cvs.width, canvas['midi'].cvs.height); 
            console.log("✅ 動畫播放完畢");
        }
    }

    requestAnimationFrame(drawFrame); // 開始動畫
}