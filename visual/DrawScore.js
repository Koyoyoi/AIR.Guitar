export class DrawScore {
    constructor() {
        this.canvas = document.querySelector("#scoreRoll");
        this.ctx = this.canvas.getContext("2d");
        this.events = [];
        this.positions = [];
        this.startX = 80;
        this.scaleX = 100;
        this.scaleY = 8;
        this.animationDuration = 300;
        this.animationStart = 0;
        this.isRunning = false;
        this.animating = false;
        this.minBeat = 0.125;

        this.resize();
        window.addEventListener("resize", () => this.resize());
        this.canvas.addEventListener("click", () => this.nextEvent());
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.draw();
    }

    setEvents(events) {
        this.events = Array.isArray(events) ? events : [];
        this.positions = [];

        let x = this.startX;
        this.minBeat = this.events.length ? Math.min(...this.events.map(event => event.beats || 0).filter(beats => beats > 0)) : 0.125;

        this.events.forEach(event => {
            this.positions.push(x);
            x += (event.beats / this.minBeat) * 50;
        });

        this.animating = false;
        this.draw();
    }

    nextEvent() {
        if (!this.events.length || this.animating) return;

        this.events.shift();
        this.positions.shift();

        if (!this.events.length) {
            this.draw();
            return;
        }

        this.startPositions = [...this.positions];

        let targetX = this.startX;
        this.targetPositions = [];

        this.events.forEach(event => {
            this.targetPositions.push(targetX);
            targetX += (event.beats / this.minBeat) * 50;
        });

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

            this.positions = this.positions.map((x, index) => {
                const startX = this.startPositions[index];
                const targetX = this.targetPositions[index];

                return startX + (targetX - startX) * eased;
            });

            if (progress >= 1) {
                this.positions = [...this.targetPositions];
                this.animating = false;
            }
        }

        this.draw();
        requestAnimationFrame(() => this.drawLoop());
    }

    draw() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        for (let index = 0; index < this.events.length; index++) {
            const event = this.events[index];
            if (!event || !Array.isArray(event.midis) || !event.midis.length) continue;

            const x = this.positions[index];
            if (x > window.innerWidth) break;

            const radius = this.velocityToRadius(event.velocity);
            const firstMidi = event.midis[0];
            const lastMidi = event.midis[event.midis.length - 1];

            event.midis.forEach(midi => {
                const y = this.canvas.height / 2 - (midi - 60) * this.scaleY;

                ctx.fillStyle = this.noteToColor(midi % 12);
                ctx.globalAlpha = 0.75;
                ctx.beginPath();
                ctx.arc(x, y, radius, 0, Math.PI * 2);
                ctx.fill();
            });

            ctx.globalAlpha = 1;

            const firstY = this.canvas.height / 2 - (firstMidi - 60) * this.scaleY;
            const lastY = this.canvas.height / 2 - (lastMidi - 60) * this.scaleY;

            ctx.fillStyle = index === 0 ? "#FEBB24" : "#BDC0BA";
            ctx.font = "bold 40px Arial";
            ctx.textAlign = "center";

            if (event.lyric) {
                ctx.fillText(event.lyric, x, firstY + radius + 40);
            }

            ctx.fillText(this.midiToNumber(firstMidi), x, lastY - radius - 20);
        }
    }

    midiToNumber(midi) {
        const notes = [
            "1", "1#", "2", "2#", "3", "4",
            "4#", "5", "5#", "6", "6#", "7"
        ];

        return notes[((midi % 12) + 12) % 12];
    }

    noteToColor(midi) {
        const colors = [
            "#B5495B", // C
            "#C46243", // C#
            "#F7C242", // D
            "#91AD70", // D#
            "#86C166", // E
            "#2D6D48", // F
            "#6699A1", // F#
            "#58B2DC", // G
            "#6E75A4", // G#
            "#70649A", // A
            "#574C57", // A#
            "#B481BB"  // B
        ];

        return colors[midi % 12];
    }

    velocityToRadius(velocity) {
        const v = Number(velocity) || 0;
        return 10 + v * 15;
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.drawLoop();
    }

    stop() {
        this.isRunning = false;
        this.animating = false;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
}