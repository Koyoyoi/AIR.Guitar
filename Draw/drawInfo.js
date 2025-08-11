import { video, baseApp, midiApp, uiApp } from "../main.js";
import { rootTab, revRootTab, pluckNotes, note7Map } from "../sound.js";
import { modeNum, playNum, showAllCtrl, capo } from "../Controll/blockControll.js";
import { songName } from "../midiEvent.js";
import { fingerPlay } from "../handCompute.js";
import { noteSeq } from "./drawMIDI.js";
import { key } from "../midiEvent.js";

const w = 1280, h = 720
// 重新調整畫布與影片的大小，根據視窗大小
export function reCanva() {
    const aspectRatio = 1280 / 720;
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
export function drawGesture(gesture, capo, LHand) {
    if (showAllCtrl || LHand[0] == undefined) return;

    if (modeNum == 0) {

        let transName = "";

        // 如果 capo 不為 0，則顯示轉調資訊
        if (capo != 0) {
            transName = `(${revRootTab[Math.floor((12 + rootTab[gesture[0]] + capo) % 12)]}${gesture.slice(1)})`
        }

        const style = new PIXI.TextStyle({
            fontFamily: 'Arial',
            fontSize: 100,
            fontWeight: 'bold',
            fill: '#00AA90',
            align: 'left',
        });

        // 顯示手勢與轉調名稱
        const text = new PIXI.Text({
            text: `${gesture} ${transName}`,
            style
        });

        text.anchor.set(0.5, 0);
        text.x = baseApp.canvas.width - LHand[9][0];            // 設定 x 座標
        text.y = LHand[9][1];            // 設定 y 座標

        baseApp.stage.addChild(text);
    }
    if (modeNum == 2 && noteSeq.length > 0) {

        let t = note7Map[rootTab[gesture[0]]];

        // 如果 capo 不為 0，則顯示轉調資訊
        if (capo != 0) {
            transName = `(${revRootTab[Math.floor((12 + rootTab[gesture[0]] + capo) % 12)]}${gesture.slice(1)})`
        }

        const style = new PIXI.TextStyle({
            fontFamily: 'Arial',
            fontSize: 150,
            fontWeight: 'bold',
            fill: t == note7Map[(noteSeq[0][1].note - key) % 12] ? 0x00AA90 : 0xffffff,
            align: 'left',
        });

        // 顯示手勢與轉調名稱
        const text = new PIXI.Text({
            text: t,
            style
        });

        text.anchor.set(0.5, 0.5);
        text.x = baseApp.canvas.width - LHand[9][0];            // 設定 x 座標
        text.y = LHand[9][1];            // 設定 y 座標

        baseApp.stage.addChild(text);
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

export async function drawHand(handData) {
    const Rhand = handData['Right'];
    const Lhand = handData['Left'];
    const G = new PIXI.Graphics();
    const appWidth = baseApp.renderer.width;
    const appHeight = baseApp.renderer.height;
    let Rpluck, Lpluck, velocities;

    if (modeNum == 1) {
        if (playNum == 0) {
            if (Rhand[0] != undefined) {
                [Rpluck, velocities] = await fingerPlay(Rhand);  // 偵測撥弦與速度
                G.circle(appWidth - Rhand[9][0], Rhand[9][1], 50)
                    .fill({ color: Rpluck.includes(1) && Rpluck.includes(0) ? 0x00AA90 : 0xffffff, alpha: 0.6 });
            }
            if (Lhand[0] != undefined) {
                [Lpluck, velocities] = await fingerPlay(Lhand);  // 偵測撥弦與速度
                G.circle(appWidth - Lhand[9][0], Lhand[9][1], 50)
                    .fill({ color: Lpluck.includes(1) && Lpluck.includes(0) ? 0x00AA90 : 0xffffff, alpha: 0.6 });
            }
            baseApp.stage.addChild(G);
        }
        else if (playNum == 1) {
            function dist2D(p1, p2) {
                const dx = p1[0] - p2[0];
                const dy = p1[1] - p2[1];
                return Math.sqrt(dx * dx + dy * dy);
            }
            let right = false;
            let left = false;
            let bothTouch = false;
            // 判斷兩手食指是否接觸
            if (Rhand?.[8] && Lhand?.[8]) {
                bothTouch = dist2D(Rhand[8], Lhand[8]) < 50;
            }

            // 判斷右手食指與拇指距離
            if (Rhand?.[4] && Rhand?.[8]) {
                right = dist2D(Rhand[4], Rhand[8]) < 50;
                // 繪製右手食指與拇指圓圈，兩手食指接觸時，食指顏色變綠
                G.circle(appWidth - Rhand[4][0], Rhand[4][1], 25)
                    .fill({ color: right ? 0x00AA90 : 0xffffff, alpha: 0.5 })
                    .circle(appWidth - Rhand[8][0], Rhand[8][1], 25)
                    .fill({ color: bothTouch ? 0x00AA90 : (right ? 0x00AA90 : 0xffffff), alpha: 0.5 });
            }
            // 判斷左手食指與拇指距離
            if (Lhand?.[4] && Lhand?.[8]) {
                left = dist2D(Lhand[4], Lhand[8]) < 50;
                // 繪製左手食指與拇指圓圈，兩手食指接觸時，食指顏色變綠
                G.circle(appWidth - Lhand[4][0], Lhand[4][1], 25)
                    .fill({ color: left ? 0x00AA90 : 0xffffff, alpha: 0.5 })
                    .circle(appWidth - Lhand[8][0], Lhand[8][1], 25)
                    .fill({ color: bothTouch ? 0x00AA90 : (left ? 0x00AA90 : 0xffffff), alpha: 0.5 });

            }
            baseApp.stage.addChild(G);

        }
        else if (playNum == 2) {
            if (Rhand[9] != undefined) {
                let closeMid = appWidth / 2 - Rhand[9][0] < Rhand[9][0] - appWidth / 2 ? true : false;
                G.circle(appWidth - Rhand[9][0], Rhand[9][1], 50)
                    .fill({ color: 0xffffff, alpha: 0.6 })
                    .circle(appWidth, Rhand[9][1], 30)
                    .fill({ color: !closeMid ? 0x00AA90 : 0xffffff, alpha: 0.6 })
                    .circle(0, Rhand[9][1], 30)
                    .fill({ color: closeMid ? 0x00AA90 : 0xffffff, alpha: 0.6 })
                    .roundRect(appWidth / 2, Rhand[9][1] - 30, 10, 60)
                    .fill(0xffffff);
            }
            if (Lhand[9] != undefined) {
                let closeMid = Lhand[9][0] - appWidth / 2 < appWidth / 2 - Lhand[9][0] ? true : false;
                G.circle(appWidth - Lhand[9][0], Lhand[9][1], 50)
                    .fill({ color: 0xffffff, alpha: 0.6 })
                    .circle(0, Lhand[9][1], 30)
                    .fill({ color: !closeMid ? 0x00AA90 : 0xffffff, alpha: 0.6 })
                    .circle(appWidth, Lhand[9][1], 30)
                    .fill({ color: closeMid ? 0x00AA90 : 0xffffff, alpha: 0.6 })
                    .roundRect(appWidth / 2, Lhand[9][1] - 30, 10, 60)
                    .fill(0xffffff);
            }
            baseApp.stage.addChild(G);
        }
    }
    else if (modeNum == 2) {
        if (Rhand[0] != undefined) {
            let closeTop = Rhand[9][1] < appHeight - Rhand[9][1] ? true : false;

            // sturming
            G.circle(appWidth - Rhand[9][0], Rhand[9][1], 50)
                .fill({ color: 0xffffff, alpha: 0.4 })
                .circle(appWidth - Rhand[9][0], 0, 30)
                .fill({ color: closeTop ? 0x00AA90 : 0xffffff, alpha: 0.4 })
                .circle(appWidth - Rhand[9][0], appHeight, 30)
                .fill({ color: !closeTop ? 0x00AA90 : 0xffffff, alpha: 0.4 })
                .roundRect(appWidth - Rhand[9][0] - 30, appHeight / 2, 60, 10)
                .fill(0xffffff);
        }

        baseApp.stage.addChild(G);
    }

}
