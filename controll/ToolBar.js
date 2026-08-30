import { loadMidiFiles, setupList } from "./MidiFiles.js";
const mode = ["Free Play", "Number Score"]

export class ToolBar {
    constructor() {
        this.capo = 0;
        this.midis = [];
        this.midiIdx = 0;
        this.currMode = 0;
        this.mode = mode[this.currMode];
        // element id
        this.element = document.getElementById("toolbar")
        this.modeValue = this.element.querySelector("#modeValue");
        this.midiPopup = this.element.querySelector("#midiPopup");
        this.init();
    }

    async init() {
        this.midis = await loadMidiFiles();
        setupList(this.midiPopup, this.midis, (midi) => {this.midiIdx = this.midis.indexOf(midi); this.updateMidi();});
        this.element.querySelector("#midiName").addEventListener("click", () => {
            this.midiPopup.style.display = this.midiPopup.style.display === "flex" ? "none" : "flex";
        });
        this.element.querySelector("#midiPrev").addEventListener("click", () => {
            this.midiIdx = (this.midiIdx - 1 + this.midis.length) % this.midis.length;
            this.updateMidi();
        });
        this.element.querySelector("#midiNext").addEventListener("click", () => {
            this.midiIdx = (this.midiIdx + 1 + this.midis.length) % this.midis.length;
            this.updateMidi();
        });

        this.modeValue.textContent = this.mode;

        this.element.querySelector("#switchMode").addEventListener("click", () => {
            this.switchMode();
        });

        this.element.querySelector("#capoMinus").addEventListener("click", () => {
            this.setCapo(this.capo - 1);
        });

        this.element.querySelector("#capoPlus").addEventListener("click", () => {
            this.setCapo(this.capo + 1);
        });

    }

    updateMidi() {
        this.element.querySelector("#midiName").textContent = this.midis[this.midiIdx].title;
        console.log(this.midis[this.midiIdx])
    }

    setCapo(value) {
        this.capo = Math.max(-12, Math.min(12, value));
        this.element.querySelector("#capoValue").textContent = `Capo ${this.capo}`;
    }

    switchMode() {
        this.currMode = (this.currMode + 1) % mode.length;
        this.mode = mode[this.currMode];
        this.modeValue.textContent = this.mode;
        // Show or Hide
        if (this.mode === "Free Play") {
            this.element.querySelector(".capo-control").style.display = "flex";
        } else {
            this.element.querySelector(".capo-control").style.display = "none";
        }
    }
}