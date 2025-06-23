import { settingCtrl, loadImg, modeNum, playNum, handCtrl, } from "./Controll/blockControll.js";
import { chordCtrl, pinchCtrl, pluckCtrl, strumCtrl, wavingCtrl } from "./Controll/musicControll.js";
import { setupMediaPipe, detectHand, detectPose } from "./MediaPipe.js";
import { initMIDIPort, buildGuitarChord } from "./sound.js";
import { drawHand, drawSongName, reCanva, drawFinger } from "./Draw/drawInfo.js";
import { midiDrawLoop } from "./Draw/drawMIDI.js";
import { midiProcess } from "./midiEvent.js"
import { load_SVM_Model } from "./SVM.js";

// --- 全域變數宣告 ---
export let video, baseApp, midiApp, uiApp;
export let handData = { "Left": [], "Right": [] }, poseData = [];

let videoSprite, overlay;

// --- 初始化畫布 ---
async function initCanvas() {
    baseApp = new PIXI.Application();
    await baseApp.init({ backgroundColor: 0x1c1c1c, width: 1280, height: 720 });

    midiApp = new PIXI.Application();
    await midiApp.init({ backgroundAlpha: 0, width: 1280, height: 720 });

    uiApp = new PIXI.Application();
    await uiApp.init({ backgroundAlpha: 0, width: 1280, height: 720 });

    overlay = new PIXI.Graphics()
        .rect(0, 0, baseApp.canvas.width, baseApp.canvas.height)
        .fill({ color: 0x1c1c1c, alpha: 0.5 });

    const wrapper = document.querySelector('.canvas-wrapper');
    wrapper.appendChild(baseApp.canvas);
    wrapper.appendChild(midiApp.canvas);
    wrapper.appendChild(uiApp.canvas);
}

// --- 初始化攝影機 ---
async function setupCamera() {
    video = document.createElement("video");
    video.style.display = "none";

    const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } }
    });

    video.srcObject = stream;

    return new Promise((resolve) => {
        video.onloadedmetadata = () => {
            document.getElementById("title").textContent = "AIR Guitar";
            document.getElementById("loading").classList.add("hidden");
            document.querySelector(".upload-section")?.classList.add("show");

            const texture = PIXI.Texture.from(video);
            videoSprite = new PIXI.Sprite(texture);
            videoSprite.width = video.videoWidth;
            videoSprite.height = video.videoHeight;
            videoSprite.scale.x = -1;
            videoSprite.x = video.videoWidth;

            reCanva();
            window.addEventListener("resize", reCanva);

            resolve(video);
        };
    });
}

// --- MIDI 檔上傳事件 ---
function setupFileUpload() {
    document.getElementById("file-upload").addEventListener("change", async (event) => {
        const file = event.target.files[0];
        if (!file) return;
        await midiProcess(file);
    });
}

// --- 主迴圈 ---
async function detectLoop() {
    baseApp.stage.removeChildren();
    uiApp.stage.removeChildren();
    baseApp.stage.addChild(videoSprite);
    if (modeNum === 1 || modeNum === 2) baseApp.stage.addChild(overlay);

    await detectHand();
    await detectPose();

    settingCtrl();

    switch (modeNum) {
        case 0:
            await chordCtrl();
            await strumCtrl();
            await pluckCtrl();
            drawFinger(handData['Right']);
            break;
        case 1:
            drawHand(handData);
            drawSongName();
            if (playNum == 0) {
                await pluckCtrl();
            }
            else if (playNum === 1) {
                await pinchCtrl(handData['Right'], handData['Left']);
            } else if (playNum === 2) {
                await wavingCtrl(handData['Right'], handData['Left']);
            }
            break;
        case 2:
            drawSongName();
            drawHand(handData);
            await chordCtrl();
            await pinchCtrl(handData['Right']);
            await wavingCtrl(handData['Right'], handData['Left']);
            break;
    }

    // 重置追蹤資料
    handData["Left"] = [];
    handData["Right"] = [];
    poseData = [];

    requestAnimationFrame(detectLoop);
}

// --- 主程式初始化 ---
async function main() {
    await loadImg();
    await setupMediaPipe();
    await load_SVM_Model();
    await initCanvas();
    await setupCamera();
    await initMIDIPort();

    buildGuitarChord('C');

    setupFileUpload();
    detectLoop();
    midiDrawLoop();
}

// --- 啟動點 ---
window.addEventListener('DOMContentLoaded', main);
