import { DrawingUtils } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest";
import { capoCtrl, chordCtrl, pluckCtrl, strumCtrl } from "./musicControll.js";
import { setupMediaPipe, detectHand, detectPose } from "./MediaPipe.js";
import { initMIDI, buildGuitarChord, loadSamples } from "./sound.js";
import { reCanva, drawImg } from "./Draw/drawInfo.js";
import { draw_midiPortArea, draw_sampleNameArea } from "./Draw/drawCtrl.js"
import { load_SVM_Model } from "./SVM.js";
import { draw_midiAnimation } from "./Draw/drawMIDI.js";

// 全域變數
export let video, canvas, ctx, drawingUtils;
export let handData = { "Left": [], "Right": [] }, poseData = [];
export let uploadedImage = null;
export let mouse = {X: 0, Y: 0}
export let noteSequence = null;

// 設置相機（video）並初始化畫布（canvas）和相關設定
async function setupCamera() {
    video = document.createElement("video");
    video.style.display = "none";
    document.body.appendChild(video);

    const stream = await navigator.mediaDevices.getUserMedia({
        video: {
            width: { ideal: 1280 },
            height: { ideal: 720 }
        }
    });

    video.srcObject = stream;

    // 確保 canvas 在這裡抓取
    canvas = document.getElementById("myCanvas");
    ctx = canvas.getContext("2d");
    drawingUtils = new DrawingUtils(ctx);

    return new Promise((resolve) => {
        video.onloadedmetadata = () => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            console.log("Video size:", video.videoWidth, video.videoHeight);

            // 顯示標題
            const title = document.getElementById("title");
            title.textContent = "AIR Guitar";

            // 隱藏 Loading
            const loading = document.getElementById("loading");
            loading.classList.add("hidden");

            // 顯示上傳區塊
            const uploadSection = document.querySelector(".upload-section");
            if (uploadSection) {
                uploadSection.classList.add("show");
            }

            // 點擊畫布的事件處理
            canvas.addEventListener("click", (e) => {
                const rect = canvas.getBoundingClientRect(); // 取得 canvas 在畫面上的實際位置與尺寸
                const scaleX = canvas.width / rect.width;
                const scaleY = canvas.height / rect.height;

                mouse.X = (e.clientX - rect.left) * scaleX;
                mouse.Y = (e.clientY - rect.top) * scaleY;

                draw_midiPortArea();
                draw_sampleNameArea();
                
                mouse.X = 0
                mouse.Y = 0
            });

            video.play();

            // 重新調整畫布大小
            reCanva();
            window.addEventListener("resize", reCanva);

            resolve(video);
        };
    });
}

// 頁面加載完成後的初始化邏輯
window.onload = async function () {
    // 檢查 Magenta.js 是否正確加載
    if (typeof mm === "undefined") {
        console.error("Magenta.js 未正確載入！");
        return;
    }

    // 處理上傳檔案（圖片或 MIDI 檔案）
    document.getElementById("file-upload").addEventListener("change", async function (event) {
        const file = event.target.files[0];
        if (!file) return;

        console.log("檔案名稱:", file.name);

        // 處理圖片文件
        if (file.type.startsWith("image/")) {
            const reader = new FileReader();

            reader.onload = function (e) {
                const uploadedImage = new Image();

                uploadedImage.onload = function () {
                    console.log("圖片成功加載，準備繪製到畫布");
                    const canvas = document.getElementById("canvas");
                    const ctx = canvas.getContext("2d");
                    canvas.width = uploadedImage.width;
                    canvas.height = uploadedImage.height;
                    ctx.drawImage(uploadedImage, 0, 0);
                };

                uploadedImage.onerror = function () {
                    console.error("圖片加載錯誤");
                };

                uploadedImage.src = e.target.result;
            };

            reader.readAsDataURL(file);
        }
        // 處理 MIDI 檔案
        else if (file.name.endsWith(".mid") || file.name.endsWith(".midi")) {
            try {
                const arrayBuffer = await file.arrayBuffer();
                const blob = new Blob([arrayBuffer], { type: "audio/midi" });

                // load MIDI 檔案
                noteSequence = await mm.blobToNoteSequence(blob);

                console.log("🎶 MIDI 播放中...");

                draw_midiAnimation();
                noteSequence = null;

            } catch (err) {
                console.error("讀取 MIDI 發生錯誤：", err);
            }
        }
        
        else {
            alert("請上傳圖片或 MIDI 檔案！");
        }
    });
};

// 手勢與姿勢偵測主函式
async function detect() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // 繪製上傳的圖片與 MIDI 控制區域
    if (uploadedImage) { drawImg() }
    draw_midiPortArea();
    draw_sampleNameArea();

    // 偵測手勢與姿勢
    await detectHand();  // mediapipe 手勢偵測
    await detectPose();  // mediapipe 姿勢偵測

    await chordCtrl();   // 和弦手勢控制
    await pluckCtrl();   // 撥弦控制
    await strumCtrl();   // 掃弦控制
    await capoCtrl();    // 品位控制

    // 重置 handData、poseData
    handData['Left'] = [];
    handData['Right'] = [];
    poseData = [];

    // 使用 requestAnimationFrame 確保無限循環
    requestAnimationFrame(detect);
}

// 初始化主函式
async function main() {
    await loadSamples();
    await setupMediaPipe();
    await load_SVM_Model();
    await setupCamera();
    await initMIDI();
    buildGuitarChord('C');
    detect();               // 啟動偵測循環
}

// 等待 DOM 完成加載後執行
window.addEventListener('DOMContentLoaded', async () => {
    await main();
});
