import { midiApp } from "../main.js";
import { mapRange, soundSample, guitarStandard } from "../sound.js";
import { modeNum } from "../Controll/blockControll.js";

// 儲存目前畫面上的音符序列
export let seq = [];
// 用來存音符圖形
const notes = [];
let effects = [];                 // 用來儲存特效動畫（例如漣漪）
let lastTime = performance.now(); // 上一次動畫更新的時間，用來計算 dt
let isRolling = false, rollCnt = 0;

// 重設音符序列
export function resetSeq() {
    seq = [];
}

// 播放序列時，將音符往左移動，並畫出可見的圓形
export async function rollSeq() {
    if (!isRolling && mode == 1) { isRolling = true; }
}

// 當音符觸發時，加入畫面序列中（位置、速度、大小等資訊）
export function animateSeq(midiNote, velocity = 0, duration = 1.5, posX = midiApp.canvas.width * 0.8) {
    seq.push({
        note: midiNote,
        v: velocity,
        d: duration,
        x: posX,
        y: mapRange(midiNote, 24, 84, midiApp.canvas.height, 0),
        r: mapRange(velocity, 60, 127, 10, 25),
        alpha: 1
    });
}

// 將 MIDI 音高對應為 PIXI 支援的十六進位顏色
function pitchToHexColor(pitch) {
    let h = Math.floor((pitch / 127) * 360); // 音高對應色相
    let s = 100, l = 60;
    s /= 100;
    l /= 100;
    const k = n => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = n =>
        l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));

    const r = Math.round(f(0) * 255);
    const g = Math.round(f(8) * 255);
    const b = Math.round(f(4) * 255);

    // 回傳十六進位整數，例如 0xFF3366
    return (r << 16) + (g << 8) + b;
}

// 主動畫迴圈
export function midiDrawLoop(now) {
    const dt = (now - lastTime) / 1000;  // 計算每幀時間差
    const speed = 200;
    lastTime = now;

    midiApp.stage.removeChildren(); // 清空畫布

    // mode 1：顯示動畫模式
    if (modeNum == 1) {

        const hitLine = new PIXI.Graphics()
            .roundRect(185, 0, 5, midiApp.canvas.height, 5)
            .fill('#434343');
        midiApp.stage.addChild(hitLine);

        seq.forEach(n => {
            if (isRolling) {
                n.x -= 20
            }
            if (n.x > 180 && n.x < midiApp.canvas.width) {
                const g = new PIXI.Graphics()
                    .circle(n.x, n.y, n.r)
                    .fill({ color: pitchToHexColor(n.note), alpha: 0.6 });
                midiApp.stage.addChild(g);
            }
        });
        if (isRolling) { rollCnt += 1; }
        if (rollCnt == 5) { isRolling = false; rollCnt = 0 }

        drawEffects();  // 畫特效漣漪
    }
    // mode 0 可視化音符與吉他和弦線條
    else {
        seq.forEach(n => {
            n.x -= speed * dt * 5;  // 快速流動
        });
        drawString(); // 畫吉他線條
    }

    removeSeq();    // 播放音效、刪除舊音符
    requestAnimationFrame(midiDrawLoop); // 呼叫下一幀
}

// 畫出擊中動畫效果
function drawEffects() {

    for (let i = effects.length - 1; i >= 0; i--) {
        let e = effects[i];

        if (e.type === "particle") {
            e.vy += 0.2; // 模擬重力
            e.x += e.vx;
            e.y += e.vy;
            e.alpha -= 0.03;
            e.radius *= 0.96; // 粒子慢慢變小
            e.life--;

            const g = new PIXI.Graphics();
            g.beginFill(e.color || 0xffcc33, e.alpha);
            g.drawCircle(e.x, e.y, e.radius || 5);
            g.endFill();
            midiApp.stage.addChild(g);

            if (e.life <= 0 || e.alpha <= 0 || e.radius < 0.5) {
                effects.splice(i, 1);
            }
        }

        // 其他特效邏輯 ...
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
                    { gain: seq[i].v / 127 * 3, duration: modeNum == 2 ? 2 : seq[i].d }
                );
            }

            // 若為動畫模式，觸發擊中特效
            if (modeNum == 1) {
                for (let j = 0; j < 10; j++) {
                    effects.push({
                        type: "particle",
                        x: 185,
                        y: seq[i].y,
                        vx: (Math.random() - 0.5) * 8,
                        vy: (Math.random() - 0.5) * 8,
                        alpha: 1.0,
                        life: 20 + Math.random() * 10,
                        radius: 5 + Math.random() * 5,
                        color: Math.random() < 0.5 ? 0xffcc33 : 0xff6666
                    });
                }

                seq.splice(i, 1); // 移除已播放的音符
            }
        }
    }
}

// 根據 guitarChord 中的音高畫出對應橫線
function drawString() {
    for (let i = seq.length - 1; i >= 0; i--) {
        const n = seq[i];
        n.alpha -= 0.04;

        if (n.alpha < 0) {
            seq.splice(i, 1);
            continue; // 不需再處理這個元素
        }

        const candidates = guitarStandard
            .map((note, idx) => ({ note, idx }))
            .filter(item => item.note <= n.note);

        let closestIndex;

        if (candidates.length === 0) {
            // 沒有小於等於 n.note 的，找最接近的
            closestIndex = guitarStandard.reduce((prevIndex, currNote, currIndex) => {
                return Math.abs(currNote - n.note) < Math.abs(guitarStandard[prevIndex] - n.note)
                    ? currIndex : prevIndex;
            }, 0);
        } else {
            // 找小於等於 note 中最接近的
            closestIndex = candidates.reduce((prev, curr) => {
                return Math.abs(curr.note - n.note) < Math.abs(prev.note - n.note)
                    ? curr : prev;
            }).idx;
        }

        drawWavyLine(closestIndex, guitarStandard[closestIndex], n.alpha);
    }

}

function drawWavyLine(stringNumber, note, alpha) {
    const segments = 200;
    const poseY = midiApp.canvas.height - 100 - stringNumber * 80;
    const segmentWidth = midiApp.canvas.width / segments;
    const waveFreq = 3
    const maxJitter = 10
    const time = performance.now() * 0.01;

    const g = new PIXI.Graphics();

    for (let i = 0; i < segments; i++) {
        const x = i * segmentWidth;
        const t = i / segments;
        const envelope = Math.sin(Math.PI * t);
        const jitter = Math.sin(2 * Math.PI * waveFreq * t + time * 5) * envelope * maxJitter;
        const y = poseY + jitter;

        const rectWidth = segmentWidth * 1.1; // 加寬讓它們重疊
        const rectHeight = 10;

        g.roundRect(x, y - rectHeight / 2, rectWidth, rectHeight).fill({ color: pitchToHexColor(note), alpha: alpha });
    }

    midiApp.stage.addChild(g);
}

