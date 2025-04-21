import { setupMediaPipe, detectHand, detectPose } from "./MediaPipe.js";
import { compute } from "./handCompute.js";
import { load_SVM_Model, predict } from "./SVM.js";
import { initMIDI, buildGuitarChord } from "./MIDI.js";
import { DrawingUtils } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest"
import { drawCapo, drawGesture } from "./draw.js";
import { capoCtrl, pluckCtrl, strumCtrl } from "./musicControll.js";

// 全域變數
export let video, canvas, ctx, drawingUtils;
export let handData = { "Left": [], "Right": [] }, poseData = [];
export let capo = 0;

let gesture = '', prevGesture = '';

// resize 函數
function resizeCanvasAndVideo() {
    const aspectRatio = video.videoWidth / video.videoHeight;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    let newWidth = windowWidth;
    let newHeight = newWidth / aspectRatio;

    if (newHeight > windowHeight) {
        newHeight = windowHeight;
        newWidth = newHeight * aspectRatio;
    }

    video.style.width = `${newWidth}px`;
    video.style.height = `${newHeight}px`;

    canvas.style.width = video.style.width;
    canvas.style.height = video.style.height;
}

async function setupCamera() {
    video = document.createElement("video");
    video.style.display = "none";
    document.body.appendChild(video);

    const stream = await navigator.mediaDevices.getUserMedia({
        video: {
            width: { ideal: 1280 },
            height: { ideal: 720 }
        }
    });

    video.srcObject = stream;

    canvas = document.createElement("canvas");
    document.body.appendChild(canvas);
    ctx = canvas.getContext("2d");
    drawingUtils = new DrawingUtils(ctx);

    return new Promise((resolve) => {
        video.onloadedmetadata = () => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            console.log("Video size:", video.videoWidth, video.videoHeight);

            const title = document.getElementById("title");
            title.textContent = "AIR Guitar";

            loading.classList.add("hidden");
            video.play();

            // 加入 resize 控制
            resizeCanvasAndVideo();
            window.addEventListener("resize", resizeCanvasAndVideo);

            resolve(video);
        };
    });
}

async function detect() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    await detectHand();
    await detectPose();

    // Left Hand Gesture
    if (handData['Left'].length != 0) {
        let parameters = compute(handData['Left']);
        gesture = await predict(parameters);
        if (prevGesture != gesture) {
            console.log(gesture);
            prevGesture = gesture;
            buildGuitarChord(gesture);
        }
        drawGesture(gesture);
    }
    
    await pluckCtrl();
    await strumCtrl();
    capo = await capoCtrl();
    drawCapo(capo);

    // 重置 handData 和 poseData
    handData['Left'] = [];
    handData['Right'] = [];
    poseData = [];

    // 使用 requestAnimationFrame 確保無限循環
    requestAnimationFrame(detect);
}

// 初始化主函式
async function main() {
    await setupMediaPipe();
    await load_SVM_Model();
    await setupCamera();
    await initMIDI();
    buildGuitarChord('C');
    detect();
}

main();
