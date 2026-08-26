export class DrawHand {

    constructor(ctx) {
        this.ctx = ctx;
        this.lineWidth = 2;
        this.pointRadius = 5;
    }

    clear() {
        this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    }

    drawGesture(gesture, pos) {
        this.clear();
        if (!gesture || !pos) return;

        const ctx = this.ctx;

        ctx.font = "bold 80px Arial";
        ctx.fillStyle = "#00AA90";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        ctx.fillText(`${gesture}`, pos[0], pos[1]);
    }

}