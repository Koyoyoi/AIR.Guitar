import { video } from "./main.js";

export function compute(landmarks) {
    let parameters = [];
    let refp1 = [landmarks[7][0], landmarks[7][1]];
    let refp2 = [landmarks[8][0], landmarks[8][1]];
    let refDistance = Math.hypot(refp2[0] - refp1[0], refp2[1] - refp1[1]);
    
    const pairs = [
        [2, 4], [0, 4], [6, 8], [5, 8], [10, 12], [9, 12], [14, 16], [13, 16], [18, 20], [17, 20],
        [4, 8], [8, 12], [12, 16], [16, 20], [4, 5], [8, 9], [12, 13], [16, 17], [1, 8], [5, 12], [9, 16], [13, 20]
    ];
    
    for (let pair of pairs) {
        let p1 = [landmarks[pair[0]][0], landmarks[pair[0]][1]];
        let p2 = [landmarks[pair[1]][0], landmarks[pair[1]][1]];
        let distance = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / refDistance;
        parameters.push(distance);
    }
    
    let fingerAngles = fingerAngle(landmarks);
    parameters.push(...fingerAngles);
    
    return parameters;
}

export function vectorAngle(v1, v2) {
    let dotProduct = v1[0] * v2[0] + v1[1] * v2[1];
    let mag1 = Math.hypot(v1[0], v1[1]);
    let mag2 = Math.hypot(v2[0], v2[1]);

    if (mag1 === 0 || mag2 === 0) return 180;

    let angle = Math.acos(dotProduct / (mag1 * mag2)) * (180 / Math.PI);
    return angle;
}

export function vectorCompute(p1, p2) {
    if (!Array.isArray(p1) || !Array.isArray(p2) || p1.length < 2 || p2.length < 2) {
        console.warn("Invalid input to vectorCompute, returning [0, 0]:", { p1, p2 });
        return [0, 0];
    }
    return [p1[0] - p2[0], p1[1] - p2[1]];
}

function fingerAngle(hand) {
    return [
        vectorAngle(vectorCompute(hand[1], hand[2]), vectorCompute(hand[2], hand[4])),
        vectorAngle(vectorCompute(hand[5], hand[6]), vectorCompute(hand[6], hand[8])),
        vectorAngle(vectorCompute(hand[9], hand[10]), vectorCompute(hand[10], hand[12])),
        vectorAngle(vectorCompute(hand[13], hand[14]), vectorCompute(hand[14], hand[16])),
        vectorAngle(vectorCompute(hand[17], hand[18]), vectorCompute(hand[18], hand[20]))
    ];
}

export async function fingerPlay(hand) {
    let angles = fingerAngle(hand);
    let pick = [];
    if (angles[0] > 25) pick.push(0);
    if (angles[1] > 25) pick.push(1);
    if (angles[2] > 25) pick.push(2);
    if (angles[3] > 25) pick.push(3);
    if (angles[4] > 50) pick.push(4);
    return [ pick, angles ];
}
