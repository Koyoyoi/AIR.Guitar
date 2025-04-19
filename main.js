import { setupMediaPipe, detectHand, detectPose } from "./MediaPipe.js";
import { compute, fingerPlay, vectorAngle, vectorCompute } from "./handCompute.js";
import { load_SVM_Model, predict } from "./SVM.js";
import { initMIDI, plucking, strumming, buildGuitarChord, mapRange } from "./MIDI.js";
import { DrawingUtils } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest"
import { drawCapo, drawGesture } from "./draw.js";

// 全域變數
export let video, canvas, ctx, drawingUtils;
export let handData = { "Left": [], "Right": [] }, poseData = [];

let armAngles = [];
let gesture = '', prevGesture = '';
let pluck = [], prevPluck = [];
let action = '', prevAction = '';
let capo = 0, timeCnt = 0;

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

    // Left Hand
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

    // Right Hand
    if (handData['Right'].length != 0) {
        pluck = await fingerPlay(handData['Right']);
    }

    // Plucking Control
    if (!pluck.includes(4)) {
        let diffPluck = [...pluck, ...prevPluck].filter(
            x => !prevPluck.includes(x)
        );

        if (diffPluck.length > 0 && action == 'Stop') {
            plucking(diffPluck, capo);
        }
        prevPluck = pluck.slice();
    }

    // Strumming Control
    if (poseData[12] != undefined && poseData[14] != undefined && poseData[16] != undefined) {
        let angle = vectorAngle(vectorCompute(poseData[12], poseData[14]), vectorCompute(poseData[16], poseData[14]));
        armAngles.push(angle);
        let position = poseData[16][0] - poseData[12][0];

        if (armAngles.length >= 8) {
            let diffs = [];
            for (let i = 1; i < 8; i++) {
                diffs.push(armAngles[i] - armAngles[i - 1]);
            }

            let diffAngle = diffs.reduce((sum, d) => sum + d, 0) / diffs.length;
            
            if (diffAngle > 2 && position > 0) {
                action = 'Down';
            } else if (diffAngle < -2 && position < -15) {
                action = 'Up';
            } else {
                action = 'Stop';
                prevAction = 'Stop';
                armAngles = [];
            }

            if (action != prevAction && action != 'Stop' && pluck.includes(4)) {
                console.log(armAngles)
                let duration = await mapRange(Math.abs(diffAngle), 2, 13, 125, 10);
                console.log(duration)
                strumming(action, capo, duration);
                prevAction = action;
            }

            armAngles.shift();
        }
    }
    else{
        armAngles.shift();
    }

    // Capo control 每1秒執行一次
    if (poseData.length > 0 && timeCnt >= 30) { 
        if (poseData[15][1] < poseData[0][1] && poseData[16][1] < poseData[0][1]) {
            capo = 0;
        } else if (poseData[16][1] < poseData[0][1]) {
            capo = Math.min(12, capo + 1);
        } else if (poseData[15][1] < poseData[0][1]){
            capo = Math.max(-12, capo - 1);
        }
        timeCnt = 0;
    }
    timeCnt += 1;
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
    await load_SVM_Model();
    await setupMediaPipe();
    await setupCamera();
    await initMIDI();
    buildGuitarChord('C');
    detect();
}

main();
