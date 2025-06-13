import { midiApp } from "../main.js";
import { soundSample, guitarStandard, revRootTab, mapRange } from "../sound.js";
import { modeNum, capo } from "../Controll/blockControll.js";
import { pitchToColor, vx } from "../midiEvent.js";

// 序列資料
export let noteSeq = [];
export let lyricSeq = [];
export let stringSeq = new Array(6).fill(null).map(() => ({ note: null, alpha: 0 }));

// 特效序列與狀態控制
let effectSeq = [];
let lastTime = performance.now();
let lastFpsUpdate = lastTime;
let fps = 0;
let isRolling = false;

// 音高對應數字
const note7Map = {
    0: '1', 1: '1#', 2: '2', 3: '2#', 4: '3', 5: '4',
    6: '4#', 7: '5', 8: '5#', 9: '6', 10: '6#', 11: '7'
};

// PIXI 圖
const note = new PIXI.Graphics();
const blur = new PIXI.Graphics();
const effect = new PIXI.Graphics();
const string = new PIXI.Graphics();

// 重設音符序列
export function resetSeq() {
    noteSeq = [];
}

// 啟動滾動動畫
export function rollSeq(velocities = 0) {
    if (!isRolling && modeNum === 1 && noteSeq.length > 0) {

        isRolling = true;
        let offset = noteSeq.length <= 1 ? 10 : noteSeq[1][0].x - noteSeq[0][0].x;

        // set target x
        for (let col = 0; col < noteSeq.length; col++) {
            noteSeq[col][0].targetX = noteSeq[col][0].x - offset;
        }

        // push effect and sound out
        let pressed_V = mapRange(velocities, 100, midiApp.canvas.height - 100, 127, 60);

        for (let i = 1; i < noteSeq[0].length; i++) {
            const n = noteSeq[0][i];
            if (n.v > 0) {
                soundSample.play(n.note, 0, {
                    gain: velocities === 0 ? n.v / 127 * 3 : pressed_V / 127 * 3,
                    duration: modeNum === 2 ? 2 : n.d
                });
            }

            for (let j = 0; j < 5; j++) {
                effectSeq.push({
                    type: "particle",
                    x: noteSeq[0][0].x,
                    y: n.y,
                    vx: (Math.random() - 0.5) * 10,
                    vy: (Math.random() - 0.5) * 10,
                    alpha: 1.0,
                    life: 20 + Math.random() * 10,
                    radius: 10 + Math.random() * 5,
                    color: Math.random() < 0.5 ? 0xffcc33 : 0xff6666
                });
            }
        }

        Object.assign(noteSeq[0][0], { hit: true, scale: 2.5 });
        noteSeq[0][0].x == 185;

    }
}

// 主動畫迴圈
export function midiDrawLoop(now) {
    const dt = (now - lastTime) / 1000;
    lastTime = now;

    fps = Math.round(1 / dt);
    if (now - lastFpsUpdate >= 1000) {
        lastFpsUpdate = now;
    }

    midiApp.stage.removeChildren();

    if (modeNum === 1) {
        drawEffects();
        drawNote();
    } else {
        drawString();
    }

    requestAnimationFrame(midiDrawLoop);
}

// 音符繪製
function drawNote() {
    if (noteSeq.length <= 0) return;

    note.clear();
    blur.clear();

    for (let col = 0; col < noteSeq.length; col++) {
        const group = noteSeq[col];
        const ctrl = group[0];

        const style = new PIXI.TextStyle({
            fontFamily: 'Arial',
            fontSize: 60,
            fontWeight: 'bold',
            fill: ctrl.x === 185 ? 0xF7C242 : 0xBDC0BA,
            align: 'left',
        });

        // 滾動動畫
        if (isRolling && !ctrl.hit) {
            ctrl.x = (ctrl.x - ctrl.targetX > vx)
                ? ctrl.x - vx
                : ctrl.targetX;
        }

        // 繪製群組音符與歌詞
        for (let i = 1; i < group.length; i++) {
            const n = group[i];
            if (ctrl.x < 185 || ctrl.x > midiApp.canvas.width) continue;

            blur.circle(ctrl.x, n.y, n.r * 1.3 * ctrl.scale)
                .fill({ color: n.color, alpha: 0.2 });

            note.circle(ctrl.x, n.y, n.r * ctrl.scale)
                .fill({ color: n.color, alpha: 0.4 });

            let decimalPlaces = ctrl.dltB.toString().split(".")[1]?.length || 0;
            let result = ctrl.dltB * Math.pow(10, decimalPlaces);
            if (result % 3 == 0 && decimalPlaces > 0) {
                note.circle(ctrl.x + n.r + 10, n.y + n.r, n.r / 2 * ctrl.scale)
                    .fill({ color: n.color, alpha: 0.4 });
            }

            if (i == 1 && !ctrl.hit) {
                const text = new PIXI.Text({
                    text: n.readyNote > 0 ? n.readyNote : note7Map[n.note % 12],
                    style: style,
                    x: ctrl.x,
                    y: n.y - 100
                });
                text.anchor.set(0.5, 0);
                midiApp.stage.addChild(text);
            }

            if (i === group.length - 1 && !ctrl.hit) {
                const text = new PIXI.Text({
                    text: ctrl.lyric,
                    style: style,
                    x: ctrl.x,
                    y: n.y + n.r + 10
                });
                text.anchor.set(0.5, 0);
                midiApp.stage.addChild(text);
            }

            if (!ctrl.hit) ctrl.scale = Math.max(1, ctrl.scale - 0.2);
        }

        if (ctrl.hit) {
            ctrl.x = 185;
            ctrl.scale -= 0.3;
        }
    }

    // 移除觸發後的音符
    if (noteSeq.length > 0 && noteSeq[0][0].hit && noteSeq[0][0].scale < 0) {
        noteSeq.splice(0, 1);
    }

    midiApp.stage.addChild(blur);
    midiApp.stage.addChild(note);

    // 停止滾動條件
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

// 琴弦動畫繪製
function drawString() {
    string.clear();
    const segments = 200;
    const segmentWidth = midiApp.canvas.width / segments;
    const waveFreq = 3, maxJitter = 10;
    const time = performance.now() * 0.01;

    for (let i = 0; i < stringSeq.length; i++) {
        const str = stringSeq[i];
        if (str.alpha > 0) {
            const poseY = midiApp.canvas.height - 100 - i * 80;

            for (let j = 0; j < segments; j++) {
                const x = j * segmentWidth;
                const t = j / segments;
                const envelope = Math.sin(Math.PI * t);
                const jitter = Math.sin(2 * Math.PI * waveFreq * t + time * 5) * envelope * maxJitter;
                const y = poseY + jitter;

                string.roundRect(x, y - 5, segmentWidth * 1.1, 10)
                    .fill({ color: pitchToColor(guitarStandard[i], 'M', 240), alpha: str.alpha });
            }

            midiApp.stage.addChild(string);
            str.alpha -= 0.03;

            const style = new PIXI.TextStyle({
                fontFamily: 'Arial',
                fontSize: 50,
                fontWeight: 'bold',
                fill: pitchToColor(guitarStandard[i], 'M', 240),
                align: 'left',
                alpha: str.alpha
            });

            const text = new PIXI.Text({
                text: revRootTab[(str.note + capo) % 12] + Math.floor((str.note + capo) / 12),
                style
            });
            text.anchor.set(0.5, 0);
            text.x = 80;
            text.y = poseY - 55;

            midiApp.stage.addChild(text);
        }
    }
}
