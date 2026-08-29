export class Loading {
    constructor() {
        this.el = document.createElement("div");

        this.el.innerHTML = `
            <div class="loading-text">Loading 0%</div>
            <div class="loading-bar">
                <div class="loading-progress"></div>
            </div>
        `;

        Object.assign(this.el.style, {
            position: "fixed",
            inset: "0",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            flexDirection: "column",
            background: "#1C1C1C",
            color: "#BDC0BA",
            font: "bold 24px Arial",
            zIndex: "9999"
        });

        document.body.appendChild(this.el);

        const style = document.createElement("style");

        style.textContent = `
            .loading-bar {
                width: 300px;
                height: 10px;
                margin-top: 15px;
                background: #434343;
                border-radius: 5px;
                overflow: hidden;
            }

            .loading-progress {
                width: 0%;
                height: 100%;
                background: #00AA90;
                transition: width 0.2s ease;
            }
        `;

        document.head.appendChild(style);

        this.text = this.el.querySelector(".loading-text");
        this.progress = this.el.querySelector(".loading-progress");
    }

    setProgress(percent, text = "Loading") {
        percent = Math.min(100, Math.max(0, percent));

        this.text.textContent = `${text} ${Math.round(percent)}%`;
        this.progress.style.width = `${percent}%`;
    }

    hide() {
        this.el.style.opacity = "0";
        this.el.style.transition = "opacity 0.3s ease";

        setTimeout(() => {
            this.el.remove();
        }, 300);
    }
}