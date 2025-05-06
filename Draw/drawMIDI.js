import {  canvas, } from "../main.js";
import { drawCircle } from "./drawGraph.js";
import {  mapRange } from "../sound.js";

export let seq = [];

let lastTime = performance.now();

export function animateSeq(midiNote, posX = null, posY = null, speed = 0) {
    // 將音符加入動畫隊列
    seq.push({
        x: posX != null ? posX : mapRange(midiNote, 21, 108, 0, canvas['midi'].cvs.width),  // 簡單取餘數決定 X 位置
        y: posY != null ? posY : 0,
        note: midiNote,
        speed: speed != 0? speed : 100 + Math.random() * 50  // 隨機速度
    });
    console.log(seq)
}


export async function midiDrawLoop(now) {
    const dt = (now - lastTime) / 1000;
    lastTime = now;

    canvas['midi'].ctx.clearRect(0, 0, canvas['midi'].cvs.width, canvas['midi'].cvs.height);
    seq.forEach((n, i) => {
        n.y += n.speed * dt;
        
        drawCircle({x: n.x, y: n.y, w: 15, h: 15}, "#EEA9A9")
    });

    // 移除已掉出畫布的音符
    for (let i = seq.length - 1; i >= 0; i--) {
        if (seq[i].y > canvas['midi'].cvs.height) {
            seq.splice(i, 1);
        }
    }

    requestAnimationFrame(midiDrawLoop);
}

