import { ctx } from "./main.js";

export function drawTriangle(area, direction = "left", color = "#434343") {
    const { x, y, w, h } = area;

    ctx.fillStyle = color;
    ctx.beginPath();

    if (direction === "left") {
        ctx.moveTo(x + w, y);         // 上角
        ctx.lineTo(x, y + h / 2);     // 中間
        ctx.lineTo(x + w, y + h);     // 下角
    } else {
        ctx.moveTo(x, y);             // 上角
        ctx.lineTo(x + w, y + h / 2); // 中間
        ctx.lineTo(x, y + h);         // 下角
    }

    ctx.closePath();
    ctx.fill();

    // 加視覺圓角修飾（兩端圓形）
    const r = 6;
    ctx.beginPath();
    const arcX = direction === "left" ? x + w : x;
    ctx.arc(arcX, y + r, r, Math.PI, Math.PI * 2);
    ctx.arc(arcX, y + h - r, r, 0, Math.PI);
    ctx.fill();
}

// 畫圓角矩形的輔助函式
export function drawRect(area, radius, color = "#434343") { 
    const { x, y, w, h } = area;

    ctx.fillStyle = color;  // 設定顏色

    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();

    ctx.fill();  // 填充顏色
}
