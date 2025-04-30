import { plucking, strumming } from "./MIDI.js";
import { vectorAngle, vectorCompute, fingerPlay } from "./handCompute.js";
import { handData, poseData, video, capo } from "./main.js"

let armAngles = [];                              // 用來儲存手臂角度的陣列
let action = '', prevAction = '';                // 記錄目前和前一個撥弦動作
let pluck = [], prevPluck = [], velocities = []; // 儲存手指彈奏的資料
let timeCnt = 0;                                 // 計數器，用於控制 capo 調整的頻率

// 撥弦控制函數
export async function pluckCtrl() {
    // 若有偵測到右手資料，則進行手指彈奏的處理
    if (handData['Right'].length !== 0) {
        [pluck, velocities] = await fingerPlay(handData['Right']);
    }

    // 如果手指彈奏的動作不包含第 4 根手指（假設是無彈奏），則觸發彈奏
    if (!pluck.includes(4)) {
        let diffPluck = [...pluck, ...prevPluck].filter(
            x => !prevPluck.includes(x)            // 取得這次彈奏與前次彈奏之間的差異
        );

        if (diffPluck.length > 0) {
            console.log(velocities);               // 輸出彈奏的速度資料
            plucking(diffPluck, capo, velocities); // 調用 MIDI 撥弦函數
        }
        prevPluck = pluck.slice();                 // 更新前次的彈奏資料
    }
}

// 撥弦動作控制函數
export async function strumCtrl() {
    if (poseData[12] !== undefined && poseData[14] !== undefined && poseData[16] !== undefined && poseData[16][1] < video.videoHeight) {
        // 計算手臂關節間的角度來判斷撥弦方向
        let angle = vectorAngle(vectorCompute(poseData[12], poseData[14]), vectorCompute(poseData[16], poseData[14]));
        armAngles.push(angle);                            // 儲存手臂角度
        let position = poseData[16][0] - poseData[12][0]; // 計算手臂位置差

        // 若角度數據足夠（至少 6 幀），計算角度變化
        if (armAngles.length >= 6) {
            let diffs = [];
            for (let i = 1; i < 6; i++) {
                diffs.push(armAngles[i] - armAngles[i - 1]); // 計算每兩幀之間的角度變化
            }

            // 計算角度變化的平均值
            let diffAngle = diffs.reduce((sum, d) => sum + d, 0) / diffs.length;

            // 根據角度變化來決定撥弦方向
            if (diffAngle > 3 && position > 5) {
                action = 'Down'; // 撥弦向下
            } else if (diffAngle < -3 && position < -15) {
                action = 'Up';   // 撥弦向上
            } else {
                action = 'Stop'; // 停止撥弦
                prevAction = 'Stop';
                armAngles = [];  // 清空手臂角度資料
            }

            // 如果撥弦動作改變且非停止，則執行撥弦
            if (action !== prevAction && action !== 'Stop') {
                strumming(action, capo, diffAngle); // 調用 MIDI 撥弦函數
                prevAction = action;               // 更新前一個動作
            }

            armAngles.shift(); // 移除最舊的角度數據
        }
    }
}

// Capo 控制函數，每秒執行一次
export async function capoCtrl() {
    if (poseData.length > 0 && timeCnt >= 30) {
        timeCnt = 0; // 重置計數器
        
        if (poseData[15][1] < poseData[0][1] && poseData[16][1] < poseData[0][1]) {
            return 0;                       // 如果雙手都在頭以下，則不調整 capo
        } else if (poseData[16][1] < poseData[0][1]) {
            return Math.min(12, capo + 1);  // 如果右手在頭以下，增加 capo，最大為 12
        } else if (poseData[15][1] < poseData[0][1]) {
            return Math.max(-12, capo - 1); // 如果左手在頭以下，減少 capo，最小為 -12
        }
    }
    timeCnt += 1; 
    return capo; 
}
