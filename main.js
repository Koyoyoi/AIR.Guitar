import { DrawingUtils } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest";
import { setupMediaPipe, detectHand, detectPose } from "./MediaPipe.js";
import { capoCtrl, pluckCtrl, strumCtrl } from "./musicControll.js";
import { initMIDI, buildGuitarChord, loadSamples } from "./MIDI.js";
import { drawCapo, drawGesture, reCanva } from "./draw.js";
import { load_SVM_Model, predict } from "./SVM.js";
import { compute } from "./handCompute.js";

// 全域變數
export let video, canvas, ctx, drawingUtils;
export let handData = { "Left": [], "Right": [] }, poseData = [];
export let capo = 0;
export let imgHeight = 0, imgWidth = 0, uploadedImage = null;

let gesture = '', prevGesture = '';

// 設定相機與畫布
async function setupCamera() {
    video = document.createElement("video");
    video.style.display = "none";  // 隱藏 video 元素
    document.body.appendChild(video);

    // 取得使用者媒體裝置（相機）
    const stream = await navigator.mediaDevices.getUserMedia({
        video: {
            width: { ideal: 1280 },
            height: { ideal: 720 }
        }
    });

    video.srcObject = stream;

    // 創建畫布元素並加入頁面
    canvas = document.createElement("canvas");
    document.body.appendChild(canvas);
    ctx = canvas.getContext("2d");         // 獲取 2D 畫布上下文
    drawingUtils = new DrawingUtils(ctx);  // 初始化畫圖工具

    return new Promise((resolve) => {
        video.onloadedmetadata = () => {
            canvas.width = video.videoWidth;    // 設定畫布寬度為視頻的寬度
            canvas.height = video.videoHeight;  // 設定畫布高度為視頻的高度
            console.log("Video size:", video.videoWidth, video.videoHeight);

            // 顯示標題
            const title = document.getElementById("title");
            title.textContent = "AIR Guitar";

            // 隱藏 Loading 圖示
            const loading = document.getElementById("loading");
            loading.classList.add("hidden");

            // 顯示上傳區塊
            const uploadSection = document.querySelector(".upload-section");
            if (uploadSection) {
                uploadSection.classList.add("show");
            }

            video.play();  // 開始播放視頻

            // 添加畫布大小調整控制
            reCanva();
            window.addEventListener("resize", reCanva);

            resolve(video);
        };
    });
}

// 監聽文件上傳事件，並處理上傳的圖片
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

// 主循環函數：捕捉影像，進行手勢識別並繪製相應元素
async function detect() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);  // 清空畫布
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);  // 繪製視頻畫面

    // 如果已經上傳了圖片，根據需求顯示圖片
    if (uploadedImage) {
        const maxImgHeight = canvas.height;
        const naturalAspectRatio = uploadedImage.width / uploadedImage.height;

        // 根據高度縮放圖片
        imgHeight = maxImgHeight;
        imgWidth = imgHeight * naturalAspectRatio;

        // 若圖片寬度超過 canvas 寬度的一半，則調整寬度與高度
        const maxImgWidth = canvas.width / 2;
        if (imgWidth > maxImgWidth) {
            imgWidth = maxImgWidth;
            imgHeight = imgWidth / naturalAspectRatio;
        }

        ctx.drawImage(uploadedImage, 0, 0, imgWidth, imgHeight);  // 繪製圖片
    }

    // 呼叫 MediaPipe 手勢識別
    await detectHand();
    await detectPose();

    // 左手手勢識別與處理
    if (handData['Left'].length != 0) {
        let parameters = compute(handData['Left']);  // 計算手勢參數
        gesture = await predict(parameters);         // 預測手勢
        if (prevGesture != gesture) {
            console.log(gesture);
            prevGesture = gesture;
            buildGuitarChord(gesture);  // 根據手勢建構和弦
        }
        drawGesture(gesture, capo); 
    }

    // 控制撥弦、掃弦與 capo 設置
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
    await loadSamples();     // 載入音效樣本
    await setupMediaPipe();  // 初始化 MediaPipe
    await load_SVM_Model();  // 載入 SVM 模型
    await setupCamera();     // 設定相機與畫布
    await initMIDI();        // 初始化 MIDI
    buildGuitarChord('C');   // 初始和弦設為 C 和弦
    detect();                // 開始手勢識別循環
}

// 等待 DOM 完成加載
window.addEventListener('DOMContentLoaded', async () => {
    await main();
});
