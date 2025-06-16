import { buildGuitarChord, plucking, strumming, mapRange } from "../sound.js";
import { compute, vectorAngle, vectorCompute, fingerPlay } from "../handCompute.js";
import { showAllCtrl, capo, modeNum } from "./blockControll.js";
import { drawGesture } from "../Draw/drawInfo.js";
import { video, handData, poseData } from "../main.js";
import { rollSeq } from "../Draw/drawMIDI.js";
import { predict } from "../SVM.js";

export let gesture = '', prevGesture = '';                 // 手勢相關

let armAngles = [];                                        // 手臂角度
let action = '', prevAction = '';                          // 動作狀態
let isRPinch = false, isLPinch = false, PinchLR = false    // 指尖觸碰
let triggeredBy = null;                                    // "R" 或 "L"：記錄目前由哪隻手觸發中
let prevRX = null, prevLX = null;
let prevRY = null;

let pluck = [], prevPluck = { 'Right': [], 'Left': [] }, velocities = [];

// 和弦控制
export async function chordCtrl() {
    if (handData['Left'].length == 0) return;

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

// 撥弦控制
export async function pluckCtrl() {
    if (showAllCtrl) return;

    let toPluck = modeNum == 1 ? ['Right', 'Left'] : ['Right'];

    for (let hand of toPluck) {
        if (handData[hand].length === 0) continue;

        [pluck, velocities] = await fingerPlay(handData[hand]);  // 偵測撥弦與速度

        if (modeNum === 1) {
            // ✅ 只判斷拇指與食指是否彎曲
            const bentThumbIndex = pluck.includes(0) && pluck.includes(1);
            const wasBentThumbIndex = prevPluck[hand].includes(0) && prevPluck[hand].includes(1);

            if (bentThumbIndex && !wasBentThumbIndex) {
                // 固定撥 0,1 為撥弦指
                rollSeq()
            }

            // 更新狀態
            prevPluck[hand] = pluck.slice();
        } else {
            // 原本邏輯（可支援撥 2~4 指）
            const isOnlyThumb = pluck.length === 1 && pluck[0] === 4;
            if (!isOnlyThumb) {
                const diffPluck = pluck.filter(x => !prevPluck[hand].includes(x));
                if (diffPluck.length > 0) {
                    plucking(diffPluck, capo, velocities);
                }
                prevPluck[hand] = pluck.slice();
            }
        }
    }
}

// 掃弦控制
export async function strumCtrl() {
    if (showAllCtrl) return

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
                action = 'Dn';
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

export async function pinchCtrl(RHand, LHand) {

    // 檢查兩邊食指接觸 (PinchLR)
    if (RHand?.[8] && LHand?.[8]) {
        const dx = RHand[8][0] - LHand[8][0];
        const dy = RHand[8][1] - LHand[8][1];
        const dist = Math.hypot(dx, dy);

        if (dist < 50 && !PinchLR) {
            PinchLR = true;
            rollSeq();
        } else if (dist >= 50 && PinchLR) {
            PinchLR = false;
        }
    }

    if (!PinchLR) {

        // 檢查右手 pinch
        if (RHand?.[4] && RHand?.[8]) {
            const dx = RHand[4][0] - RHand[8][0];
            const dy = RHand[4][1] - RHand[8][1];
            const dist = Math.hypot(dx, dy);
            if (dist < 40 && !isRPinch) {
                isRPinch = true;
                rollSeq(); // 右手觸發
            } else if (dist >= 50 && isRPinch) {
                isRPinch = false;
            }
        }

        // 檢查左手 pinch
        if (LHand?.[4] && LHand?.[8]) {
            const dx = LHand[4][0] - LHand[8][0];
            const dy = LHand[4][1] - LHand[8][1];
            const dist = Math.hypot(dx, dy);
            if (dist < 40 && !isLPinch) {
                isLPinch = true;
                rollSeq(); // 左手觸發
            } else if (dist >= 50 && isLPinch) {
                isLPinch = false;
            }
        }
    }

}

export async function wavingCtrl(RHand, LHand) {
    if (modeNum === 1) {
        const midX = video.videoWidth / 2;

        // 右手判斷
        if (RHand?.[0]) {
            const currentRX = RHand[9][0];
            if (prevRX !== null) {
                if ((prevRX < midX && currentRX >= midX) || (prevRX >= midX && currentRX < midX)) {
                    if (triggeredBy === null || triggeredBy === "R") {
                        triggeredBy = "R";
                        rollSeq();
                    }
                }
            }
            prevRX = currentRX;
        } else if (triggeredBy === "R") {
            triggeredBy = null; // 右手離開畫面，解除限制
        }

        // 左手判斷
        if (LHand?.[0]) {
            const currentLX = LHand[9][0];
            if (prevLX !== null) {
                if ((prevLX < midX && currentLX >= midX) || (prevLX >= midX && currentLX < midX)) {
                    if (triggeredBy === null || triggeredBy === "L") {
                        triggeredBy = "L";
                        rollSeq();
                    }
                }
            }
            prevLX = currentLX;
        } else if (triggeredBy === "L") {
            triggeredBy = null; // 左手離開畫面，解除限制
        }
    }
    else if (modeNum === 2) {
        const midY = video.videoHeight / 2;

        if (RHand?.[0]) {
            const currentRY = RHand[9][1];

            if (prevRY !== null) {
                const crossedDown = prevRY < midY && currentRY >= midY;  // 只由上往下
                if (crossedDown && (triggeredBy === null || triggeredBy === "R")) {
                    triggeredBy = "R";
                    rollSeq('Down');
                }
            }

            prevRY = currentRY;
        } else if (triggeredBy === "R") {
            triggeredBy = null;
            prevRY = null;
        }
    }

}