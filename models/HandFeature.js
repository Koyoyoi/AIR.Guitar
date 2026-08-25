export function vectorCompute(p1, p2) {
    if (!Array.isArray(p1) || !Array.isArray(p2) || p1.length < 3 || p2.length < 3) {
        console.warn("Invalid input to vectorCompute, returning [0, 0, 0]:", { p1, p2 });
        return [0, 0, 0];
    }

    return [p1[0] - p2[0], p1[1] - p2[1], p1[2] - p2[2]];
}

export function vectorAngle(v1, v2) {
    const dotProduct = v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2];
    const mag1 = Math.hypot(v1[0], v1[1], v1[2]);
    const mag2 = Math.hypot(v2[0], v2[1], v2[2]);

    if (mag1 === 0 || mag2 === 0) return 180;

    const cosine = Math.max(-1, Math.min(1, dotProduct / (mag1 * mag2)));
    return Math.acos(cosine) * (180 / Math.PI);
}

function fingerAngle(hand) {
    return [
        vectorAngle(vectorCompute(hand[0], hand[2]), vectorCompute(hand[2], hand[4])),
        vectorAngle(vectorCompute(hand[5], hand[6]), vectorCompute(hand[6], hand[8])),
        vectorAngle(vectorCompute(hand[9], hand[10]), vectorCompute(hand[10], hand[12])),
        vectorAngle(vectorCompute(hand[13], hand[14]), vectorCompute(hand[14], hand[16])),
        vectorAngle(vectorCompute(hand[17], hand[18]), vectorCompute(hand[18], hand[20])),
    ];
}

function isHandLandmarks(landmarks) {
    return Array.isArray(landmarks)
        && landmarks.length >= 21
        && landmarks.every((point) => Array.isArray(point) && point.length >= 3);
}

export function compute(landmarks) {
    if (!isHandLandmarks(landmarks)) return [];

    const refDistance = Math.hypot(
        landmarks[8][0] - landmarks[7][0],
        landmarks[8][1] - landmarks[7][1],
        landmarks[8][2] - landmarks[7][2]
    );
    if (refDistance === 0) return [];

    const pairs = [
        [2, 4], [0, 4], [6, 8], [5, 8], [10, 12], [9, 12], [14, 16], [13, 16], [18, 20], [17, 20],
        [4, 8], [8, 12], [12, 16], [16, 20], [4, 5], [8, 9], [12, 13], [16, 17], [1, 8], [5, 12], [9, 16], [13, 20],
    ];

    const distances = pairs.map(([first, second]) => Math.hypot(
        landmarks[second][0] - landmarks[first][0],
        landmarks[second][1] - landmarks[first][1],
        landmarks[second][2] - landmarks[first][2]
    ) / refDistance);

    return [...distances, ...fingerAngle(landmarks)];
}

export function mapRange(value, inputMin, inputMax, outputMin, outputMax) {
    const ratio = (value - inputMin) / (inputMax - inputMin);
    const clampedRatio = Math.max(0, Math.min(1, ratio));
    return Math.round(outputMin + clampedRatio * (outputMax - outputMin));
}

export function fingerBends(hand) {
    if (!isHandLandmarks(hand)) return [[], []];

    const angles = fingerAngle(hand);
    const pick = [];
    const velocities = [];

    if (angles[0] > 15) { pick.push(0); velocities.push(mapRange(angles[0], 30, 60, 60, 127)); }
    if (angles[1] > 20) { pick.push(1); velocities.push(mapRange(angles[1], 30, 180, 40, 127)); }
    if (angles[2] > 20) { pick.push(2); velocities.push(mapRange(angles[2], 20, 160, 40, 127)); }
    if (angles[3] > 30) { pick.push(3); velocities.push(mapRange(angles[3], 20, 150, 40, 127)); }
    if (angles[4] > 150) { pick.push(4); velocities.push(0); }

    return [pick, velocities];
}
