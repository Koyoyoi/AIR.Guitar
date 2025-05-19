import { video, baseApp, midiApp, uiApp } from "../main.js";
import { rootTab, revRootTab } from "../sound.js";

// 重新調整畫布與影片的大小，根據視窗大小
export function reCanva() {
    const aspectRatio = video.videoWidth / video.videoHeight;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    // 計算新的寬度和高度，並限制最大高度為 900px
    let newHeight = Math.min(windowHeight, 900);
    let newWidth = newHeight * aspectRatio;

    // 如果新寬度超出視窗寬度，則以視窗寬度為主重新計算
    if (newWidth > windowWidth) {
        newWidth = windowWidth;
        newHeight = newWidth / aspectRatio;
    }

    // 設置影片和畫布的寬高
    video.style.width = `${newWidth}px`;
    video.style.height = `${newHeight}px`;

    baseApp.canvas.style.width = video.style.width;
    baseApp.canvas.style.height = video.style.height;
    midiApp.canvas.style.width = video.style.width;
    midiApp.canvas.style.height = video.style.height;
    uiApp.canvas.style.width = video.style.width;
    uiApp.canvas.style.height = video.style.height;

    // 垂直置中
    const verticalOffset = Math.max(0, (windowHeight - newHeight) / 2);
    video.style.position = 'absolute';
    video.style.top = `${verticalOffset}px`;

    baseApp.canvas.style.position = 'absolute';
    baseApp.canvas.style.top = `${verticalOffset}px`;
    midiApp.canvas.style.position = 'absolute';
    midiApp.canvas.style.top = `${verticalOffset}px`;
    uiApp.canvas.style.position = 'absolute';
    uiApp.canvas.style.top = `${verticalOffset}px`;

    // 標題遮擋判斷
    const title = document.getElementById("title");
    if (title) {
        title.style.display = verticalOffset < 100 ? 'none' : 'block';
    }
}

// 繪製手勢與轉調資訊，顯示在畫布上
export function drawGesture(gesture, capo) {
    let transName = "";

    // 如果 capo 不為 0，則顯示轉調資訊
    if (capo != 0) {
        transName = `(${revRootTab[Math.floor((12 + rootTab[gesture[0]] + capo) % 12)]}${gesture.slice(1)})`
    }

    const style = new PIXI.TextStyle({
        fontFamily: 'Arial',
        fontSize: 70,
        fontWeight: 'bold',
        fill: '#00AA90',
        align: 'left',
    });

    // 顯示手勢與轉調名稱
    const text = new PIXI.Text({
        text: `${gesture} ${transName}`,
        style
    });

    // 設定位置（等同 textAlign: 'left', textBaseline: 'top'）
    text.anchor.set(0, 0);  // (0, 0) 是左上角對齊
    text.x = 50;            // 設定 x 座標
    text.y = 25;            // 設定 y 座標

    baseApp.stage.addChild(text);
}

// 繪製 capo 設定資訊，顯示在畫布的右上角
export function drawCapo(capo) {
    // 設定 PixiJS 文字樣式
    const style = new PIXI.TextStyle({
        fontFamily: 'Arial',
        fontSize: 70,
        fontWeight: 'bold',
        fill: '#00AA90', // 設定顏色
        align: 'right',  // 文字對齊右邊
    });

    // 顯示 capo 設定資訊的文字
    const text = new PIXI.Text({
        text: `Capo: ${capo}`, 
        style
    });

    // 調整文字顯示位置
    text.x = baseApp.screen.width * 0.8 - 50; // 文字右對齊
    text.y = 25; // 文字垂直位置

    // 把文字加入舞台
    baseApp.stage.addChild(text);
}