import { ctx, canvas, video } from "./main.js";

export function drawGesture(gesture) {

    // 設定字型與顏色
    ctx.font = "100px Arial";
    ctx.fillStyle = "#00AA90";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";

    // 畫出手勢文字
    ctx.fillText(`${gesture}`, 50, 50);  // 位置設為左上角，距離 canvas 

}

export function drawCapo(capo) {
    // 設定字型與顏色
    ctx.font = "80px Arial";
    ctx.fillStyle = "#00AA90";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    // 畫出 capo 文字（右上角）

    ctx.textAlign = "right";  // 設為右對齊
    ctx.fillText(`Capo: ${capo}`, canvas.width - 50, 50);  // 顯示 capo，距離右邊 50px，並且在上方

}

// resize 函數
export function reCanva() {
    const aspectRatio = video.videoWidth / video.videoHeight;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    let newWidth = windowWidth;
    let newHeight = newWidth / aspectRatio;

    if (newHeight > windowHeight) {
        newHeight = windowHeight;
        newWidth = newHeight * aspectRatio;
    }

    video.style.width = `${newWidth}px`;
    video.style.height = `${newHeight}px`;

    canvas.style.width = video.style.width;
    canvas.style.height = video.style.height;
}
