import { drawRect, drawTriangle } from "./drawGraph.js";
import { instruments } from "../sound.js";
import { mouse, canvas  } from "../main.js";
import { portCtrl, portOpen, sampleCtrl, settingCtrl, showAllCtrl, sampleNum } from "../Controll/areaControll.js";

let IMGs = {}
let modeNum = 0;
const modeName = ["自由模式", "歌曲演奏"];


// 載入圖片
export async function loadImg(){
    const res = await fetch('./IMG/list.json');
    const fileList = await res.json(); 

    for (let filename of fileList) {
        const key = filename; 
        const img = await new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = () => reject(new Error('載入失敗: ' + filename));
            image.src = './IMG/' + filename + '.png';
        });
        IMGs[key] = img;
    }
}

// Setting 控制區域
export function draw_setting(){
     // 區域的位置與大小
     let Area = {
        x: canvas['base'].cvs.width - canvas['base'].cvs.height * 0.1,
        y: canvas['base'].cvs.height - 20 - canvas['base'].cvs.height * 0.08,
        w: canvas['base'].cvs.height * 0.1,
        h: canvas['base'].cvs.height * 0.1
    };
    let img = showAllCtrl? IMGs['close_setting'] : IMGs['open_setting']
    canvas['base'].ctx.drawImage(img, Area.x, Area.y, Area.w, Area.h);

    // 檢查是否點擊在控制區域
    if (mouse.X != 0 && mouse.Y != 0) {
        if (
            mouse.X >= Area.x &&
            mouse.X <= Area.x + Area.w &&
            mouse.Y >= Area.y &&
            mouse.Y <= Area.y + Area.h
        ) {
            console.log("✅ confing 控制區被點擊！");
            settingCtrl();
        }
    }
}

// Mode 控制區域
export function draw_ModeCtrl(){
    let Area = {
        x: canvas['base'].cvs.width / 2 - canvas['base'].cvs.width * 0.1,
        y: 0,
        w: canvas['base'].cvs.width * 0.2,
        h: canvas['base'].cvs.height * 0.08
    };
    
    // 繪製左右箭頭按鈕
    const buttonWidth = Area.h * 0.8;
    const buttonHeight = Area.h;
    const buttonY = Area.y + (Area.h - buttonHeight) / 2;

    // 左側按鈕（三角形）
    let LButton = {
        x: Area.x - 60,
        y: buttonY,
        w: buttonWidth,
        h: buttonHeight
    };

    // 右側按鈕（三角形）
    let RButton = {
        x: Area.x + Area.w - buttonWidth + 60,
        y: buttonY,
        w: buttonWidth,
        h: buttonHeight
    };

    drawRect(Area, 10);              // 畫圓角矩形區域
    drawTriangle(RButton, "right");  // 畫右箭頭（實心三角形）
    drawTriangle(LButton, "left");   // 畫左箭頭（實心三角形）

    // 區域的狀態
    canvas['base'].ctx.font = `700 ${Area.h * 0.5}px Arial`;
    canvas['base'].ctx.fillStyle = "#787d7b"; // 如果 portOpen 為 true，顯示為綠色，否則顯示為灰色
    canvas['base'].ctx.textAlign = "center";
    canvas['base'].ctx.textBaseline = "middle";
    canvas['base'].ctx.fillText(`${modeName[modeNum]}`, Area.x + Area.w / 2, Area.y + Area.h / 2);

     // 檢查是否點擊在按鈕上
     if (mouse.X != 0 && mouse.Y != 0) {
        if (
            mouse.X >= LButton.x &&
            mouse.X <= LButton.x + LButton.w &&
            mouse.Y >= LButton.y &&
            mouse.Y <= LButton.y + LButton.h
        ) {
            console.log("✅ mode Left 被點擊！");
            modeNum -= 1
        } else if (
            mouse.X >= RButton.x &&
            mouse.X <= RButton.x + RButton.w &&
            mouse.Y >= RButton.y &&
            mouse.Y <= RButton.y + RButton.h
        ) {
            console.log("✅ mode Right 被點擊！");
            modeNum += 1
        }
    }

    modeNum = (modeName.length + modeNum) % modeName.length;
}
// 畫出 MIDI 控制區域
export function draw_midiPortArea() {
    // 定義 MIDI 控制區域的位置與大小
    let Area = {
        x: 30,
        y: canvas['base'].cvs.height - 20 - canvas['base'].cvs.height * 0.08,
        w: canvas['base'].cvs.width * 0.2,
        h: canvas['base'].cvs.height * 0.08
    };

    // 畫圓角矩形區域
    drawRect(Area, 20)

    // 區域的狀態
    canvas['base'].ctx.font = `700 ${Area.h * 0.5}px Arial`;
    canvas['base'].ctx.fillStyle = portOpen ? "#00AA90" : "#787d7b"; // 如果 portOpen 為 true，顯示為綠色，否則顯示為灰色
    canvas['base'].ctx.textAlign = "center";
    canvas['base'].ctx.textBaseline = "middle";
    canvas['base'].ctx.fillText(`MIDI port : ${portOpen ? 'on' : 'off'}`, Area.x + Area.w / 2, Area.y + Area.h / 2);

    // 檢查是否點擊在控制區域
    if (mouse.X != 0 && mouse.Y != 0) {
        if (
            mouse.X >= Area.x &&
            mouse.X <= Area.x + Area.w &&
            mouse.Y >= Area.y &&
            mouse.Y <= Area.y + Area.h
        ) {
            console.log("✅ MIDI port 控制區被點擊！");
            portCtrl();
        }
    }
}
// 畫出 SoundFont 控制區域
export function draw_sampleNameArea() {

    // 區域的位置與大小
    let Area = {
        x: canvas['base'].cvs.width / 2 - canvas['base'].cvs.width * 0.15,
        y: canvas['base'].cvs.height - 20 - canvas['base'].cvs.height * 0.08,
        w: canvas['base'].cvs.width * 0.3,
        h: canvas['base'].cvs.height * 0.08
    };

    // 繪製左右箭頭按鈕
    const buttonWidth = Area.h * 0.8;
    const buttonHeight = Area.h;
    const buttonY = Area.y + (Area.h - buttonHeight) / 2;

    // 左側按鈕（三角形）
    let LButton = {
        x: Area.x - 60,
        y: buttonY,
        w: buttonWidth,
        h: buttonHeight
    };

    // 右側按鈕（三角形）
    let RButton = {
        x: Area.x + Area.w - buttonWidth + 60,
        y: buttonY,
        w: buttonWidth,
        h: buttonHeight
    };

    drawRect(Area, 10);              // 畫圓角矩形區域
    drawTriangle(RButton, "right");  // 畫右箭頭（實心三角形）
    drawTriangle(LButton, "left");   // 畫左箭頭（實心三角形）

    // 顯示 sample name 
    canvas['base'].ctx.font = `700 ${Area.h * 0.5}px Arial`;
    canvas['base'].ctx.fillStyle = "#787d7b";
    canvas['base'].ctx.textAlign = "center";
    canvas['base'].ctx.textBaseline = "middle";
    canvas['base'].ctx.fillText(`${instruments[sampleNum]}`, Area.x + Area.w / 2, Area.y + Area.h / 2);

    // 檢查是否點擊在按鈕上
    if (mouse.X != 0 && mouse.Y != 0) {
        if (
            mouse.X >= LButton.x &&
            mouse.X <= LButton.x + LButton.w &&
            mouse.Y >= LButton.y &&
            mouse.Y <= LButton.y + LButton.h
        ) {
            console.log("✅ sample Left 被點擊！");
            sampleCtrl('-');
        } else if (
            mouse.X >= RButton.x &&
            mouse.X <= RButton.x + RButton.w &&
            mouse.Y >= RButton.y &&
            mouse.Y <= RButton.y + RButton.h
        ) {
            console.log("✅ sample Right 被點擊！");
            sampleCtrl('+');
        }
    }

}