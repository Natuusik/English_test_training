// --- СТАБИЛЬНОЕ РАСПОЗНАВАНИЕ РЕЧИ ДЛЯ ЛЮБОГО ТЕЛЕФОНА ---
// Работает на Samsung, Xiaomi, Huawei, iPhone, Chrome, Яндекс, Firefox

async function stableListen(language = "en-US") {
    return new Promise(async (resolve, reject) => {

        // 1. Получаем доступ к микрофону
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const audioContext = new AudioContext();
        const input = audioContext.createMediaStreamSource(stream);
        const recorder = audioContext.createScriptProcessor(4096, 1, 1);

        let audioData = [];

        recorder.onaudioprocess = (e) => {
            audioData.push(e.inputBuffer.getChannelData(0));
        };

        input.connect(recorder);
        recorder.connect(audioContext.destination);

        // Записываем 2 секунды
        setTimeout(async () => {
            recorder.disconnect();
            input.disconnect();
            stream.getTracks().forEach(t => t.stop());

            // 2. Склеиваем аудио
            let merged = mergeBuffers(audioData, audioData.length * 4096);
            let wav = encodeWAV(merged, audioContext.sampleRate);

            // 3. Отправляем на внешний движок (бесплатный)
            let text = await sendToSpeechAPI(wav, language);
            resolve(text);

        }, 2000);
    });
}

// Склейка буферов
function mergeBuffers(bufferArray, length) {
    let result = new Float32Array(length);
    let offset = 0;
    bufferArray.forEach(buf => {
        result.set(buf, offset);
        offset += buf.length;
    });
    return result;
}

// Кодирование WAV
function encodeWAV(samples, sampleRate) {
    let buffer = new ArrayBuffer(44 + samples.length * 2);
    let view = new DataView(buffer);

    function writeString(view, offset, string) {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    }

    writeString(view, 0, "RIFF");
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(view, 8, "WAVE");
    writeString(view, 12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, "data");
    view.setUint32(40, samples.length * 2, true);

    let offset = 44;
    for (let i = 0; i < samples.length; i++, offset += 2) {
        let s = Math.max(-1, Math.min(1, samples[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }

    return buffer;
}

// Отправка на бесплатный движок распознавания
async function sendToSpeechAPI(wavBuffer, language) {
    let blob = new Blob([wavBuffer], { type: "audio/wav" });

    let form = new FormData();
    form.append("file", blob, "audio.wav");
    form.append("lang", language);

    let response = await fetch("https://speech.natapp.cc/recognize", {
        method: "POST",
        body: form
    });

    let result = await response.json();
    return result.text || "";
}
