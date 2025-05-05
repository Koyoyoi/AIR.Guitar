// 從 main.js 引入畫圖的上下文
import { ctx, midiCtx } from "../main.js";

// 畫三角形，根據方向繪製左右箭頭
export function drawTriangle(area, direction = "left", color = "#434343") {
    const { x, y, w, h } = area;  // 解構區域座標與尺寸

    ctx.fillStyle = color;  // 設定顏色
    ctx.beginPath();  // 開始繪製

    // 根據方向繪製三角形，"left" 為左箭頭，其他為右箭頭
    if (direction === "left") {
        ctx.moveTo(x + w, y);         // 上角
        ctx.lineTo(x, y + h / 2);     // 中間
        ctx.lineTo(x + w, y + h);     // 下角
    } else {
        ctx.moveTo(x, y);             // 上角
        ctx.lineTo(x + w, y + h / 2); // 中間
        ctx.lineTo(x, y + h);         // 下角
    }

    ctx.closePath();  // 關閉路徑
    ctx.fill();  // 填充顏色

    // 加入視覺圓角修飾（兩端圓形）
    const r = 6;  // 圓角半徑
    ctx.beginPath();
    const arcX = direction === "left" ? x + w : x;  // 根據方向決定圓角的 X 座標
    ctx.arc(arcX, y + r, r, Math.PI, Math.PI * 2);  // 上圓角
    ctx.arc(arcX, y + h - r, r, 0, Math.PI);  // 下圓角
    ctx.fill();  // 填充圓角
}

// 畫圓角矩形的輔助函式
export function drawRect(area, radius, color = "#434343") {
    const { x, y, w, h } = area;  // 解構區域座標與尺寸

    ctx.fillStyle = color;  // 設定顏色

    ctx.beginPath();  // 開始繪製
    // 從左上角開始，使用二次貝茲曲線來畫圓角
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();  // 關閉路徑

    ctx.fill();  // 填充顏色
}

// 畫圓形的輔助函式
export function drawCircle(area, color) {
    const centerX = area.x + area.w / 2;  // 圓心 X 座標
    const centerY = area.y + area.h / 2;  // 圓心 Y 座標
    const radius = area.h / 2;  // 圓的半徑

    midiCtx.beginPath();  // 開始繪製圓形
    midiCtx.arc(centerX, centerY, radius, 0, 2 * Math.PI);  // 計算圓形範圍
    midiCtx.fillStyle = color;  // 設定顏色
    midiCtx.fill();  // 填充顏色
}
