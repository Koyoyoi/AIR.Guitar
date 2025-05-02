import { ctx, canvas, video, uploadedImage } from "./main.js";
import { rootTab, revRootTab } from "./MIDI.js";

let imgH = 0, imgW = 0

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

export function drawGesture(gesture, capo) {
    // 畫出手勢文字(左上角)
    let transName = ""
    let posX = 50, posY = 50;
 
    ctx.font = "100px Arial";
    ctx.fillStyle = "#00AA90";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    
    // transpose re-name and re-position
    if (capo != 0) {
        transName = `(${revRootTab[Math.floor((12 + rootTab[gesture[0]] + capo) % 12)]}${gesture.slice(1)})`
    }
    if (video.videoHeight - imgH > video.videoWidth / 2 - imgW) {
        posY += imgH- 30
    }
    else if (video.videoHeight - imgH < video.videoWidth / 2 - imgW) {
        posX += imgW
    }

    ctx.fillText(`${gesture} ${transName}`, posX, posY);  
}

export function drawCapo(capo) {
    // 畫出 capo 文字(右上角）
    ctx.font = "80px Arial";
    ctx.fillStyle = "#00AA90";
    ctx.textAlign = "right";
    ctx.textBaseline = "top";
    ctx.fillText(`Capo: ${capo}`, canvas.width - 50, 50);  
}

export function drawImg() {
    const maxImgHeight = canvas.height;
    const naturalAspectRatio = uploadedImage.width / uploadedImage.height;

    // 先依照高度縮放
    imgH = maxImgHeight;
    imgW = imgH * naturalAspectRatio;

    // 如果超過 canvas 寬度的一半，則限制為一半並重新計算高度
    const maxImgWidth = canvas.width / 2;
    if (imgW > maxImgWidth) {
        imgW = maxImgWidth;
        imgH = imgW / naturalAspectRatio;
    }

    ctx.drawImage(uploadedImage, 0, 0, imgW, imgH);
}

// 儲存控制區的位置（供滑鼠點擊時使用）
export let midiCtrlArea = {
    x: 0,
    y: 0,
    width: 0,
    height: 0
};

export function getMIDIctrlArea() {
    return midiCtrlArea;
}

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

export function drawMIDIportCtrl(portName) {
    const boxWidth = canvas.width * 0.3;
    const boxHeight = canvas.height * 0.08;
    const margin = 30;
    const radius = 20;

    const x = margin;
    const y = canvas.height - margin - boxHeight;

    // 更新範圍資訊
    midiCtrlArea = { x, y, width: boxWidth, height: boxHeight };

    drawRoundedRect(x, y, boxWidth, boxHeight, radius);
    ctx.fillStyle = "#FFD700";
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#444";
    ctx.stroke();

    ctx.font = `${boxHeight * 0.4}px Arial`;
    ctx.fillStyle = "#000";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`MIDI: ${portName}`, x + boxWidth / 2, y + boxHeight / 2);
}



