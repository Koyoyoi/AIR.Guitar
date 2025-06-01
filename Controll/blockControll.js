import { uiApp } from "../main.js";
import { midiProcess } from "../midiEvent.js";
import { initMIDIPort, instruments, loadSamples } from "../sound.js";

export let modeNum = 0, sampleNum = 0, capo = 0;
export let showAllCtrl = false, isPlay = false, isSwitch = false, portOpen = false;

let IMGs = {}
let textStyle = {
    'normal': new PIXI.TextStyle({
        fontFamily: "Arial",
        fontSize: 30,
        fontWeight: "bold",
        fill: 0xBDC0BA,
        align: "center"
    }),
    'gesture': new PIXI.TextStyle({
        fontFamily: "Arial",
        fontSize: 30,
        fontWeight: "bold",
        fill: 0xe87a90,
        align: "center"
    }),
    'soundCtrl': new PIXI.TextStyle({
        fontFamily: "Arial",
        fontSize: 30,
        fontWeight: "bold",
        fill: 0x5dac81,
        align: "center"
    })
}
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

    if (showAllCtrl) {
        midiPortCtrl();
        sampleCtrl();
        ModeCtrl();
        handCtrl();
    } else {
        capoCtrl();
    }
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

    // 文字創建方式`
    const label = new PIXI.Text({
        text: `${modeName[modeNum]}`,
        style: textStyle['normal']
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

// MIDI 控制區域
export function midiPortCtrl() {
    const Area = {
        x: 25,
        y: 10,
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

    // 顯示狀態文字
    const midiLabel = new PIXI.Text({
        text: `MIDI port : ${portOpen ? 'on' : 'off'}`,
        style: textStyle['normal']
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
// SoundFont 控制區域
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

    // 顯示 sample 名稱
    const sampleLabel = new PIXI.Text({
        text: instruments[sampleNum],
        style: textStyle['normal']
    });
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

// hand 控制區域
export function handCtrl() {
    const Area = {
        x: 25,
        y: uiApp.screen.height - 20 - uiApp.screen.height * 0.08,
        w: uiApp.screen.width * 0.25,
        h: uiApp.screen.height * 0.08
    };

    // 背景區域
    const bg = new PIXI.Graphics()
        .roundRect(Area.x, Area.y, Area.w, Area.h, 50)
        .fill(0x434343)
        .roundRect(Area.x + Area.w / 2 - 40, Area.y + 5, 4, Area.h - 10)
        .fill(0x656765)
        .roundRect(Area.x + Area.w / 2 + 40, Area.y + 5, 4, Area.h - 10)
        .fill(0x656765)
    uiApp.stage.addChild(bg);

    const swBtn = new PIXI.Sprite(IMGs['switch']);
    swBtn.hitArea = new PIXI.Rectangle(Area.x + Area.w / 2 - 40, Area.y, 80, Area.h); // 限定互動範圍（可調整）
    swBtn.x = Area.x + Area.w / 2 - 25;
    swBtn.y = Area.y + 5;
    swBtn.width = 50;
    swBtn.height = 50;

    // 互動
    swBtn.interactive = true;
    swBtn.buttonMode = true;

    // 點擊事件
    swBtn.on('pointerdown', () => {
        console.log("✅ switch hand 控制區被點擊！");
        isSwitch = !isSwitch;
    });
    uiApp.stage.addChild(swBtn);

    // left hand 
    const left = new PIXI.Text({
        text: '左',
        style: isSwitch ? textStyle['soundCtrl'] : textStyle['gesture']
    });
    left.anchor.set(0.5);
    left.x = Area.x + 30;
    left.y = Area.y + Area.h / 2;
    uiApp.stage.addChild(left);

    const LHand = new PIXI.Sprite(IMGs['left_hand']);
    LHand.x = left.x + 20;
    LHand.y = Area.y + 5;
    LHand.width = 50;
    LHand.height = 50;

    // 互動
    LHand.hitArea = new PIXI.Rectangle(Area.x, Area.y, Area.w / 2 - 40, Area.h); // 限定互動範圍（可調整）
    LHand.interactive = true;
    LHand.buttonMode = true;

    // 點擊事件
    LHand.on('pointerdown', () => { console.log("✅ left hand 控制區被點擊！"); });
    uiApp.stage.addChild(LHand);

    // right hand
    const right = new PIXI.Text({
        text: '右',
        style: isSwitch ? textStyle['gesture'] : textStyle['soundCtrl']
    });
    right.anchor.set(0.5);
    right.x = Area.x + Area.w - 30;
    right.y = Area.y + Area.h / 2;
    uiApp.stage.addChild(right);

    const RHand = new PIXI.Sprite(IMGs['right_hand']);
    RHand.x = right.x - 70;
    RHand.y = Area.y + 5;
    RHand.width = 50;
    RHand.height = 50;

    // 互動
    RHand.hitArea = new PIXI.Rectangle(Area.x + Area.w / 2 + 40, Area.y, Area.w / 2 - 40, Area.h); // 限定互動範圍（可調整）
    RHand.interactive = true;
    RHand.buttonMode = true;

    // 點擊事件
    RHand.on('pointerdown', () => { console.log("✅ right hand 控制區被點擊！"); });
    uiApp.stage.addChild(RHand);
}

// reload 控制區域
export function reloadCtrl() {
    if(showAllCtrl) return

    const Area = {
        x: 25,
        y: uiApp.screen.height - 20 - uiApp.screen.height * 0.08,
        w: uiApp.screen.height * 0.1,
        h: uiApp.screen.height * 0.1,
    };

    const reloadBtn = new PIXI.Sprite(IMGs['reload']);
    reloadBtn.x = Area.x;
    reloadBtn.y = Area.y;
    reloadBtn.width = Area.w;
    reloadBtn.height = Area.h;

    // 讓圖片可以互動
    reloadBtn.hitArea = new PIXI.Rectangle(Area.x, Area.y, Area.w, Area.h); // 限定互動範圍（可調整）
    reloadBtn.interactive = true;
    reloadBtn.buttonMode = true;

    // 點擊事件
    reloadBtn.on('pointerdown', () => {
        console.log("✅ reload 控制區被點擊！");
        midiProcess();
    });

    uiApp.stage.addChild(reloadBtn);
}

export function capoCtrl() {
    if(modeNum != 0) return
    
    const Area = {
        x: uiApp.screen.width - uiApp.screen.height * 0.4,
        y: 10,
        w: uiApp.screen.width * 0.2,
        h: uiApp.screen.height * 0.08
    };

    // 背景區域
    const bg = new PIXI.Graphics()
        .roundRect(Area.x, Area.y, Area.w, Area.h, 50)
        .fill(0x434343)
        .roundRect(Area.x + Area.w / 2 - 80, Area.y + 5, 4, Area.h - 10)
        .fill(0x656765)
        .roundRect(Area.x + Area.w / 2 + 80, Area.y + 5, 4, Area.h - 10)
        .fill(0x656765);
    uiApp.stage.addChild(bg);

    // 左邊控制（減號或「左」）
    const sub = new PIXI.Text({
        text: '-',
        style: textStyle['normal']
    });
    sub.anchor.set(0.5);
    sub.x = Area.x + Area.w / 2 - 100;
    sub.y = Area.y + Area.h / 2;
    sub.hitArea = new PIXI.Rectangle(Area.x, Area.y, (Area.w - 160 / 2), Area.h);
    sub.interactive = true;
    sub.buttonMode = true;
    sub.on('pointerdown', () => {
        console.log("✅ - 被點擊");
        capo -= 1
    });
    uiApp.stage.addChild(sub);

    // 右邊控制（加號或「+」）
    const add = new PIXI.Text({
        text: '+',
        style: textStyle['normal']
    });
    add.anchor.set(0.5);
    add.x = Area.x + Area.w / 2 + 105;
    add.y = Area.y + Area.h / 2;
    add.hitArea = new PIXI.Rectangle(add.x - 10, Area.y, (Area.w - 160 / 2), Area.h);
    add.interactive = true;
    add.buttonMode = true;
    add.on('pointerdown', () => {
        console.log("✅ + 被點擊");
        capo += 1;
    });
    uiApp.stage.addChild(add);

    capo = Math.max(-12, Math.min(12, capo));

    // capo 開關文字按鈕
    const text = new PIXI.Text({
        text: 'capo: ' + capo,
        style: textStyle['normal']
    });
    text.x = Area.x + Area.w / 2 - 60;
    text.y = Area.y + (Area.h - text.height) / 2;
    text.hitArea = new PIXI.Rectangle(text.x - 20, Area.y, 160, Area.h);
    text.interactive = true;
    text.buttonMode = true;
    text.on('pointerdown', () => {
        console.log("✅ capo 被點擊");
        capo = 0
    });
    uiApp.stage.addChild(text);
}
