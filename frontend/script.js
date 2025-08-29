document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element References ---
    const recordBtn = document.getElementById('recordBtn');
    const statusMessage = document.getElementById('statusMessage');
    const chatHistoryContainer = document.getElementById('chatHistoryContainer');
    const audioPlayer = document.createElement('audio');

    // Settings Modal Elements
    const settingsIcon = document.getElementById('settings-icon');
    const settingsModal = document.getElementById('settings-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const apiKeyForm = document.getElementById('api-key-form');

    // --- Global State ---
    let isRecording = false;
    let webSocket = null;
    let audioChunksPlayback = [];
    let stream, audioContextRecording, processor, source;
    let sessionId = null;

    // --- Initialization ---
    function initializeApp() {
        loadApiKeys();
        loadAndSetSessionId();
        checkKeysAndSetStatus();
        setupEventListeners();
        addMessage("Hello! I'm Kratosni. Click the mic and let's talk.", 'ai');
    }

    function setupEventListeners() {
        recordBtn.addEventListener('click', toggleRecording);
        settingsIcon.addEventListener('click', () => settingsModal.style.display = 'flex');
        closeModalBtn.addEventListener('click', () => settingsModal.style.display = 'none');
        apiKeyForm.addEventListener('submit', (e) => {
            e.preventDefault();
            saveApiKeys();
            settingsModal.style.display = 'none';
            checkKeysAndSetStatus();
        });
    }

    function loadAndSetSessionId() {
        sessionId = localStorage.getItem('kratosni_session_id');
        if (!sessionId) {
            sessionId = `kratosni_session_${Date.now()}`;
            localStorage.setItem('kratosni_session_id', sessionId);
        }
        console.log("Using Session ID:", sessionId);
    }


    // --- API Key Management ---
    function saveApiKeys() {
        localStorage.setItem('assemblyai_key', document.getElementById('assemblyai-key').value);
        localStorage.setItem('google_gemini_key', document.getElementById('google-gemini-key').value);
        localStorage.setItem('murf_ai_key', document.getElementById('murf-ai-key').value);
        localStorage.setItem('alpha_vantage_key', document.getElementById('alpha-vantage-key').value);
        localStorage.setItem('exchange_rate_key', document.getElementById('exchange-rate-key').value);
        alert("API Keys saved successfully!");
    }

    function loadApiKeys() {
        document.getElementById('assemblyai-key').value = localStorage.getItem('assemblyai_key') || '';
        document.getElementById('google-gemini-key').value = localStorage.getItem('google-gemini-key') || '';
        document.getElementById('murf-ai-key').value = localStorage.getItem('murf_ai_key') || '';
        document.getElementById('alpha-vantage-key').value = localStorage.getItem('alpha_vantage_key') || '';
        document.getElementById('exchange-rate-key').value = localStorage.getItem('exchange_rate_key') || '';
    }

    function getApiKeys() {
        return {
            assemblyai: localStorage.getItem('assemblyai_key'),
            google_gemini: localStorage.getItem('google_gemini_key'),
            murf_ai: localStorage.getItem('murf_ai_key'),
            alpha_vantage: localStorage.getItem('alpha_vantage_key'),
            exchange_rate: localStorage.getItem('exchange_rate_key'),
        };
    }

    function checkKeysAndSetStatus() {
        const keys = getApiKeys();
        if (!keys.assemblyai || !keys.google_gemini || !keys.murf_ai || !keys.alpha_vantage || !keys.exchange_rate) {
            recordBtn.disabled = true;
            statusMessage.textContent = "Please enter all API keys in Settings (⚙️)";
        } else {
            recordBtn.disabled = false;
            statusMessage.textContent = "Ready. Click the mic to start.";
        }
    }

    // --- Chat History & UI ---
    function addMessage(text, type) {
        const bubble = document.createElement('div');
        bubble.className = `chat-bubble ${type}-bubble`;
        bubble.textContent = text;
        chatHistoryContainer.appendChild(bubble);
        chatHistoryContainer.scrollTop = chatHistoryContainer.scrollHeight;
    }

    function updateLiveTranscript(text) {
        let liveBubble = chatHistoryContainer.querySelector('.user-bubble.live');
        if (!liveBubble) {
            liveBubble = document.createElement('div');
            liveBubble.className = 'chat-bubble user-bubble live';
            chatHistoryContainer.appendChild(liveBubble);
        }
        liveBubble.textContent = text;
        chatHistoryContainer.scrollTop = chatHistoryContainer.scrollHeight;
    }

    // --- WebSocket Logic ---
    function setupWebSocket() {
        return new Promise((resolve, reject) => {
            const keys = getApiKeys();
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const finalWsUrl = `${protocol}//${window.location.host}/ws?session_id=${sessionId}&assemblyai_key=${keys.assemblyai}&google_gemini_key=${keys.google_gemini}&murf_ai_key=${keys.murf_ai}&alpha_vantage_key=${keys.alpha_vantage}&exchange_rate_key=${keys.exchange_rate}`;

            webSocket = new WebSocket(finalWsUrl);
            webSocket.onopen = resolve;
            webSocket.onmessage = handleWebSocketMessage;
            webSocket.onerror = (error) => { console.error("WebSocket Error:", error); statusMessage.textContent = "Connection error."; reject(error); };
            webSocket.onclose = (event) => { 
                if (isRecording) { stopRecordingCleanup(); }
                statusMessage.textContent = event.reason || "Session finished. Click mic to start again.";
            };
        });
    }

    function handleWebSocketMessage(event) {
        const message = event.data;
        if (message.startsWith("AUDIO_CHUNK:")) {
            audioChunksPlayback.push(base64ToArrayBuffer(message.substring("AUDIO_CHUNK:".length)));
        } else if (message === "AUDIO_END") {
            playConcatenatedAudio();
        } else if (message.startsWith("AI_RESPONSE:")) {
            const liveBubble = chatHistoryContainer.querySelector('.user-bubble.live');
            if (liveBubble) {
                // Finalize the live transcript before showing AI response
                addMessage(liveBubble.textContent, 'user');
                liveBubble.remove();
            }
            const aiResponse = message.substring("AI_RESPONSE:".length);
            addMessage(aiResponse, 'ai');
            statusMessage.textContent = "Speaking...";
        } else if (message === "END_OF_TURN") {
            const liveBubble = chatHistoryContainer.querySelector('.user-bubble.live');
            if (liveBubble) {
                 // Finalize the bubble by creating a permanent copy
                addMessage(liveBubble.textContent, 'user');
                liveBubble.remove();
            }
            statusMessage.textContent = "Thinking...";
        } else {
            updateLiveTranscript(message);
        }
    }

    // --- Audio Playback Functions ---
    function base64ToArrayBuffer(base64) {
        const binaryString = window.atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    }

    function playConcatenatedAudio() {
        if (audioChunksPlayback.length === 0) return;
        const audioBlob = new Blob(audioChunksPlayback, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        audioPlayer.src = audioUrl;
        audioPlayer.play();
        audioPlayer.onended = () => {
            console.log("Playback finished.");
            URL.revokeObjectURL(audioUrl);
            audioChunksPlayback = [];
            statusMessage.textContent = "Ready. Click the mic to start.";
        };
    }

    // --- Recording Functions ---
    function toggleRecording() { isRecording ? stopRecording() : startRecording(); }

    function floatTo16BitPCM(input) {
        const buffer = new ArrayBuffer(input.length * 2);
        const view = new DataView(buffer);
        for (let i = 0; i < input.length; i++) {
            const s = Math.max(-1, Math.min(1, input[i]));
            view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        }
        return buffer;
    }

    async function startRecording() {
        if (isRecording) return;

        if (!audioPlayer.paused) {
            audioPlayer.pause();
            audioPlayer.currentTime = 0;
            console.log("Agent playback interrupted.");
        }

        isRecording = true;
        updateButtonUI(true);
        statusMessage.textContent = "Connecting...";

        try {
            await setupWebSocket();
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioContextRecording = new AudioContext({ sampleRate: 16000 });
            source = audioContextRecording.createMediaStreamSource(stream);
            processor = audioContextRecording.createScriptProcessor(4096, 1, 1);
            source.connect(processor);
            processor.connect(audioContextRecording.destination);
            processor.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);
                const pcmData = floatTo16BitPCM(inputData);
                if (webSocket && webSocket.readyState === WebSocket.OPEN) {
                    webSocket.send(pcmData);
                }
            };
        } catch (err) {
            console.error("Microphone or WebSocket error:", err);
            statusMessage.textContent = "Could not start recording.";
            stopRecordingCleanup();
        }
    }

    function stopRecording() {
        if (webSocket && webSocket.readyState === WebSocket.OPEN) {
            webSocket.close();
        }
        stopRecordingCleanup();
    }

    function stopRecordingCleanup() {
        if (processor) { processor.disconnect(); processor.onaudioprocess = null; }
        if (source) source.disconnect();
        if (audioContextRecording) audioContextRecording.close();
        if (stream) { stream.getTracks().forEach(track => track.stop()); }
        isRecording = false;
        updateButtonUI(false);
    }

    function updateButtonUI(recording) {
        const icon = recordBtn.querySelector('.icon');
        if (recording) {
            recordBtn.classList.add("recording");
            icon.textContent = "⏹️";
        } else {
            recordBtn.classList.remove("recording");
            icon.textContent = "🎙️";
        }
    }

    initializeApp();
});