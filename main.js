import { DrawingUtils } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest";
import { initMIDI, buildGuitarChord, loadSamples, soundSample, audioCtx } from "./sound.js";
import { capoCtrl, chordCtrl, pluckCtrl, strumCtrl } from "./musicControll.js";
import { draw_midiPortArea, draw_sampleNameArea } from "./Draw/drawCtrl.js";
import { setupMediaPipe, detectHand, detectPose } from "./MediaPipe.js";
import { draw_midiAnimation, seq } from "./Draw/drawMIDI.js";
import { reCanva, drawImg } from "./Draw/drawInfo.js";
import { load_SVM_Model } from "./SVM.js";

//  全域變數宣告區 
export let canvas = { base: {}, midi: {} };
export let video, drawingUtils;
export let midiCanvas, midiCtx;
export let handData = { "Left": [], "Right": [] }, poseData = [];
export let uploadedImage = null;
export let mouse = { X: 0, Y: 0 };
export let noteSequence = [];


// 相機設定與畫布初始化 
async function setupCamera() {
    video = document.createElement("video");
    video.style.display = "none";
    document.body.appendChild(video);

    // 啟動相機串流
    const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } }
    });

    video.srcObject = stream;

    // 設定畫布與繪圖環境
    canvas['base'] = { cvs: document.getElementById("baseCanvas"), ctx: {} }
    canvas['base'].ctx = canvas.base.cvs.getContext("2d")
    drawingUtils = new DrawingUtils(canvas.base.ctx);
    canvas['midi'] = { cvs: document.getElementById("midiCanvas"), ctx: {} }
    canvas['midi'].ctx = canvas.midi.cvs.getContext("2d");

    return new Promise((resolve) => {
        video.onloadedmetadata = () => {
            console.log("Video size:", video.videoWidth, video.videoHeight);

            // 顯示標題
            document.getElementById("title").textContent = "AIR Guitar";

            // 隱藏 loading 畫面
            document.getElementById("loading").classList.add("hidden");

            // 顯示上傳介面
            document.querySelector(".upload-section")?.classList.add("show");

            // 點擊畫布時的事件：取得滑鼠座標並顯示 MIDI 控制
            canvas['base'].cvs.addEventListener("click", (e) => {
                const rect = canvas['base'].cvs.getBoundingClientRect();
                const scaleX = canvas['base'].cvs.width / rect.width;
                const scaleY = canvas['base'].cvs.height / rect.height;

                mouse.X = (e.clientX - rect.left) * scaleX;
                mouse.Y = (e.clientY - rect.top) * scaleY;

                draw_midiPortArea();
                draw_sampleNameArea();

                // 重置滑鼠位置
                mouse.X = 0;
                mouse.Y = 0;
            });

            video.play();

            // 設定畫布尺寸調整事件
            reCanva();
            window.addEventListener("resize", reCanva);

            resolve(video);
        };
    });
}

export function updateSeq() {
    noteSequence = seq
}

// === 網頁載入完成後，處理檔案上傳邏輯（圖片或 MIDI）===
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

        // = 處理圖片檔 =
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

                uploadedImage.onerror = () => console.error("圖片加載錯誤");
                uploadedImage.src = e.target.result;
            };

            reader.readAsDataURL(file);
        }

        // = 處理 MIDI 檔 =
        if (file.name.endsWith(".mid") || file.name.endsWith(".midi")) {
            try {
                const arrayBuffer = await file.arrayBuffer();
                const blob = new Blob([arrayBuffer], { type: "audio/midi" });

                // 使用 Magenta.js 解析 MIDI
                let midifile = await mm.blobToNoteSequence(blob);
                noteSequence = midifile.notes.map(note => ({
                    pitch: note.pitch,
                    v: note.velocity,
                    start: note.startTime,
                    end: note.endTime,
                }));

                console.log(noteSequence);
                draw_midiAnimation(); // 播放動畫

                // 播放所有音符
                noteSequence.forEach(note => {
                    soundSample.play(
                        note.pitch,
                        audioCtx.currentTime + note.start,    // 延後播放
                        { velocity: note.v, duration: note.end - note.start }
                    );
                });

            } catch (err) {
                console.error("讀取 MIDI 發生錯誤：", err);
            }
        }

        // = 非支援格式 =
        else {
            alert("請上傳圖片或 MIDI 檔案！");
        }
    });
};

// 主偵測函式：處理即時畫面、偵測、與音樂互動 
async function detect() {
    canvas['base'].ctx.clearRect(0, 0, video.videoWidth, video.videoHeight);
    canvas['base'].ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);

    // 若有上傳圖片則顯示
    if (uploadedImage) drawImg();

    // 顯示控制區
    draw_midiPortArea();
    draw_sampleNameArea();

    // 執行 MediaPipe 偵測
    await detectHand();
    await detectPose();

    // 音樂控制
    await chordCtrl();
    await pluckCtrl();
    await strumCtrl();
    await capoCtrl();

    // 重置追蹤資料
    handData["Left"] = [];
    handData["Right"] = [];
    poseData = [];

    // 持續偵測
    requestAnimationFrame(detect);
}


// === 主程式：載入模組並開始偵測 ===
async function main() {
    await loadSamples();         // 音效取樣
    await setupMediaPipe();      // MediaPipe 模組初始化
    await load_SVM_Model();      // 載入手勢模型
    await setupCamera();         // 相機與畫布設定
    await initMIDI();            // MIDI 設定
    buildGuitarChord('C');       // 建立預設 C 和弦
    detect();                    // 開始主偵測循環
}


// 等待 HTML 載入完成後啟動主程式 
window.addEventListener('DOMContentLoaded', async () => {
    await main();
});
