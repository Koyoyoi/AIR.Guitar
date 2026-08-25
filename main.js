import { MediaPipe } from "./models/MediaPipe.js";

export let MP;

async function initVideo() {
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

async function loop() {
    await MP.detectHand();
    await MP.detectPose();
    requestAnimationFrame(loop);
}

async function main() {
    const video = await initVideo();
    MP = new MediaPipe(video);
    await MP.init();
    loop();
}

window.addEventListener("DOMContentLoaded", main);
