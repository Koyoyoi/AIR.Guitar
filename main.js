import { setupMediaPipe, detectHand, detectPose } from "./MediaPipe.js";
import { compute, fingerPlay, vectorAngle, vectorCompute } from "./handCompute.js";
import { load_SVM_Model, predict } from "./SVM.js";
import { initMIDI, plucking, strumming, buildGuitarChord } from "./MIDI.js";
import { DrawingUtils } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest"
import { drawGesture } from "./draw.js";

// 宣告全域變數
export let video, canvas, ctx, drawingUtils;
export let handData = { "Left": [], "Right": [] }, poseData = [];

let armAngles = [];
let gesture = '', prevGesture = '';
let pluck = [], prevPluck = [];
let action = '', prevAction = '';
let capo = 0;

// 設置攝影機並取得影像流
// 設置攝影機並取得影像流
async function setupCamera() {
    video = document.createElement("video");
    video.style.display = "none";  // 不顯示在頁面中

    // 動態調整大小
    video.style.width = "100%";   // 設定寬度為 100% 視窗寬度
    video.style.height = "100%";  // 設定高度為 100% 視窗高度

    document.body.appendChild(video);

    // 顯示 Loading 動畫
    const loadingElement = document.getElementById('loading');

    // 開始加載攝影機流
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;

    canvas = document.createElement("canvas");
    document.body.appendChild(canvas);
    ctx = canvas.getContext("2d");
    drawingUtils = new DrawingUtils(ctx);

    return new Promise((resolve) => {
        video.onloadedmetadata = () => {
            // 設定 canvas 大小，保證有正確尺寸
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            // 隱藏 loading 畫面
            loading.classList.add("hidden");

            // 更新標題為 AIR Guitar
            const title = document.getElementById("title");
            title.textContent = "AIR Guitar";  // 更改為你的標題

            video.play();  // 播放視頻
            resolve(video);
        };
    });
}


async function detect() {

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    await detectHand();
    await detectPose();

    // Left Hand
    if (handData['Left'].length != 0) {
        let parameters = compute(handData['Left']);
        // 手勢預測
        gesture = await predict(parameters)
        if (prevGesture != gesture) {
            console.log(gesture);
            prevGesture = gesture;
            buildGuitarChord(gesture);
        }
        drawGesture(gesture)

    }
    // Right Hand
    if (handData['Right'].length != 0) {
        pluck = await fingerPlay(handData['Right']);
    }

    // Plucking controll
    if (!pluck.includes(4)) {
        let diffPluck = [...pluck, ...prevPluck].filter(
            x => !(prevPluck.includes(x))
        );

        if (diffPluck.length > 0) {
            plucking(diffPluck, capo);
        }

        // 更新 prevPluck 為 pluck 的快照
        prevPluck = pluck.slice();
    }
    // Strumming controll

    if (poseData[12] != undefined && poseData[14] != undefined && poseData[16] != undefined) {
        let angle = vectorAngle(vectorCompute(poseData[12], poseData[14]), vectorCompute(poseData[16], poseData[14]))
        armAngles.push(Math.round(angle));
        let position = poseData[16][0] - poseData[12][0]

        if (armAngles.length >= 5) { // every 5 frames
            let diffs = [];
            for (let i = 1; i < 5; i++) {
                diffs.push(armAngles[i] - armAngles[i - 1]);
            }

            let diffAngle = diffs.reduce((sum, d) => sum + d, 0) / diffs.length;

            if (diffAngle > 7 && position > -5) {
                action = 'Down';
            }
            else if (diffAngle < -7 && position < -15) {
                action = 'Up';
            }
            else {
                action = 'Stop';
                prevAction = 'Stop';
            }

            if (action != prevAction && action != 'stop') {
                strumming(action, capo)
                prevAction = action;
            }
            armAngles.shift();
        }
    }

    // clear hand data
    handData['Left'] = [];
    handData['Right'] = [];
    poseData = [];

    requestAnimationFrame(detect);
}

// 主函式，負責初始化所有功能
async function main() {
    await load_SVM_Model(); // 載入Ptyhon WASM 
    await setupMediaPipe(); // 載入手部偵測模型
    await setupCamera(); // 啟動攝影機
    await initMIDI();
    buildGuitarChord('C');
    detect(); // 啟動偵測
}

// 執行程式
main();