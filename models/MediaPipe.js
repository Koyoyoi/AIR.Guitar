import { HandLandmarker, PoseLandmarker, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest";
import { load_SVM_Model, predict } from "./SVM.js";
import { transData, fingerBends } from "./HandFeature.js";

export class MediaPipe {

    constructor(video) {
        this.video = video;
        this.handLandmarker = null;
        this.handData = { Left: [], Right: [] };
        this.gesture = null;
        this.fingerBend = [];
    }

    async init() {
        await load_SVM_Model();

        const vision = await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );

        this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: "./models/MP_model/hand_landmarker.task",
                delegate: "GPU",
            },
            runningMode: "VIDEO",
            min_hand_detection_confidence: 0.5,
            min_tracking_confidence: 0.5,
            numHands: 2,
        });
    }

    async detectHand() {
        if (!this.handLandmarker || !this.video) return;

        this.handData = { Left: [], Right: [] };
        this.fingerBend = [];

        const data = this.handLandmarker.detectForVideo(
            this.video, performance.now(), {
            width: this.video.videoWidth,
            height: this.video.videoHeight,
        }
        );

        for (let i = 0; i < data.handednesses.length; i++) {
            const side = String(data.handednesses[i][0].categoryName);
            this.handData[side] = data.landmarks[i].map(({ x, y, z }) => [
                Math.abs(x * this.video.videoWidth - this.video.videoWidth),
                y * this.video.videoHeight,
                z * 10,
            ]);
        }


        if (this.handData.Right.length > 0) {
            this.fingerBend = fingerBends(this.handData.Right);
        }

        if (this.handData.Left.length > 0) {
            this.gesture = await predict(transData(this.handData.Left));
        }


    }

}
