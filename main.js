import { MediaPipe } from "./models/MediaPipe.js";
import { Sound } from "./controll/Sound.js";
import { HandVisualizer } from "./visual/HandVisualizer.js";
import { Loading } from "./visual/Loading.js";
import { ToolBar } from "./controll/ToolBar.js";
let MP;
let sound;
let handVisual;
let toolBar;

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
    handVisual.clear();
    handVisual.setHand(MP.handData);

    await MP.detectHand();
    if (toolBar.mode == "Free Play") {
        sound.buildGuitarChord(MP.gesture, toolBar.capo);
        sound.plucking(MP.fingerBend);
        sound.strumming(MP.handData.Right);
        handVisual.drawGesture(MP.gesture, toolBar.capo, MP.handData.Left[9]);
        handVisual.drawNote(sound.pluckNotes, sound.prevPluck, MP.handData.Right);
        handVisual.drawStrings();
    }
    if (toolBar.mode == "Number Score"){
        
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
    sound = new Sound();
    await sound.loadSamples();

    await progress(30, "Setup Tool Bar");
    toolBar = new ToolBar();

    await progress(60, "Open Camera");
    MP = new MediaPipe(await initVideo());

    await progress(80, "Loading Model");
    await MP.init();

    await progress(90, "Setup Visualizer");
    handVisual = new HandVisualizer(await initCanvas(MP.video));
    handVisual.connectSound(sound);

    await progress(100, "Ready");
    setTimeout(() => {
        loading.hide();
        loop();
    }, 500);
}

window.addEventListener("DOMContentLoaded", main);
