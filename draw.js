import { ctx, canvas, video, imgHeight, imgWidth } from "./main.js";
import { rootTab, revRootTab } from "./MIDI.js";

// 畫出手勢及其轉位名稱
export function drawGesture(gesture, capo) {
    let transName = "";  // 轉位
    let posX = 50, posY = 50;  // 預設位置

    ctx.font = "100px Arial";
    ctx.fillStyle = "#00AA90";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";

    // 如果有 capo，顯示轉位名稱
    if (capo != 0) {
        transName = `(${revRootTab[Math.floor((12 + rootTab[gesture[0]] + capo) % 12)]})`;
    }

    // 調整文字位置
    if (imgWidth != 0) {
        if (video.videoHeight - imgHeight > video.videoWidth / 2 - imgWidth) {
            posY += imgHeight - 30;
        } else if (video.videoHeight - imgHeight < video.videoWidth / 2 - imgWidth) {
            posX += imgWidth;
        }
    }
    // 畫出手勢文字
    ctx.fillText(`${gesture} ${transName}`, posX, posY);
}

// 畫出 Capo 設置
export function drawCapo(capo) {
    ctx.font = "80px Arial";
    ctx.fillStyle = "#00AA90";
    ctx.textAlign = "right";
    ctx.textBaseline = "top";
    console.log(canvas.width)
    // 畫出 Capo 文字 
    ctx.fillText(`Capo: ${capo}`, canvas.width - 50, 50);
}

// 畫出樂譜 (jpeg, png)
export function drawScore(uploadScore) {
    if (uploadeScore) {
        const maxImgHeight = canvas.height;
        const naturalAspectRatio = uploadScore.width / uploadScore.height;

        // 根據高度縮放圖片
        imgHeight = maxImgHeight;
        imgWidth = imgHeight * naturalAspectRatio;

        // 若圖片寬度超過 canvas 寬度的一半，則調整寬度與高度
        const maxImgWidth = canvas.width / 2;
        if (imgWidth > maxImgWidth) {
            imgWidth = maxImgWidth;
            imgHeight = imgWidth / naturalAspectRatio;
        }

        ctx.drawImage(uploadScore, 0, 0, imgWidth, imgHeight);  // 繪製圖片
    }
}

// 畫布大小重設函數
export function reCanva() {
    const aspectRatio = video.videoWidth / video.videoHeight;  // 計算影片的寬高比
    const windowWidth = window.innerWidth;   // 獲取視窗寬度
    const windowHeight = window.innerHeight; // 獲取視窗高度

    let newWidth = windowWidth;              // 預設寬度為視窗寬度
    let newHeight = newWidth / aspectRatio;  // 根據寬高比計算對應的高度

    // 若新的高度超過視窗高度，則調整寬度與高度
    if (newHeight > windowHeight) {
        newHeight = windowHeight;            // 高度限制為視窗高度
        newWidth = newHeight * aspectRatio;  // 根據高度調整寬度
    }

    // 更新 video 和 canvas 的尺寸，使其適應視窗大小
    video.style.width = `${newWidth}px`;
    video.style.height = `${newHeight}px`;

    // 讓 canvas 追隨 video 尺寸調整
    canvas.style.width = video.style.width;
    canvas.style.height = video.style.height;
}
