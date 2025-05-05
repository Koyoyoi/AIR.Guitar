import { noteSequence, canvas, updateSeq } from "../main.js";
import { drawCircle } from "./drawGraph.js";
import {  mapRange } from "../sound.js";

export let seq = [];
let startTime = performance.now()

// 繪製整個 MIDI 音符序列的動畫
export async function draw_midiAnimation() {
    if (!noteSequence || noteSequence.length == 0) {
        console.warn("⚠️ 沒有 MIDI 音符可顯示！");
        return;
    }

    if(seq.length == 0){
         startTime = performance.now();
    } // 動畫起始時間
    const pixelsPerSecond = 200;         // 控制滑動速度
    seq = noteSequence

    function drawFrame(now) {
        const elapsed = (now - startTime) / 1000; // 已過時間（秒）
        canvas['midi'].ctx.clearRect(0, 0, canvas['midi'].cvs.width, canvas['midi'].cvs.height); 

        // 畫出音符
        seq = seq.filter(note => {
            const posX = canvas['midi'].cvs.width - (elapsed - note.start) * pixelsPerSecond;
        
            // 如果剩下 x < 畫面10% 移除
            if (posX >= canvas['midi'].cvs.width * 0.1) {
                const area = {
                    x: posX - ((note.end - note.start) * pixelsPerSecond) / 2,
                    y: mapRange(note.pitch, 24, 96, canvas['midi'].cvs.height, 0),
                    w: (note.end - note.start) * 100,
                    h: 15
                };
                drawCircle(area, "#EE9A9A");
                return true; // 保留這個 note
            }
            return false; // 過濾掉這個 note（即刪除）
        });
        
        if (seq.length > 0) {
            updateSeq();
            requestAnimationFrame(drawFrame); // 繼續播放動畫
        } else {
            canvas['midi'].ctx.clearRect(0, 0, canvas['midi'].cvs.width, canvas['midi'].cvs.height); 
            console.log("✅ 動畫播放完畢");
        }
    }

    requestAnimationFrame(drawFrame); // 開始動畫
}