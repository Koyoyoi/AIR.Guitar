import { settingCtrl, loadImg, modeNum, reloadCtrl, touchCtrl, playCtrl, playNum } from "./Controll/blockControll.js";
import { chordCtrl, touchPointCtrl, pluckCtrl, strumCtrl } from "./Controll/musicControll.js";
import { setupMediaPipe, detectHand, detectPose } from "./MediaPipe.js";
import { initMIDIPort, buildGuitarChord } from "./sound.js";
import { drawHand, drawSongName, reCanva } from "./Draw/drawInfo.js";
import { midiDrawLoop } from "./Draw/drawMIDI.js";
import { midiProcess } from "./midiEvent.js"
import { load_SVM_Model } from "./SVM.js";

//  全域變數宣告區 
export let video, baseApp, midiApp, uiApp;
export let handData = { "Left": [], "Right": [] }, poseData = [];

let videoSprite, overlay;

async function initCanvas() {
    // 設定畫布與繪圖環境
    baseApp = new PIXI.Application()
    await baseApp.init({
        backgroundColor: 0x1c1c1c,
        width: 1280,
        height: 720,
    });
    midiApp = new PIXI.Application()
    await midiApp.init({
        backgroundAlpha: 0,
        width: 1280,
        height: 720,
    });
    uiApp = new PIXI.Application()
    await uiApp.init({
        backgroundAlpha: 0,
        width: 1280,
        height: 720,
    });

    overlay = new PIXI.Graphics()
        .rect(0, 0, baseApp.canvas.width, baseApp.canvas.height)
        .fill({ color: 0x1c1c1c, alpha: 0.7 });

    // 確保 midiApp初始化完成後再操作 canvas
    document.querySelector('.canvas-wrapper').appendChild(baseApp.canvas);
    document.querySelector('.canvas-wrapper').appendChild(midiApp.canvas);
    document.querySelector('.canvas-wrapper').appendChild(uiApp.canvas);
}

// 相機設定與畫布初始化 
async function setupCamera() {
    video = document.createElement("video");
    video.style.display = "none";

    // 啟動相機串流
    const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } }
    });

    video.srcObject = stream;

    return new Promise((resolve) => {
        video.onloadedmetadata = () => {
            console.log("Video size:", video.videoWidth, video.videoHeight);

            // 顯示標題
            document.getElementById("title").textContent = "AIR Guitar";

            // 隱藏 loading 畫面
            document.getElementById("loading").classList.add("hidden");

            // 顯示上傳介面
            document.querySelector(".upload-section")?.classList.add("show");

            const texture = PIXI.Texture.from(video);
            videoSprite = new PIXI.Sprite(texture);

            // 設定原始寬高
            videoSprite.width = video.videoWidth;
            videoSprite.height = video.videoHeight;
            // 水平翻轉
            videoSprite.scale.x = -1;
            // 因為翻轉後會往左邊跑掉，要調整 x 讓它顯示在畫面內
            videoSprite.x = video.videoWidth;

            // 設定畫布尺寸調整事件
            reCanva();
            window.addEventListener("resize", reCanva);

            resolve(video);
        };
    });
}

// 網頁載入完成後，處理檔案上傳 MIDI
window.onload = async function () {
    // 確保 Magenta.js 已載入
    if (typeof mm === "undefined") {
        console.error("Magenta.js 未正確載入！");
        return;
    }
    document.getElementById("file-upload").addEventListener("change", async function (event) {
        const file = event.target.files[0];
        if (!file || modeNum == 0) return;
        await midiProcess(file);
    });
};

// 主偵測函式：處理即時畫面、偵測、與音樂互動 
async function detectLoop() {
    baseApp.stage.removeChildren();
    uiApp.stage.removeChildren();
    baseApp.stage.addChild(videoSprite);

    if (modeNum == 1) baseApp.stage.addChild(overlay);

    // 執行 MediaPipe 偵測
    await detectHand();
    await detectPose();

    // 控制聲音
    await strumCtrl();
    await pluckCtrl(modeNum);
    if (playNum == 1 && modeNum == 1) {
        await touchPointCtrl(handData['Left'], handData['Right'])
    }

    // 顯示控制區
    settingCtrl()

    if (modeNum == 0) {
        await chordCtrl();
    }
    if (modeNum == 1) {
        drawHand(handData)
        reloadCtrl();
        drawSongName();
        touchCtrl();
        playCtrl();
    }

    // 重置追蹤資料
    handData["Left"] = [];
    handData["Right"] = [];
    poseData = [];

    // 持續偵測
    requestAnimationFrame(detectLoop);
}

// 主程式：載入模組並開始偵測 
async function main() {
    await loadImg();             // 載入圖檔 ./IMGs
    await setupMediaPipe();      // MediaPipe 模組初始化
    await load_SVM_Model();      // 載入手勢模型
    await initCanvas();          // 畫布設定
    await setupCamera();         // 相機設定
    await initMIDIPort();        // MIDI 設定

    buildGuitarChord('C');       // 建立預設 C 和弦
    detectLoop();                // base canva detect loop
    midiDrawLoop();              // midi canva  draw  loop
}

// 等待 HTML 載入完成後啟動主程式 
window.addEventListener('DOMContentLoaded', async () => {
    main();
});
