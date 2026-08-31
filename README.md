# AIR.Guitar

[**AIR.Guitar**](https://koyoyoi.github.io/AIR.Guitar/) 是一個基於瀏覽器的虛擬吉他體驗工具，結合 **MediaPipe 手部追蹤、手勢辨識、MIDI 與即時音效**，讓使用者透過手部動作演奏虛擬吉他。

## 功能特色

* **手部追蹤**：使用 MediaPipe 追蹤雙手 Landmark。
* **手勢辨識**：分析手部特徵並辨識演奏所需的手勢。
* **Free Play**：自由演奏虛擬吉他。
* **Score Play**：載入 MIDI 並依照譜面進行演奏。
* **多種演奏方式**：Score Play 支援 Pinch、Wave、Bend。
* **即時音效**：將手部動作轉換為吉他音符。
* **視覺化**：即時顯示手部、音符、琴弦與 Score。
* **Capo**：支援即時調整音高。

## 架構

2026 年 8 月進行架構重構，將專案依照資料處理、視覺化與控制流程拆分：

```text
AIR.Guitar
│
├── models/   負責 MediaPipe 手部追蹤、手部特徵分析與 Gesture 辨識。
│   └── MediaPipe、Hand Feature、SVM
│
├── visual/   負責手部、音符、琴弦與 Score 的視覺化。
│   └── Hand Visualizer、Score Visualizer
│
├── controll/ 負責 Toolbar、Play Mode、MIDI、音效與各模組之間的控制流程。
│   └── ToolBar、MIDI Library、Sound
│
├── main.js
├── index.html
└── styles.css
```

## Play Mode

### Free Play

自由演奏模式。

使用者透過手部動作直接控制虛擬吉他：

* 左手：辨識 Gesture 並建立 Guitar Chord
* 右手：透過手指彎曲與手部移動控制 Plucking / Strumming
* Capo：調整演奏音高

```text
Left Hand
   │
   ▼
Gesture
   │
   ▼
Guitar Chord

Right Hand
   │
   ├──► Finger Bend ──► Plucking
   │
   └──► Hand Movement ──► Strumming
```

### Score Play

譜面演奏模式。

載入 MIDI 後，系統解析 MIDI Event，並透過選擇的演奏方式觸發下一個音符。

```text
MIDI
 │
 ▼
MIDI Events
 │
 ▼
Score
 │
 ▲
 │
Playing Method
```

#### Playing Methods

| Method    | 操作      |
| --------- | ------- |
| **Pinch** | 拇指與食指捏合 |
| **Wave**  | 手掌左右揮動  |
| **Bend**  | 手指彎曲    |

不同的 Playing Method 會被轉換成觸發事件，當偵測到有效動作後，Score 會進入下一個 MIDI Event。程式中分別透過 `pinching()`、`waving()` 與 `bending()` 處理三種方式。

## Score Play 流程

```text
MIDI File
   │
   ▼
MIDI Library
   │
   ▼
MIDI Events
   │
   ▼
Score
   ▲
   │
Playing Method
   │
   ├── Pinch
   ├── Wave
   └── Bend
```

偵測到有效的演奏動作後，Score Visualizer 會推進至下一個 Event，並觸發對應的音效。

## 線上體驗

**[開始使用 AIR.Guitar](https://koyoyoi.github.io/AIR.Guitar/)**

### 環境需求

* 允許瀏覽器使用攝影機
* 建議使用最新版 Google Chrome
* 支援 WebAssembly 與 MediaPipe
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

**2026/08** 完成 `models / visual / controll` 架構重構，將手部資料處理、視覺化與控制流程分離，提升程式的可讀性、維護性與擴充性。
