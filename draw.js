import { ctx, canvas, video, uploadedImage } from "./main.js";
import { rootTab, revRootTab } from "./MIDI.js";

let imgH = 0, imgW = 0

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
