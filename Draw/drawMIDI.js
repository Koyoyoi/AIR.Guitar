// 繪製整個 MIDI 音符序列的動畫
export async function draw_midiAnimation() {
    if (!noteSequence || noteSequence.length == 0) {
        console.warn("⚠️ 沒有 MIDI 音符可顯示！");
        return;
    }
    console.log(noteSequence)

    const startTime = performance.now(); // 動畫起始時間
    const pixelsPerSecond = 100; // 控制滑動速度

    const currentTime = audioContext.currentTime;

    // 播放所有音符
    noteSequence.forEach(note => {
        soundSample.play(
            note.pitch,
            currentTime + note.start,  // 延後播放
            { velocity: note.v, duration: note.end - note.start }
        );
    });

    function drawFrame(now) {
        const elapsed = (now - startTime) / 1000; // 已過時間（秒）
        midiCtx.clearRect(0, 0, midiCanvas.width, midiCanvas.height); // 清除畫布

        // 畫出音符
        noteSequence.forEach(note => {
            if (elapsed >= note.start) {
                note.x = canvas.width - (elapsed - note.start) * pixelsPerSecond;

                const area = {
                    x: note.x - (note.w * 100) / 2,
                    y: note.y,
                    w: note.w * 100,
                    h: note.h
                };

                drawCircle(area, "#EE9A9A"); // 使用圓形來表示音符
            }
        });

        const endTime = Math.max(...noteSequence.map(n => n.end));
        if (elapsed < endTime + 2) {
            requestAnimationFrame(drawFrame); // 繼續播放動畫
        } else {
            midiCtx.clearRect(0, 0, midiCanvas.width, midiCanvas.height); // 停止動畫並清除畫布
            console.log("✅ 動畫播放完畢");
            reset(); // 重置
        }
    }

    requestAnimationFrame(drawFrame); // 開始動畫
}

// 繪製單個音符的動畫
export async function draw_singleNote(note, velocity, duration) {
    const startTime = performance.now(); // 動畫起始時間
    const pixelsPerSecond = 100; // 控制滑動速度

    // 單一音符資料
    const noteData = {
        pitch: note,
        v: velocity,
        start: 0, // 假設音符從 0 秒開始
        end: duration, // 音符的持續時間
        x: canvas.width, // 起始 X 座標（畫面右側）
        y: mapRange(note, 24, 96, video.videoHeight, 0), // 根據音符映射計算 Y 位置
        w: duration * pixelsPerSecond, // 計算音符的寬度
        h: 15 // 設定音符的高度
    };

    const currentTime = audioContext.currentTime;

    // 播放單個音符
    soundSample.play(
        noteData.pitch,
        currentTime + noteData.start, // 延後播放
        { velocity: noteData.v, duration: noteData.end - noteData.start }
    );

    function drawFrame(now) {
        const elapsed = (now - startTime) / 1000; // 計算經過的時間

        // 清除畫布
        midiCtx.clearRect(0, 0, midiCanvas.width, midiCanvas.height);

        if (elapsed >= noteData.start) {
            // 計算 X 位置，從畫布右側開始移動
            noteData.x = canvas.width - (elapsed - noteData.start) * pixelsPerSecond;

            // 使用圓形繪製音符
            const area = {
                x: noteData.x - noteData.w / 2,
                y: noteData.y,
                w: noteData.w,
                h: noteData.h
            };

            drawCircle(area, "#EE9A9A"); // 繪製圓形
        }

        if (elapsed < noteData.end + 2) {
            requestAnimationFrame(drawFrame); // 繼續繪製動畫
        } else {
            midiCtx.clearRect(0, 0, midiCanvas.width, midiCanvas.height); // 停止並清除畫布
            console.log("✅ 動畫播放完畢");
        }
    }

    requestAnimationFrame(drawFrame); // 開始動畫
}
