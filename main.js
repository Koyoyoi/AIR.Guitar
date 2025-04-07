import { setupMediaPipe, detectHand, detectPose } from "./MediaPipe.js";
import { compute, fingerPlay, vectorAngle, vectorCompute } from "./handCompute.js";
import { load_SVM_Model, predict } from "./SVM.js";
import { initMIDI, plucking, buildGuitarChord } from "./MIDI.js";
import { DrawingUtils } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest"

// 宣告全域變數
export let drawingUtils;
export let handData = { "Left": [], "Right": [] }, poseData = [];
let video, canvas, ctx;
let gesture = '', prevGesture = '';
let pluck = [], prevPluck = [];
let capo = 0;

// 設置攝影機並取得影像流
async function setupCamera() {
    video = document.createElement("video");
    video.style.display = "none";
    document.body.appendChild(video);

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

            video.play();
            resolve(video);
        };
    });
}


async function detect() {
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    await detectHand(video);
    await detectPose(video);

    
    // Left Hand
    if (handData['Left'].length !== 0) {
        let parameters = compute(handData['Left']);
        // 手勢預測
        gesture = await predict(parameters)
        if (prevGesture != gesture) {
            console.log(gesture);
            prevGesture = gesture;
            buildGuitarChord(gesture);
        }

    }
    // Right Hand
    if (handData['Right'].length !== 0) {
        pluck = await fingerPlay(handData['Right']);
    }

    // Pluck controll
    if (!pluck.includes(4)) {
        let diffPluck = [...pluck, ...prevPluck].filter(
            x => !(prevPluck.includes(x))
        );

        if (diffPluck.length > 0) {
            plucking(diffPluck, capo)
        }

        // 更新 prevPluck 為 pluck 的快照
        prevPluck = pluck.slice();
    }
    
    if (poseData != undefined){
        let angle = vectorAngle(vectorCompute(poseData[12], poseData[14]), vectorCompute(poseData[16], poseData[14]))
        
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
    detect(); // 啟動手部偵測
}

// 執行程式
main();
