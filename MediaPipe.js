import { HandLandmarker, PoseLandmarker, FilesetResolver, DrawingUtils } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest";
import { compute, fingerPlay } from "./handCompute.js";
import { load_SVM_Model, predict } from "./SVM.js";
import { initMIDI, plucking, buildGuitarChord } from "./MIDI.js";

// 宣告全域變數
let video, canvas, ctx;
let handLandmarker, poseLandmarker, drawingUtils;
let handData = { "Left": [], "Right": [] }, poseData = [];
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

    return new Promise((resolve) => {
        video.onloadedmetadata = () => {
            video.play();
            resolve(video);
        };
    });
}

// 設置 MediaPipe
async function setupMediaPipe() {
    const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );

    handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: "./models/MediaPipe/hand_landmarker.task",
            delegate: "GPU"
        },
        runningMode: "VIDEO",
        numHands: 2
    });

    poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: "./models/MediaPipe/pose_landmarker_lite.task",
            delegate: "GPU",
        },
        runningMode: "VIDEO",
        numPoses: 1
    });
}

// 設置畫布（Canvas）以便繪製手部偵測結果
function setupCanvas() {
    canvas = document.createElement("canvas");
    document.body.appendChild(canvas);
    ctx = canvas.getContext("2d");
    drawingUtils = new DrawingUtils(ctx);

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
}

// 偵測手部並繪製標記
async function detect() {
    if (!handLandmarker && !poseLandmarker) return;

    let hand = handLandmarker.detectForVideo(video, performance.now());
    let pose = poseLandmarker.detectForVideo(video, performance.now());

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // 如果偵測到手部標誌點，則繪製標記
    if (hand.landmarks) {
        for (const landmarks of hand.landmarks) {
            // 畫出手部關節連線
            drawingUtils.drawConnectors(landmarks, HandLandmarker.HAND_CONNECTIONS, { color: "green", lineWidth: 3 });
            // 畫出手指關鍵點
            drawingUtils.drawLandmarks(landmarks, { color: "red", radius: 5 });
        }
    }
    // 如果偵測到身體標誌點，則繪製標記
    if (pose.landmarks) {
        for (const landmarks of pose.landmarks) {
            // 畫出身體關節連線
            drawingUtils.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS, { color: "green", lineWidth: 3 });
            // 畫出身體關鍵點
            drawingUtils.drawLandmarks(landmarks, { color: "red", radius: 5 });
        }
    }

    const handPoints = hand.landmarks;
    const handednesses = hand.handednesses;
    const posePoints = pose.landmarks;

    for (let i = 0; i < handednesses.length; i++) {
        let points = [];
        let left_or_right = String(handednesses[i][0].categoryName);
        for (let p of handPoints[i]) {
            p = [p.x * video.videoWidth, p.y * video.videoHeight, p.z];
            points.push(p);
        }
        handData[left_or_right] = points;
    }
    for (let p of posePoints){
        p = [p.x * video.videoWidth, p.y * video.videoHeight, p.z];
        poseData.push(p);
    }

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

    console.log(poseData);
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
    setupCanvas(); // 設置畫布
    detect(); // 啟動手部偵測
}

// 執行程式
main();
