import { HandLandmarker, PoseLandmarker, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest";
import { handData, poseData,video } from './main.js';
import { isSwitch } from "./Controll/blockControll.js";

// 全域變數：用來儲存模型實例
let handLandmarker, poseLandmarker;

// 初始化 MediaPipe 手部與姿勢偵測模型
export async function setupMediaPipe() {
    const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );

    // 建立手部標誌點模型
    handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: "./models/MediaPipe/hand_landmarker.task",
            delegate: "GPU"
        },
        runningMode: "VIDEO",
        min_hand_detection_confidence: 0.5,
        min_tracking_confidence: 0.5,
        numHands: 2
    });

    // 建立姿勢標誌點模型
    poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: "./models/MediaPipe/pose_landmarker_lite.task",
            delegate: "GPU",
        },
        runningMode: "VIDEO",
        min_pose_detection_confidence: 0.8,
        min_tracking_confidence: 0.7,
        numPoses: 1
    });
}

// 偵測手部關鍵點並繪製圖像，同時更新 handData
export async function detectHand() {
    if (!handLandmarker) return;

    let data = handLandmarker.detectForVideo(video, performance.now(),  { width: video.videoWidth, height: video.videoHeight });

    const handPoints = data.landmarks;
    const handednesses = data.handednesses;

    // 將每隻手的座標轉換為像素座標並分類左右手
    for (let i = 0; i < handednesses.length; i++) {
        let points = [];
        let left_or_right = String(handednesses[i][0].categoryName);
        for (let p of handPoints[i]) {
            p = [p.x * video.videoWidth, p.y * video.videoHeight, p.z * 10];
            points.push(p);
        }
        handData[left_or_right] = points;
    }

    if (isSwitch) {[handData['Left'], handData['Right']] = [handData['Right'], handData['Left']]}
}

// 偵測身體關鍵點並繪製圖像，同時更新 poseData
export async function detectPose() {
    if (!poseLandmarker) return;

    let data = poseLandmarker.detectForVideo(video, performance.now(), { width: video.videoWidth, height: video.videoHeight });

    const posePoints = data.landmarks;

    // 將第一組姿勢標誌點轉換為像素座標
    if (posePoints[0] != undefined) {
        for (let p of posePoints[0]) {
            p = [p.x * video.videoWidth, p.y * video.videoHeight, p.z * 10];
            poseData.push(p);
        }
    }
}
