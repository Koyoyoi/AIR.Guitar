import { MediaPipe } from "./models/MediaPipe.js";

let MP;

function loop() {
    MP.detectHand();
    MP.detectPose();
    MP.clear();
    requestAnimationFrame(loop);
}

async function initializeVideo() {
    const video = document.querySelector("#camera");

    const stream = await navigator.mediaDevices.getUserMedia({
        video: {
            width: 1280,
            height: 720,
            facingMode: "user",
        },
        audio: false,
    });

    video.srcObject = stream;
    await video.play();
    return video;
}

async function main() {
    const video = await initializeVideo();
    MP = new MediaPipe(video);
    await MP.init();
    loop();
}

window.addEventListener("DOMContentLoaded", main);
