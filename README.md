# AIR.Guitar

[**AIR.Guitar**](https://koyoyoi.github.io/AIR.Guitar/) 是一個基於瀏覽器的虛擬吉他體驗工具，結合 **MediaPipe 手勢辨識、MIDI 音效與即時視覺化**，讓使用者僅透過手部動作即可進行演奏。

## 功能特色

* **手勢辨識**：利用 MediaPipe 追蹤雙手動作，辨識不同演奏手勢。
* **多種演奏模式**：支援 Pinch、Wave、Bend。
* **MIDI 音樂**：載入 MIDI 檔案並解析音符事件。
* **即時音效**：將手勢轉換為吉他音符並即時播放。
* **視覺化效果**：即時顯示手勢、音符與琴弦振動。
* **Capo 控制**：支援即時調整 Capo 音高。
* **瀏覽器運行**：不需安裝額外軟體即可使用。

## 2026/08 架構重構

2026 年 8 月對 AIR.Guitar 進行架構重構，將專案依照**資料模型、視覺化與控制邏輯**拆分為三個主要目錄，使不同功能之間的責任更加明確，也方便後續擴充與維護。

```text
AIR.Guitar
│
├── models/
│   └── MediaPipe、Hand Feature等核心資料與功能模型
│
├── visual/
│   └── Hand Visualizer、Canvas、Score Roll 等視覺化相關功能
│
├── controll/
│   └── ToolBar、MIDI Library、Guitar Sound 等使用者操作與流程控制
│
├── main.js
├── index.html
└── styles.css
```

### `models/`

負責核心資料處理與模型相關功能，例如：

* MediaPipe Hand / Pose Landmarker
* Hand Feature
* Finger Angle


此層主要負責取得、分析與處理演奏所需的資料。

### `visual/`

負責所有畫面與視覺效果，例如：

* Hand Visualizer
* Gesture 顯示
* Note 顯示
* Guitar String Animation
* Canvas Rendering
* Score Roll

視覺化元件透過模型提供的資料呈現目前的演奏狀態。

### `controll/`

負責使用者操作與各組件之間的控制流程，例如：

* ToolBar
* MIDI Library
* Play Mode
* Score Mode
* Capo Control
* MIDI Song Selection
* Guitar Sound
* MIDI / 音符相關資料

此層主要負責 UI 操作以及控制不同模型與視覺元件之間的互動。

## 系統流程

```text
Camera
   │
   ▼
models/
MediaPipe
   │
   ▼
Hand Data
   │
   ├──────────────┐
   ▼              ▼
visual/        controll/
HandVisualizer   ToolBar
   │              │
   │              ├── Play Mode
   │              ├── Score Mode
   │              └── Capo
   │
   ▼
controll/
GuitarSound
   │
   ▼
Audio / MIDI Event
   │
   ▼
visual/
Note / String / Gesture
```

## Play Mode

AIR.Guitar 提供三種手勢演奏方式：

| Mode      | 操作      |
| --------- | ------- |
| **Pinch** | 拇指與食指捏合 |
| **Wave**  | 手掌左右揮動  |
| **Bend**  | 手指彎曲    |

手勢經由 MediaPipe 取得後，由控制流程判斷目前的 Play Mode，再觸發對應的演奏行為。

## Score Mode

### Free Play

自由演奏模式，使用手勢直接控制虛擬吉他。

### Number Score

MIDI 譜面模式，載入 MIDI 檔案，依照 MIDI Event 播放音符並同步顯示視覺效果。

## 線上體驗

[**開始使用 AIR.Guitar**](https://koyoyoi.github.io/AIR.Guitar/)

### 環境需求

* 需要允許瀏覽器使用攝影機
* 建議使用最新版 Google Chrome
* 需要支援 WebAssembly 與 MediaPipe 的現代瀏覽器
* 建議使用具備 GPU 加速能力的裝置

## 使用技術

* JavaScript
* HTML / CSS
* MediaPipe Tasks Vision
* Web Audio API
* MIDI
* Canvas API
* SoundFont
* WebAssembly
* GitHub Pages

## Project Status

AIR.Guitar 持續開發中。

**2026/08** 完成主要架構重構，將專案整理為 `models / visual / controll` 三個主要模組，分離核心資料處理、視覺化以及控制流程，提升程式的可讀性、維護性與後續擴充能力。
