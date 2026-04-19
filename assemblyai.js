const ASSEMBLYAI_API_KEY = CONFIG.ASSEMBLYAI_API_KEY;
const SAMPLE_RATE = 16000;

let socket;
let audioContext;
let micSource;
let processor;
let isStreaming = false;
let assemblyStatus = 'disconnected';

function startAssemblyAI(onTranscript) {
    if (isStreaming) return;

    audioContext = getAudioContext();

    assemblyStatus = 'connecting';

    socket = new WebSocket(
        `wss://streaming.assemblyai.com/v3/ws` +
        `?speech_model=universal-streaming` +
        `&encoding=pcm_s16le` +
        `&sample_rate=${SAMPLE_RATE}` +
        `&token=${ASSEMBLYAI_API_KEY}`
    );

    socket.onopen = () => {
        console.log('AssemblyAI connected');
        assemblyStatus = 'connected';
        isStreaming = true;
        startMicCapture(onTranscript);
    };

    socket.onmessage = (msg) => {
        const data = JSON.parse(msg.data);
        if (data.type === 'Turn' && data.end_of_turn === true && data.transcript.trim() !== '') {
            onTranscript(data.transcript);
        }
    };

    socket.onerror = (e) => {
        console.error('AssemblyAI error:', e);
        assemblyStatus = 'error';
    };

    socket.onclose = (event) => {
        console.log('AssemblyAI disconnected — code:', event.code, 'reason:', event.reason);
        assemblyStatus = 'disconnected';
        isStreaming = false;
    };
}

function stopAssemblyAI() {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'Terminate' }));
    }
    if (processor) {
        processor.disconnect();
        processor = null;
    }
    if (micSource) {
        micSource.disconnect();
        micSource = null;
    }
    if (socket) {
        socket.close();
        socket = null;
    }
    isStreaming = false;
    assemblyStatus = 'disconnected';
}

function startMicCapture(onTranscript) {
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
        micSource = audioContext.createMediaStreamSource(stream);

        processor = audioContext.createScriptProcessor(4096, 1, 1);
        micSource.connect(processor);

        // Deliberately not connecting processor to destination
        // — we only want to capture audio, not play it back
        processor.connect(audioContext.destination);

        processor.onaudioprocess = (e) => {
            if (!socket || socket.readyState !== WebSocket.OPEN) return;
            const float32 = e.inputBuffer.getChannelData(0);
            const int16 = convertFloat32ToInt16(float32);
            socket.send(int16.buffer);
        };
    }).catch((err) => {
        console.error('Mic access error:', err);
        assemblyStatus = 'error';
    });
}

function convertFloat32ToInt16(buffer) {
    const int16 = new Int16Array(buffer.length);
    for (let i = 0; i < buffer.length; i++) {
        int16[i] = Math.max(-32768, Math.min(32767, buffer[i] * 32768));
    }
    return int16;
}