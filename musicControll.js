import { buildGuitarChord, plucking, strumming, mapRange, initMIDI, instruments, loadSamples } from "./sound.js";
import { compute, vectorAngle, vectorCompute, fingerPlay } from "./handCompute.js";
import { handData, poseData, video } from "./main.js"
import { predict } from "./SVM.js";
import {  drawCapo, drawGesture } from "./Draw/drawInfo.js";

export let capo = 0, portOpen = false, sampleName = 0 ;

let gesture = '', prevGesture = '';
let armAngles = [];
let action = '', prevAction = '';
let pluck = [], prevPluck = [], velocities = [];
let timeCnt = 0;


export async function chordCtrl() {
    // Chord Control
    if (handData['Left'].length != 0) {
        let parameters = compute(handData['Left']);
        gesture = await predict(parameters);
        if (prevGesture != gesture) {
            console.log(gesture);
            prevGesture = gesture;
            buildGuitarChord(gesture);
        }
        drawGesture(gesture, capo);
    }

}

export async function pluckCtrl() {
    // Plucking Control
    if (handData['Right'].length != 0) {
        [pluck, velocities] = await fingerPlay(handData['Right']);
    }

    if (!pluck.includes(4)) {
        let diffPluck = [...pluck, ...prevPluck].filter(
            x => !prevPluck.includes(x)
        );

        if (diffPluck.length > 0) {
            console.log(velocities)
            plucking(diffPluck, capo, velocities);
        }
        prevPluck = pluck.slice();
    }
}

export async function strumCtrl() {
    // Strumming Control
    if (poseData[12] != undefined && poseData[14] != undefined && poseData[16] != undefined && poseData[16][1] < video.videoHeight) {
        let angle = vectorAngle(vectorCompute(poseData[12], poseData[14]), vectorCompute(poseData[16], poseData[14]));
        armAngles.push(angle);
        let position = poseData[16][0] - poseData[12][0];

        if (armAngles.length >= 6) {
            let diffs = [];
            for (let i = 1; i < 6; i++) {
                diffs.push(armAngles[i] - armAngles[i - 1]);
            }

            let diffAngle = diffs.reduce((sum, d) => sum + d, 0) / diffs.length;

            if (diffAngle > 3 && position > 5) {
                action = 'Down';
            } else if (diffAngle < -3 && position < -15) {
                action = 'Up';

            } else {
                action = 'Stop';
                prevAction = 'Stop';
                armAngles = [];
            }

            if (action != prevAction && action != 'Stop') {
                let duration = await mapRange(Math.abs(diffAngle), 3, 15, 125, 1);
                strumming(action, capo, duration);
                prevAction = action;
            }

            armAngles.shift();
        }
    }
}

export async function capoCtrl() {
    // Capo control 每1秒執行一次
    if (poseData.length > 0 && timeCnt >= 30) {
        timeCnt = 0;
        if (poseData[15][1] < poseData[0][1] && poseData[16][1] < poseData[0][1]) {
            capo = 0;
        } else if (poseData[16][1] < poseData[0][1]) {
            capo = Math.min(12, capo + 1);
        } else if (poseData[15][1] < poseData[0][1]) {
            capo = Math.max(-12, capo - 1);
        }
    }
    timeCnt += 1;
    drawCapo(capo)
}

export async function portCtrl() {
    portOpen = !portOpen
    if (portOpen) { await initMIDI() }
}

export async function sampleCtrl(c){
    if (c == '-'){
        sampleName -= 1
    }else if (c == '+'){
        sampleName += 1
    }
    sampleName = (instruments.length + sampleName) % instruments.length
    loadSamples();
}