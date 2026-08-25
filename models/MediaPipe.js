import { HandLandmarker, PoseLandmarker, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest";

export class MediaPipe {
    constructor(video) {
        this.video = video;

        this.handLandmarker = null;
        this.poseLandmarker = null;

        this.handData = { Left: [], Right: [] };
        this.poseData = [];
    }

    async init() {
        const vision = await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );

        this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: "./models/MediaPipe/hand_landmarker.task",
                delegate: "GPU",
            },
            runningMode: "VIDEO",
            min_hand_detection_confidence: 0.5,
            min_tracking_confidence: 0.5,
            numHands: 2,
        });

        this.poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: "./models/MediaPipe/pose_landmarker_lite.task",
                delegate: "GPU",
            },
            runningMode: "VIDEO",
            min_pose_detection_confidence: 0.8,
            min_tracking_confidence: 0.7,
            numPoses: 1,
        });
    }

    async detectHand() {
        if (!this.handLandmarker || !this.video) return;

        const data = this.handLandmarker.detectForVideo(
            this.video, performance.now(), {
            width: this.video.videoWidth,
            height: this.video.videoHeight,
        }
        );

        for (let i = 0; i < data.handednesses.length; i++) {
            const side = String(data.handednesses[i][0].categoryName);
            this.handData[side] = data.landmarks[i].map(({ x, y, z }) => [
                x * this.video.videoWidth,
                y * this.video.videoHeight,
                z * 10,
            ]);
        }

    }

    async detectPose() {
        if (!this.poseLandmarker || !this.video) return;

        const data = this.poseLandmarker.detectForVideo(this.video, performance.now(), {
            width: this.video.videoWidth,
            height: this.video.videoHeight,
        });
        const pose = data.landmarks[0];

        if (pose) {
            this.poseData.push(
                ...pose.map(({ x, y, z }) => [
                    x * this.video.videoWidth,
                    y * this.video.videoHeight,
                    z * 10,
                ])
            );
        }
    }

    clear() {
        this.handData = { Left: [], Right: [] };
    }
}
