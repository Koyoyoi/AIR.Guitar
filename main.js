import { MediaPipe } from "./models/MediaPipe.js";
import { GuitarSound } from "./controll/sound.js";
import { GuitarVisualizer } from "./visual/GuitarVisualizer.js";
export let MP;
export let GS;
export let GV;

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

async function initCanvas(video) {
    const canvas = document.querySelector("#canvas");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    return ctx;

}

async function loop() {
    GV.clear();
    await MP.detectHand();
    GS.buildGuitarChord(MP.gesture);
    GS.plucking(MP.fingerBend);
    GS.strumming(MP.handData.Right);

    GV.drawGesture(MP.gesture, MP.handData.Left[9]);
    GV.drawNote(GS.pluckNotes, GS.prevPluck, MP.handData.Right);
    GV.drawStrings();

    requestAnimationFrame(loop);
}

async function main() {
    GS = new GuitarSound();
    await GS.loadSamples();
    MP = new MediaPipe(await initVideo());
    await MP.init();
    GV = new GuitarVisualizer(await initCanvas(MP.video));

    loop();
}

window.addEventListener("DOMContentLoaded", main);
