import { setupMediaPipe, detectHand, detectPose } from "./MediaPipe.js";
import { compute, fingerPlay, vectorAngle, vectorCompute, isInCanvas } from "./handCompute.js";
import { load_SVM_Model, predict } from "./SVM.js";
import { initMIDI, plucking, strumming, buildGuitarChord } from "./MIDI.js";
import { DrawingUtils } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest"

// 宣告全域變數
export let video, canvas, ctx, drawingUtils;
export let handData = { "Left": [], "Right": [] }, poseData = [];

let armAngles = [];
let gesture = '', prevGesture = '';
let pluck = [], prevPluck = [];
let action = '', prevAction = '';
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

    }
    // Right Hand
    if (handData['Right'].length != 0) {
        pluck = fingerPlay(handData['Right']);
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

        if (armAngles.length >= 5) { // every 5 frames
            let diffs = [];
            for (let i = 1; i < 5; i++) {
                diffs.push(armAngles[i] - armAngles[i - 1]);
            }

            let diffAngle = diffs.reduce((sum, d) => sum + d, 0) / diffs.length;

            console.log(armAngles)

            if (diffAngle > 9) {
                action = 'Down';
            }
            else if (diffAngle < -9) {
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