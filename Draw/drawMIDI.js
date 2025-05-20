import { midiApp } from "../main.js";
import { mapRange, soundSample, guitarStandard } from "../sound.js";
import { modeNum } from "../Controll/blockControll.js";

// 儲存目前畫面上的音符序列
export let seq = [];
let effects = [];                 // 用來儲存特效動畫（例如漣漪）
let lastTime = performance.now(); // 上一次動畫更新的時間，用來計算 dt
let isRolling = false, rollCnt = 0, nScale = 1;

// 重設音符序列
export function resetSeq() { seq = []; }

// 播放序列時，將音符往左移動，並畫出可見的圓形
export async function rollSeq() {
    if (!isRolling && modeNum == 1) { isRolling = true; }
}

// 當音符觸發時，加入畫面序列中（位置、速度、大小等資訊）
export function animateSeq(midiNote, velocity = 0, duration = 1.5, posX = midiApp.canvas.width * 0.8) {
    seq.push({
        note: midiNote,
        v: velocity,
        d: duration,
        x: posX,
        y: mapRange(midiNote, 24, 84, midiApp.canvas.height - 200, 200),
        r: mapRange(velocity, 60, 127, 10, 25),
        alpha: 1,
        scale: 1,
        hit: false,      // 是否已擊中
        hitTime: 0       // 擊中後顯示幾幀
    });
}

// 將 MIDI 音高對應為 PIXI 支援的十六進位顏色
function pitchToHexColor(pitch, tone = 'G') {
    let baseHue = (pitch / 127) * 360; // 基礎色相

    // 根據 tone 調整色相偏移
    switch (tone) {
        case 'G': baseHue = (baseHue + 0) % 360; break;   // 紅調（不變）
        case 'B': baseHue = (baseHue + 120) % 360; break; // 綠調
        case 'R': baseHue = (baseHue + 240) % 360; break; // 藍調
    }

    let h = Math.floor(baseHue);
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

    return (r << 16) + (g << 8) + b;
}


// 主動畫迴圈
export function midiDrawLoop(now) {
    const dt = (now - lastTime) / 1000;  // 計算每幀時間差
    const speed = 10;
    lastTime = now;

    midiApp.stage.removeChildren(); // 清空畫布

    // mode 1：顯示動畫模式
    if (modeNum == 1) {
        drawEffects();  // 畫特效
        drawNote();
        if (isRolling) { rollCnt += 1; }
        if (rollCnt == 5) { isRolling = false; rollCnt = 0 }
    }
    // mode 0 可視化音符與吉他和弦線條
    else {
        seq.forEach(n => {
            n.x -= speed * dt;  // 快速流動
        });
        drawString();           // 畫吉他線條
    }
    nScale += (1 - nScale) * 0.15;
    removeSeq();                         // 播放音效、刪除舊音符
    requestAnimationFrame(midiDrawLoop); // 呼叫下一幀
}

function drawNote() {
    for (let i = seq.length - 1; i >= 0; i--) {
        const n = seq[i];

        if (isRolling && !n.hit) {
            n.x -= 20;
        }

        if ((n.x > 180 && n.x < midiApp.canvas.width) || n.hit) {
            // glow layer
            const glow = new PIXI.Graphics()
                .circle(n.x, n.y, n.r * 1.2 * nScale)
                .fill({ color: pitchToHexColor(n.note), alpha: 0.2 });
            glow.filters = [new PIXI.BlurFilter({ strength: 8, quality: 4, resolution: 1, kernelSize: 5 })];
            midiApp.stage.addChild(glow);

            // main circle
            const g = new PIXI.Graphics()
                .circle(n.x, n.y, n.r * nScale)
                .fill({ color: pitchToHexColor(n.note), alpha: 0.7 });
            midiApp.stage.addChild(g);
        }

        // 處理擊中動畫的縮小與刪除
        if (n.hit) {
            n.hitTime--;
            if (n.hitTime <= 0) {
                seq.splice(i, 1); // 動畫結束移除
            }
        }
    }
}

// 畫出擊中動畫效果
function drawEffects() {
    for (let i = effects.length - 1; i >= 0; i--) {
        let e = effects[i];

        if (e.type === "particle") {
            e.x += e.vx;
            e.y += e.vy;
            e.alpha -= 0.03;
            e.radius *= 0.96; // 粒子慢慢變小
            e.life--;

            const g = new PIXI.Graphics()
                .circle(e.x, e.y, e.radius || 5)
                .fill({ color: e.color || 0xffcc33, alpha: e.alpha });
            midiApp.stage.addChild(g);

            if (e.life <= 0 || e.alpha <= 0 || e.radius < 0.5) {
                effects.splice(i, 1);
            }
        }
    }
}

// 移除掉出畫面的音符，並觸發音效與特效
function removeSeq() {
    for (let i = seq.length - 1; i >= 0; i--) {
        if (seq[i].x < 180 && !seq[i].hit) {
            if (seq[i].v > 0) {
                soundSample.play(
                    seq[i].note,
                    0,
                    { gain: seq[i].v / 127 * 3, duration: modeNum == 2 ? 2 : seq[i].d }
                );
            }

            if (modeNum == 1) {
                // 播放特效
                for (let j = 0; j < 10; j++) {
                    effects.push({
                        type: "particle",
                        x: 185,
                        y: seq[i].y,
                        vx: (Math.random() - 0.5) * 10,
                        vy: (Math.random() - 0.5) * 10,
                        alpha: 1.0,
                        life: 20 + Math.random() * 10,
                        radius: 5 + Math.random() * 5,
                        color: Math.random() < 0.5 ? 0xffcc33 : 0xff6666
                    });
                }

                // 標記為已擊中
                seq[i].hit = true;
                seq[i].hitTime = 10; // 保留顯示 10 幀
                nScale = 2;  // 放大
                seq[i].x = 185;      // 固定在擊中位置
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

        g.roundRect(x, y - rectHeight / 2, rectWidth, rectHeight).fill({ color: pitchToHexColor(note, 'R'), alpha: alpha });
    }

    midiApp.stage.addChild(g);
}

