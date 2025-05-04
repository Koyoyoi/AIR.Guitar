import { ctx, canvas, video, uploadedImage} from "../main.js";
import { rootTab, revRootTab } from "../sound.js";

let imgH = 0, imgW = 0

// 重新調整畫布與影片的大小
export function reCanva() {
    const aspectRatio = video.videoWidth / video.videoHeight; // 影片的寬高比
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    // 計算寬度與高度
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

    canvas.style.width = video.style.width;
    canvas.style.height = video.style.height;

    // 確保畫面在垂直方向居中顯示，並避免被遮擋
    const verticalOffset = Math.max(0, (windowHeight - newHeight) / 2);  // 確保偏移量不為負數
    video.style.position = 'absolute';
    video.style.top = `${verticalOffset}px`;

    canvas.style.position = 'absolute';
    canvas.style.top = `${verticalOffset}px`;

    // 檢查影片的高度是否與標題重疊，超過一定位置隱藏標題
    const title = document.getElementById("title");
    if (title) {
        if (verticalOffset < 100) { // 例如，影片頂部與標題重疊時隱藏標題
            title.style.display = 'none'; // 隱藏標題
        } else {
            title.style.display = 'block'; // 顯示標題
        }
    }
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