import { HandLandmarker, PoseLandmarker, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest";
import { drawingUtils, handData, poseData } from './main.js'
import { video } from "./main.js";

let handLandmarker, poseLandmarker;

// 設置 MediaPipe 並初始化手部與姿勢偵測
export async function setupMediaPipe() {
    // 載入 vision 模型文件
    const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );

    // 初始化手部偵測器
    handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: "./models/MediaPipe/hand_landmarker.task",
            delegate: "GPU" // 使用 GPU 進行加速
        },
        runningMode: "VIDEO",               // 設定為即時視訊模式
        min_hand_detection_confidence: 0.3, // 設定最低手部偵測信心值
        min_tracking_confidence: 0.3      , // 設定最低追蹤信心值
        numHands: 2                         // 偵測最多兩隻手
    });                     

    // 初始化身體姿勢偵測器
    poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: "./models/MediaPipe/pose_landmarker_lite.task",
            delegate: "GPU" // 使用 GPU 進行加速
        },
        runningMode: "VIDEO",               // 設定為即時視訊模式
        min_pose_detection_confidence: 0.8, // 設定最低姿勢偵測信心值
        min_tracking_confidence: 0.7,       // 設定最低姿勢追蹤信心值
        numPoses: 1                         // 偵測一個姿勢
    });
}

// 偵測手部並更新手部資料
export async function detectHand() {
    // 如果 handLandmarker 未初始化，直接返回
    if (!handLandmarker) return;

    // 進行手部偵測
    let data = handLandmarker.detectForVideo(video, performance.now());

    // 如果未偵測到手部，清空資料並返回
    if (!data.landmarks) {
        handData['Left'] = [];
        handData['Right'] = [];
        return;
    }

    // 遍歷每隻手的標誌點並繪製
    for (const landmarks of data.landmarks) {
        drawingUtils.drawConnectors(landmarks, HandLandmarker.HAND_CONNECTIONS, { color: "#F8C3CD", lineWidth: 4 });
        drawingUtils.drawLandmarks(landmarks, { color: "#DB4D6D", radius: 4 });
    }

    // 取得手部標誌點資料和手部識別資料
    const handPoints = data.landmarks;
    const handednesses = data.handednesses;

    // 儲存每隻手的位置資料
    handPoints.forEach((points, index) => {
        let left_or_right = String(handednesses[index][0].categoryName); 
        handData[left_or_right] = points.map(p => [p.x * video.videoWidth, p.y * video.videoHeight, p.z * 10]);
    });
}

// 偵測身體姿勢並更新姿勢資料
export async function detectPose() {
    // 如果 poseLandmarker 未初始化，直接返回
    if (!poseLandmarker) return;

    // 進行身體姿勢偵測
    let data = poseLandmarker.detectForVideo(video, performance.now());

    // 如果未偵測到姿勢標誌點，清空資料並返回
    if (!data.landmarks) {
        poseData = [];
        return;
    }

    // 遍歷身體姿勢標誌點並繪製
    for (const landmarks of data.landmarks) {
        drawingUtils.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS, { color: "green", lineWidth: 3 });
        drawingUtils.drawLandmarks(landmarks, { color: "red", radius: 5 });
    }

    // 取得身體姿勢資料
    const posePoints = data.landmarks[0];

    // 如果姿勢資料存在，將其轉換為影片畫面中的像素座標並儲存到 poseData 中
    if (posePoints) {
        poseData = posePoints.map(p => [p.x * video.videoWidth, p.y * video.videoHeight, p.z * 10]);
    }
}
