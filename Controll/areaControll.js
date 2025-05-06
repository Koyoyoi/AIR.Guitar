import { initMIDIPort, instruments, loadSamples } from "../sound.js";

// 設定全域變數
export let capo = 0, portOpen = false, sampleName = 0, showAllCtrl = false;

// MIDI Port 控制
export async function portCtrl() {
    portOpen = !portOpen;
    if (portOpen) {
        await initMIDIPort();  // 初始化 MIDI
    }
}

// sound font控制
export async function sampleCtrl(c) {
    if (c == '-') {
        sampleName -= 1;  // 減少樣本索引
    } else if (c == '+') {
        sampleName += 1;  // 增加樣本索引
    }
    sampleName = (instruments.length + sampleName) % instruments.length;  // 確保樣本索引在範圍內
    loadSamples();  // 加載對應的樣本
}

export async function settingCtrl() {
    showAllCtrl = !showAllCtrl
}
