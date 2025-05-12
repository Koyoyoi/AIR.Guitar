import { canvas, } from "../main.js";
import { drawCircle } from "./drawGraph.js";
import { mapRange } from "../sound.js";
import { soundSample } from "../sound.js";
import { modeNum } from "../Controll/blockControll.js";

export let seq = [], isRoll = false;

let lastTime = performance.now();

export function resetSeq() {
    seq = [];
}

export async function rollSeq() {
    for (let i = 0; i < 10; i++) {
        seq.forEach(n => {
            n.x -= 185 / 10;
            drawCircle({ x: n.x, y: n.y, w: 20, h: 20 }, "#EEA9A9");
        });
    }
}

export function animateSeq(midiNote, velocity = 0, duration = 1.5, posX = canvas['midi'].cvs.width * 0.8, posY = 0) {
    // 將音符加入動畫隊列
    seq.push({
        note: midiNote,
        v: velocity,
        d: duration,
        x: posX,
        y: posY == 0 ? mapRange(midiNote, 24, 96, canvas['midi'].cvs.height, 0) : posY,
    });
}

export async function midiDrawLoop(now) {
    const dt = (now - lastTime) / 1000;
    const speed = 200
    lastTime = now;

    canvas['midi'].ctx.clearRect(0, 0, canvas['midi'].cvs.width, canvas['midi'].cvs.height);

    // 在 x = 200 畫一條垂直線
    if (modeNum == 2) {
        canvas['midi'].ctx.beginPath();
        canvas['midi'].ctx.moveTo(200, 0);
        canvas['midi'].ctx.lineTo(200, canvas['midi'].cvs.height);
        canvas['midi'].ctx.strokeStyle = '#888';  // 可改顏色
        canvas['midi'].ctx.lineWidth = 5;
        canvas['midi'].ctx.stroke();
    }

    seq.forEach(n => {
        if (modeNum != 2) { n.x -= speed * dt; }
        drawCircle({ x: n.x, y: n.y, r: modeNum == 2? 30 : 20 }, "#EEA9A9")
    });


    // 移除已掉出畫布的音符
    for (let i = seq.length - 1; i >= 0; i--) {
        if (seq[i].x < 180) {
            if (seq[i].v > 0) {
                soundSample.play(
                    seq[i].note,
                    0,
                    { velocity: seq[i].v, duration: seq[i].d }
                );
            }
            seq.splice(i, 1);
        }

    }

    requestAnimationFrame(midiDrawLoop);
}

