const mode = ["Free Play", "Number Score"]

export class ToolBar {
    constructor() {
        this.currMode = 0;
        this.capo = 0;

        this.element = document.createElement("div");
        this.element.id = "toolbar";

        this.element.innerHTML = `
            <div id="modeControl">
                <span id="modeValue">${mode[0]}</span>
                <span id="modeSeparator"></span>
                <button id="switchMode" title="Switch Mode">
                    <i class="fa-solid fa-repeat"></i>
                </button>
            </div>

            <div class="capo-control">
                <button id="capoMinus" title="Decrease Capo">
                    <i class="fa-solid fa-minus"></i>
                </button>
                <span id="capoValue">Capo 0</span>
                <button id="capoPlus" title="Increase Capo">
                    <i class="fa-solid fa-plus"></i>
                </button>
            </div>
        `;
        document.body.appendChild(this.element);

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
        console.log("Switch Mode");
        this.currMode = value % mode.length;
        this.element.querySelector("#modeValue").textContent = mode[this.currMode];
    }
}