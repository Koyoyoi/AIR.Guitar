import { MediaPipe } from "./models/MediaPipe.js";
import { GuitarSound } from "./controll/sound.js";
import { GuitarVisualizer } from "./visual/GuitarVisualizer.js";
import { Loading } from "./visual/Loading.js";
let MP;
let GS;
let GV;

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
    GV.setHand(MP.handData);

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
    const loading = new Loading();
    loading.setProgress(10, "Starting");

    GS = new GuitarSound();

    loading.setProgress(20, "Loading Guitar");

    await GS.loadSamples();

    loading.setProgress(50, "Loading Camera");

    MP = new MediaPipe(await initVideo());

    loading.setProgress(80, "Loading MediaPipe");

    await MP.init();


    GV = new GuitarVisualizer(await initCanvas(MP.video));
    GV.connectSound(GS);

    loading.setProgress(100, "Ready");

    setTimeout(() => {
        loading.hide();
        setTimeout(() => {
            loop();
        }, 300);
    }, 700);
}

window.addEventListener("DOMContentLoaded", main);
