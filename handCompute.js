import { mapRange } from "./MIDI.js";

/**
 * 計算兩個 3D 點的向量 (p1 - p2)
 * @param {Array} p1 - [x, y, z]
 * @param {Array} p2 - [x, y, z]
 * @returns {Array} 向量 [x, y, z]
 */
export function vectorCompute(p1, p2) {
    if (!Array.isArray(p1) || !Array.isArray(p2) || p1.length < 3 || p2.length < 3) {
        console.warn("Invalid input to vectorCompute, returning [0, 0, 0]:", { p1, p2 });
        return [0, 0, 0];
    }
    return [p1[0] - p2[0], p1[1] - p2[1], p1[2] - p2[2]];
}

/**
 * 計算兩個 3D 向量的夾角（單位：度）
 * @param {Array} v1 - 向量1 [x, y, z]
 * @param {Array} v2 - 向量2 [x, y, z]
 * @returns {number} 角度（degree）
 */
export function vectorAngle(v1, v2) {
    const dotProduct = v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2];
    const mag1 = Math.hypot(...v1);
    const mag2 = Math.hypot(...v2);

    if (mag1 === 0 || mag2 === 0) return 180; // 避免除以 0

    const cosTheta = dotProduct / (mag1 * mag2);
    return Math.acos(Math.min(Math.max(cosTheta, -1), 1)) * (180 / Math.PI); // 保險處理數值誤差
}

/**
 * 計算每根手指的角度
 * @param {Array} hand - 21 個 landmark
 * @returns {Array} 五根手指的角度
 */
function fingerAngle(hand) {
    return [
        vectorAngle(vectorCompute(hand[1], hand[2]), vectorCompute(hand[2], hand[4])),   // 拇指
        vectorAngle(vectorCompute(hand[5], hand[6]), vectorCompute(hand[6], hand[8])),   // 食指
        vectorAngle(vectorCompute(hand[9], hand[10]), vectorCompute(hand[10], hand[12])), // 中指
        vectorAngle(vectorCompute(hand[13], hand[14]), vectorCompute(hand[14], hand[16])), // 無名指
        vectorAngle(vectorCompute(hand[17], hand[18]), vectorCompute(hand[18], hand[20]))  // 小指
    ];
}

/**
 * 計算手勢特徵參數（距離、角度）
 * @param {Array} landmarks - 21 個 landmark
 * @returns {Array} 特徵參數（normalized distances + finger angles）
 */
export function compute(landmarks) {
    const parameters = [];

    // 參考距離，用來標準化（使用食指的兩點）
    const refDistance = Math.hypot(
        landmarks[8][0] - landmarks[7][0],
        landmarks[8][1] - landmarks[7][1],
        landmarks[8][2] - landmarks[7][2]
    ) || 1; // 避免 refDistance 為 0

    // 要計算距離的 landmark 配對
    const pairs = [
        [2, 4], [0, 4], [6, 8], [5, 8], [10, 12], [9, 12],
        [14, 16], [13, 16], [18, 20], [17, 20],
        [4, 8], [8, 12], [12, 16], [16, 20],
        [4, 5], [8, 9], [12, 13], [16, 17],
        [1, 8], [5, 12], [9, 16], [13, 20]
    ];

    for (const [i, j] of pairs) {
        const dist = Math.hypot(
            landmarks[j][0] - landmarks[i][0],
            landmarks[j][1] - landmarks[i][1],
            landmarks[j][2] - landmarks[i][2]
        ) / refDistance;
        parameters.push(dist);
    }

    // 加入每根手指的角度
    parameters.push(...fingerAngle(landmarks));

    return parameters;
}

/**
 * 根據手指角度判定要播放哪些音符與其力度
 * @param {Array} hand - 21 個 landmark
 * @returns {Promise<[Array, Array]>} [要播放的音符編號, 對應的 velocities]
 */
export async function fingerPlay(hand) {
    const angles = fingerAngle(hand);
    const pick = [];
    const velocities = [];

    // 各手指開啟條件
    if (angles[0] > 15) { 
        pick.push(0); 
        velocities.push(mapRange(angles[0], 30, 60, 40, 127)); 
    }
    if (angles[1] > 20) { 
        pick.push(1); 
        velocities.push(mapRange(angles[1], 30, 180, 40, 127)); 
    }
    if (angles[2] > 20) { 
        pick.push(2); 
        velocities.push(mapRange(angles[2], 20, 160, 40, 127)); 
    }
    if (angles[3] > 20) { 
        pick.push(3); 
        velocities.push(mapRange(angles[3], 20, 150, 40, 127)); 
    }
    if (angles[4] > 150) { 
        pick.push(4); 
        velocities.push(0); // 小指角度大時，velocity = 0（mute）
    }

    return [pick, velocities];
}