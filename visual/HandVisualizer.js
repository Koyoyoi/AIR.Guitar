import { fingerAngle } from "../models/HandFeature.js"

export class HandVisualizer {

    constructor(video) {
        this.hand = null;
        this.canvas = document.querySelector("#canvas");
        this.ctx = this.canvas.getContext("2d");
        this.strings = [];

        this.prevPinch = { Left: false, Right: false };
        this.prevBend = { Left: false, Right: false };
        this.prevWave = { Left: false, Right: false };

        this.NOTE_NAMES = [
            "C", "C#", "D", "D#", "E", "F",
            "F#", "G", "G#", "A", "A#", "B"
        ];

        this.resize(video);
    }

    resize(video) {
        this.canvas.width = video.videoWidth;
        this.canvas.height = video.videoHeight;
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

    bending(hands) {
        const ctx = this.ctx;
        let triggered = false;

        for (const side of ["Left", "Right"]) {
            const hand = hands?.[side];

            if (!hand || hand.length < 21) {
                this.prevBend[side] = false;
                continue;
            }

            const angles = fingerAngle(hand);
            const isBent = angles[1] > 60;
            const tip = hand[8];

            ctx.fillStyle = isBent ? "#FEBB24" : "#BDC0BA";
            ctx.globalAlpha = 0.75;
            ctx.beginPath();
            ctx.arc(tip[0], tip[1], 15, 0, Math.PI * 2);
            ctx.fill();

            // 伸直 → 彎曲
            if (isBent && !this.prevBend[side] && !triggered) {
                console.log("noteOn");
                triggered = true;
            }

            this.prevBend[side] = isBent;
        }

        ctx.globalAlpha = 1;
    }

    pinching(hands) {
        const ctx = this.ctx;
        const offsetX = 0;

        for (const side of ["Left", "Right"]) {
            const hand = hands?.[side];
            if (!hand || hand.length < 21) continue;

            const thumb = hand[4];
            const index = hand[8];

            const distance = Math.hypot(thumb[0] - index[0], thumb[1] - index[1]);

            const isPinching = distance < 50;

            // Pinch 狀態改變
            if (isPinching !== this.prevPinch[side]) {
                this.prevPinch[side] = isPinching;

                if (isPinching) {
                    console.log("noteOn");
                }
            }

            ctx.globalAlpha = 0.75;
            ctx.fillStyle = this.prevPinch[side] ? "#FEBB24" : "#BDC0BA";

            ctx.beginPath();
            ctx.arc(thumb[0] + offsetX, thumb[1] - offsetX, 15, 0, Math.PI * 2);
            ctx.fill();

            ctx.beginPath();
            ctx.arc(index[0] + offsetX, index[1] - offsetX, 15, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.globalAlpha = 1;
    }

    waving(hands) {
        const ctx = this.ctx;
        const palmPoints = [0, 5, 9, 13, 17];

        const centerX = this.canvas.width / 2;
        const fadeDistance = this.canvas.width * 0.25;

        for (const side of ["Left", "Right"]) {
            const hand = hands?.[side];
            if (!hand || hand.length < 21) continue;

            let palmX = 0;
            let palmY = 0;

            for (const index of palmPoints) {
                palmX += hand[index][0];
                palmY += hand[index][1];
            }

            palmX /= palmPoints.length;
            palmY /= palmPoints.length;

            // 第一次偵測
            if (this.prevWave[side] === undefined) {
                this.prevWave[side] = palmX;
            }

            const prevX = this.prevWave[side];

            // 跨過中線
            const crossCenter = (prevX < centerX && palmX >= centerX) || (prevX > centerX && palmX <= centerX);

            if (crossCenter) {
                console.log("noteOn");
            }

            this.prevWave[side] = palmX;

            // 距離中線
            const distance = Math.abs(palmX - centerX);

            // 漸變
            const progress = Math.min(distance / fadeDistance, 1);

            const start = [189, 192, 186];
            const end = [254, 187, 36];

            const r = Math.round(start[0] + (end[0] - start[0]) * progress);
            const g = Math.round(start[1] + (end[1] - start[1]) * progress);
            const b = Math.round(start[2] + (end[2] - start[2]) * progress);

            ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
            ctx.globalAlpha = 0.75;

            ctx.beginPath();
            ctx.arc(palmX, palmY, 30, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.globalAlpha = 1;
    }
}