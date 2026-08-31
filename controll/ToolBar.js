import { MidiLibrary } from "./MidiFiles.js";

const mode = ["Free Play", "Score Play"];
const play = ["Pinch", "Wave", "Bend"];

export class ToolBar {
    constructor() {
        this.element = document.getElementById("toolbar");
        this.modeValue = this.element.querySelector("#modeValue");
        this.midiPopup = this.element.querySelector("#midiPopup");
        this.playModeValue = this.element.querySelector("#playModeValue");
        this.playControl = this.element.querySelector("#play-control");
        this.midiLib = new MidiLibrary(this.element);
        this.capo = 0;
        this.currMode = 1;
        this.mode = mode[this.currMode];
        this.playIdx = 0;
        this.playMode = play[this.playIdx];
        this.init();
    }

    async init() {
        await this.midiLib.loadMidiFiles();
        this.midiLib.setupList(this.midiPopup);

        this.element.querySelector("#midiName").addEventListener("click", () => {
            const isOpen = this.midiPopup.style.display === "flex";
            this.midiPopup.style.display = isOpen ? "none" : "flex";
        });

        this.element.querySelector("#midiPrev").addEventListener("click", () => {
            this.midiLib.midiIdx -= 1;
            this.midiLib.updateMidi(this.element);
        });

        this.element.querySelector("#midiNext").addEventListener("click", () => {
            this.midiLib.midiIdx += 1;
            this.midiLib.updateMidi(this.element);
        });

        this.element.querySelector("#switchMode").addEventListener("click", () => {
            this.currMode += 1;
            this.switchMode();
        });

        this.element.querySelector("#capoMinus").addEventListener("click", () => {
            this.setCapo(this.capo - 1);
        });

        this.element.querySelector("#capoPlus").addEventListener("click", () => {
            this.setCapo(this.capo + 1);
        });

        this.setPlayMode(0);

        this.playControl.addEventListener("click", () => {
            this.setPlayMode();
        });

        this.switchMode();
    }

    setPlayMode(index = null) {
        this.playIdx = index === null ? (this.playIdx + 1) % play.length : ((index % play.length) + play.length) % play.length;
        this.playMode = play[this.playIdx];
        this.playModeValue.textContent = this.playMode;
    }

    setCapo(value) {
        this.capo = Math.max(-12, Math.min(12, value));
        this.element.querySelector("#capoValue").textContent = `Capo ${this.capo}`;
    }

    switchMode() {
        this.currMode %= mode.length;
        this.mode = mode[this.currMode];
        this.modeValue.textContent = this.mode;
        const capoControl = this.element.querySelector(".capo-control");
        const midiList = this.element.querySelector(".midiList");
        const playMethod = this.element.querySelector(".playMode")

        if (this.mode === "Free Play") {
            capoControl.style.display = "flex";
            midiList.style.display = "none";
            this.midiPopup.style.display = "none";
            playMethod.style.display = "none";
        } else if(this.mode === "Score Play") {
            capoControl.style.display = "none";
            midiList.style.display = "flex";
            playMethod.style.display = "flex";
        }
    }
}