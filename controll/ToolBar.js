import { MidiLibrary } from "./MidiFiles.js";
const mode = ["Free Play", "Number Score"]

export class ToolBar {
    constructor() {
        // element id
        this.element = document.getElementById("toolbar")
        this.modeValue = this.element.querySelector("#modeValue");
        this.midiPopup = this.element.querySelector("#midiPopup");
        // tool bar var
        this.midiLib = new MidiLibrary(this.element);
        this.capo = 0;
        this.currMode = 0;
        this.mode = mode[this.currMode];
        
        this.init();
    }

    async init() {
        // load and build list of midi songs
        await this.midiLib.loadMidiFiles();
        this.midiLib.setupList(this.midiPopup);
        this.element.querySelector("#midiName").addEventListener("click", () => {
            this.midiPopup.style.display = this.midiPopup.style.display === "flex" ? "none" : "flex";
        });
        this.element.querySelector("#midiPrev").addEventListener("click", () => {
            this.midiLib.midiIdx -= 1;
            this.midiLib.updateMidi(this.element);
        });
        this.element.querySelector("#midiNext").addEventListener("click", () => {
            this.midiLib.midiIdx += 1;
            this.midiLib.updateMidi(this.element);
        });
        // set mode
        this.modeValue.textContent = this.mode;
        this.element.querySelector("#switchMode").addEventListener("click", () => {
            this.currMode += 1;
            this.switchMode();
        });
        // set capo
        this.element.querySelector("#capoMinus").addEventListener("click", () => {
            this.setCapo(this.capo - 1);
        });
        this.element.querySelector("#capoPlus").addEventListener("click", () => {
            this.setCapo(this.capo + 1);
        });
         
        this.switchMode();
    }


    setCapo(value) {
        this.capo = Math.max(-12, Math.min(12, value));
        this.element.querySelector("#capoValue").textContent = `Capo ${this.capo}`;
    }

    switchMode() {
        this.currMode = this.currMode % mode.length;
        this.mode = mode[this.currMode];
        this.modeValue.textContent = this.mode;
        // Show or Hide
        if (this.mode === "Free Play") {
            this.element.querySelector(".capo-control").style.display = "flex";
            this.element.querySelector(".midiList").style.display = "none";
            this.midiLib.drawScore.stop();
        } else {
            this.element.querySelector(".capo-control").style.display = "none";
            this.element.querySelector(".midiList").style.display = "flex";
            this.midiLib.drawScore.start();
        }
    }
}