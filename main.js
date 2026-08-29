import { MediaPipe } from "./models/MediaPipe.js";
import { GuitarSound } from "./controll/sound.js";
import { GuitarVisualizer } from "./visual/GuitarVisualizer.js";
import { Loading } from "./visual/Loading.js";
import { ToolBar } from "./controll/ToolBar.js";
let MP;
let GS;
let GV;
let TB;

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
    if (TB.mode == "Free Play") {
        GS.buildGuitarChord(MP.gesture);
        GS.plucking(MP.fingerBend);
        GS.strumming(MP.handData.Right);
        GV.drawGesture(MP.gesture, MP.handData.Left[9]);
        GV.drawNote(GS.pluckNotes, GS.prevPluck, MP.handData.Right);
        GV.drawStrings();
    }
    if (TB.mode == "Number Score"){
        
    }
    requestAnimationFrame(loop);
}

async function main() {
    const loading = new Loading();

    const progress = async (value, text) => {
        loading.setProgress(value, text);
        await new Promise(resolve => setTimeout(resolve, 500));
    };
    await progress(10, "Starting");
    GS = new GuitarSound();
    await GS.loadSamples();

    await progress(30, "Setup Tool Bar");
    TB = new ToolBar();

    await progress(60, "Open Camera");
    MP = new MediaPipe(await initVideo());

    await progress(80, "Loading Model");
    await MP.init();

    await progress(90, "Setup Visualizer");
    GV = new GuitarVisualizer(await initCanvas(MP.video));
    GV.connectSound(GS);

    await progress(100, "Ready");
    setTimeout(() => {
        loading.hide();
        loop();
    }, 500);
}

window.addEventListener("DOMContentLoaded", main);
