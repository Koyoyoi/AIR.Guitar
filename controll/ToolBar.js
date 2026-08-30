const mode = ["Free Play", "Number Score"]

export class ToolBar {
    constructor() {
        this.currMode = 0;
        this.mode = mode[this.currMode];
        this.capo = 0;
        this.element = document.getElementById("toolbar")
        this.init();
    }

    init() {
        this.element
            .querySelector("#switchMode")
            .addEventListener("click", () => {
                this.switchMode(this.currMode + 1);
            });

        this.element
            .querySelector("#capoMinus")
            .addEventListener("click", () => {
                this.setCapo(this.capo - 1);
            });

        this.element
            .querySelector("#capoPlus")
            .addEventListener("click", () => {
                this.setCapo(this.capo + 1);
            });

    }

    setCapo(value) {
        this.capo = Math.max(-12, Math.min(12, value));
        this.element.querySelector("#capoValue").textContent = `Capo ${this.capo}`;
    }

    switchMode(value) {
        this.currMode = value % mode.length;
        this.mode = mode[this.currMode];
        this.element.querySelector("#modeValue").textContent = this.mode;
        // Show or Hide
        if (this.mode === "Free Play") {
            this.element.querySelector(".capo-control").style.display = "flex";
        } else {
            this.element.querySelector(".capo-control").style.display = "none";
        }
    }
}