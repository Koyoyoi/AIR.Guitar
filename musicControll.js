import { plucking, strumming, mapRange } from "./MIDI.js";
import { vectorAngle, vectorCompute, fingerPlay } from "./handCompute.js";
import { handData, poseData, video, capo } from "./main.js"

let armAngles = [];
let action = '', prevAction = '';
let pluck = [], prevPluck = [], velocities = [];
let timeCnt = 0;

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
            return 0;
        } else if (poseData[16][1] < poseData[0][1]) {
            return Math.min(12, capo + 1);
        } else if (poseData[15][1] < poseData[0][1]) {
            return Math.max(-12, capo - 1);
        }
    }
    timeCnt += 1;
    return capo
}