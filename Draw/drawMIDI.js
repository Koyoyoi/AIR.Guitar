import { midiApp } from "../main.js";
import { soundSample, guitarStandard, revRootTab, mapRange } from "../sound.js";
import { modeNum, capo } from "../Controll/blockControll.js";
import { pitchToColor } from "../midiEvent.js";

// 音符、歌詞、琴弦序列
export let noteSeq = [],
    lyricSeq = [],
    stringSeq = new Array(6).fill(null).map(() => ({ note: null, alpha: 0 }));

let effectSeq = [];  // 特效序列
let lastTime = performance.now();
let lastFpsUpdate = lastTime;
let fps = 0;
let isRolling = false;
let pressed_V = 0;

const note7Map = {
    0: '1', 1: '1', 2: '2', 3: '2', 4: '3', 5: '4',
    6: '4', 7: '5', 8: '5', 9: '6', 10: '6', 11: '7'
};

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
export function rollSeq(velocites = 0) {
    if (!isRolling && modeNum === 1 && noteSeq.length > 0) {
        if (velocites != 0)
            pressed_V = mapRange(velocites, 100, midiApp.canvas.height - 100, 127, 60)

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



// 主動畫迴圈
export function midiDrawLoop(now) {
    const dt = (now - lastTime) / 1000;
    lastTime = now;

    const currentFPS = 1 / dt;
    fps = Math.round(currentFPS);

    // 每秒輸出一次 FPS 到 console
    if (now - lastFpsUpdate >= 1000) {
        // console.log(`FPS: ${fps}`);
        lastFpsUpdate = now;
    }

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
        const style = new PIXI.TextStyle({
            fontFamily: 'Arial',
            fontSize: 40,
            fontWeight: 'bold',
            fill: ctrl.x == 185 ? 0xF7C242 : 0xBDC0BA,
            align: 'left',
        });

        // 滾動時往左移
        if (isRolling && !ctrl.hit) {
            if (ctrl.x - ctrl.targetX > 25) {
                ctrl.x -= 25;  // 速度可調整
            } else {
                ctrl.x = ctrl.targetX
            }
        }

        // 繪製音符
        for (let i = 1; i < group.length; i++) {
            const n = group[i];
            if (ctrl.x < 185 || ctrl.x > midiApp.canvas.width) continue;

            let posY = n.isReady ? midiApp.canvas.height / 2 : mapRange(n.note, 36, 84, midiApp.canvas.height - 150, 150)

            blur.circle(ctrl.x, posY, n.r * 1.3 * ctrl.scale)
                .fill({ color: n.color, alpha: 0.2 });

            note.circle(ctrl.x, posY, n.r * ctrl.scale)
                .fill({ color: n.color, alpha: 0.6 });

            if (!n.isReady && !ctrl.hit) {
                const text = new PIXI.Text({
                    text: note7Map[n.note % 12],
                    style: style
                });
                text.anchor.set(0.5, 0);
                text.x = ctrl.x;
                text.y = posY - 60

                midiApp.stage.addChild(text);
            }

            if (i == group.length - 1 && !ctrl.hit) {
                const text = new PIXI.Text({
                    text: ctrl.lyric,
                    style: style
                });
                text.anchor.set(0.5, 0);
                text.x = ctrl.x;
                text.y = posY + n.r + 10

                midiApp.stage.addChild(text);

            }
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
    if (!isRolling || noteSeq.length == 0) return

    for (let group of noteSeq) {
        const ctrl = group[0];

        if (ctrl.x < 180 && !ctrl.hit) {  // 避免重複觸發
            for (let i = 1; i < group.length; i++) {
                const n = group[i];

                if (n.v > 0) {
                    soundSample.play(n.note, 0, {
                        gain: pressed_V == 0 ? n.v / 127 * 3 : pressed_V / 127 * 3,
                        duration: modeNum === 2 ? 2 : n.d
                    });
                }
                let posY = n.isReady ? midiApp.canvas.height / 2 : mapRange(n.note, 36, 84, midiApp.canvas.height - 150, 150)
                for (let j = 0; j < 5; j++) {
                    effectSeq.push({
                        type: "particle",
                        x: ctrl.x,
                        y: posY,
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
    pressed_V = 0;
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
                    .fill({ color: pitchToColor(guitarStandard[i], 'M', 240), alpha: stringSeq[i].alpha });
            }
            midiApp.stage.addChild(string);
            stringSeq[i].alpha -= 0.03;

            const style = new PIXI.TextStyle({
                fontFamily: 'Arial',
                fontSize: 50,
                fontWeight: 'bold',
                fill: pitchToColor(guitarStandard[i], 'M', 240),
                align: 'left',
                alpha: stringSeq[i].alpha
            });
            const text = new PIXI.Text({
                text: revRootTab[(stringSeq[i].note + capo) % 12] + Math.floor((stringSeq[i].note + capo) / 12),
                style: style
            });
            text.anchor.set(0.5, 0);
            text.x = 80;
            text.y = poseY - 55;

            midiApp.stage.addChild(text);
        }
    }
}

