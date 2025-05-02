import { DrawingUtils } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest";
import { capoCtrl, chordCtrl, pluckCtrl, strumCtrl } from "./musicControll.js";
import { setupMediaPipe, detectHand, detectPose } from "./MediaPipe.js";
import { initMIDI, buildGuitarChord, loadSamples } from "./MIDI.js";
import { load_SVM_Model } from "./SVM.js";
import { reCanva, drawImg } from "./draw.js";


// 全域變數
export let video, canvas, ctx, drawingUtils;
export let handData = { "Left": [], "Right": [] }, poseData = [];
export let uploadedImage = null;


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

    canvas = document.createElement("canvas");
    document.body.appendChild(canvas);
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

            video.play();

            // resize 
            reCanva();
            window.addEventListener("resize", reCanva);

            resolve(video);
        };
    });
}

// upload event
document.getElementById("file-upload").addEventListener("change", function (event) {
    const file = event.target.files[0];
    if (!file) return;

    console.log("檔案名稱:", file.name);

    if (file.type.startsWith("image/")) {
        const reader = new FileReader();

        reader.onload = function (e) {
            uploadedImage = new Image();

            uploadedImage.onload = function () {
                console.log("圖片成功加載，準備繪製到畫布");
            };

            uploadedImage.onerror = function () {
                console.error("圖片加載錯誤");
            };

            uploadedImage.src = e.target.result;
        };

        reader.readAsDataURL(file);
    } else {
        console.log("上傳的文件不是圖片");
    }
});


async function detect() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // draw image
    if (uploadedImage) { drawImg() }

    await detectHand();  // mediapipe hand detect
    await detectPose();  // mediapipe pose detect

    await chordCtrl();   // gestrue of chord
    await pluckCtrl();   // pluck control
    await strumCtrl();   // strum control
    await capoCtrl();    // capo  control

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
    detect();               // start detect loop
}

// 等待 DOM 完成加載
window.addEventListener('DOMContentLoaded', async () => {
    await main();
});
