import { canvas } from "../main.js";
import { drawCircle, drawLine } from "./drawGraph.js";
import { mapRange, guitarChord, soundSample } from "../sound.js";
import { modeNum, isPlay } from "../Controll/blockControll.js";

// 儲存目前畫面上的音符序列
export let seq = [];

let effects = [];                 // 用來儲存特效動畫（例如漣漪）
let lastTime = performance.now(); // 上一次動畫更新的時間，用來計算 dt

// 重設音符序列
export function resetSeq() {
    seq = [];
}

// 播放序列時，將音符往左移動，並畫出可見的圓形
export async function rollSeq() {
    for (let i = 0; i < 10; i++) {
        seq.forEach(n => {
            n.x -= 100 / 10;  // 每一回合向左移動
            if (n.x > 180) {
                const color = pitchToColor(n.note);  // 音高對應顏色
                drawCircle({ x: n.x, y: n.y, r: n.r }, `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.6)`);
            }
        });
    }
}

// 當音符觸發時，加入畫面序列中（位置、速度、大小等資訊）
export function animateSeq(midiNote, velocity = 0, duration = 1.5, posX = canvas['midi'].cvs.width * 0.8, posY = 0) {
    seq.push({
        note: midiNote,
        v: velocity,
        d: duration,
        x: posX,
        y: mapRange(midiNote, 24, 84, canvas['midi'].cvs.height, 0),
        r: mapRange(velocity, 60, 127, 20, 50)
    });
}

// 將 MIDI 音高對應為 RGB 顏色
function pitchToColor(pitch) {
    let h = Math.floor((pitch / 127) * 360); // 音高對應色相
    let s = 100, l = 60;
    s /= 100;
    l /= 100;
    const k = n => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = n =>
        l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

// 主動畫迴圈
export function midiDrawLoop(now) {
    const dt = (now - lastTime) / 1000;  // 計算每幀時間差
    const speed = 200;
    lastTime = now;

    // 清空畫布
    canvas['midi'].ctx.clearRect(0, 0, canvas['midi'].cvs.width, canvas['midi'].cvs.height);

    // mode 2：顯示動畫模式
    if (modeNum == 2) {
        drawLine(200, 0, 200, canvas['midi'].cvs.height, '#888'); // 擊中線
        seq.forEach(n => {
            if (isPlay) {}
            if (n.x > 180) {
                const color = pitchToColor(n.note);
                drawCircle({ x: n.x, y: n.y, r: n.r }, `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.6)`);
            }
        });
        drawEffects();  // 畫特效漣漪
        removeSeq();    // 播放音效、刪除舊音符
    }
    // mode 0 或 1：可視化音符與吉他和弦線條
    else {
        seq.forEach(n => {
            n.x -= modeNum == 2 ? speed * dt : speed * dt * 10;  // 快速流動
        });
        drawChordLine(); // 畫吉他和弦線條
        removeSeq();     // 播放音效、刪除舊音符
    }

    requestAnimationFrame(midiDrawLoop); // 呼叫下一幀
}

// 畫出動畫效果（如漣漪圈）
function drawEffects() {
    for (let i = effects.length - 1; i >= 0; i--) {
        let e = effects[i];
        canvas['midi'].ctx.beginPath();
        canvas['midi'].ctx.arc(e.x, e.y, e.radius, 0, 2 * Math.PI);
        canvas['midi'].ctx.strokeStyle = `rgba(255, 255, 255, ${e.alpha})`;
        canvas['midi'].ctx.lineWidth = 5;
        canvas['midi'].ctx.stroke();

        // 擴散動畫
        e.radius += Math.random() * (10 - 3) + 3;
        e.alpha -= 0.05;

        // 若完全透明則移除
        if (e.alpha <= 0) {
            effects.splice(i, 1);
        }
    }
}

// 移除掉出畫面的音符，並觸發音效與特效
function removeSeq() {
    for (let i = seq.length - 1; i >= 0; i--) {
        if (seq[i].x < 180) {
            // 音量大於 0 時才播放聲音
            if (seq[i].v > 0) {
                soundSample.play(
                    seq[i].note,
                    0,
                    { velocity: seq[i].v, duration: seq[i].d }
                );
            }

            // 若為動畫模式，觸發擊中特效
            if (modeNum == 2) {
                effects.push({
                    x: 185,
                    y: seq[i].y,
                    radius: 0,
                    alpha: 1.0
                });
            }

            seq.splice(i, 1); // 移除已播放的音符
        }
    }
}

// 根據 guitarChord 中的音高畫出對應橫線
function drawChordLine() {
    guitarChord.forEach(n => {
        const baseY = mapRange(n, 36, 68, canvas['midi'].cvs.height, 100);
        const color = pitchToColor(n);

        canvas['midi'].ctx.strokeStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, 1)`;
        canvas['midi'].ctx.lineWidth = 10;
        canvas['midi'].ctx.beginPath();

        if (seq.some(s => s.note === n)) {       // 若有對應音符，畫波浪線
            drawWavyLine(baseY, n);           
        } else {                                 // 否則畫直線
            canvas['midi'].ctx.moveTo(0, baseY);
            canvas['midi'].ctx.lineTo(canvas['midi'].cvs.width, baseY);
        }

        canvas['midi'].ctx.stroke();
    });
}

// 畫出波浪線
function drawWavyLine(baseY, n) {
    const segments = 100;
    const segmentWidth = canvas['midi'].cvs.width / segments;
    const waveFreq = mapRange(n, 48, 56, 2, 12);
    const maxJitter = mapRange(n, 48, 56, 20, 2);
    const time = performance.now() * 0.01;

    canvas['midi'].ctx.beginPath();

    for (let i = 0; i <= segments; i++) {
        const x = i * segmentWidth;
        const t = i / segments;
        const envelope = Math.sin(Math.PI * t); 
        const jitter = Math.sin(2 * Math.PI * waveFreq * t + time * 5) * envelope * maxJitter;
        const y = baseY + jitter;

        if (i === 0) {
            canvas['midi'].ctx.moveTo(x, y);
        } else {
            canvas['midi'].ctx.lineTo(x, y);
        }
    }
}
