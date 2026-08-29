export class GuitarVisualizer {

    constructor(ctx) {
        this.hand = null;
        this.ctx = ctx;
        this.strings = [];
        this.NOTE_NAMES = [
            "C", "C#", "D", "D#", "E", "F",
            "F#", "G", "G#", "A", "A#", "B"
        ];
    }

    setHand(hand) {
        this.hand = hand;
    }

    clear() {
        this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    }

    drawGesture(gesture, capo, pos) {
        if (!gesture || !pos) return;

        const root = gesture[0];
        const suffix = gesture.slice(1);

        const index = this.NOTE_NAMES.indexOf(root);
        const note = this.NOTE_NAMES[(index + capo + 12) % 12];

        const ctx = this.ctx;

        ctx.font = "bold 80px Arial";
        ctx.fillStyle = "#00AA90";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        ctx.fillText(`${note}${suffix}`, pos[0], pos[1]);
    }

    drawNote(note, prePluck) {
        if (!note || !this.hand.Right) return;

        const ctx = this.ctx;
        const fingertips = [4, 8, 12, 16];

        ctx.font = "bold 40px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        for (let i = 0; i < 4; i++) {
            const point = this.hand.Right[fingertips[i]];
            if (!point || note[i] === undefined) continue;

            const x = point[0];
            const y = point[1];

            const midi = note[i];
            const name = this.NOTE_NAMES[midi % 12];
            const octave = Math.floor(midi / 12) - 1;

            if (prePluck?.includes(i)) {
                ctx.fillStyle = "#D0104C";
            } else {
                ctx.fillStyle = "#00AA90";
            }

            ctx.fillText(`${name}${octave}`, x, y);
        }

        this.prevPluck = prePluck?.slice() ?? [];
    }

    connectSound(guitarSound) {
        guitarSound.addEventListener("noteOn", ({ detail }) => {
            const hand = this.hand.Right;
            if (!hand) return;

            if (detail.type === "pluck") {
                const fingertips = [4, 8, 12, 16];
                const point = hand[fingertips[detail.stringIndex]];

                if (!point) return;

                this.addString(point[1], detail.midi);
                return;
            }

            if (detail.type === "strum") {
                const base = hand[11];
                if (!base) return;

                let index = detail.stringIndex;

                if (detail.direction === "Up") {
                    index = 5 - index;
                }

                const y = base[1] + index * 35;

                this.addString(y, detail.midi);
            }
        });
    }

    addString(y, midi) {
        this.strings.push({
            y,
            midi,
            startTime: performance.now(),
            duration: 500,
            amplitude: 8,
            frequency: 0.08
        });
    }

    drawStrings() {
        const ctx = this.ctx;
        const width = ctx.canvas.width;
        const now = performance.now();

        this.strings = this.strings.filter(string => {
            const elapsed = now - string.startTime;

            if (elapsed >= string.duration) return false;

            const progress = elapsed / string.duration;
            const fade = 1 - progress;

            ctx.beginPath();
            ctx.strokeStyle = this.noteToColor(string.midi);
            ctx.globalAlpha = fade;
            ctx.lineWidth = 7;

            const segments = 40;

            for (let i = 0; i <= segments; i++) {
                const t = i / segments;
                const x = width * t;

                const wave = Math.sin(t * Math.PI * 8 + elapsed * string.frequency);

                const y = string.y + wave * string.amplitude * fade;

                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }

            ctx.stroke();
            ctx.globalAlpha = 1;

            return true;
        });
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

}