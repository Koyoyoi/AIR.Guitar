export async function loadMidiFiles() {
    let midiList = [];
    let page = 1;

    while (true) {
        const url = `https://imuse.ncnu.edu.tw/Midi-library/api/midis` + `?page=${page}&limit=100&sort=uploaded_at&order=desc`;
        const res = await fetch(url);

        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }

        const json = await res.json();
        const items = Array.isArray(json.items) ? json.items : [];

        if (items.length === 0) break;

        midiList.push(...items);

        page++;

        await new Promise(resolve => setTimeout(resolve, 250));
    }

    return midiList
}

export function setupList(midiPopup, midis, onSelect) {
    const search = midiPopup.querySelector("#midiSearch");
    const items = midiPopup.querySelector("#midiItems");

    const render = (keyword = "") => {
        items.innerHTML = "";

        keyword = keyword.toLowerCase();

        midis
            .filter(midi =>
                (midi.title || "").toLowerCase().includes(keyword) ||
                (midi.composer || "").toLowerCase().includes(keyword)
            )
            .forEach((midi, index) => {
                const item = document.createElement("div");

                item.className = "midi-item";

                item.innerHTML = `
                    <div class="midi-title">${midi.title}</div>
                    <div class="midi-composer">
                        ${midi.composer || "Unknown"}
                    </div>
                `;

                item.addEventListener("click", () => {
                    onSelect(midi);
                });

                items.appendChild(item);
            });
    };

    search.addEventListener("input", () => {
        render(search.value);
    });

    render();
}