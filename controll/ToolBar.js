export class ToolBar {
    constructor() {
        this.element = document.createElement("div");
        this.element.id = "toolbar";

        this.element.innerHTML = `
            <button id="switchMode" title="Switch Mode">
                <i class="fa-solid fa-repeat"></i>
            </button>

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
                this.switchMode();
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

    switchMode() {
        console.log("Switch Mode");

    }
}