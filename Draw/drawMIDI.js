import { canvas, } from "../main.js";
import { drawCircle } from "./drawGraph.js";
import { mapRange } from "../sound.js";
import { soundSample } from "../sound.js";
import { modeNum } from "../Controll/blockControll.js";

export let seq = [], isRoll = false;

let effects = [];

let lastTime = performance.now();

export function resetSeq() {
    seq = [];
}

export async function rollSeq() {
    for (let i = 0; i < 10; i++) {
        seq.forEach(n => {
            n.x -= 100 / 10;

            if (n.x > 180) {
                const color = pitchToColor(n.note);  // color 是 [r, g, b]
                drawCircle({ x: n.x, y: n.y, r: n.r }, `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.7)`)
            }
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
        y: mapRange(midiNote, 24, 84, canvas['midi'].cvs.height, 0),
        r: mapRange(velocity, 60, 127, 20, 50)
    });
}

function pitchToColor(pitch) {
    // pitch: MIDI 音高 (0~127)
    // 將其映射為色相 hue (0~360)，例如 40~100 會落在彩虹範圍
    const hue = Math.floor((pitch / 127) * 360);  // 0~360
    const saturation = 100;  // %，飽和度
    const lightness = 60;    // %，亮度

    return hslToRgb(hue, saturation, lightness);
}

// 將 HSL 轉為 RGB 數組
function hslToRgb(h, s, l) {
    s /= 100;
    l /= 100;
    const k = n => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = n =>
        l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}



export function midiDrawLoop(now) {
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
        if (n.x > 180) {
            const color = pitchToColor(n.note);  // color 是 [r, g, b]
            drawCircle({ x: n.x, y: n.y, r: n.r }, `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.7)`)
        }
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

            // ✨ 加入動畫效果（例如漣漪）
            effects.push({
                x: 185,
                y: seq[i].y,
                radius: 0,
                alpha: 1.0  // 1.0 表示完全不透明
            });

            seq.splice(i, 1);
        }

    }

    // 畫特效動畫
    for (let i = effects.length - 1; i >= 0; i--) {
        let e = effects[i];

        canvas['midi'].ctx.beginPath();
        canvas['midi'].ctx.arc(e.x, e.y, e.radius, 0, 2 * Math.PI);
        canvas['midi'].ctx.strokeStyle = `rgba(255, 255, 255, ${e.alpha})`;
        canvas['midi'].ctx.lineWidth = 5;
        canvas['midi'].ctx.stroke();

        // 更新動畫狀態
        e.radius += Math.random() * (10 - 3) + 3;
        e.alpha -= 0.05;

        if (e.alpha <= 0) {
            effects.splice(i, 1);
        }
    }


    requestAnimationFrame(midiDrawLoop);
}

