import { DrawScore } from "../visual/DrawScore.js";

export class MidiLibrary {

    constructor(element) {
        this.element = element;
        this.drawScore = new DrawScore();
        this.midiIdx = 0;
        this.midis = [];
        this.currMidi = [];
        this.events = [];
    }

    async loadMidiFiles() {
        this.midis = [];

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

            this.midis.push(...items);

            page++;

            await new Promise(resolve =>
                setTimeout(resolve, 250)
            );
        }
        this.currMidi = this.midis[0];
    }

    async updateMidi() {
        this.currMidi = this.midis[(this.midiIdx + this.midis.length) % this.midis.length];
        this.element.querySelector("#midiName").textContent = this.currMidi.title;
        console.log(this.currMidi.title);
        await this.getMidiEvent(this.currMidi.id);
    }

    setupList(midiPopup) {
        const search = midiPopup.querySelector("#midiSearch");
        const items = midiPopup.querySelector("#midiItems");

        const render = (keyword = "") => {
            items.innerHTML = "";

            keyword = keyword.toLowerCase();

            this.midis
                .filter(midi =>
                    (midi.title || "").toLowerCase().includes(keyword) ||
                    (midi.composer || "").toLowerCase().includes(keyword)
                )
                .forEach(midi => {
                    const item = document.createElement("div");

                    item.className = "midi-item";

                    item.innerHTML = `
                        <div class="midi-title">
                            ${midi.title}
                        </div>
                        <div class="midi-composer">
                            ${midi.composer || "Unknown"}
                        </div>
                    `;

                    item.addEventListener("click", () => {
                        this.currMidi = midi;
                        this.midiIdx = this.midis.findIndex(midi => midi.title === this.currMidi.title);
                        this.updateMidi();

                        midiPopup.style.display = "none";
                    });

                    items.appendChild(item);
                });
        };

        search.addEventListener("input", () => {
            render(search.value);
        });

        render();
    }

    async getMidiEvent(id) {
        const url = `https://imuse.ncnu.edu.tw/Midi-library/api/midis/${id}/events`;

        const res = await fetch(url);

        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }

        const json = await res.json();

        await this.transEvent(json);
    }

    async transEvent(json) {
        const events = json.events || [];
        const lyrics = json.lyrics || [];
        const map = {};

        events.forEach(event => {
            const time = Number(event.time).toFixed(4);

            if (!map[time]) {
                map[time] = {
                    time: Number(time),
                    midis: [],
                    lyric: null,
                    velocity: Number(event.velocity).toFixed(4)
                };
            }

            map[time].midis.push(event.midi);
            map[time].midis.sort((a, b) => a - b);
        });

        lyrics.forEach(lyric => {
            const time = Number(lyric.time).toFixed(4);

            if (!map[time]) {
                map[time] = {
                    time: Number(time),
                    midis: [],
                    lyric: null,
                    velocity: null
                };
            }

            map[time].lyric = lyric.text;
        });

        this.events = Object.values(map).sort((a, b) => a.time - b.time);
        this.drawScore.setEvents(this.events);
    }

}