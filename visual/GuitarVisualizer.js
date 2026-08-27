export class GuitarVisualizer {

    constructor(ctx) {
        this.ctx = ctx;
        this.lineWidth = 2;
        this.pointRadius = 5;
        this.strings = [];
        this.NOTE_NAMES = [
            "C", "C#", "D", "D#", "E", "F",
            "F#", "G", "G#", "A", "A#", "B"
        ];
    }

    clear() {
        this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    }

    drawGesture(gesture, pos) {
        if (!gesture || !pos) return;

        const ctx = this.ctx;

        ctx.font = "bold 80px Arial";
        ctx.fillStyle = "#00AA90";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        ctx.fillText(`${gesture}`, pos[0], pos[1]);
    }

    drawNote(note, prePluck, hand) {
        if (!note || !hand) return;

        const ctx = this.ctx;
        const fingertips = [4, 8, 12, 16];

        ctx.font = "bold 40px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        for (let i = 0; i < 4; i++) {
            const point = hand[fingertips[i]];
            if (!point || note[i] === undefined) continue;

            const x = point[0];
            const y = point[1];

            const midi = note[i];
            const name = this.NOTE_NAMES[midi % 12];
            const octave = Math.floor(midi / 12) - 1;

            if (prePluck?.includes(i)) {
                ctx.fillStyle = "#D0104C";

                if (!this.prevPluck.includes(i)) {
                    this.strings.push({
                        y,
                        midi,
                        startTime: performance.now(),
                        duration: 500,
                        amplitude: 8,
                        frequency: 0.08
                    });
                }
            } else {
                ctx.fillStyle = "#00AA90";
            }

            ctx.fillText(`${name}${octave}`, x, y);
        }

        this.prevPluck = prePluck?.slice() ?? [];
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
            ctx.lineWidth = 8;

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
            "#FF4D4D", // C
            "#FF8A4D", // C#
            "#FFD24D", // D
            "#B8D94E", // D#
            "#4DCC66", // E
            "#4DD9A8", // F
            "#4DC4FF", // F#
            "#4D79FF", // G
            "#795CFF", // G#
            "#B04DFF", // A
            "#E04DFF", // A#
            "#FF4DB8"  // B
        ];

        return colors[midi % 12];
    }

}