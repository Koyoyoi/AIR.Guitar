import { uiApp } from "../main.js";
import { initMIDIPort, instruments, loadSamples } from "../sound.js";

export let modeNum = 0, portOpen = false, sampleNum = 0;
export let showAllCtrl = false, isPlay = false;

let IMGs = {}
const modeName = ["自由演奏", "歌曲演奏"];

// 載入圖片
export async function loadImg() {
    const res = await fetch('./IMG/list.json');
    const fileList = await res.json();

    for (let filename of fileList) {
        const key = filename;
        const texture = await PIXI.Assets.load(`./IMG/${filename}.png`)
        IMGs[key] = texture;
    }
}

// Setting 控制區域
export function settingCtrl() {
    const Area = {
        x: uiApp.screen.width - uiApp.screen.height * 0.1,
        y: uiApp.screen.height - 20 - uiApp.screen.height * 0.08,
        w: uiApp.screen.height * 0.1,
        h: uiApp.screen.height * 0.1,
    };

    const settingSprite = new PIXI.Sprite(showAllCtrl ? IMGs['close_setting'] : IMGs['open_setting']);

    settingSprite.x = Area.x;
    settingSprite.y = Area.y;
    settingSprite.width = Area.w;
    settingSprite.height = Area.h;

    // 讓圖片可以互動
    settingSprite.hitArea = new PIXI.Rectangle(Area.x, Area.y, Area.w, Area.h); // 限定互動範圍（可調整）
    settingSprite.interactive = true;
    settingSprite.buttonMode = true;

    // 點擊事件
    settingSprite.on('pointerdown', () => {
        console.log("✅ config 控制區被點擊！");
        showAllCtrl = !showAllCtrl;
    });

    uiApp.stage.addChild(settingSprite);
}

// Mode 控制區域
export function ModeCtrl() {
    const Area = {
        x: uiApp.screen.width / 2 - uiApp.screen.width * 0.1,
        y: 10,
        w: uiApp.screen.width * 0.2,
        h: uiApp.screen.height * 0.08
    };

    const buttonWidth = Area.h * 0.8;
    const buttonHeight = Area.h;
    const buttonY = Area.y + (Area.h - buttonHeight) / 2;

    // 背景區域
    const labelBase = new PIXI.Graphics()
        .roundRect(Area.x, Area.y, Area.w, Area.h, 10)
        .fill(0x434343);
    uiApp.stage.addChild(labelBase);

    // 顯示目前模式文字
    const labelStyle = new PIXI.TextStyle({
        fontFamily: "Arial",
        fontSize: Area.h * 0.5,
        fontWeight: "bold",
        fill: 0xBDC0BA,
        align: "center"
    });

    // 修改文字創建方式，使用對象傳遞 `text` 和 `style`
    const label = new PIXI.Text({
        text: `${modeName[modeNum]}`,  // 這裡放置文字內容
        style: labelStyle               // 使用先前定義的樣式
    });
    label.anchor.set(0.5);
    label.x = Area.x + Area.w / 2;
    label.y = Area.y + Area.h / 2;
    uiApp.stage.addChild(label); // 確保文字能夠顯示在背景區域之上

    // 左箭頭三角形
    const LBtn = new PIXI.Graphics()
        .moveTo(0, buttonHeight / 2)
        .lineTo(buttonWidth, 0)
        .lineTo(buttonWidth, buttonHeight)
        .fill(0x434343);
    LBtn.x = Area.x - 60;
    LBtn.y = buttonY;
    LBtn.hitArea = new PIXI.Rectangle(LBtn.x, LBtn.y, buttonWidth, buttonHeight); // 設置 hitArea
    LBtn.interactive = true;
    LBtn.buttonMode = true;
    LBtn.on("pointerdown", () => {
        modeNum = (modeName.length + modeNum - 1) % modeName.length;
        console.log("✅ mode Left 被點擊！");
    });
    uiApp.stage.addChild(LBtn);

    // 右箭頭三角形
    const RBtn = new PIXI.Graphics()
        .moveTo(0, 0)
        .lineTo(buttonWidth, buttonHeight / 2)
        .lineTo(0, buttonHeight)
        .fill(0x434343);
    RBtn.x = Area.x + Area.w + 15;
    RBtn.y = buttonY;
    RBtn.hitArea = new PIXI.Rectangle(RBtn.x, RBtn.y, buttonWidth, buttonHeight); // 設置 hitArea
    RBtn.interactive = true;
    RBtn.buttonMode = true;
    RBtn.on("pointerdown", () => {
        modeNum = (modeNum + 1) % modeName.length;
        console.log("✅ mode Right 被點擊！");
    });
    uiApp.stage.addChild(RBtn);
}

// 畫出 MIDI 控制區域
export function midiPortCtrl() {
    const Area = {
        x: 30,
        y: uiApp.screen.height - 20 - uiApp.screen.height * 0.08,
        w: uiApp.screen.width * 0.2,
        h: uiApp.screen.height * 0.08
    };

    // 畫圓角矩形作為背景
    const midiBg = new PIXI.Graphics()
        .roundRect(Area.x, Area.y, Area.w, Area.h, 20)
        .fill(portOpen ? 0x00AA90 : 0x434343);
    midiBg.interactive = true;
    midiBg.buttonMode = true;
    midiBg.hitArea = new PIXI.Rectangle(Area.x, Area.y, Area.w, Area.h); // 確保互動區範圍正確
    uiApp.stage.addChild(midiBg);

    // 文字樣式
    const labelStyle = new PIXI.TextStyle({
        fontFamily: "Arial",
        fontSize: Area.h * 0.5,
        fontWeight: "bold",
        fill: 0xBDC0BA,
        align: "center"
    });

    // 顯示狀態文字
    const midiLabel = new PIXI.Text({
        text: `MIDI port : ${portOpen ? 'on' : 'off'}`,
        style: labelStyle
    });
    midiLabel.anchor.set(0.5);
    midiLabel.x = Area.x + Area.w / 2;
    midiLabel.y = Area.y + Area.h / 2;
    uiApp.stage.addChild(midiLabel);

    // 點擊事件處理
    midiBg.on('pointerdown', () => {
        portOpen = !portOpen;
        console.log("✅ MIDI port 控制區被點擊！");
        if (portOpen) initMIDIPort();
    });

}
// 畫出 SoundFont 控制區域
export async function sampleCtrl() {

    // 區域大小設定
    const Area = {
        x: uiApp.screen.width / 2 - uiApp.screen.width * 0.15,
        y: uiApp.screen.height - 20 - uiApp.screen.height * 0.08,
        w: uiApp.screen.width * 0.3,
        h: uiApp.screen.height * 0.08
    };

    const buttonWidth = Area.h * 0.8;
    const buttonHeight = Area.h;
    const buttonY = Area.y + (Area.h - buttonHeight) / 2;

    // 建立底色框
    const labelBG = new PIXI.Graphics();
    labelBG.roundRect(Area.x, Area.y, Area.w, Area.h, 10).fill(0x434343);
    uiApp.stage.addChild(labelBG);

    // 建立文字樣式
    const labelStyle = new PIXI.TextStyle({
        fontFamily: "Arial",
        fontSize: Area.h * 0.5,
        fontWeight: "bold",
        fill: 0xBDC0BA,
        align: "center"
    });

    // 顯示 sample 名稱
    const sampleLabel = new PIXI.Text({ text: instruments[sampleNum], style: labelStyle });
    sampleLabel.anchor.set(0.5);
    sampleLabel.x = Area.x + Area.w / 2;
    sampleLabel.y = Area.y + Area.h / 2;
    uiApp.stage.addChild(sampleLabel);

    // 建立左側按鈕（三角形）
    const LBtn = new PIXI.Graphics()
        .moveTo(0, buttonHeight / 2)
        .lineTo(buttonWidth, 0)
        .lineTo(buttonWidth, buttonHeight)
        .fill(0x434343)
    LBtn.x = Area.x - 60;
    LBtn.y = buttonY;
    LBtn.interactive = true;
    LBtn.buttonMode = true;
    LBtn.hitArea = new PIXI.Rectangle(LBtn.x, LBtn.y, buttonWidth, buttonHeight);
    LBtn.on('pointerdown', async () => {
        sampleNum = (instruments.length + sampleNum - 1) % instruments.length;
        console.log("✅ sample Left 被點擊！");
        await loadSamples();
    });
    uiApp.stage.addChild(LBtn);

    // 建立右側按鈕（三角形）
    const RBtn = new PIXI.Graphics()
        .moveTo(0, 0)
        .lineTo(buttonWidth, buttonHeight / 2)
        .lineTo(0, buttonHeight)
        .fill(0x434343);
    RBtn.x = Area.x + Area.w + 15;
    RBtn.y = buttonY;
    RBtn.interactive = true;
    RBtn.buttonMode = true;
    RBtn.hitArea = new PIXI.Rectangle(RBtn.x, RBtn.y, buttonWidth, buttonHeight);
    RBtn.on('pointerdown', async () => {
        sampleNum = (sampleNum + 1) % instruments.length;
        console.log("✅ sample Right 被點擊！");
        await loadSamples();
    });
    uiApp.stage.addChild(RBtn);
}
