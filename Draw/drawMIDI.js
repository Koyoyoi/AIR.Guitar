import {  canvas, } from "../main.js";
import { drawCircle } from "./drawGraph.js";
import {  mapRange } from "../sound.js";
import { soundSample } from "../sound.js";

export let seq = [];

let lastTime = performance.now();

export function animateSeq(midiNote, posX = canvas['midi'].cvs.width * 0.8, posY = 0, speed = 0) {
    // 將音符加入動畫隊列
    seq.push({
        x: posX,  
        y: posY == 0 ? mapRange(midiNote, 24, 96, canvas['midi'].cvs.height, 0) : posY,
        note: midiNote,
        speed: speed != 0 ? speed : 100 + Math.random() * 50  // 隨機速度
    });
}

export async function midiDrawLoop(now) {
    const dt = (now - lastTime) / 1000;
    lastTime = now;

    canvas['midi'].ctx.clearRect(0, 0, canvas['midi'].cvs.width, canvas['midi'].cvs.height);
    seq.forEach((n, i) => {
        n.x -= n.speed * dt;
        
        drawCircle({x: n.x, y: n.y, w: 20, h: 20}, "#EEA9A9")
    });

    // 移除已掉出畫布的音符
    for (let i = seq.length - 1; i >= 0; i--) {
        if (seq[i].x < 0) {
            
            soundSample.play(
                seq[i].note,
                0,
                { velocity: 127, duration: 3 }
            );

            seq.splice(i, 1);
        }
        
    }

    requestAnimationFrame(midiDrawLoop);
}

