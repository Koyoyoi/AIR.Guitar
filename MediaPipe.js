import { HandLandmarker, PoseLandmarker, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest";
import { drawingUtils, handData, poseData } from './main.js'
import { video } from "./main.js";

let handLandmarker, poseLandmarker;

// 設置 MediaPipe 模型
export async function setupMediaPipe() {
    const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );

    // 初始化手部偵測模型
    handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: "./models/MediaPipe/hand_landmarker.task", // 手部模型路徑
            delegate: "GPU" // 使用 GPU 加速
        },
        runningMode: "VIDEO",               // 設定為影片模式
        min_hand_detection_confidence: 0.3, // 手部偵測信心閾值
        min_tracking_confidence: 0.3,       // 手部追蹤信心閾值
        numHands: 2                         // 最多同時偵測 2 隻手
    });

    // 初始化姿態偵測模型
    poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: "./models/MediaPipe/pose_landmarker_lite.task", // 姿態模型路徑
            delegate: "GPU", // 使用 GPU 加速
        },
        runningMode: "VIDEO",               // 設定為影片模式
        min_pose_detection_confidence: 0.8, // 姿態偵測信心閾值
        min_tracking_confidence: 0.7,       // 姿態追蹤信心閾值
        numPoses: 1                         // 最多偵測一個人
    });
}

// 偵測手部關鍵點
export async function detectHand() {
    if (!handLandmarker) return; // 若手部模型未初始化則退出

    let data = handLandmarker.detectForVideo(video, performance.now()); // 執行手部偵測

    // 如果偵測到手部標誌點，則繪製手部標記
    if (data.landmarks) {
        for (const landmarks of data.landmarks) {
            drawingUtils.drawConnectors(landmarks, HandLandmarker.HAND_CONNECTIONS, { color: "#F8C3CD", lineWidth: 4 });
            drawingUtils.drawLandmarks(landmarks, { color: "#DB4D6D", radius: 4 });
        }
    }

    const handPoints = data.landmarks;      // 取得手部點座標
    const handednesses = data.handednesses; // 取得手部左右資訊

    // 根據左右手分別儲存關鍵點座標
    for (let i = 0; i < handednesses.length; i++) {
        let points = [];
        let left_or_right = String(handednesses[i][0].categoryName); 
        for (let p of handPoints[i]) {
            p = [p.x * video.videoWidth, p.y * video.videoHeight, p.z * 10];  
            points.push(p);
        }
        handData[left_or_right] = points; // 儲存進 handData
    }
}

// 偵測身體姿態關鍵點
export async function detectPose() {
    if (!poseLandmarker) return; // 若姿態模型未初始化則退出

    let data = poseLandmarker.detectForVideo(video, performance.now()); // 執行姿態偵測

    // 如果偵測到身體標誌點，則繪製身體標記
    if (data.landmarks) {
        for (const landmarks of data.landmarks) {
            drawingUtils.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS, { color: "#F8C3CD", lineWidth: 3 });
            drawingUtils.drawLandmarks(landmarks, { color: "#DB4D6D", radius: 5 });
        }
    }

    const posePoints = data.landmarks; // 取得姿態點座標

    if (posePoints[0] != undefined) {
        // 儲存第一組偵測到的姿態資料
        for (let p of posePoints[0]) {
            p = [p.x * video.videoWidth, p.y * video.videoHeight, p.z * 10]; // 轉換座標為畫面尺寸
            poseData.push(p);
        }
    }
}
