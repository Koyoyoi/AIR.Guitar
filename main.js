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
export let soundFontPlayer;


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

                if (
                    mouseX >= checkArea.x &&
                    mouseX <= checkArea.x + checkArea.w &&
                    mouseY >= checkArea.y &&
                    mouseY <= checkArea.y + checkArea.h
                ) {
                    console.log("✅ MIDI port 控制區被點擊！");
                    portCtrl();
                } else {
                    console.log("❌ 點擊位置不在 MIDI port 控制區內");
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



    window.onload = async function () {
        // 檢查 Magenta.js 是否正確加載
        if (typeof mm === "undefined") {
            console.error("Magenta.js 未正確載入！");
            return;
        }

        soundFontPlayer = new mm.SoundFontPlayer(
            'https://storage.googleapis.com/magentadata/js/soundfonts/sgm_plus'
        );

        // 等待 SoundFont 樣本加載完成
        soundFontPlayer.onSamplesLoaded = function () {
            console.log("SoundFont 样本加载完成！");
        };

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

                    // 播放 MIDI 檔案
                    const noteSequence = await mm.blobToNoteSequence(blob);

                    // 載入音效並播放
                    await soundFontPlayer.loadSamples(noteSequence); // 確保音效載入
                    soundFontPlayer.start(noteSequence);

                    console.log("🎶 MIDI 播放中...");
                } catch (err) {
                    console.error("讀取 MIDI 發生錯誤：", err);
                    alert("無法播放 MIDI 檔案。");
                }
            } else {
                alert("請上傳圖片或 MIDI 檔案！");
            }
        });
    };


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
