import { MediaPipe } from "./models/MediaPipe.js";
import { GuitarSound } from "./controll/sound.js";
export let MP;
export let GS;

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
    GS.buildGuitarChord(MP.gesture);
    GS.plucking(MP.fingerBend);
    GS.strumming(MP.handData.Right);
 
    requestAnimationFrame(loop);
}

async function main() {
    const video = await initVideo();
    MP = new MediaPipe(video);
    await MP.init();
    GS = new GuitarSound();
    await GS.loadSamples();

    loop();
}

window.addEventListener("DOMContentLoaded", main);
