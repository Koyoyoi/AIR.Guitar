export class ToolBar {
    constructor() {
        this.element = document.createElement("div");
        this.element.id = "toolbar";

        this.element.innerHTML = `
            <button id="switchMode" title="Switch Mode">
                <i class="fa-solid fa-repeat"></i>
            </button>
        `;

        document.body.appendChild(this.element);

        this.init();
    }

    init() {
        const switchMode = this.element.querySelector("#switchMode");

        switchMode.addEventListener("click", () => {
            this.switchMode();
        });
    }

    switchMode() {
        console.log("Switch Mode");

    }
}