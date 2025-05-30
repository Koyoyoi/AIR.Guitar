import { midiApp } from "../main.js";
import { soundSample, guitarStandard } from "../sound.js";
import { modeNum } from "../Controll/blockControll.js";
import { tempo } from "../midiEvent.js";

export let noteSeq = [], lyricSeq = [], stringSeq = [];  // 音符、歌詞、琴弦序列
let effectSeq = [];  // 特效序列
let lastTime = performance.now();
let isRolling = false;

// PIXI 圖層
const note = new PIXI.Graphics();       // 主音符
const blur = new PIXI.Graphics();       // 模糊圓圈
const effect = new PIXI.Graphics();     // 音效粒子
const string = new PIXI.Graphics();     // 琴弦波形

// 重設音符序列
export function resetSeq() {
    noteSeq = [];
}

// 平移畫面中的所有音符（推動音符向左）
export async function rollSeq() {
    if (!isRolling && modeNum === 1 && noteSeq.length > 0) {
        const uniqueX = [...new Set(noteSeq.map(n => n.x))].sort((a, b) => a - b);
        const targetX = uniqueX.length >= 2 ? uniqueX[1] : uniqueX[0];
        const k = targetX - 185 == 0 ? targetX : targetX - 185;

        if (noteSeq.length > 0) {
            const baseDuration = 10;
            // tempo越大速度越快，tempoFactor越小
            const tempoFactor = 60 / tempo;
            const durationFrames = Math.max(1, Math.floor(baseDuration * Math.max(1, Math.abs(k)) * tempoFactor / 100));
            console.log("durationFrames:", durationFrames, "tempo:", tempo);

            noteSeq.forEach(n => {
                if (!n.hit) {
                    n.targetX = n.x - k;
                    n.vx = (n.targetX - n.x) / durationFrames;
                }
            });

            isRolling = true
        }
    }
}

// 將 pitch 映射為 HEX 顏色
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
        drawEffects();   // 粒子特效
        drawNote();      // 音符顯示
        drawLyric();     // 歌詞顯示
    } else {
        drawString();    // 琴弦波動
    }
    removeSeq();         // 處理播放與刪除音符
    requestAnimationFrame(midiDrawLoop);
}

// 歌詞繪製
function drawLyric() {
    const style = new PIXI.TextStyle({ fontFamily: 'Arial', fontSize: 50, fontWeight: 'bold', fill: 0xBDC0BA });
    lyricSeq.forEach(n => {
        if (n.x > 180 && n.x < midiApp.canvas.width) {
            const text = new PIXI.Text({ text: n.t, style });
            text.anchor.set(0.5, 0);
            text.x = n.x;
            text.y = midiApp.canvas.height - 100;
            midiApp.stage.addChild(text);
        }
    });
}

// 音符繪製與縮放動畫
function drawNote() {
    note.clear();
    blur.clear();
    for (let i = noteSeq.length - 1; i >= 0; i--) {
        const n = noteSeq[i];
        if (isRolling && !n.hit) {
            if (Math.abs(n.x - n.targetX) > 1) n.x += n.vx;
            else { n.x = n.targetX; n.vx = 0; }
        }
        if ((n.x > 180 && n.x < midiApp.canvas.width) || n.hit) {
            blur.circle(n.x, n.y, n.r * 1.3 * n.scale)
                .fill({ color: pitchToHexColor(n.note), alpha: 0.2 });
            note.circle(n.x, n.y, n.r * n.scale)
                .fill({ color: pitchToHexColor(n.note), alpha: 0.6 });
            n.scale = Math.max(1, n.scale - 0.2);
        }
        if (n.hit && --n.hitTime <= 0) noteSeq.splice(i, 1);
    }
    midiApp.stage.addChild(blur);
    midiApp.stage.addChild(note);

    if (isRolling && noteSeq.every(n => Math.abs(n.x - n.targetX) < 1 || n.hit))
        isRolling = false;
}

// 特效繪製
function drawEffects() {
    effect.clear();
    for (let i = effectSeq.length - 1; i >= 0; i--) {
        let e = effectSeq[i];
        if (e.type === "particle") {
            e.x += e.vx; e.y += e.vy; e.alpha -= 0.03;
            e.radius *= 0.96; e.life--;
            effect.circle(e.x, e.y, e.radius || 5)
                .fill({ color: e.color || 0xffcc33, alpha: e.alpha });

            if (e.life <= 0 || e.alpha <= 0 || e.radius < 0.5)
                effectSeq.splice(i, 1);
        }
    }
    midiApp.stage.addChild(effect);
}

// 處理音符播放與消除
function removeSeq() {
    for (let i = noteSeq.length - 1; i >= 0; i--) {
        const n = noteSeq[i];
        if (n.x < 180 && !n.hit) {
            if (n.v > 0) {
                soundSample.play(n.note, 0, {
                    gain: n.v / 127 * 3,
                    duration: modeNum === 2 ? 2 : n.d
                });
            }
            if (modeNum === 1) {
                for (let j = 0; j < 5; j++) {
                    effectSeq.push({
                        type: "particle", x: 185, y: n.y,
                        vx: (Math.random() - 0.5) * 10,
                        vy: (Math.random() - 0.5) * 10,
                        alpha: 1.0, life: 20 + Math.random() * 10,
                        radius: 10 + Math.random() * 5,
                        color: Math.random() < 0.5 ? 0xffcc33 : 0xff6666
                    });
                }
                Object.assign(n, { hit: true, hitTime: 10, scale: 2.5, x: 185 });
            }
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
        if (stringSeq[i] > 0) {
            const poseY = midiApp.canvas.height - 100 - i * 80;
            const alpha = stringSeq[i];
            for (let j = 0; j < segments; j++) {
                const x = j * segmentWidth;
                const t = j / segments;
                const envelope = Math.sin(Math.PI * t);
                const jitter = Math.sin(2 * Math.PI * waveFreq * t + time * 5) * envelope * maxJitter;
                const y = poseY + jitter;
                string.roundRect(x, y - 5, segmentWidth * 1.1, 10)
                    .fill({ color: pitchToHexColor(guitarStandard[i], 'R'), alpha });
            }
            midiApp.stage.addChild(string);
            stringSeq[i] -= 0.03; // 漸淡消失
        }
    }
}
