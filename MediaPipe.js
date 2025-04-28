import { HandLandmarker, PoseLandmarker, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest";
import { drawingUtils, handData, poseData } from './main.js'
import { video } from "./main.js";

let handLandmarker, poseLandmarker;

// 設置 MediaPipe
export async function setupMediaPipe() {
    const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );

    handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: "./models/MediaPipe/hand_landmarker.task",
            delegate: "GPU"
        },
        runningMode: "VIDEO",
        min_hand_detection_confidence: 0.3,
        min_tracking_confidence: 0.3,
        numHands: 2
    });

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

export async function detectHand() {
    if (!handLandmarker) return;

    let data = handLandmarker.detectForVideo(video, performance.now())

    // 如果偵測到手部標誌點，則繪製標記
    if (data.landmarks) {
        for (const landmarks of data.landmarks) {
            // 畫出手部關節連線
            drawingUtils.drawConnectors(landmarks, HandLandmarker.HAND_CONNECTIONS, { color: "#F8C3CD", lineWidth: 4 });
            // 畫出手指關鍵點
            drawingUtils.drawLandmarks(landmarks, { color: "#DB4D6D", radius: 4 });
        }
    }

    const handPoints = data.landmarks;
    const handednesses = data.handednesses;

    for (let i = 0; i < handednesses.length; i++) {
        let points = [];
        let left_or_right = String(handednesses[i][0].categoryName);
        for (let p of handPoints[i]) {
            p = [p.x * video.videoWidth, p.y * video.videoHeight, p.z * 10];
            points.push(p);
        }
        handData[left_or_right] = points;
    }

}

export async function detectPose() {
    if (!poseLandmarker) return;

    let data = poseLandmarker.detectForVideo(video, performance.now());

    // 如果偵測到身體標誌點，則繪製標記
    
    if (data.landmarks) {
        for (const landmarks of data.landmarks) {
            // 畫出身體關節連線
            drawingUtils.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS, { color: "green", lineWidth: 3 });
            // 畫出身體關鍵點
            drawingUtils.drawLandmarks(landmarks, { color: "red", radius: 5 });
        }
    }

    const posePoints = data.landmarks;

    if (posePoints[0] != undefined) {
        for (let p of posePoints[0]) {
            p = [p.x * video.videoWidth, p.y * video.videoHeight, p.z * 10];
            poseData.push(p)
        }
    }
}