import { mapRange } from "./sound.js";

// 3D 向量運算
export function vectorCompute(p1, p2) {
    if (!Array.isArray(p1) || !Array.isArray(p2) || p1.length < 3 || p2.length < 3) {
        console.warn("Invalid input to vectorCompute, returning [0, 0, 0]:", { p1, p2 });
        return [0, 0, 0];
    }
    return [p1[0] - p2[0], p1[1] - p2[1], p1[2] - p2[2]];
}

// 支援 3D 向量角度計算
export function vectorAngle(v1, v2) {
    const dotProduct = v1[0]*v2[0] + v1[1]*v2[1] + v1[2]*v2[2];
    const mag1 = Math.hypot(v1[0], v1[1], v1[2]);
    const mag2 = Math.hypot(v2[0], v2[1], v2[2]);

    if (mag1 === 0 || mag2 === 0) return 180;

    const angle = Math.acos(dotProduct / (mag1 * mag2)) * (180 / Math.PI);
    return angle;
}

// 計算手指角度
function fingerAngle(hand) {
    return [
        vectorAngle(vectorCompute(hand[1], hand[2]), vectorCompute(hand[2], hand[4])),
        vectorAngle(vectorCompute(hand[5], hand[6]), vectorCompute(hand[6], hand[8])),
        vectorAngle(vectorCompute(hand[9], hand[10]), vectorCompute(hand[10], hand[12])),
        vectorAngle(vectorCompute(hand[13], hand[14]), vectorCompute(hand[14], hand[16])),
        vectorAngle(vectorCompute(hand[17], hand[18]), vectorCompute(hand[18], hand[20]))
    ];
}

// 主要輸出參數計算（距離與角度）
export function compute(landmarks) {
    let parameters = [];

    let refp1 = landmarks[7];
    let refp2 = landmarks[8];
    let refDistance = Math.hypot(
        refp2[0] - refp1[0],
        refp2[1] - refp1[1],
        refp2[2] - refp1[2]
    );

    const pairs = [
        [2, 4], [0, 4], [6, 8], [5, 8], [10, 12], [9, 12], [14, 16], [13, 16], [18, 20], [17, 20],
        [4, 8], [8, 12], [12, 16], [16, 20], [4, 5], [8, 9], [12, 13], [16, 17], [1, 8], [5, 12], [9, 16], [13, 20]
    ];

    for (let pair of pairs) {
        const p1 = landmarks[pair[0]];
        const p2 = landmarks[pair[1]];
        const dist = Math.hypot(
            p2[0] - p1[0],
            p2[1] - p1[1],
            p2[2] - p1[2]
        ) / refDistance;
        parameters.push(dist);
    }

    const angles = fingerAngle(landmarks);
    parameters.push(...angles);

    return parameters;
}

// 用手指角度來觸發
export async function fingerPlay(hand) {
    const angles = fingerAngle(hand);
    let pick = [], velocities = [];

    if (angles[0] > 15) { pick.push(0); velocities.push(mapRange(angles[0], 30, 60, 60, 127)); }
    if (angles[1] > 20) { pick.push(1); velocities.push(mapRange(angles[1], 30, 180, 40, 127)); }
    if (angles[2] > 20) { pick.push(2); velocities.push(mapRange(angles[2], 20, 160, 40, 127)); }
    if (angles[3] > 20) { pick.push(3); velocities.push(mapRange(angles[3], 20, 150, 40, 127)); }
    if (angles[4] > 150) { pick.push(4); velocities.push(0); }

    return [pick, velocities];
}
