const DEFAULT_INSTRUMENTS = [
    "acoustic_guitar_nylon",
    "acoustic_guitar_steel",
    "electric_guitar_clean",
];

const ROOTS = {
    C: 0, "C#": 1, D: 2, "D#": 3, E: 4, F: 5,
    "F#": 6, G: 7, "G#": 8, A: 9, "A#": 10, B: 11,
};

const CHORD_INTERVALS = {
    "": [0, 4, 7],
    m: [0, 3, 7],
    dim: [0, 3, 6],
};

export class GuitarSound extends EventTarget {
    constructor({
        instruments = DEFAULT_INSTRUMENTS,
        instrumentID = 0,
        soundfont = "FluidR3_GM",
        tuning = [40, 45, 50, 55, 59, 64],
    } = {}) {
        super();
        // Sound
        this.instruments = instruments;
        this.instrumentID = instrumentID;
        this.soundfont = soundfont;
        this.tuning = tuning;
        this.audioContext = null;
        this.soundSample = null;
        // Guitar
        this.guitarChord = [];
        this.pluckNotes = [];
        this.capo = 0;
        // Gesture
        this.prevGesture = null;
        this.prevPluck = [];
        this.prevWristX = null;
        this.prevAction = null;
    }

    async loadSamples(instrumentIndex = this.instrumentID) {
        if (!globalThis.Soundfont) {
            throw new Error("Soundfont Player 尚未載入。");
        }

        const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext;
        if (!AudioContextClass) {
            throw new Error("此瀏覽器不支援 Web Audio API。");
        }

        this.audioContext ??= new AudioContextClass();
        if (this.audioContext.state === "suspended") {
            await this.audioContext.resume();
        }

        this.instrumentID = instrumentIndex;
        const instrument = this.instruments[instrumentIndex] ?? this.instruments[0];
        this.soundSample = await globalThis.Soundfont.instrument(this.audioContext, instrument, {
            soundfont: this.soundfont,
        });
        return this.soundSample;
    }

    buildGuitarChord(gesture) {
        if (typeof gesture !== "string" || !gesture || ROOTS[gesture[0]] === undefined) {
            this.guitarChord = [];
            this.pluckNotes = [];
            return [];
        }
        if (this.prevGesture == gesture) {
            return;
        }
        this.prevGesture = gesture;
        const root = gesture[0];
        const intervals = CHORD_INTERVALS[gesture.slice(1)];
        if (!intervals) return [];

        const chord = intervals.map((interval) => (interval + ROOTS[root]) % 12);
        let foundRoot = false;
        this.guitarChord = [];

        for (const openNote of this.tuning) {
            const closest = Math.min(...chord.map((value) => {
                const difference = value - (openNote % 12);
                return (difference < 0 ? difference + 12 : difference) + openNote;
            }));

            if (closest % 12 === ROOTS[root]) foundRoot = true;
            if (foundRoot) this.guitarChord.push(closest);
        }

        this.pluckNotes = [
            this.guitarChord[0],
            this.guitarChord.at(-3),
            this.guitarChord.at(-2),
            this.guitarChord.at(-1),
        ].filter(Number.isFinite);


    }

    async plucking(fingerBend) {

        if (!this.soundSample || !this.prevAction) return;

        const picks = fingerBend.map(([pick]) => pick);

        // 沒有手指 → 視為全部釋放
        if (picks.length === 0) {
            this.prevPluck = [];
            return;
        }

        // 只有拇指
        if (picks.length === 1 && picks[0] === 4) {
            this.prevPluck = picks;
            return;
        }

        // 找出新出現的手指
        const diffPluck = fingerBend.filter(([pick]) => !this.prevPluck.includes(pick));

        // 播放新出現的手指
        for (const [stringIndex, velocity] of diffPluck) {

            if (stringIndex === 4) continue;

            const midi = this.pluckNotes[stringIndex];

            if (!Number.isFinite(midi)) continue;


            this.dispatchEvent(new CustomEvent("noteOn", {
                detail: {
                    stringIndex,
                    midi,
                }
            }));

            this.soundSample.play(
                midi + this.capo,
                this.audioContext.currentTime,
                {
                    gain: this.mapRange(
                        velocity,
                        0,
                        127,
                        0,
                        3
                    ),
                    duration: 1.5
                }
            );
        }

        // 更新目前按下的手指
        this.prevPluck = picks;
    }

    async strumming(hand) {
        if (!this.soundSample || this.guitarChord.length === 0) return;

        if (!hand || hand.length === 0) {
            this.prevWristX = null;
            this.prevAction = null;
            return;
        }

        const wristX = hand[0][0];

        if (this.prevWristX === null) {
            this.prevWristX = wristX;
            return;
        }

        const movement = wristX - this.prevWristX;
        this.prevWristX = wristX;

        const threshold = 10;
        let action = null;

        if (movement > threshold) {
            action = "Dn";
        } else if (movement < -threshold) {
            action = "Up";
        }

        if (action === null || action === this.prevAction) return;
        this.prevAction = action;

        const duration = this.mapRange(Math.abs(movement), threshold, 150, 125, 1);

        const notes = action === "Up"
            ? [...this.guitarChord].reverse()
            : this.guitarChord;

        const interval = Math.max(
            1,
            Math.floor(duration * 4 / notes.length)
        );

        for (const note of notes) {
            this.soundSample.play(
                note + this.capo,
                this.audioContext.currentTime,
                {
                    gain: 4,
                    duration: 1
                }
            );

            await new Promise(resolve =>
                setTimeout(resolve, interval)
            );
        }
    }

    mapRange(value, inputMin, inputMax, outputMin, outputMax) {
        if (inputMin === inputMax) return (outputMin + outputMax) / 2;
        const clamped = Math.max(inputMin, Math.min(value, inputMax));
        return outputMin + (clamped - inputMin) / (inputMax - inputMin) * (outputMax - outputMin);
    }
}
