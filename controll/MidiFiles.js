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

    console.log(`Total ${midiList.length} are loaded.`);
    return midiList
}