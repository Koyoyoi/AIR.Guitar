export class GuitarVisualizer {

    constructor(ctx) {
        this.ctx = ctx;
        this.lineWidth = 2;
        this.pointRadius = 5;
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

            ctx.fillStyle = prePluck?.includes(i)
                ? "#D0104C"
                : "#00AA90";

            ctx.fillText(`${name}${octave}`, x, y);
        }
    }
}