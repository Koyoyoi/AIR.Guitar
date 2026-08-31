export class MidiLibrary {

    constructor(element) {
        this.element = element;
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
        const bpm = Number(json.bpm) || 120;
        const map = {};

        events.forEach(event => {
            const time = Number(event.time).toFixed(4);

            if (!map[time]) {
                map[time] = {
                    time: Number(time),
                    midis: [],
                    lyric: null,
                    velocity: Number(event.velocity).toFixed(4),
                    duration: 0,
                    beats: 0,
                    noteType: ""
                };
            }

            map[time].midis.push(event.midi);
            map[time].midis.sort((a, b) => a - b);

            const duration = Number(event.duration) || 0;
            map[time].duration = Math.max(map[time].duration, duration);
        });

        lyrics.forEach(lyric => {
            const time = Number(lyric.time).toFixed(4);

            if (map[time]) {
                map[time].lyric = lyric.text;
            }
        });

        this.events = Object.values(map)
            .sort((a, b) => a.time - b.time)
            .map(event => {
                const beats = event.duration * bpm / 60;
                const noteType = this.getNoteType(beats);

                return {
                    ...event,
                    beats: noteType.beats,
                    noteType: noteType.name
                };
            });
    }

    getNoteType(beats) {
        const types = [
            { beats: 4, name: "全音符" },
            { beats: 2, name: "二分音符" },
            { beats: 1, name: "四分音符" },
            { beats: 0.5, name: "八分音符" },
            { beats: 0.25, name: "十六分音符" },
            { beats: 0.125, name: "三十二分音符" }
        ];

        const clamped = Math.max(0.125, Math.min(4, beats));

        return types.reduce((closest, type) => Math.abs(clamped - type.beats) < Math.abs(clamped - closest.beats) ? type : closest);
    }

}