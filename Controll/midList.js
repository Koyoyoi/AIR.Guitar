import { midiProcess } from "../midiEvent.js";

const API_URL = "https://imuse.ncnu.edu.tw/Midi-library/api/midis?page=1&limit=20&sort=uploaded_at&order=desc";
const showListBtn = document.getElementById("showListBtn");
const midiListContainer = document.getElementById("midiListContainer");
const midiListDiv = document.getElementById("midiList");
const closeList = document.getElementById("closeList");
let list
/**
 * 載入 MIDI 清單並顯示
 */
export async function loadMidiFiles() {

    fetch(API_URL)
        .then(res => res.json())
        .then(json => {
            list = Array.isArray(json.items) ? json.items : [];
        })
        .catch(err => {
            console.error(err);
            midiListDiv.innerHTML = "<p style='color:#f55'>載入失敗，請稍後再試。</p>";
        });
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
    list.forEach(mid => {
        const div = document.createElement("div");
        div.className = "midi-item";
        div.textContent = `${mid.title}`;
        div.addEventListener("click", async () => {
            console.log(`MIDI ID: ${mid.id}`);
            const midiUrl = `https://imuse.ncnu.edu.tw/Midi-library/api/midis/${mid.id}/download`;

            try {
                const res = await fetch(midiUrl);
                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

                const arrayBuffer = await res.arrayBuffer();
                console.log("MIDI 檔案抓取完成:", arrayBuffer);
                midiProcess(arrayBuffer, mid.title)

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
