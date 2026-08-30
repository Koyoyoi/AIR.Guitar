export class DrawScore {
    constructor() {
        this.canvas = document.querySelector("#scoreRoll");
        this.ctx = this.canvas.getContext("2d");
        this.events = [];
        this.startX = 80;
        this.scaleX = 100;
        this.scaleY = 8;
        this.offset = 0;
        this.animationStart = 0;
        this.animationDuration = 300;
        this.isRunning = false;
        this.animating = false;

        this.resize();
        window.addEventListener("resize", () => this.resize());
        this.canvas.addEventListener("click", () => this.nextEvent());
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    setEvents(events) {
        this.events = events || [];
        this.offset = 0;
        this.animating = false;
        this.draw();
    }

    nextEvent() {
        if (!this.events.length || this.animating) return;

        this.animationStart = performance.now();
        this.animating = true;
    }

    drawLoop() {
        if (!this.isRunning) return;

        if (this.animating) {
            const progress = Math.min(
                (performance.now() - this.animationStart) / this.animationDuration,
                1
            );

            const eased = 1 - Math.pow(1 - progress, 3);
            this.offset = this.scaleX * eased;

            if (progress >= 1) {
                this.events.shift();
                this.offset = 0;
                this.animating = false;
            }
        }

        this.draw();
        requestAnimationFrame(() => this.drawLoop());
    }

    draw() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.events.forEach((event, index) => {
            const x = this.startX + index * this.scaleX - this.offset;

            event.midis.forEach(midi => {
                const y = this.canvas.height / 2 - (midi - 60) * this.scaleY;
                ctx.beginPath();
                ctx.arc(x + 10, y + 10, 10, 0, Math.PI * 2);
                ctx.fill();
            });
        });
    }

    start() {
        if (this.isRunning) return;

        this.isRunning = true;
        this.drawLoop();
    }

    stop() {
        this.isRunning = false;
        this.animating = false;
        this.offset = 0;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
}