import { rollSeq } from "../Draw/drawMIDI.js";
import { uiApp, webCam, setupCamera } from "../main.js";
import { midiProcess } from "../midiEvent.js";
import { initMIDIPort, instruments, loadSamples } from "../sound.js";

export let modeNum = 1, sampleNum = 0, capo = 0, playNum = 0;
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
const modeName = ["自由演奏", "歌曲演奏", "數字演奏"];
const playName = ["彎曲手指", "雙指互碰", "手部揮動"]

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

export function closeSet() {
    showAllCtrl = false;
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

    } else {
        ModeCtrl();
        capoCtrl();
        camCtrl();
        if (modeNum == 0) {
            handCtrl();
        }
        else if (modeNum == 1) {
            reloadCtrl();
            touchCtrl();
            playCtrl();
        }
        else if (modeNum == 2) {
            reloadCtrl();
            handCtrl();
        }
    }

}

// Mode 控制區域
function ModeCtrl() {
    const Area = {
        x: 20,
        y: 10,
        w: uiApp.screen.width * 0.2,
        h: uiApp.screen.height * 0.08
    };

    // 背景區域
    const labelBase = new PIXI.Graphics()
        .roundRect(Area.x, Area.y, Area.w, Area.h, 10)
        .fill(0x434343)
        .roundRect(Area.x + Area.w * 3 / 5 + 10, Area.y + 5, 4, Area.h - 10)
        .fill(0x656765);
    uiApp.stage.addChild(labelBase);

    // 文字創建方式`
    const label = new PIXI.Text({
        text: `${modeName[modeNum]}`,
        style: textStyle['normal'],
        x: Area.x + Area.w / 3,
        y: Area.y + Area.h / 2
    });
    label.anchor.set(0.5);
    uiApp.stage.addChild(label); // 確保文字能夠顯示在背景區域之上

    const chBtn = new PIXI.Sprite(IMGs['change_Mode']);
    chBtn.x = Area.x + Area.w * 2 / 3 + 20;
    chBtn.y = Area.y;
    chBtn.width = 50;
    chBtn.height = Area.h;
    // 點擊事件
    chBtn.hitArea = new PIXI.Rectangle(Area.x + Area.w * 2 / 3, Area.y, Area.w / 3, Area.h); // 限定互動範圍（可調整）
    chBtn.interactive = true;
    chBtn.buttonMode = true;
    chBtn.on('pointerdown', () => {
        console.log("✅ mode 控制區被點擊！");
        if (webCam) modeNum = (modeNum + 1) % modeName.length
    });
    uiApp.stage.addChild(chBtn);
}

// MIDI 控制區域
function midiPortCtrl() {
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
        style: textStyle['normal'],
        x: Area.x + Area.w / 2,
        y: Area.y + Area.h / 2
    });
    midiLabel.anchor.set(0.5);
    uiApp.stage.addChild(midiLabel);

    // 點擊事件處理
    midiBg.on('pointerdown', () => {
        portOpen = !portOpen;
        console.log("✅ MIDI port 控制區被點擊！");
        if (portOpen) initMIDIPort();
    });

}

// SoundFont 控制區域
async function sampleCtrl() {
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
        style: textStyle['normal'],
        x: Area.x + Area.w / 2,
        y: Area.y + Area.h / 2
    });
    sampleLabel.anchor.set(0.5);
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
export function handCtrl(ctrl) {

    if (ctrl == 'switch') isSwitch = !isSwitch;

    const Area = {
        x: 25,
        y: uiApp.screen.height / 2 - uiApp.screen.width * 0.25 / 2,
        w: uiApp.screen.height * 0.08,
        h: uiApp.screen.width * 0.25
    };

    // 背景區域
    const bg = new PIXI.Graphics()
        .roundRect(Area.x, Area.y, Area.w, Area.h, 50)
        .fill(0x434343)
        .roundRect(Area.x + 5, Area.y + Area.h / 2 - 40, Area.w - 10, 4)
        .fill(0x656765)
        .roundRect(Area.x + 5, Area.y + Area.h / 2 + 40, Area.w - 10, 4)
        .fill(0x656765)
    uiApp.stage.addChild(bg);

    const swBtn = new PIXI.Sprite(IMGs['switch']);
    swBtn.hitArea = new PIXI.Rectangle(Area.x + Area.w / 2 - 40, Area.y, 80, Area.h); // 限定互動範圍（可調整）
    swBtn.rotation = Math.PI / -2;
    swBtn.x = Area.x + 5;
    swBtn.y = Area.y + Area.h / 2 + 25;
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
        style: isSwitch ? textStyle['soundCtrl'] : textStyle['gesture'],
        x: Area.x + Area.w / 2,
        y: Area.y + 30
    });
    left.anchor.set(0.5);
    uiApp.stage.addChild(left);

    const LHand = new PIXI.Sprite(IMGs['left_hand']);
    LHand.x = Area.x + 5;
    LHand.y = left.y + 20;
    LHand.width = 50;
    LHand.height = 50;
    uiApp.stage.addChild(LHand);

    // right hand
    const right = new PIXI.Text({
        text: '右',
        style: isSwitch ? textStyle['gesture'] : textStyle['soundCtrl'],
        x: Area.x + Area.w / 2,
        y: Area.y + Area.h - 30
    });
    right.anchor.set(0.5);
    uiApp.stage.addChild(right);

    const RHand = new PIXI.Sprite(IMGs['right_hand']);
    RHand.x = Area.x + 5;
    RHand.y = right.y - 70;
    RHand.width = 50;
    RHand.height = 50;
    uiApp.stage.addChild(RHand);

}

// reload 控制區域
export function reloadCtrl() {
    if (showAllCtrl) return

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
        midiProcess('reload');
    });

    uiApp.stage.addChild(reloadBtn);
}

export function capoCtrl() {
    if (modeNum != 0) return

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
        style: textStyle['normal'],
        x: Area.x + Area.w / 2 - 100,
        y: Area.y + Area.h / 2,
        hitArea: new PIXI.Rectangle(Area.x, Area.y, (Area.w - 160 / 2), Area.h),
        interactive: true,
        buttonMode: true
    });
    sub.anchor.set(0.5);
    sub.on('pointerdown', () => {
        console.log("✅ - 被點擊");
        capo -= 1
    });
    uiApp.stage.addChild(sub);

    // 右邊控制（加號或「+」）
    const add = new PIXI.Text({
        text: '+',
        style: textStyle['normal'],
        x: Area.x + Area.w / 2 + 105,
        y: Area.y + Area.h / 2,
        hitArea: new PIXI.Rectangle(Area.x + Area.w / 2 + 95, Area.y, (Area.w - 160 / 2), Area.h),
        interactive: true,
        buttonMode: true
    });
    add.anchor.set(0.5);
    add.on('pointerdown', () => {
        console.log("✅ + 被點擊");
        capo += 1;
    });
    uiApp.stage.addChild(add);

    capo = Math.max(-12, Math.min(12, capo));

    // capo 開關文字按鈕
    const text = new PIXI.Text({
        text: 'capo: ' + capo,
        style: textStyle['normal'],
        x: Area.x + Area.w / 2 - 60,
        y: Area.y + Area.h / 4,
        hitArea: new PIXI.Rectangle(Area.x + Area.w / 2 - 60 - 20, Area.y, 160, Area.h),
        interactive: true,
        buttonMode: true
    });

    text.on('pointerdown', () => {
        console.log("✅ capo 被點擊");
        capo = 0
    });
    uiApp.stage.addChild(text);
}

export function touchCtrl() {

    const Area = {
        x: 0,
        y: 100,
        w: uiApp.screen.width,
        h: uiApp.screen.height - 200
    };

    // 背景區域
    const touch = new PIXI.Graphics()
        .roundRect(Area.x, Area.y, Area.w, Area.h, 1)

    touch.hitArea = new PIXI.Rectangle(Area.x, Area.y, Area.w, Area.h);
    touch.interactive = true;
    touch.buttonMode = true;
    touch.on('pointerdown', (event) => {
        const pos = event.data.global;
        console.log(`✅ Touch: x: ${pos.x.toFixed(2)}, y: ${pos.y.toFixed(2)}`);
        rollSeq(pos.y.toFixed(2))
    });

    uiApp.stage.addChild(touch);

}

export function playCtrl() {
    if (showAllCtrl) return

    const Area = {
        x: uiApp.screen.width - uiApp.screen.width * 0.25,
        y: uiApp.screen.height - uiApp.screen.height * 0.1,
        w: uiApp.screen.width * 0.18,
        h: uiApp.screen.height * 0.08
    };

    // 背景區域
    const labelBase = new PIXI.Graphics()
        .roundRect(Area.x, Area.y, Area.w, Area.h, 10)
        .fill(0x434343)
        .roundRect(Area.x + Area.w * 3 / 5 + 20, Area.y + 5, 4, Area.h - 10)
        .fill(0x656765);
    uiApp.stage.addChild(labelBase);

    // 文字創建方式`
    const label = new PIXI.Text({
        text: `${playName[playNum]}`,
        style: textStyle['normal']
    });
    label.anchor.set(0.5);
    label.x = Area.x + Area.w / 3;
    label.y = Area.y + Area.h / 2;
    uiApp.stage.addChild(label); // 確保文字能夠顯示在背景區域之上

    const chBtn = new PIXI.Sprite(IMGs['change_Play']);
    chBtn.x = Area.x + Area.w * 2 / 3 + 20;
    chBtn.y = Area.y;
    chBtn.width = 50;
    chBtn.height = Area.h;
    // 點擊事件
    chBtn.hitArea = new PIXI.Rectangle(Area.x + Area.w * 2 / 3, Area.y, Area.w / 3, Area.h); // 限定互動範圍（可調整）
    chBtn.interactive = true;
    chBtn.buttonMode = true;
    chBtn.on('pointerdown', () => {
        console.log("✅ reload 控制區被點擊！");
        playNum = (playNum + 1) % playName.length
    });
    uiApp.stage.addChild(chBtn);

}


// --- CAM 控制按鈕 ---
export function camCtrl() {
    if (showAllCtrl) return;

    const Area = {
        x: uiApp.screen.width - uiApp.screen.width * 0.25,
        y: 10,
        w: uiApp.screen.width * 0.18,
        h: uiApp.screen.height * 0.08
    };

    // 背景區域
    const labelBase = new PIXI.Graphics()
        .roundRect(Area.x, Area.y, Area.w, Area.h, 10)
        .fill(0x434343)
        .roundRect(Area.x + Area.w * 3 / 5 + 20, Area.y + 5, 4, Area.h - 10)
        .fill(0x656765);
    uiApp.stage.addChild(labelBase);

    // 文字
    const label = new PIXI.Text({
        text: webCam ? "Cam On" : "Cam Off",
        style: textStyle['normal']
    });
    label.anchor.set(0.5);
    label.x = Area.x + Area.w / 3;
    label.y = Area.y + Area.h / 2;
    uiApp.stage.addChild(label);

    // 按鈕
    const camBtn = new PIXI.Sprite(IMGs['cam']);
    camBtn.x = Area.x + Area.w * 2 / 3 + 20;
    camBtn.y = Area.y;
    camBtn.width = 50;
    camBtn.height = Area.h;
    camBtn.hitArea = new PIXI.Rectangle(Area.x, Area.y, Area.w, Area.h)
    camBtn.interactive = true;
    camBtn.buttonMode = true;

    camBtn.on('pointerdown', async () => {
        console.log("📷 CAM 控制按鈕被點擊！");
        await setupCamera(webCam ? 'close' : 'open');
        label.text = webCam ? "Cam On" : "Cam Off"; // 更新狀態文字
    });

    uiApp.stage.addChild(camBtn);
}
