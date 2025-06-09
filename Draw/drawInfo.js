import { video, baseApp, midiApp, uiApp } from "../main.js";
import { rootTab, revRootTab, pluckNotes } from "../sound.js";
import { modeNum, playNum, showAllCtrl, capo } from "../Controll/blockControll.js";
import { songName } from "../midiEvent.js";

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
export function drawFinger(handData) {
    if (handData.length == 0 || modeNum != 0) return

    // 建立文字樣式
    const style = new PIXI.TextStyle({
        fontFamily: 'Arial',
        fontSize: 50,
        fontWeight: 'bold',
        fill: '#00AA90',
        align: 'center',
    });

    // landmark 對應到五指尖端
    const fingerTips = [handData[4], handData[8], handData[12], handData[16]];
    for (let i = 0; i < fingerTips.length; i++) {
        const note = pluckNotes[i] || '';        // 沒有音符就留空白

        const text = new PIXI.Text({
            text: revRootTab[(note + capo) % 12], // + Math.floor(note + capo / 12)
            style: style
        });

        text.anchor.set(0.5);
        text.x = baseApp.renderer.width - fingerTips[i][0];
        text.y = fingerTips[i][1] - 50;
        baseApp.stage.addChild(text);
    }

}

// 繪製手勢與轉調資訊，顯示在畫布上
export function drawGesture(gesture, capo) {
    if (showAllCtrl) return;

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

export function drawHand(handData) {
    const Rhand = handData['Right'];
    const Lhand = handData['Left'];
    const G = new PIXI.Graphics();
    const appWidth = baseApp.renderer.width;

    if (playNum == 0) {
        if (Rhand[0] != undefined)
            G.circle(appWidth - Rhand[9][0], Rhand[9][1], 50)
                .fill({ color: 0xffffff, alpha: 0.6 });

        if (Lhand[0] != undefined)
            G.circle(appWidth - Lhand[9][0], Lhand[9][1], 50)
                .fill({ color: 0xffffff, alpha: 0.6 });

        baseApp.stage.addChild(G);
    }
    else if (playNum == 1) {
        function dist2D(p1, p2) {
            const dx = p1[0] - p2[0];
            const dy = p1[1] - p2[1];
            return Math.sqrt(dx * dx + dy * dy);
        }

        let Both
        if (Rhand[0] != undefined && Lhand[0] != undefined)
            Both = dist2D(Rhand[4], Lhand[4]);

        if (Rhand[0] != undefined) {
            let right = dist2D(Rhand[4], Rhand[8]) < 50;
            G.circle(appWidth - Rhand[4][0], Rhand[4][1], 25)
                .fill({ color: right ? 0x00AA90 : 0xffffff, alpha: 0.5 })
                .circle(appWidth - Rhand[8][0], Rhand[8][1], 25)
                .fill({ color: right ? 0x00AA90 : 0xffffff, alpha: 0.5 })
        }
        if (Lhand[0] != undefined) {
            let left = dist2D(Lhand[4], Lhand[8]) < 50;
            G.circle(appWidth - Lhand[4][0], Lhand[4][1], 25)
                .fill({ color: left ? 0x00AA90 : 0xffffff, alpha: 0.5 })
                .circle(appWidth - Lhand[8][0], Lhand[8][1], 25)
                .fill({ color: left ? 0x00AA90 : 0xffffff, alpha: 0.5 });
        }
        baseApp.stage.addChild(G);
    }
    else if (playNum == 2) {
        if (Rhand[0] != undefined)
            G.circle(appWidth - Rhand[9][0], Rhand[9][1], 50)
                .fill({ color: 0xffffff, alpha: 0.6 })
                .circle(appWidth - 15, Rhand[9][1], 30)
                .fill({ color: 0xffffff, alpha: 0.6 })
                .circle(appWidth / 2 - 15, Rhand[9][1], 30)
                .fill({ color: 0xffffff, alpha: 0.6 });

        if (Lhand[0] != undefined)
            G.circle(appWidth - Lhand[9][0], Lhand[9][1], 50)
                .fill({ color: 0xffffff, alpha: 0.6 })
                .circle(0 + 15, Rhand[9][1], 30)
                .fill({ color: 0xffffff, alpha: 0.6 })
                .circle(appWidth / 2 - 15, Rhand[9][1], 30)
                .fill({ color: 0xffffff, alpha: 0.6 });

        baseApp.stage.addChild(G);
    }

}

export function drawSongName() {
    const style = new PIXI.TextStyle({
        fontFamily: 'Arial',
        fontSize: 50,
        fontWeight: 'bold',
        fill: 0xBDC0BA,
        align: 'left',
        alpha: 0.6
    });

    const text = new PIXI.Text({
        text: songName,
        style
    });

    text.anchor.set(0.5, 0); // anchor 設在水平方向中心、垂直方向頂部
    text.x = baseApp.renderer.width / 2; // 畫面水平中心
    text.y = 15;

    baseApp.stage.addChild(text);
}