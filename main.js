import { settingCtrl, loadImg, modeNum, playNum, loadLanguage } from "./Controll/blockControll.js";
import { chordCtrl, pinchCtrl, pluckCtrl, strumCtrl, wavingCtrl } from "./Controll/musicControll.js";
import { setupMediaPipe, detectHand, detectPose } from "./models/MediaPipe.js";
import { initMIDIPort, buildGuitarChord } from "./sound.js";
import { drawHand, drawSongName, drawFinger } from "./Draw/drawInfo.js";
import { midiDrawLoop } from "./Draw/drawMIDI.js";
import { midiProcess } from "./midiEvent.js"
import { load_SVM_Model } from "./models/SVM.js";
import { loadMidiFiles } from "./Controll/midList.js";

// --- 全域變數宣告 ---
export let video, baseApp, midiApp, uiApp;
export let handData = { "Left": [], "Right": [] }, poseData = [];
export let webCam = false;

let videoSprite, overlay;

// --- 初始化畫布 ---
async function initCanvas() {
    const wrapper = document.querySelector('.canvas-wrapper');
    baseApp = new PIXI.Application();
    await baseApp.init({ resizeTo: wrapper, antialias: true });

    midiApp = new PIXI.Application();
    await midiApp.init({ backgroundAlpha: 0, resizeTo: wrapper, antialias: true });

    uiApp = new PIXI.Application();
    await uiApp.init({ backgroundAlpha: 0, resizeTo: wrapper, antialias: true });

    overlay = new PIXI.Graphics()
        .rect(0, 0, baseApp.renderer.width, baseApp.renderer.height)
        .fill({ color: 0x1c1c1c, alpha: 0.5 });

    // PIXI canvas append
    wrapper.appendChild(baseApp.canvas);
    wrapper.appendChild(midiApp.canvas);
    wrapper.appendChild(uiApp.canvas);

    // overlay 隨 baseApp canvas resize
    baseApp.renderer.on('resize', () => {
        overlay.clear()
            .rect(0, 0, baseApp.renderer.width, baseApp.renderer.height)
            .fill({ color: 0x1c1c1c, alpha: 0.5 });
    });
    // 更新 UI 狀態
    //document.getElementById("title").textContent = "AIR Guitar";
    document.getElementById("loading").classList.add("hidden");
    document.querySelector(".show-list-btn")?.classList.add("show");

}

export async function setupCamera(ctrl = 'open') {
    if (ctrl === 'close') {
        // 關閉攝影機並停止所有串流 track
        if (video?.srcObject) {
            video.srcObject.getTracks().forEach(track => track.stop());
            video.srcObject = null;
        }
        webCam = false;
        return null;
    }

    // ctrl === 'open' 或其他值 → 嘗試開啟攝影機
    video = document.createElement("video");
    video.style.display = "none";

    let stream;
    try {
        stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: baseApp.renderer.width }, height: { ideal: baseApp.renderer.height } }
        });
        webCam = true;
        video.srcObject = stream;
    } catch (err) {
        console.warn("使用者未允許或沒有鏡頭", err);
        webCam = false;
        return null;
    }

    return new Promise((resolve) => {
        video.onloadedmetadata = () => {
            if (webCam) {

                setupVideoSprite();
            }
            resolve(video);
        };
        video.play().catch(e => console.warn("無法自動播放攝影機影像", e));
    });
}
export let scale
function setupVideoSprite() {
    const texture = PIXI.Texture.from(video);
    videoSprite = new PIXI.Sprite(texture);

    videoSprite.x = baseApp.renderer.width;
    videoSprite.y = 0;
    videoSprite.width = baseApp.renderer.width;
    videoSprite.height = baseApp.renderer.height;
    // 水平鏡像
    videoSprite.scale.x = -videoSprite.scale.x;
    scale = -videoSprite.scale.x

}

// --- 主迴圈 ---
async function detectLoop() {
    baseApp.stage.removeChildren();
    uiApp.stage.removeChildren();
    setupVideoSprite();

    if (webCam) baseApp.stage.addChild(videoSprite);
    if (modeNum === 1 || modeNum === 2) baseApp.stage.addChild(overlay);

    if (webCam && !(video.videoWidth === 0 || video.videoHeight === 0)) {
        await detectHand();
        await detectPose();
    }

    settingCtrl();

    switch (modeNum) {
        case 0:
            if (webCam) {
                await chordCtrl();
                await strumCtrl();
                await pluckCtrl();
                drawFinger(handData['Right']);
            }
            break;
        case 1:
            drawHand(handData);
            drawSongName();
            if (webCam) {
                if (playNum == 0) {
                    await pluckCtrl();
                }
                else if (playNum === 1) {
                    await pinchCtrl(handData['Right'], handData['Left']);
                } else if (playNum === 2) {
                    await wavingCtrl(handData['Right'], handData['Left']);
                }
            }
            break;
        case 2:
            if (webCam) {
                drawSongName();
                drawHand(handData);
                await chordCtrl();
                await wavingCtrl(handData['Right'], handData['Left']);
            }
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
    await loadLanguage();
    await loadImg();
    await loadMidiFiles();
    await setupMediaPipe();
    await load_SVM_Model();
    await initCanvas();
    await setupCamera();
    await initMIDIPort();

    buildGuitarChord('C');
    detectLoop();
    midiDrawLoop();
}

// --- 啟動點 ---
window.addEventListener('DOMContentLoaded', main);
