import { settingCtrl, loadImg, modeNum, playNum } from "./Controll/blockControll.js";
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
export let webCam = false;

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

export async function setupCamera(ctrl = 'open') {
    if (ctrl === 'close') {
        // 關閉攝影機並停止所有串流 track
        if (video?.srcObject) {
            video.srcObject.getTracks().forEach(track => track.stop());
            video.srcObject = null;
        }
        webCam = false;

        // 切換成佔位圖
        const placeholderTexture = PIXI.Texture.from("images/no-camera.png");
        setupVideoSprite(placeholderTexture, 1280, 720);

        return null;
    }

    // ctrl === 'open' 或其他值 → 嘗試開啟攝影機
    video = document.createElement("video");
    video.style.display = "none";

    let stream;
    try {
        stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        webCam = true;
        video.srcObject = stream;
    } catch (err) {
        console.warn("使用者未允許或沒有鏡頭", err);
        webCam = false;

        // 顯示佔位圖
        const placeholderTexture = PIXI.Texture.from("images/no-camera.png");
        setupVideoSprite(placeholderTexture, 1280, 720);

        return null;
    }

    return new Promise((resolve) => {
        video.onloadedmetadata = () => {
            if (webCam) {
                const texture = PIXI.Texture.from(video);
                setupVideoSprite(texture, video.videoWidth, video.videoHeight);
            } else {
                const placeholderTexture = PIXI.Texture.from("images/no-camera.png");
                setupVideoSprite(placeholderTexture, 1280, 720);
            }
            resolve(video);
        };
        video.play().catch(e => console.warn("無法自動播放攝影機影像", e));
    });
}

function setupVideoSprite(texture, width, height) {
    // 更新 UI 狀態
    document.getElementById("title").textContent = "AIR Guitar";
    document.getElementById("loading").classList.add("hidden");
    document.querySelector(".upload-section")?.classList.add("show");

    videoSprite = new PIXI.Sprite(texture);
    videoSprite.width = width;
    videoSprite.height = height;
    videoSprite.scale.x = -1;
    videoSprite.x = width;

    reCanva();
    window.addEventListener("resize", reCanva);
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
    await loadImg();
    await setupMediaPipe();
    await load_SVM_Model();
    await initCanvas();
    await setupCamera();
    await initMIDIPort();

    const jsonUrl = 'https://imuse.ncnu.edu.tw/virtualpianostudio/audio/midi-files.json';
    const midiUrl = 'https://imuse.ncnu.edu.tw/virtualpianostudio/audio/望春風.mid';

    fetch(jsonUrl)
        .then(res => res.json())
        .then(json => {
            console.log('MIDI 檔清單:', json);
        })
        .catch(err => console.error('Fetch JSON error:', err));

    fetch(midiUrl)
        .then(res => res.arrayBuffer())
        .then(buffer => {
            console.log('透過 proxy 抓到 MIDI:', buffer);
            // 處理 buffer
            midiProcess(buffer)
        })
        .catch(err => console.error('Proxy Fetch Error:', err));



    buildGuitarChord('C');

    setupFileUpload();
    detectLoop();
    midiDrawLoop();
}

// --- 啟動點 ---
window.addEventListener('DOMContentLoaded', main);
