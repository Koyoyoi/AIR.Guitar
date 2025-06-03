import { midiApp } from "../main.js";
import { soundSample, guitarStandard, revRootTab, mapRange } from "../sound.js";
import { modeNum, capo } from "../Controll/blockControll.js";
import { tempo } from "../midiEvent.js";

// 音符、歌詞、琴弦序列
export let noteSeq = [],
    lyricSeq = [],
    stringSeq = new Array(6).fill(null).map(() => ({ note: null, alpha: 0 }));

let effectSeq = [];  // 特效序列
let lastTime = performance.now();
let isRolling = false;

// PIXI 圖層
const note = new PIXI.Graphics();
const blur = new PIXI.Graphics();
const effect = new PIXI.Graphics();
const string = new PIXI.Graphics();

// 重設音符序列
export function resetSeq() {
    noteSeq = [];
}

// 啟動滾動（外部事件呼叫）
export function rollSeq() {
    if (!isRolling && modeNum === 1 && noteSeq.length > 0) {
        isRolling = true;
        let offset
        if (noteSeq.length <= 1)
            offset = 10
        else
            offset = noteSeq[1][0].x - noteSeq[0][0].x
        for (let col = 0; col < noteSeq.length; col++) {
            noteSeq[col][0].targetX = noteSeq[col][0].x - offset
        }
    }
}

// pitch 映射 HEX 色碼
function pitchToHexColor(pitch, tone = 'G') {
    let baseHue = (pitch / 127) * 360;
    if (tone === 'B') baseHue += 120;
    else if (tone === 'R') baseHue += 240;
    baseHue %= 360;

    const h = Math.floor(baseHue);
    const s = 1, l = 0.6;
    const k = n => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));

    const r = Math.round(f(0) * 255);
    const g = Math.round(f(8) * 255);
    const b = Math.round(f(4) * 255);

    return (r << 16) + (g << 8) + b;
}

// 主動畫迴圈
export function midiDrawLoop(now) {
    const dt = (now - lastTime) / 1000;
    lastTime = now;

    midiApp.stage.removeChildren();

    if (modeNum === 1) {
        drawEffects();
        drawNote();
    } else {
        drawString();
    }

    removeSeq();

    requestAnimationFrame(midiDrawLoop);
}

// 音符繪製與移動動畫
function drawNote() {
    if (noteSeq.length <= 0) return;

    note.clear();
    blur.clear();

    for (let col = 0; col < noteSeq.length; col++) {
        const group = noteSeq[col];
        const ctrl = group[0];

        // 滾動時往左移
        if (isRolling) {
            if (ctrl.x - ctrl.targetX > 10) {
                ctrl.x -= 10;  // 速度可調整
            } else {
                ctrl.x = ctrl.targetX
            }
        }

        // 繪製音符
        for (let i = 1; i < group.length; i++) {
            const n = group[i];
            if (ctrl.x < 185 || ctrl.x > midiApp.canvas.width) continue;

            blur.circle(ctrl.x, ctrl.yList[i - 1], n.r * 1.3 * ctrl.scale)
                .fill({ color: pitchToHexColor(n.note), alpha: 0.2 });

            note.circle(ctrl.x, ctrl.yList[i - 1], n.r * ctrl.scale)
                .fill({ color: pitchToHexColor(n.note), alpha: 0.6 });

            // 縮放動畫
            if (!ctrl.hit) ctrl.scale = Math.max(1, ctrl.scale - 0.2);
        }
        // hit 動畫處理
        if (ctrl.hit) {
            ctrl.x = 185;
            ctrl.scale -= 0.3;
        }
    }

    // 移除已觸發的音符群組
    if (noteSeq.length > 0 && noteSeq[0][0].hit && noteSeq[0][0].scale < 0) {
        noteSeq.splice(0, 1);
    }

    midiApp.stage.addChild(blur);
    midiApp.stage.addChild(note);

    // 判斷滾動結束條件
    if (isRolling && noteSeq.length > 0 && noteSeq[0][0].x === 185 && !noteSeq[0][0].hit) {
        isRolling = false;
    }
}

// 粒子特效繪製
function drawEffects() {
    effect.clear();

    for (let i = effectSeq.length - 1; i >= 0; i--) {
        const e = effectSeq[i];
        if (e.type === "particle") {
            e.x += e.vx;
            e.y += e.vy;
            e.alpha -= 0.03;
            e.radius *= 0.96;
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

// 移除已播放音符，並播放音效、特效
function removeSeq() {
    for (let group of noteSeq) {
        const ctrl = group[0];

        if (ctrl.x < 180 && !ctrl.hit) {  // 避免重複觸發
            for (let i = 1; i < group.length; i++) {
                const n = group[i];

                if (n.v > 0) {
                    soundSample.play(n.note, 0, {
                        gain: n.v / 127 * 3,
                        duration: modeNum === 2 ? 2 : n.d
                    });
                }

                for (let j = 0; j < 5; j++) {
                    effectSeq.push({
                        type: "particle",
                        x: ctrl.x,
                        y: ctrl.yList[i - 1],
                        vx: (Math.random() - 0.5) * 10,
                        vy: (Math.random() - 0.5) * 10,
                        alpha: 1.0,
                        life: 20 + Math.random() * 10,
                        radius: 10 + Math.random() * 5,
                        color: Math.random() < 0.5 ? 0xffcc33 : 0xff6666
                    });
                }
            }

            Object.assign(ctrl, {
                hit: true,
                scale: 2.5
            });

            ctrl.x = 185;  // 鎖定位置避免重複觸發
        }
    }
}

// 琴弦震動繪製
function drawString() {
    string.clear();
    const segments = 200;
    const segmentWidth = midiApp.canvas.width / segments;
    const waveFreq = 3, maxJitter = 10;
    const time = performance.now() * 0.01;

    for (let i = 0; i < stringSeq.length; i++) {
        if (stringSeq[i].alpha > 0) {
            const poseY = midiApp.canvas.height - 100 - i * 80;
            for (let j = 0; j < segments; j++) {
                const x = j * segmentWidth;
                const t = j / segments;
                const envelope = Math.sin(Math.PI * t);
                const jitter = Math.sin(2 * Math.PI * waveFreq * t + time * 5) * envelope * maxJitter;
                const y = poseY + jitter;
                string.roundRect(x, y - 5, segmentWidth * 1.1, 10)
                    .fill({ color: pitchToHexColor(guitarStandard[i], 'R'), alpha: stringSeq[i].alpha });
            }
            midiApp.stage.addChild(string);
            stringSeq[i].alpha -= 0.03;

            const style = new PIXI.TextStyle({
                fontFamily: 'Arial',
                fontSize: 50,
                fontWeight: 'bold',
                fill: pitchToHexColor(guitarStandard[i], 'R'),
                align: 'left',
                alpha: stringSeq[i].alpha
            });
            const text = new PIXI.Text(
                revRootTab[(stringSeq[i].note + capo) % 12] + Math.floor((stringSeq[i].note + capo) / 12),
                style
            );
            text.anchor.set(0.5, 0);
            text.x = 80;
            text.y = poseY - 55;

            midiApp.stage.addChild(text);
        }
    }
}

