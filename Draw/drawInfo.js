import { canvas, video, uploadedImage } from "../main.js";
import { rootTab, revRootTab } from "../sound.js";

// 用來儲存圖片的高度與寬度
let imgH = 0, imgW = 0;

// 重新調整畫布與影片的大小，根據視窗大小
export function reCanva() {
    const aspectRatio = video.videoWidth / video.videoHeight; // 影片的寬高比
    const windowWidth = window.innerWidth; // 取得視窗寬度
    const windowHeight = window.innerHeight; // 取得視窗高度

    // 計算新的寬度和高度
    let newWidth = windowWidth;
    let newHeight = newWidth / aspectRatio;

    // 如果調整後的高度超過 900px 或視窗高度，則進行調整
    if (newHeight > windowHeight || newHeight > 900) {
        newHeight = Math.min(windowHeight, 900);  // 高度最大為 900px 或視窗高度
        newWidth = newHeight * aspectRatio;  // 根據新的高度計算寬度
    }

    // 設置影片和畫布的寬高
    video.style.width = `${newWidth}px`;
    video.style.height = `${newHeight}px`;

    canvas['base'].cvs.style.width = video.style.width;
    canvas['base'].cvs.style.height = video.style.height;

    canvas['midi'].cvs.style.width = video.style.width;
    canvas['midi'].cvs.style.height = video.style.height;

    // 計算並確保畫面垂直居中顯示，避免被遮擋
    const verticalOffset = Math.max(0, (windowHeight - newHeight) / 2);  // 確保偏移量不為負數
    video.style.position = 'absolute';
    video.style.top = `${verticalOffset}px`;

    canvas['base'].cvs.style.position = 'absolute';
    canvas['base'].cvs.style.top = `${verticalOffset}px`;

    canvas['midi'].cvs.style.position = 'absolute';
    canvas['midi'].cvs.style.top = `${verticalOffset}px`;

    // 檢查影片的高度是否與標題重疊，若重疊則隱藏標題
    const title = document.getElementById("title");
    if (title) {
        if (verticalOffset < 100) { // 例如，影片頂部與標題重疊時隱藏標題
            title.style.display = 'none'; // 隱藏標題
        } else {
            title.style.display = 'block'; // 顯示標題
        }
    }
}

// 繪製手勢與轉調資訊，顯示在畫布上
export function drawGesture(gesture, capo) {
    let transName = "";
    let posX = 50, posY = 50;

    // 設定文字樣式
    canvas['base'].ctx.font = "700 100px Arial";
    canvas['base'].ctx.fillStyle = "#00AA90";
    canvas['base'].ctx.textAlign = "left";
    canvas['base'].ctx.textBaseline = "top";

    // 如果 capo 不為 0，則顯示轉調資訊
    if (capo != 0) {
        transName = `(${revRootTab[Math.floor((12 + rootTab[gesture[0]] + capo) % 12)]}${gesture.slice(1)})`
    }

    // 根據圖片大小調整文字顯示位置
    if (video.videoHeight - imgH > video.videoWidth / 2 - imgW) {
        posY += imgH - 30;  // 調整文字的 Y 座標
    }
    else if (video.videoHeight - imgH < video.videoWidth / 2 - imgW) {
        posX += imgW;  // 調整文字的 X 座標
    }

    // 顯示手勢與轉調名稱
    canvas['base'].ctx.fillText(`${gesture} ${transName}`, posX, posY);
}

// 繪製 capo 設定資訊，顯示在畫布的右上角
export function drawCapo(capo) {
    canvas['base'].ctx.font = "700 80px Arial";  // 設定字型大小
    canvas['base'].ctx.fillStyle = "#00AA90";  // 設定顏色
    canvas['base'].ctx.textAlign = "right";  // 文字對齊右邊
    canvas['base'].ctx.textBaseline = "top";  // 文字基準線為上端
    canvas['base'].ctx.fillText(`Capo: ${capo}`, canvas['base'].cvs.width - 50, 50);  // 顯示 capo 設定資訊
}

// 繪製上傳的圖片，並根據畫布大小調整圖片的大小
export function drawImg() {
    const maxImgHeight = canvas['base'].cvs.height;  // 最大圖片高度為畫布高度
    const naturalAspectRatio = uploadedImage.width / uploadedImage.height;  // 圖片的自然寬高比

    // 根據高度來縮放圖片
    imgH = maxImgHeight;
    imgW = imgH * naturalAspectRatio;

    // 如果圖片寬度超過畫布的一半，則限制為畫布寬度的一半，並重新計算高度
    const maxImgWidth = canvas['base'].cvs.width / 2;
    if (imgW > maxImgWidth) {
        imgW = maxImgWidth;
        imgH = imgW / naturalAspectRatio;
    }

    // 在畫布上繪製上傳的圖片
    canvas['base'].ctx.drawImage(uploadedImage, 0, 0, imgW, imgH);
}
