import { setupMediaPipe, detectHand, detectPose } from "./MediaPipe.js";
import { compute } from "./handCompute.js";
import { load_SVM_Model, predict } from "./SVM.js";
import { initMIDI, buildGuitarChord, loadSamples } from "./MIDI.js";
import { DrawingUtils } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest";
import { drawCapo, drawGesture, reCanva } from "./draw.js";
import { capoCtrl, pluckCtrl, strumCtrl } from "./musicControll.js";

// 全域變數
export let video, canvas, ctx, drawingUtils;
export let handData = { "Left": [], "Right": [] }, poseData = [];
export let capo = 0;
export let imgHeight = 0, imgWidth = 0, uploadedImage = null;

let gesture = '', prevGesture = '';

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

            // 加入 resize 控制
            reCanva();
            window.addEventListener("resize", reCanva);

            resolve(video);
        };
    });
}


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

    // 如果圖片已經加載，則根據需求繪製圖片
    if (uploadedImage) {
        const maxImgHeight = canvas.height;
        const naturalAspectRatio = uploadedImage.width / uploadedImage.height;

        // 先依照高度縮放
        imgHeight = maxImgHeight;
        imgWidth = imgHeight * naturalAspectRatio;

        // 如果超過 canvas 寬度的一半，則限制為一半並重新計算高度
        const maxImgWidth = canvas.width / 2;
        if (imgWidth > maxImgWidth) {
            imgWidth = maxImgWidth;
            imgHeight = imgWidth / naturalAspectRatio;
        }

        ctx.drawImage(uploadedImage, 0, 0, imgWidth, imgHeight);
    }


    await detectHand();
    await detectPose();

    // Left Hand Gesture
    if (handData['Left'].length != 0) {
        let parameters = compute(handData['Left']);
        gesture = await predict(parameters);
        if (prevGesture != gesture) {
            console.log(gesture);
            prevGesture = gesture;
            buildGuitarChord(gesture);
        }
        drawGesture(gesture, capo);
    }

    await pluckCtrl();
    await strumCtrl();
    capo = await capoCtrl();
    drawCapo(capo);

    // 重置 handData 和 poseData
    handData['Left'] = [];
    handData['Right'] = [];
    poseData = [];

    // 使用 requestAnimationFrame 確保無限循環
    requestAnimationFrame(detect);
}

// 初始化主函式
async function main() {
    await setupMediaPipe();
    await load_SVM_Model();
    await setupCamera();
    await loadSamples();
    await initMIDI();
    buildGuitarChord('C');
    detect();
}

// 等待 DOM 完成加載
window.addEventListener('DOMContentLoaded', async () => {
    await main();
});
