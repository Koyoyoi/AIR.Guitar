import { midiProcess } from "../midiEvent.js";

const showListBtn = document.getElementById("showListBtn");
const midiListContainer = document.getElementById("midiListContainer");
const midiListDiv = document.getElementById("midiList");
const closeList = document.getElementById("closeList");
export let midiList = [];

// 載入 MIDI 清單並顯示
export async function loadMidiFiles() {
    let page = 1;
    while (true) {
        let url = `https://imuse.ncnu.edu.tw/Midi-library/api/midis?page=${page}&limit=100&sort=uploaded_at&order=desc`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();

        const items = Array.isArray(json.items) ? json.items : [];
        if (items.length === 0) break;
        midiList = [...midiList, ...items];
        page++;
        await new Promise(r => setTimeout(r, 250));
    }
    console.log(`Total ${midiList.length} are loaded.`);
}

// 關閉清單
closeList.addEventListener("click", () => {
    midiListContainer.style.display = "none";
});

// 顯示 MIDI 清單項目
function renderMidiList() {
    midiListContainer.style.display = "block";
    midiListDiv.innerHTML = "載入中...";
    midiListDiv.innerHTML = "";
    midiList.forEach(mid => {
        const div = document.createElement("div");
        div.className = "midi-item";
        div.textContent = `${mid.title}`;
        div.addEventListener("click", async () => {
            try {
                midiProcess(mid.title, mid.id)

                // 自動關閉 MIDI 清單
                const midiListContainer = document.getElementById("midiListContainer");
                if (midiListContainer) {
                    midiListContainer.style.display = "none";
                }

            } catch (err) {
                console.error("抓取 MIDI 檔案失敗:", err);
            }
        });

        midiListDiv.appendChild(div);
    });
}

// 按鈕綁定
showListBtn.addEventListener("click", renderMidiList);
