import { buildGuitarChord, plucking, strumming, mapRange, initMIDIPort, instruments, loadSamples } from "../sound.js";
import { compute, vectorAngle, vectorCompute, fingerPlay } from "../handCompute.js";
import { handData, poseData, video } from "../main.js";
import { predict } from "../SVM.js";
import { drawCapo, drawGesture } from "../Draw/drawInfo.js";

// 設定全域變數
export let capo = 0, portOpen = false, sampleName = 0, showAllCtrl = false;

let gesture = '', prevGesture = '';  // 手勢相關
let armAngles = [];  // 手臂角度
let action = '', prevAction = '';  // 動作狀態
let pluck = [], prevPluck = [], velocities = [];  // 撥弦狀態與速度
let timeCnt = 0;  // 計時器

// 和弦控制
export async function chordCtrl() {
    if (handData['Left'].length != 0) {
        let parameters = compute(handData['Left']);
        gesture = await predict(parameters);

        // 若手勢改變，重新構建和弦
        if (prevGesture != gesture) {
            console.log(gesture);
            prevGesture = gesture;
            buildGuitarChord(gesture);  // 建立對應的吉他和弦
        }

        // 繪製手勢
        drawGesture(gesture, capo);
    }
}

// 撥弦控制
export async function pluckCtrl() {
    if (handData['Right'].length != 0) {
        [pluck, velocities] = await fingerPlay(handData['Right']);  // 計算撥弦與速度
    }

    // 檢查是否有新的撥弦，並執行撥弦動作
    if (!pluck.includes(4)) {
        let diffPluck = [...pluck, ...prevPluck].filter(x => !prevPluck.includes(x));

        if (diffPluck.length > 0) {
            plucking(diffPluck, capo, velocities);  // 撥弦
        }
        prevPluck = pluck.slice();                  // 更新撥弦狀態
    }
}

// 掃弦控制
export async function strumCtrl() {
    if (poseData[12] != undefined && poseData[14] != undefined && poseData[16] != undefined && poseData[16][1] < video.videoHeight) {
        let angle = vectorAngle(vectorCompute(poseData[12], poseData[14]), vectorCompute(poseData[16], poseData[14]));  // 計算手臂的角度
        armAngles.push(angle);
        let position = poseData[16][0] - poseData[12][0];  // 計算位置變化

        // 判斷是否有掃弦動作
        if (armAngles.length >= 6) {
            let diffs = [];
            for (let i = 1; i < 6; i++) {
                diffs.push(armAngles[i] - armAngles[i - 1]);
            }

            let diffAngle = diffs.reduce((sum, d) => sum + d, 0) / diffs.length;

            // 根據角度變化和位置來判斷掃弦方向
            if (diffAngle > 3 && position > 5) {
                action = 'Down';
            } else if (diffAngle < -3 && position < -15) {
                action = 'Up';
            } else {
                action = 'Stop';
                prevAction = 'Stop';
                armAngles = [];  // 清空角度數據
            }

            // 執行掃弦動作
            if (action != prevAction && action != 'Stop') {
                let duration = await mapRange(Math.abs(diffAngle), 3, 15, 125, 1);  // 計算掃弦持續時間
                strumming(action, capo, duration);  // 掃弦
                prevAction = action;
            }

            armAngles.shift();  // 移除最舊的角度數據
        }
    }
}

// 品位控制
export async function capoCtrl() {
    if (poseData.length > 0 && timeCnt >= 30) {
        timeCnt = 0;

        // 判斷姿勢並調整品位
        if (poseData[15][1] < poseData[0][1] && poseData[16][1] < poseData[0][1]) {
            capo = 0;   
        } else if (poseData[16][1] < poseData[0][1]) {
            capo = Math.min(12, capo + 1);  
        } else if (poseData[15][1] < poseData[0][1]) {
            capo = Math.max(-12, capo - 1);   
        }
    }
    timeCnt += 1;    // 計時器更新
    drawCapo(capo);  // 更新畫面上的品位顯示
}

// MIDI Port 控制
export async function portCtrl() {
    portOpen = !portOpen;
    if (portOpen) {
        await initMIDIPort();  // 初始化 MIDI
    }
}

// sound font控制
export async function sampleCtrl(c) {
    if (c == '-') {
        sampleName -= 1;  // 減少樣本索引
    } else if (c == '+') {
        sampleName += 1;  // 增加樣本索引
    }
    sampleName = (instruments.length + sampleName) % instruments.length;  // 確保樣本索引在範圍內
    loadSamples();  // 加載對應的樣本
}

export async function settingCtrl() {
    showAllCtrl = !showAllCtrl
}
