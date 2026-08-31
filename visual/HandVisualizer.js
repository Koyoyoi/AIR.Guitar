import { fingerAngle } from "../models/HandFeature.js";

export class HandVisualizer {
    constructor(video) {
        this.hand = null;
        this.canvas = document.querySelector("#canvas");
        this.ctx = this.canvas.getContext("2d");
        this.strings = [];
        this.plucks = [];
        this.strums = [];
        this.particles = [];
        this.prevPinch = { Left: false, Right: false };
        this.prevBend = { Left: false, Right: false };
        this.waveState = {
            Left: { side: null, next: 1, lastTrigger: 0 },
            Right: { side: null, next: 1, lastTrigger: 0 }
        };
        this.prevPluck = [];
        this.NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
        this.triggered = false;
        this.triggeredHand = null;
        this.lastTriggerTime = { Left: 0, Right: 0 };
        this.triggerCooldown = 180;
        this.resize(video);
    }

    resize(video) {
        if (!video?.videoWidth || !video?.videoHeight) return;
        this.canvas.width = video.videoWidth;
        this.canvas.height = video.videoHeight;
    }

    setHand(hand) {
        this.hand = hand;
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.globalAlpha = 1;
        this.ctx.shadowBlur = 0;
        this.ctx.lineWidth = 1;
    }

    draw() {
        this.drawStrings();
        this.drawStrums();
        this.drawParticles();
    }

    drawGesture(gesture, capo, pos) {
        if (!gesture || !pos) return;
        const root = gesture[0];
        const suffix = gesture.slice(1);
        const index = this.NOTE_NAMES.indexOf(root);
        if (index < 0) return;
        const note = this.NOTE_NAMES[(index + capo + 12) % 12];
        this.ctx.save();
        this.ctx.font = "bold 80px Arial";
        this.ctx.fillStyle = "#00AA90";
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
        this.ctx.shadowBlur = 18;
        this.ctx.shadowColor = "#00AA90";
        this.ctx.fillText(`${note}${suffix}`, pos[0], pos[1]);
        this.ctx.restore();
    }

    drawNote(note, prePluck) {
        if (!note || !this.hand?.Right) return;
        const fingertips = [4, 8, 12, 16];
        this.ctx.save();
        this.ctx.font = "bold 40px Arial";
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
        for (let i = 0; i < 4; i++) {
            const point = this.hand.Right[fingertips[i]];
            if (!point || note[i] === undefined) continue;
            const midi = note[i];
            const name = this.NOTE_NAMES[((midi % 12) + 12) % 12];
            const octave = Math.floor(midi / 12) - 1;
            const active = prePluck?.includes(i);
            this.ctx.fillStyle = active ? "#D0104C" : "#00AA90";
            this.ctx.shadowBlur = active ? 14 : 8;
            this.ctx.shadowColor = this.ctx.fillStyle;
            this.ctx.fillText(`${name}${octave}`, point[0], point[1]);
        }
        this.ctx.restore();
        this.prevPluck = prePluck?.slice() ?? [];
    }

    connectSound(guitarSound) {
        guitarSound.addEventListener("noteOn", ({ detail }) => {
            if (!detail) return;
            const hand = this.hand?.Right;
            if (!hand) return;
            if (detail.type === "pluck") {
                const point = hand[[4, 8, 12, 16][detail.stringIndex]];
                if (!point) return;
                const velocity = detail.velocity ?? 1;
                this.addPluck(point[0], point[1], detail.midi, velocity, detail.stringIndex);
                this.addString(point[1], detail.midi, velocity);
                return;
            }
            if (detail.type === "strum") {
                const base = hand[11];
                if (!base) return;
                let index = detail.stringIndex;
                if (detail.direction === "Up") index = 5 - index;
                const y = base[1] + index * 35;
                const velocity = detail.velocity ?? 1;
                this.addStrum(base[0], y, detail.midi, detail.direction, velocity);
                this.addString(y, detail.midi, velocity);
            }
        });
    }

    addPluck(x, y, midi, velocity = 1, stringIndex = 0) {
        const color = this.noteToColor(midi);
        this.plucks.push({ x, y, midi, velocity, stringIndex, color, startTime: performance.now(), duration: 250 });
        this.spawnParticles(x, y, color, 8 + Math.floor(velocity * 6));
    }

    addStrum(x, y, midi, direction = "Down", velocity = 1) {
        const color = this.noteToColor(midi);
        this.strums.push({ x, y, midi, velocity, direction, color, startTime: performance.now(), duration: 380 });
        this.spawnParticles(x, y, color, 14 + Math.floor(velocity * 8));
    }

    drawStrums() {
        const now = performance.now();
        this.strums = this.strums.filter(strum => {
            const elapsed = now - strum.startTime;
            if (elapsed >= strum.duration) return false;
            const progress = elapsed / strum.duration;
            const fade = 1 - progress;
            const direction = strum.direction === "Up" ? -1 : 1;
            const y = strum.y + direction * progress * 170;
            const width = 70 + progress * 120;
            this.ctx.save();
            this.ctx.globalAlpha = fade;
            this.ctx.strokeStyle = strum.color;
            this.ctx.lineWidth = 6 + strum.velocity * 4;
            this.ctx.shadowBlur = 18;
            this.ctx.shadowColor = strum.color;
            this.ctx.lineCap = "round";
            this.ctx.beginPath();
            this.ctx.moveTo(strum.x - width, y);
            this.ctx.lineTo(strum.x + width, y);
            this.ctx.stroke();
            this.ctx.globalAlpha = fade * 0.55;
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(strum.x - width, y - 12);
            this.ctx.lineTo(strum.x + width, y - 12);
            this.ctx.stroke();
            this.ctx.beginPath();
            this.ctx.moveTo(strum.x - width, y + 12);
            this.ctx.lineTo(strum.x + width, y + 12);
            this.ctx.stroke();
            this.ctx.globalAlpha = fade;
            this.ctx.lineWidth = 5;
            const arrowX = strum.x + width;
            this.ctx.beginPath();
            this.ctx.moveTo(arrowX, y);
            this.ctx.lineTo(arrowX - 24, y - direction * 18);
            this.ctx.moveTo(arrowX, y);
            this.ctx.lineTo(arrowX - 24, y + direction * 18);
            this.ctx.stroke();
            this.ctx.restore();
            return true;
        });
    }

    addString(y, midi, velocity = 1) {
        this.strings.push({ y, midi, velocity, startTime: performance.now(), duration: 500, amplitude: 2 + velocity * 2.5, frequency: 0.055 });
    }

    drawStrings() {
        const width = this.ctx.canvas.width;
        const now = performance.now();
        this.strings = this.strings.filter(string => {
            const elapsed = now - string.startTime;
            if (elapsed >= string.duration) return false;
            const progress = elapsed / string.duration;
            const fade = 1 - progress;
            const amplitude = string.amplitude * fade;
            const envelope = Math.sin(Math.PI * progress);
            const color = this.noteToColor(string.midi);
            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.strokeStyle = color;
            this.ctx.globalAlpha = fade * 0.75;
            this.ctx.lineWidth = 3 + string.velocity * 1.5;
            this.ctx.shadowBlur = 8;
            this.ctx.shadowColor = color;
            for (let i = 0; i <= 60; i++) {
                const t = i / 60;
                const x = width * t;
                const y = string.y + Math.sin(t * Math.PI * 6 + elapsed * string.frequency) * amplitude * envelope;
                if (i === 0) this.ctx.moveTo(x, y);
                else this.ctx.lineTo(x, y);
            }
            this.ctx.stroke();
            this.ctx.restore();
            return true;
        });
    }

    spawnParticles(x, y, color, count = 10) {
        const now = performance.now();
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 4;
            this.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, size: 2 + Math.random() * 4, color, startTime: now, duration: 350 + Math.random() * 250 });
        }
    }

    drawParticles() {
        const now = performance.now();
        this.particles = this.particles.filter(particle => {
            const elapsed = now - particle.startTime;
            if (elapsed >= particle.duration) return false;
            const fade = 1 - elapsed / particle.duration;
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.vx *= 0.97;
            particle.vy *= 0.97;
            this.ctx.save();
            this.ctx.globalAlpha = fade;
            this.ctx.fillStyle = particle.color;
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = particle.color;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size * fade, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
            return true;
        });
    }

    bending(hands) {
        this.triggered = false;
        this.triggeredHand = null;
        for (const side of ["Left", "Right"]) {
            const hand = hands?.[side];
            if (!hand || hand.length < 21) {
                this.prevBend[side] = false;
                continue;
            }
            const tip = hand[8];
            if (!tip) continue;
            const indexAngle = fingerAngle(hand)?.[1] ?? 0;
            const bend = Math.max(0, Math.min(1, (indexAngle - 20) / 60));
            const isBent = bend > 0.35;
            if (isBent && !this.prevBend[side] && this.canTrigger(side)) {
                this.triggered = true;
                this.triggeredHand = side;
            }
            this.prevBend[side] = isBent;
            this.drawBendFinger(tip, bend);
        }
        this.ctx.globalAlpha = 1;
    }

    drawBendFinger(tip, bend) {
        if (!tip) return;
        const intensity = Math.max(0.15, bend);
        const color = this.mixColor("#BDC0BA", "#FEBB24", intensity);
        const radius = 9 + bend * 13;
        this.ctx.save();
        this.ctx.fillStyle = color;
        this.ctx.strokeStyle = color;
        this.ctx.shadowColor = color;
        this.ctx.shadowBlur = 6 + bend * 20;
        this.ctx.globalAlpha = 0.3 + bend * 0.55;
        this.ctx.beginPath();
        this.ctx.arc(tip[0], tip[1], radius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.globalAlpha = 0.3 + bend * 0.5;
        this.ctx.lineWidth = 2 + bend * 4;
        this.ctx.beginPath();
        this.ctx.arc(tip[0], tip[1], radius + 7 + bend * 9, -Math.PI * 0.8, Math.PI * 0.8);
        this.ctx.stroke();
        if (bend > 0.15) {
            this.ctx.globalAlpha = bend * 0.5;
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(tip[0], tip[1], radius + 17 + bend * 12, -Math.PI * 0.65, Math.PI * 0.65);
            this.ctx.stroke();
        }
        this.ctx.restore();
    }

    pinching(hands) {
        this.triggered = false;
        this.triggeredHand = null;
        for (const side of ["Left", "Right"]) {
            const hand = hands?.[side];
            if (!hand || hand.length < 21) {
                this.prevPinch[side] = false;
                continue;
            }
            const thumb = hand[4];
            const index = hand[8];
            if (!thumb || !index) continue;
            const distance = Math.hypot(thumb[0] - index[0], thumb[1] - index[1]);
            const pinchProgress = Math.max(0, Math.min(1, 1 - distance / 85));
            const isPinching = distance < 50;
            const bend = Math.max(0, Math.min(1, ((fingerAngle(hand)?.[0] ?? 0) - 20) / 60));
            const intensity = Math.max(pinchProgress, bend * 0.75, isPinching ? 1 : 0);
            const color = this.mixColor("#BDC0BA", "#FEBB24", intensity);
            if (isPinching && !this.prevPinch[side] && this.canTrigger(side)) {
                this.triggered = true;
                this.triggeredHand = side;
                this.spawnParticles((thumb[0] + index[0]) / 2, (thumb[1] + index[1]) / 2, "#FEBB24", 8);
            }
            this.prevPinch[side] = isPinching;
            this.ctx.save();
            this.ctx.lineCap = "round";
            this.ctx.strokeStyle = color;
            this.ctx.fillStyle = color;
            this.ctx.shadowColor = color;
            this.ctx.globalAlpha = 0.35 + intensity * 0.45;
            this.ctx.lineWidth = 3 + bend * 4;
            this.ctx.shadowBlur = 8 + bend * 18;
            this.ctx.beginPath();
            this.ctx.arc(index[0], index[1], 9 + bend * 10, 0, Math.PI * 2);
            this.ctx.stroke();
            if (bend > 0.05) {
                this.ctx.globalAlpha = 0.15 + bend * 0.45;
                this.ctx.lineWidth = 2 + bend * 3;
                this.ctx.beginPath();
                this.ctx.arc(index[0], index[1], 18 + bend * 14, -Math.PI * 0.8, Math.PI * 0.8);
                this.ctx.stroke();
            }
            this.ctx.globalAlpha = 0.3 + intensity * 0.5;
            this.ctx.lineWidth = 3 + pinchProgress * 3;
            this.ctx.beginPath();
            this.ctx.arc(thumb[0], thumb[1], 8 + pinchProgress * 7, 0, Math.PI * 2);
            this.ctx.stroke();
            this.ctx.globalAlpha = 0.15 + pinchProgress * 0.7;
            this.ctx.lineWidth = 2 + pinchProgress * 4;
            this.ctx.beginPath();
            this.ctx.moveTo(thumb[0], thumb[1]);
            this.ctx.lineTo(index[0], index[1]);
            this.ctx.stroke();
            if (pinchProgress > 0.08) {
                const centerX = (thumb[0] + index[0]) / 2;
                const centerY = (thumb[1] + index[1]) / 2;
                const radius = 10 + pinchProgress * 16;
                this.ctx.globalAlpha = 0.2 + pinchProgress * 0.65;
                this.ctx.lineWidth = 2 + pinchProgress * 3;
                this.ctx.beginPath();
                this.ctx.arc(centerX, centerY, radius, -Math.PI / 2, -Math.PI / 2 + pinchProgress * Math.PI * 2);
                this.ctx.stroke();
            }
            if (isPinching) {
                const centerX = (thumb[0] + index[0]) / 2;
                const centerY = (thumb[1] + index[1]) / 2;
                this.ctx.globalAlpha = 0.95;
                this.ctx.fillStyle = "#FEBB24";
                this.ctx.shadowBlur = 20;
                this.ctx.beginPath();
                this.ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
                this.ctx.fill();
            }
            this.ctx.restore();
        }
        this.ctx.globalAlpha = 1;
    }

    waving(hands) {
        const now = performance.now();
        const centerX = this.canvas.width / 2;
        const deadZone = this.canvas.width * 0.06;
        const cooldown = 350;
        this.triggered = false;
        this.triggeredHand = null;

        for (const side of ["Left", "Right"]) {
            const hand = hands?.[side];
            const state = this.waveState[side];

            if (!hand || hand.length < 21) {
                state.side = null;
                continue;
            }

            let palmX = 0;
            let palmY = 0;
            let validPoints = 0;

            for (const index of [0, 5, 9, 13, 17]) {
                if (!hand[index]) continue;
                palmX += hand[index][0];
                palmY += hand[index][1];
                validPoints++;
            }

            if (!validPoints) continue;
            palmX /= validPoints;
            palmY /= validPoints;

            const currentSide = palmX < centerX - deadZone ? -1 : palmX > centerX + deadZone ? 1 : 0;

            if (state.side === null) {
                if (currentSide !== 0) state.side = currentSide;
            } else if (currentSide !== 0 && currentSide !== state.side) {
                if (currentSide === state.next && now - state.lastTrigger >= cooldown) {
                    state.lastTrigger = now;
                    if (this.canTrigger(side)) {
                        this.triggered = true;
                        this.triggeredHand = side;
                    }
                    state.next *= -1;
                }
                state.side = currentSide;
            }

            this.drawWaveDirection(state.next, palmY, palmX, centerX);
        }

        this.ctx.globalAlpha = 1;
    }

    drawWaveDirection(direction, palmY, palmX, centerX) {
        if (!direction) return;
        const distance = Math.abs(palmX - centerX);
        const proximity = 1 - Math.min(distance / (this.canvas.width * 0.35), 1);
        const intensity = Math.max(0.12, proximity);
        const color = this.mixColor("#BDC0BA", "#FEBB24", intensity);
        const y = Math.max(35, Math.min(this.canvas.height - 35, palmY));
        const arrowSize = 24 + intensity * 14;
        const lineLength = 50 + intensity * 45;
        const arrowX = centerX + direction * lineLength;

        this.ctx.save();
        this.ctx.strokeStyle = color;
        this.ctx.fillStyle = color;
        this.ctx.lineCap = "round";
        this.ctx.lineJoin = "round";
        this.ctx.shadowColor = color;
        this.ctx.shadowBlur = 4 + intensity * 14;
        this.ctx.globalAlpha = 0.25 + intensity * 0.5;
        this.ctx.lineWidth = 2 + intensity * 2;
        this.ctx.beginPath();
        this.ctx.moveTo(centerX - direction * lineLength, y);
        this.ctx.lineTo(arrowX, y);
        this.ctx.stroke();
        this.ctx.globalAlpha = 0.45 + intensity * 0.5;
        this.ctx.lineWidth = 3 + intensity * 3;
        this.ctx.beginPath();
        this.ctx.moveTo(arrowX, y);
        this.ctx.lineTo(arrowX - direction * arrowSize, y - arrowSize * 0.55);
        this.ctx.moveTo(arrowX, y);
        this.ctx.lineTo(arrowX - direction * arrowSize, y + arrowSize * 0.55);
        this.ctx.stroke();
        this.ctx.globalAlpha = 0.4 + intensity * 0.5;
        this.ctx.beginPath();
        this.ctx.arc(centerX, y, 4 + intensity * 3, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();
    }

    mixColor(start, end, amount) {
        const a = this.hexToRgb(start);
        const b = this.hexToRgb(end);
        return `rgb(${Math.round(a.r + (b.r - a.r) * amount)}, ${Math.round(a.g + (b.g - a.g) * amount)}, ${Math.round(a.b + (b.b - a.b) * amount)})`;
    }

    hexToRgb(hex) {
        const value = hex.replace("#", "");
        return {
            r: parseInt(value.substring(0, 2), 16),
            g: parseInt(value.substring(2, 4), 16),
            b: parseInt(value.substring(4, 6), 16)
        };
    }

    noteToColor(midi) {
        const colors = ["#B5495B", "#C46243", "#F7C242", "#91AD70", "#86C166", "#2D6D48", "#6699A1", "#58B2DC", "#6E75A4", "#70649A", "#574C57", "#B481BB"];
        return colors[((midi % 12) + 12) % 12];
    }

    canTrigger(side) {
        const now = performance.now();
        if (now - this.lastTriggerTime[side] < this.triggerCooldown) return false;
        this.lastTriggerTime[side] = now;
        return true;
    }
}