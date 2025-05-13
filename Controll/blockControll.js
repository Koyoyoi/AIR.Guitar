import { drawRect, drawTriangle } from "../Draw/drawGraph.js";
import { mouse, canvas  } from "../main.js";
import { initMIDIPort, instruments, loadSamples } from "../sound.js";

export let modeNum = 0, portOpen = false,   sampleNum = 0, showAllCtrl = false;;

let IMGs = {}
const modeName = ["自由演奏", "簡單演奏", "歌曲演奏"];

function isInside(mouse, area) {
    return (
        mouse.X >= area.x &&
        mouse.X <= area.x + area.w &&
        mouse.Y >= area.y &&
        mouse.Y <= area.y + area.h
    );
}

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
export function settingArea(){
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
        if (isInside(mouse, Area)) {
            console.log("✅ confing 控制區被點擊！");
            showAllCtrl = !showAllCtrl
        }
    }
}

// Mode 控制區域
export function ModeCtrl(){
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
        if (isInside(mouse, LButton)) {
            console.log("✅ mode Left 被點擊！");
            modeNum -= 1
        } else if (isInside(mouse, RButton)) {
            console.log("✅ mode Right 被點擊！");
            modeNum += 1
        }
    }

    modeNum = (modeName.length + modeNum) % modeName.length;
}
// 畫出 MIDI 控制區域
export function midiPortArea() {
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
        if (isInside(mouse, Area)) {
            console.log("✅ MIDI port 控制區被點擊！");
            portOpen = !portOpen;
            if (portOpen) { initMIDIPort(); }
        }
    }


}
// 畫出 SoundFont 控制區域
export async function sampleNameArea() {

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
        let change = false
        if (isInside(mouse, LButton)) {
            console.log("✅ sample Left 被點擊！");
            sampleNum -= 1;  // 減少樣本索引
            change = true
        } else if (isInside(mouse, RButton)) {
            console.log("✅ sample Right 被點擊！");
            sampleNum += 1;  // 增加樣本索引
            change = true
        }
        
        if(change){
            sampleNum = (instruments.length + sampleNum) % instruments.length;  // 確保樣本索引在範圍內
            await loadSamples();                                                      // 加載對應的樣本
        }
    }

}