import { ctx, canvas, video, uploadedImage } from "./main.js";
import { rootTab, revRootTab } from "./sound.js";
import { portOpen } from "./musicControll.js";

let imgH = 0, imgW = 0

// 重新調整畫布與影片的大小
export function reCanva() {
    const aspectRatio = video.videoWidth / video.videoHeight; // 影片的寬高比
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    let newWidth = windowWidth;
    let newHeight = newWidth / aspectRatio;

    // 如果調整後的高度大於視窗高度，則根據視窗高度調整大小
    if (newHeight > windowHeight) {
        newHeight = windowHeight;
        newWidth = newHeight * aspectRatio;
    }

    // 設置影片和畫布的寬高
    video.style.width = `${newWidth}px`;
    video.style.height = `${newHeight}px`;

    canvas.style.width = video.style.width;
    canvas.style.height = video.style.height;
}

// 畫出手勢與轉調資訊
export function drawGesture(gesture, capo) {
    let transName = ""
    let posX = 50, posY = 50;

    // 設置文字樣式
    ctx.font = "700 100px Arial";
    ctx.fillStyle = "#00AA90";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";

    // 如果 capo 不為 0，則轉調
    if (capo != 0) {
        transName = `(${revRootTab[Math.floor((12 + rootTab[gesture[0]] + capo) % 12)]}${gesture.slice(1)})`
    }
    // 根據圖片大小調整文字顯示位置
    if (video.videoHeight - imgH > video.videoWidth / 2 - imgW) {
        posY += imgH - 30
    }
    else if (video.videoHeight - imgH < video.videoWidth / 2 - imgW) {
        posX += imgW
    }

    // 顯示手勢與轉調名稱
    ctx.fillText(`${gesture} ${transName}`, posX, posY);
}

// 畫出 capo 的設定資訊
export function drawCapo(capo) {
    // 畫出 capo 文字 (右上角)
    ctx.font = "700 80px Arial";
    ctx.fillStyle = "#00AA90";
    ctx.textAlign = "right";
    ctx.textBaseline = "top";
    ctx.fillText(`Capo: ${capo}`, canvas.width - 50, 50);
}

// 畫出上傳的圖片
export function drawImg() {
    const maxImgHeight = canvas.height;
    const naturalAspectRatio = uploadedImage.width / uploadedImage.height;

    // 先根據高度來縮放圖片
    imgH = maxImgHeight;
    imgW = imgH * naturalAspectRatio;

    // 如果圖片寬度超過畫布的一半，則限制為畫布寬度的一半，並重新計算高度
    const maxImgWidth = canvas.width / 2;
    if (imgW > maxImgWidth) {
        imgW = maxImgWidth;
        imgH = imgW / naturalAspectRatio;
    }

    // 將圖片繪製到畫布上
    ctx.drawImage(uploadedImage, 0, 0, imgW, imgH);
}

// 畫圓角矩形的輔助函式
function drawRoundedRect(x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

// 畫出 MIDI 控制區域
export function draw_midiPortArea() {
    const radius = 20;

    // 定義 MIDI 控制區域的位置與大小
    let midiPortArea = {
        x: 30,
        y: canvas.height - 30 - canvas.height * 0.08,
        w: canvas.width * 0.2,
        h: canvas.height * 0.08
    };

    // 畫圓角矩形區域
    drawRoundedRect(midiPortArea.x, midiPortArea.y, midiPortArea.w, midiPortArea.h, radius);
    ctx.fillStyle = "#434343";
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#1c1c1c";
    ctx.stroke();

    // 顯示 MIDI 控制區域的狀態
    ctx.font = `700 ${midiPortArea.h * 0.5}px Arial`;
    ctx.fillStyle = portOpen ? "#00AA90" : "#787d7b"; // 如果 portOpen 為 true，顯示為綠色，否則顯示為灰色
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`MIDI port : ${portOpen ? 'on' : 'off'}`, midiPortArea.x + midiPortArea.w / 2, midiPortArea.y + midiPortArea.h / 2);

    return midiPortArea
}
