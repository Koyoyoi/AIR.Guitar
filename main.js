import { settingCtrl, midiPortCtrl, ModeCtrl, sampleNameArea, loadImg, showAllCtrl, modeNum } from "./Controll/blockControll.js";
import { initMIDIPort, buildGuitarChord } from "./sound.js";
import { capoCtrl, chordCtrl, pluckCtrl, strumCtrl } from "./Controll/musicControll.js";
import { setupMediaPipe, detectHand, detectPose } from "./MediaPipe.js";
import { midiDrawLoop, animateSeq, resetSeq } from "./Draw/drawMIDI.js";
import { reCanva } from "./Draw/drawInfo.js";
import { load_SVM_Model } from "./SVM.js";

//  全域變數宣告區 
export let video, drawingUtils;
export let midiCanvas, midiCtx;
export let handData = { "Left": [], "Right": [] }, poseData = [];
export let baseApp, midiApp, uiApp;

let videoSprite;

// 相機設定與畫布初始化 
async function setupCamera() {
    video = document.createElement("video");
    video.style.display = "none";

    // 啟動相機串流
    const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } }
    });

    video.srcObject = stream;

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
    midiApp.stage.sortableChildren = true;
    midiApp.canvas.style.pointerEvents = 'none';

    uiApp = new PIXI.Application()
    await uiApp.init({
        backgroundAlpha: 0,
        width: 1280,
        height: 720,
    });

    // 確保 midiApp初始化完成後再操作 canvas
    document.querySelector('.canvas-wrapper').appendChild(baseApp.canvas);
    document.querySelector('.canvas-wrapper').appendChild(midiApp.canvas);
    document.querySelector('.canvas-wrapper').appendChild(uiApp.canvas);

    // drawingUtils = new DrawingUtils(baseApp.canvas.ctx);

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

            videoSprite.zIndex = 0;


            // 設定畫布尺寸調整事件
            reCanva();
            window.addEventListener("resize", reCanva);

            resolve(video);
        };
    });
}

// 網頁載入完成後，處理檔案上傳邏輯（圖片或 MIDI）
window.onload = async function () {
    // 確保 Magenta.js 已載入（MIDI 用）
    if (typeof mm === "undefined") {
        console.error("Magenta.js 未正確載入！");
        return;
    }

    document.getElementById("file-upload").addEventListener("change", async function (event) {
        const file = event.target.files[0];
        if (!file) return;
        console.log("檔案名稱:", file.name);

        //  處理 MIDI 檔 
        if (file.name.endsWith(".mid") || file.name.endsWith(".midi")) {
            resetSeq();

            const arrayBuffer = await file.arrayBuffer();
            const blob = new Blob([arrayBuffer], { type: "audio/midi" });

            // 使用 Magenta.js 解析 MIDI
            let midifile = await mm.blobToNoteSequence(blob);

            const xMap = new Map();
            let i = 0;

            midifile.notes.sort((a, b) => a.startTime - b.startTime);

            midifile.notes.forEach((note) => {
                if (21 <= note.pitch && note.pitch <= 108 && !note.isDrum) {
                    // col controll
                    if (!xMap.has(note.startTime)) {
                        xMap.set(note.startTime, 185 + i * 100);
                        i++;
                    }
                    // add to animate sequence
                    animateSeq(
                        note.pitch,
                        note.velocity,
                        (note.endTime - note.startTime),
                        modeNum == 1 ? xMap.get(note.startTime) : video.videoWidth * 0.8 + note.startTime * 200 * 10,
                    )
                };
            });

        }
        //  非支援格式 
        else {
            alert("請上傳圖片或 MIDI 檔案！");
        }
    });
};

// 主偵測函式：處理即時畫面、偵測、與音樂互動 
async function detectLoop() {
    baseApp.stage.removeChildren();
    uiApp.stage.removeChildren();
    baseApp.stage.addChild(videoSprite);

    // 執行 MediaPipe 偵測
    await detectHand();
    await detectPose();

    // 顯示控制區
    if (showAllCtrl) {
        midiPortCtrl();
        sampleNameArea();
        ModeCtrl();
    }
    settingCtrl()

    // 音樂控制
    if (modeNum != 1) {
        await chordCtrl();
        await capoCtrl();
    }
    await pluckCtrl();
    await strumCtrl();


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
    await setupCamera();         // 相機與畫布設定
    await initMIDIPort();        // MIDI 設定

    buildGuitarChord('C');       // 建立預設 C 和弦
    detectLoop();                // base canva detect loop
    midiDrawLoop();              // midi canva  draw  loop


}

// 等待 HTML 載入完成後啟動主程式 
window.addEventListener('DOMContentLoaded', async () => {
    await main();
});
