import { DrawingUtils } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest";
import { capoCtrl, chordCtrl, pluckCtrl, portCtrl, strumCtrl } from "./musicControll.js";
import { setupMediaPipe, detectHand, detectPose } from "./MediaPipe.js";
import { initMIDI, buildGuitarChord, loadSamples } from "./MIDI.js";
import { load_SVM_Model } from "./SVM.js";
import { reCanva, drawImg, draw_midiPortArea } from "./draw.js";


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

            canvas.addEventListener("click", (e) => {
                const rect = canvas.getBoundingClientRect(); // 取得 canvas 在畫面上的實際位置與尺寸
                const scaleX = canvas.width / rect.width;
                const scaleY = canvas.height / rect.height;
            
                const mouseX = (e.clientX - rect.left) * scaleX;
                const mouseY = (e.clientY - rect.top) * scaleY;
                
                const checkArea = draw_midiPortArea();
                console.log(`Canvas 被點擊，位置: (${mouseX}, ${mouseY})`);
                console.log("控制區 Y:", checkArea.y);
                console.log("控制區高度:", checkArea.height);
            
                console.log("mouseX >= checkArea.x:", mouseX >= checkArea.x);
                console.log("mouseX <= checkArea.x + checkArea.width:", mouseX <= checkArea.x + checkArea.w);
                console.log("mouseY >= checkArea.y:", mouseY >= checkArea.y);
                console.log("mouseY <= checkArea.y + checkArea.height:", mouseY <= checkArea.y + checkArea.h);
            
                if (
                    mouseX >= checkArea.x &&
                    mouseX <= checkArea.x + checkArea.w&&
                    mouseY >= checkArea.y &&
                    mouseY <= checkArea.y + checkArea.h
                ) {
                    console.log("✅ MIDI 控制區被點擊！");
                    portCtrl();
                } else {
                    console.log("❌ 點擊位置不在 MIDI 控制區內");
                }
            });

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
    draw_midiPortArea();

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
