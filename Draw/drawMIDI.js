import { soundSample, guitarStandard, revRootTab, mapRange, note7Map, rootTab, guitarChord } from "../sound.js";
import { modeNum, capo } from "../Controll/blockControll.js";
import { pitchToColor, key } from "../midiEvent.js";
import { gesture } from "../Controll/musicControll.js";
import { midiApp } from "../main.js";

// 序列資料
export let noteSeq = [];
export let lyricSeq = [];
export let stringSeq = new Array(6).fill(null).map(() => ({ note: null, alpha: 0 }));

// 特效序列與狀態控制
let effectSeq = { 'scale': [], 'spike': [] };
let lastTime = performance.now();
let lastFpsUpdate = lastTime;
let fps = 0;
let isRolling = false, isLoad = false;
let dx = 30;

// PIXI 圖
const note = new PIXI.Graphics();
const blur = new PIXI.Graphics();
const effect = new PIXI.Graphics();
const string = new PIXI.Graphics();

// 重設音符序列
export async function resetSeq() {
    noteSeq = [];
}

// 啟動滾動動畫
export async function rollSeq(velocities = 0) {

    if (noteSeq.length > 0) {
        if (modeNum === 1) {

            isRolling = true;
            let offset = noteSeq.length <= 1 ? 10 : noteSeq[1][0].x - 185 

            // set target x
            for (let col = 0; col < noteSeq.length; col++) {
                noteSeq[col][0].targetX = noteSeq[col][0].x - offset;
            }

            // push effect and sound out
            let pressed_V = mapRange(velocities, 100, midiApp.canvas.height - 100, 127, 60);

            for (let i = 1; i < noteSeq[0].length; i++) {
                const n = noteSeq[0][i];
                // sound 
                if (n.v > 0) {
                    soundSample.play(n.note, 0, {
                        gain: velocities === 0 ? n.v / 127 * 3 : pressed_V / 127 * 3,
                        duration: modeNum === 2 ? 2 : n.d
                    });
                }
                // effect
                effectSeq['scale'].push({
                    x: noteSeq[0][0].x,
                    y: n.y,
                    r: n.r * 2.5,
                    color: n.color
                });

                for (let j = 0; j < 5; j++) {
                    effectSeq['spike'].push({
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
            noteSeq.shift();
        }
        else if (modeNum === 2) {
            let isEqual = note7Map[rootTab[gesture[0]]] == note7Map[(noteSeq[0][1].note - key) % 12][0]
            if (isEqual) {

                let noteGroup = noteSeq[0]
                noteSeq.shift(); // 移除第一個 object
                if (velocities == 'Down') {
                    function sleep(ms) {
                        return new Promise(resolve => setTimeout(resolve, ms));
                    }
                    let v = noteGroup[1].v
                    let d = noteGroup[1].d
                    for (let i = 0; i < guitarChord.length; i++) {
                        soundSample.play(guitarChord[i], 0, {
                            gain: v / 127 * 3,
                            duration: modeNum === 2 ? 2 : d

                        });
                        await sleep(100); // 等待 10 毫秒
                    }

                }
                else {
                    for (let i = 1; i < noteGroup.length; i++) {
                        const n = noteGroup[i];

                        if (n.v > 0) {
                            soundSample.play(n.note, 0, {
                                gain: n.v / 127 * 3,
                                duration: modeNum === 2 ? 2 : n.d
                            });
                        }
                    }

                }

            }
        }
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

    if (modeNum === 0) {
        drawString();
        isLoad = false
    }
    else if (modeNum === 1) {
        drawEffects();
        drawNote();
    }
    else if (modeNum === 2) {
        drawNext();
    }

    if (noteSeq.length == 0) {

        const style = new PIXI.TextStyle({
            fontFamily: 'Arial',
            fontSize: 100,
            fontWeight: 'bold',
            fill: 0xBDC0BA,
            align: 'left',
        });

        const text = new PIXI.Text({
            text: isLoad ? "End" : "",
            style: style,
            x: midiApp.canvas.width / 2,
            y: midiApp.canvas.height / 2
        });
        text.anchor.set(0.5, .5);
        midiApp.stage.addChild(text);

    } else {
        isLoad = true
    }

    requestAnimationFrame(midiDrawLoop);
}

function drawNext() {
    if (noteSeq.length <= 0) return;

    while (noteSeq[0][1].readyNote) {
        noteSeq.shift();
    }

    for (let i = 0; i < 5; i++) {

        if (noteSeq[i] == undefined) break

        let ctrl = noteSeq[i][0]
        let n = noteSeq[i][1]

        const style = new PIXI.TextStyle({
            fontFamily: 'Arial',
            fontSize: 80,
            fontWeight: 'bold',
            fill: i == 0 ? 0xF7C242 : 0xBDC0BA,
            align: 'left',
        });

        const text = new PIXI.Text({
            text: n.readyNote > 0 ? n.readyNote : note7Map[(n.note - key) % 12],
            style: style,
            x: midiApp.canvas.width / 2 + i * 200 - 100,
            y: midiApp.canvas.height * 0.25 + 25
        });
        text.anchor.set(0.5, 0);
        midiApp.stage.addChild(text);

        const lryic = new PIXI.Text({
            text: ctrl.lyric,
            style: style,
            x: midiApp.canvas.width / 2 + i * 200 - 140,
            y: midiApp.canvas.height * 0.25 + 100
        });
        text.anchor.set(0.5, 0);
        midiApp.stage.addChild(lryic);
    }
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
            fill: col === 0 ? 0xF7C242 : 0xBDC0BA,
            align: 'left',
        });

        // 滾動動畫
        if (isRolling) {
            ctrl.x = (ctrl.x - ctrl.targetX > ctrl.vx) ? ctrl.x - ctrl.vx : ctrl.targetX;
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
            if (result % 3 == 0 && decimalPlaces > 0 && !n.isReady) {
                note.circle(ctrl.x + n.r + 15, n.y + n.r / 3, n.r / 2 * ctrl.scale)
                    .fill({ color: n.color, alpha: 0.4 });
            }
            // note name
            if (i == 1) {
                const text = new PIXI.Text({
                    text: n.readyNote > 0 ? n.readyNote : note7Map[(n.note - key) % 12],
                    style: style,
                    x: ctrl.x,
                    y: n.y - 100
                });
                text.anchor.set(0.5, 0);
                midiApp.stage.addChild(text);
            }
            // lyric
            if (i === group.length - 1) {
                const text = new PIXI.Text({
                    text: ctrl.lyric,
                    style: style,
                    x: ctrl.x,
                    y: n.y + n.r + 10
                });
                text.anchor.set(0.5, 0);
                midiApp.stage.addChild(text);
            }

        }
    }

    midiApp.stage.addChild(blur);
    midiApp.stage.addChild(note);

    // 停止滾動條件
    if (isRolling && noteSeq.length > 0 && noteSeq[0][0].x === 185) {
        isRolling = false;
    }
}

// 粒子特效繪製
function drawEffects() {
    effect.clear();

    for (let i = 0; i < effectSeq['scale'].length; i++) {
        const e = effectSeq['scale'][i];
        e.r *= 0.85;

        effect.circle(e.x, e.y, e.r)
            .fill({ color: e.color, alpha: 0.5 });

        if (e.r < 10) {
            effectSeq['scale'].splice(i, 1);
        }
    }

    for (let i = effectSeq['spike'].length - 1; i >= 0; i--) {
        const e = effectSeq['spike'][i];
        e.x += e.vx;
        e.y += e.vy;
        e.alpha -= 0.03;
        e.radius *= 0.96;
        e.life--;

        effect.circle(e.x, e.y, e.radius)
            .fill({ color: e.color, alpha: e.alpha });

        if (e.life <= 0 || e.alpha <= 0 || e.radius < 0.5) {
            effectSeq['spike'].splice(i, 1);
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
            text.x = 180;
            text.y = poseY - 55;

            midiApp.stage.addChild(text);
        }
    }
}
