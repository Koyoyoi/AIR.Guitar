import { midiApp } from "../main.js";
import { mapRange, soundSample, guitarStandard } from "../sound.js";
import { modeNum } from "../Controll/blockControll.js";

export let noteSeq = [];
let effectSeq = [], lyricSeq = [], stringSeq = [];
let lastTime = performance.now();   // 上一次動畫更新的時間，用來計算 dt
let isRolling = false, k = 0;
// draw graphics
const note = new PIXI.Graphics()
const blur = new PIXI.Graphics()
const effect = new PIXI.Graphics()

// 重設音符序列
export function resetSeq() { noteSeq = []; }

export async function rollSeq() {
    if (!isRolling && modeNum === 1) {
        const uniqueX = [...new Set(noteSeq.map(n => n.x))].sort((a, b) => a - b);

        const secondMinX = uniqueX[1];
        k = secondMinX - 185 == 0 ? 0 : secondMinX - 185;

        if (k !== 0) {
            noteSeq.forEach(n => {
                if (!n.hit) {
                    n.targetX = n.x - k;
                    n.vx = (n.targetX - n.x) / 10;  // 可調整動畫速度（10 趟內完成）
                }
            });
            isRolling = true;
        }

    }
}


// 加入畫面序列中（位置、速度、大小等資訊）
export function animateSeq(context, velocity = 0, duration = 1.5, posX = midiApp.canvas.width * 0.8) {
    if (typeof context === 'number') {
        if (velocity > 0) {
            noteSeq.push({
                note: context,
                v: velocity,
                d: duration,
                x: posX,
                targetX: posX, // 初始與 x 相同
                vx: 0,         // 初始速度為 0
                y: mapRange(context, 24, 84, midiApp.canvas.height - 100, 100),
                r: mapRange(velocity, 60, 127, 10, 25),
                scale: 1,
                hit: false,
                hitTime: 0,
            });
        } else {
            const candidates = guitarStandard
                .map((note, idx) => ({ note, idx }))
                .filter(item => item.note <= context);

            let closestIndex;

            if (candidates.length === 0) {
                closestIndex = guitarStandard.reduce((prevIndex, currNote, currIndex) => {
                    return Math.abs(currNote - context) < Math.abs(guitarStandard[prevIndex] - context)
                        ? currIndex : prevIndex;
                }, 0);
            } else {
                closestIndex = candidates.reduce((prev, curr) => {
                    return Math.abs(curr.note - context) < Math.abs(prev.note - context)
                        ? curr : prev;
                }).idx;
            }

            stringSeq[closestIndex] = 1;
        }
    }
    else if (typeof context === 'string') {
        lyricSeq.push({
            t: context,
            x: posX
        })
    }
}

// 將 MIDI 音高對應為 PIXI 支援的十六進位顏色
function pitchToHexColor(pitch, tone = 'G') {
    let baseHue = (pitch / 127) * 360; // 基礎色相

    // 根據 tone 調整色相偏移
    switch (tone) {
        case 'G': baseHue = (baseHue + 0) % 360; break;   // 綠調
        case 'B': baseHue = (baseHue + 120) % 360; break; // 藍調
        case 'R': baseHue = (baseHue + 240) % 360; break; // 紅調
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
        drawLyric();
    }
    // mode 0 可視化音符與吉他和弦線條
    else {
        drawString();           // 畫吉他線條
    }
    removeSeq();                         // 播放音效、刪除舊音符
    requestAnimationFrame(midiDrawLoop); // 呼叫下一幀
}

function drawLyric() {
    const style = new PIXI.TextStyle({
        fontFamily: 'Arial',
        fontSize: 50,
        fontWeight: 'bold',
        fill: 0xBDC0BA,
        align: 'left',
        alpha: 0.6
    });

    lyricSeq.forEach((n) => {
        if (n.x > 180 && n.x < midiApp.canvas.width) {
            const text = new PIXI.Text({
                text: n.t,
                style
            });

            text.anchor.set(0.5, 0);      // anchor 設定在文字中間
            text.x = n.x;                 // 使用指定位置 x
            text.y = midiApp.canvas.height - 100;                  // 固定 y 座標，例如畫面上方

            midiApp.stage.addChild(text);
        }
    });
}

function drawNote() {
    note.clear();
    blur.clear();

    for (let i = noteSeq.length - 1; i >= 0; i--) {
        const n = noteSeq[i];

        // 平滑移動
        if (isRolling && !n.hit) {
            if (Math.abs(n.x - n.targetX) > 1) {
                n.x += n.vx;
            } else {
                n.x = n.targetX;
                n.vx = 0;
            }
        }

        // 畫音符與模糊
        if ((n.x > 180 && n.x < midiApp.canvas.width) || n.hit) {
            blur.circle(n.x, n.y, n.r * 1.3 * n.scale)
                .fill({ color: pitchToHexColor(n.note), alpha: 0.2 });

            note.circle(n.x, n.y, n.r * n.scale)
                .fill({ color: pitchToHexColor(n.note), alpha: 0.6 });

            n.scale > 1 ? n.scale -= 0.2 : n.scale = 1;
        }

        midiApp.stage.addChild(blur);
        midiApp.stage.addChild(note);

        // 移除 hit 音符
        if (n.hit) {
            n.hitTime--;
            if (n.hitTime <= 0) {
                noteSeq.splice(i, 1);
            }
        }
    }

    // 所有音符都移動完畢時再結束滾動
    if (isRolling && noteSeq.every(n => Math.abs(n.x - n.targetX) < 1 || n.hit)) {
        isRolling = false;
    }
}


// 畫出擊中動畫效果
function drawEffects() {
    effect.clear();
    for (let i = effectSeq.length - 1; i >= 0; i--) {
        let e = effectSeq[i];

        if (e.type === "particle") {
            e.x += e.vx;
            e.y += e.vy;
            e.alpha -= 0.03;
            e.radius *= 0.96; // 粒子慢慢變小
            e.life--;
            effect.circle(e.x, e.y, e.radius || 5)
                .fill({ color: e.color || 0xffcc33, alpha: e.alpha });
            if (e.life <= 0 || e.alpha <= 0 || e.radius < 0.5) {
                effectSeq.splice(i, 1);
            }
        }
    }
    midiApp.stage.addChild(effect);
}

// 移除掉出畫面的音符，並觸發音效與特效
function removeSeq() {

    for (let i = noteSeq.length - 1; i >= 0; i--) {
        if (noteSeq[i].x < 180 && noteSeq[i].x < midiApp.canvas.width && !noteSeq[i].hit) {
            if (noteSeq[i].v > 0) {
                soundSample.play(
                    noteSeq[i].note,
                    0,
                    { gain: noteSeq[i].v / 127 * 3, duration: modeNum == 2 ? 2 : noteSeq[i].d }
                );
            }

            if (modeNum == 1) {
                // 播放特效
                for (let j = 0; j < 5; j++) {
                    effectSeq.push({
                        type: "particle",
                        x: 185,
                        y: noteSeq[i].y,
                        vx: (Math.random() - 0.5) * 10,
                        vy: (Math.random() - 0.5) * 10,
                        alpha: 1.0,
                        life: 20 + Math.random() * 10,
                        radius: 10 + Math.random() * 5,
                        color: Math.random() < 0.5 ? 0xffcc33 : 0xff6666
                    });
                }

                // 標記為已擊中
                noteSeq[i].hit = true;
                noteSeq[i].hitTime = 10; // 保留顯示 10 幀
                noteSeq[i].scale = 2.5;  // 放大
                noteSeq[i].x = 185;      // 固定在擊中位置
            }
        }
    }
}

// 根據 guitarChord 中的音高畫出對應橫線
function drawString() {
    const segments = 200;
    const segmentWidth = midiApp.canvas.width / segments;
    const waveFreq = 3;
    const maxJitter = 10;
    const time = performance.now() * 0.01;

    for (let i = 0; i < stringSeq.length; i++) {
        if (stringSeq[i] > 0) {
            const strings = new PIXI.Graphics();
            const poseY = midiApp.canvas.height - 100 - i * 80;
            const note = guitarStandard[i];
            const alpha = stringSeq[i];

            for (let j = 0; j < segments; j++) {
                const x = j * segmentWidth;
                const t = j / segments;
                const envelope = Math.sin(Math.PI * t);
                const jitter = Math.sin(2 * Math.PI * waveFreq * t + time * 5) * envelope * maxJitter;
                const y = poseY + jitter;

                const rectWidth = segmentWidth * 1.1;
                const rectHeight = 10;

                strings.roundRect(x, y - rectHeight / 2, rectWidth, rectHeight)
                    .fill({ color: pitchToHexColor(note, 'R'), alpha: alpha });
            }

            midiApp.stage.addChild(strings);
            stringSeq[i] -= 0.04;
        }
    }
}
