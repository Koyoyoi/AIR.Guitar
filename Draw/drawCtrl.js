// 從其他模組載入函式
import { drawRect, drawTriangle } from "./drawGraph.js";
import { portCtrl, portOpen, sampleCtrl, sampleName } from "../musicControll.js";
import { instruments } from "../sound.js";
import { ctx, mouse, canvas, video } from "../main.js";

// 畫出 MIDI 控制區域
export function draw_midiPortArea() {
    // 定義 MIDI 控制區域的位置與大小
    let Area = {
        x: 30, // 控制區域的左上角 x 座標
        y: canvas.height - 20 - canvas.height * 0.08, // 控制區域的左上角 y 座標
        w: canvas.width * 0.2, // 控制區域的寬度
        h: canvas.height * 0.08 // 控制區域的高度
    };

    // 畫圓角矩形區域
    drawRect(Area, 20);

    // 顯示 MIDI 控制區域的狀態
    ctx.font = `700 ${Area.h * 0.5}px Arial`;  // 設置字體
    ctx.fillStyle = portOpen ? "#00AA90" : "#787d7b"; // 如果 MIDI port 開啟顯示綠色，否則顯示灰色
    ctx.textAlign = "center"; // 設置文字對齊方式
    ctx.textBaseline = "middle"; // 設置文字基準線
    ctx.fillText(`MIDI port : ${portOpen ? 'on' : 'off'}`, Area.x + Area.w / 2, Area.y + Area.h / 2);

    // 檢查是否點擊在 MIDI 控制區域
    if (mouse.X != 0 && mouse.Y != 0) {
        if (
            mouse.X >= Area.x &&  // 點擊 X 座標範圍
            mouse.X <= Area.x + Area.w &&  // 點擊 X 座標範圍
            mouse.Y >= Area.y &&  // 點擊 Y 座標範圍
            mouse.Y <= Area.y + Area.h  // 點擊 Y 座標範圍
        ) {
            console.log("✅ MIDI port 控制區被點擊！");
            portCtrl(); // 執行 MIDI 控制函式
        }
    }
}

// 畫出樣本名稱區域並控制樣本變換
export function draw_sampleNameArea() {
    // 定義區域的位置與大小
    let Area = {
        x: video.videoWidth - canvas.width * 0.3, // 區域的 X 座標
        y: canvas.height - 20 - canvas.height * 0.08, // 區域的 Y 座標
        w: canvas.width * 0.25, // 區域的寬度
        h: canvas.height * 0.08 // 區域的高度
    };

    // 設定左右箭頭按鈕的大小與位置
    const buttonWidth = Area.h * 0.8; // 設定按鈕的寬度
    const buttonHeight = Area.h;  // 設定按鈕的高度
    const buttonY = Area.y + (Area.h - buttonHeight) / 2; // 按鈕的 Y 座標

    // 左側按鈕（三角形）設定
    let LButton = {
        x: Area.x - 60,  // 左箭頭按鈕 X 座標
        y: buttonY,      // 左箭頭按鈕 Y 座標
        w: buttonWidth,  // 左箭頭按鈕寬度
        h: buttonHeight  // 左箭頭按鈕高度
    };

    // 右側按鈕（三角形）設定
    let RButton = {
        x: Area.x + Area.w - buttonWidth + 60,  // 右箭頭按鈕 X 座標
        y: buttonY,  // 右箭頭按鈕 Y 座標
        w: buttonWidth,  // 右箭頭按鈕寬度
        h: buttonHeight  // 右箭頭按鈕高度
    };

    // 畫圓角矩形區域
    drawRect(Area, 10);
    // 畫右箭頭（實心三角形）
    drawTriangle(RButton, "right");
    // 畫左箭頭（實心三角形）
    drawTriangle(LButton, "left");

    // 顯示目前的樣本名稱
    ctx.font = `700 ${Area.h * 0.5}px Arial`;  // 設置字體
    ctx.fillStyle = "#787d7b";  // 設置顏色為灰色
    ctx.textAlign = "center";  // 設置文字對齊方式
    ctx.textBaseline = "middle";  // 設置文字基準線
    ctx.fillText(`${instruments[sampleName]}`, Area.x + Area.w / 2, Area.y + Area.h / 2);

    // 檢查是否點擊在按鈕上並控制樣本切換
    if (mouse.X != 0 && mouse.Y != 0) {
        if (
            mouse.X >= LButton.x &&  // 點擊左箭頭範圍
            mouse.X <= LButton.x + LButton.w &&
            mouse.Y >= LButton.y && 
            mouse.Y <= LButton.y + LButton.h
        ) {
            console.log("✅ sample Left 被點擊！");
            sampleCtrl('-');  // 執行樣本向左切換
        } else if (
            mouse.X >= RButton.x &&  // 點擊右箭頭範圍
            mouse.X <= RButton.x + RButton.w &&
            mouse.Y >= RButton.y && 
            mouse.Y <= RButton.y + RButton.h
        ) {
            console.log("✅ sample Right 被點擊！");
            sampleCtrl('+');  // 執行樣本向右切換
        }
    }
}
