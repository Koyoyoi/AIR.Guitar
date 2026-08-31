export class ScoreVisualizer {
    constructor() {
        this.canvas = document.querySelector("#scoreRoll");
        this.ctx = this.canvas.getContext("2d");
        this.prevEevents = [];
        this.currEevents = [];
        this.positions = [];
        this.startPositions = [];
        this.targetPositions = [];
        this.startX = 150;
        this.scaleX = 100;
        this.scaleY = 8;
        this.animationDuration = 300;
        this.animationStart = 0;
        this.isRunning = false;
        this.animating = false;
        this.minBeat = 0.125;
        this.beatDuration = 300;

        this.resize();
        window.addEventListener("resize", () => this.resize());
        this.canvas.addEventListener("click", () => this.nextEvent());
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    setEvents(events) {
        if (events === this.prevEevents) return;
        this.currEevents = Array.isArray(events) ? events : [];
        this.prevEevents = this.currEevents;
        this.positions = [];

        let x = this.startX;
        const beats = this.currEevents.map(event => Number(event.beats)).filter(beats => beats > 0);

        this.minBeat = beats.length ? Math.min(...beats) : 0.125;

        this.currEevents.forEach(event => {
            this.positions.push(x);
            x += (Number(event.beats) / this.minBeat) * 80;
        });

        this.startPositions = [...this.positions];
        this.targetPositions = [...this.positions];
        this.animating = false;
        this.draw();
    }

    nextEvent() {
        if (!this.currEevents.length) return;

        const removedEvent = this.currEevents[0];
        const moveBeats = Number(removedEvent.beats) || this.minBeat;

        this.currEevents.shift();
        this.positions.shift();

        if (!this.currEevents.length) {
            this.animating = false;
            this.draw();
            return;
        }

        this.startPositions = [...this.positions];
        this.targetPositions = [];

        let targetX = this.startX;

        this.currEevents.forEach(event => {
            this.targetPositions.push(targetX);
            targetX += (Number(event.beats) / this.minBeat) * 80;
        });

        // 根據被移除音符的 beats 決定動畫時間
        this.animationDuration = moveBeats * this.beatDuration;
        this.animationDuration = Math.max(50, this.animationDuration);

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

            this.positions = this.startPositions.map((startX, index) => {
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

        for (let index = 0; index < this.currEevents.length; index++) {
            const event = this.currEevents[index];
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
            "#B5495B", "#C46243", "#F7C242", "#91AD70",
            "#86C166", "#2D6D48", "#6699A1", "#58B2DC",
            "#6E75A4", "#70649A", "#574C57", "#B481BB"
        ];

        return colors[((midi % 12) + 12) % 12];
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