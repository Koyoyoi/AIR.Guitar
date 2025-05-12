import { canvas } from "../main.js";

// 畫三角形，根據方向繪製左右箭頭
export function drawTriangle(area, direction = "left", color = "#434343") {
    const { x, y, w, h } = area;           // 解構區域座標與尺寸

    canvas['base'].ctx.fillStyle = color;  // 設定顏色
    canvas['base'].ctx.beginPath();        // 開始繪製

    // 根據方向繪製三角形，"left" 為左箭頭，其他為右箭頭
    if (direction === "left") {
        canvas['base'].ctx.moveTo(x + w, y);         // 上角
        canvas['base'].ctx.lineTo(x, y + h / 2);     // 中間
        canvas['base'].ctx.lineTo(x + w, y + h);     // 下角
    } else {
        canvas['base'].ctx.moveTo(x, y);             // 上角
        canvas['base'].ctx.lineTo(x + w, y + h / 2); // 中間
        canvas['base'].ctx.lineTo(x, y + h);         // 下角
    }

    canvas['base'].ctx.closePath();  // 關閉路徑
    canvas['base'].ctx.fill();       // 填充顏色

    // 加入視覺圓角修飾（兩端圓形）
    const r = 6;                                                   // 圓角半徑
    canvas['base'].ctx.beginPath();
    const arcX = direction === "left" ? x + w : x;                 // 根據方向決定圓角的 X 座標
    canvas['base'].ctx.arc(arcX, y + r, r, Math.PI, Math.PI * 2);  // 上圓角
    canvas['base'].ctx.arc(arcX, y + h - r, r, 0, Math.PI);        // 下圓角
    canvas['base'].ctx.fill();                                     // 填充圓角
}

// 畫圓角矩形的輔助函式
export function drawRect(area, radius, color = "#434343") {
    const { x, y, w, h } = area;           // 解構區域座標與尺寸

    canvas['base'].ctx.fillStyle = color;  // 設定顏色

    canvas['base'].ctx.beginPath();        // 開始繪製
    // 從左上角開始，使用二次貝茲曲線來畫圓角
    canvas['base'].ctx.moveTo(x + radius, y);
    canvas['base'].ctx.lineTo(x + w - radius, y);
    canvas['base'].ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    canvas['base'].ctx.lineTo(x + w, y + h - radius);
    canvas['base'].ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    canvas['base'].ctx.lineTo(x + radius, y + h);
    canvas['base'].ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    canvas['base'].ctx.lineTo(x, y + radius);
    canvas['base'].ctx.quadraticCurveTo(x, y, x + radius, y);
    canvas['base'].ctx.closePath();  // 關閉路徑

    canvas['base'].ctx.fill();       // 填充顏色
}

// 畫圓形的輔助函式
export function drawCircle(area, color) {
    const centerX = area.x + area.r / 2;   // 圓心 X 座標
    const centerY = area.y + area.r / 2;   // 圓心 Y 座標

    canvas['midi'].ctx.beginPath();        // 開始繪製圓形
    canvas['midi'].ctx.arc(centerX, centerY, area.r / 2, 0, 2 * Math.PI);  // 計算圓形範圍
    canvas['midi'].ctx.fillStyle = color;  // 設定顏色
    canvas['midi'].ctx.fill();             // 填充顏色
}
