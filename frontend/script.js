document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element References ---
    const newChatBtn = document.getElementById('newChatBtn');
    const sessionList = document.getElementById('sessionList');
    const recordBtn = document.getElementById('recordBtn');
    const statusMessage = document.getElementById('statusMessage');
    const chatHistoryContainer = document.getElementById('chatHistoryContainer');
    const welcomeScreen = document.getElementById('welcomeScreen');
    const chatScreen = document.getElementById('chatScreen');
    const audioPlayer = document.createElement('audio');
    const settingsIcon = document.getElementById('settings-icon');
    const settingsModal = document.getElementById('settings-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const apiKeyForm = document.getElementById('api-key-form');

    // --- Global State ---
    let isRecording = false;
    let sessionId = null;
    let webSocket = null;
    let audioChunksPlayback = [];
    let stream, audioContextRecording, processor, source;

    // --- Initialization ---
    function initializeApp() {
        const urlParams = new URLSearchParams(window.location.search);
        sessionId = urlParams.get("session_id");
        
        loadApiKeys();
        checkKeysAndSetStatus();
        loadAndRenderSessions();

        if (sessionId) {
            loadChatHistory(sessionId);
        } else {
            showWelcomeScreen();
        }
        setupEventListeners();
    }

    function setupEventListeners() {
        newChatBtn.addEventListener('click', createNewChat);
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

    // --- API Key Management ---
    function saveApiKeys() {
        localStorage.setItem('assemblyai_key', document.getElementById('assemblyai-key').value);
        localStorage.setItem('google_gemini_key', document.getElementById('google-gemini-key').value);
        localStorage.setItem('murf_ai_key', document.getElementById('murf-ai-key').value);
        alert("API Keys saved successfully!");
    }

    function loadApiKeys() {
        document.getElementById('assemblyai-key').value = localStorage.getItem('assemblyai_key') || '';
        document.getElementById('google-gemini-key').value = localStorage.getItem('google_gemini_key') || '';
        document.getElementById('murf-ai-key').value = localStorage.getItem('murf_ai_key') || '';
    }

    function getApiKeys() {
        return {
            assemblyai: localStorage.getItem('assemblyai_key'),
            google_gemini: localStorage.getItem('google_gemini_key'),
            murf_ai: localStorage.getItem('murf_ai_key'),
        };
    }

    function checkKeysAndSetStatus() {
        const keys = getApiKeys();
        if (!sessionId) {
            recordBtn.disabled = true;
            statusMessage.textContent = "Start a new chat or select one from the history.";
        } else if (!keys.assemblyai || !keys.google_gemini || !keys.murf_ai) {
            recordBtn.disabled = true;
            statusMessage.textContent = "Please enter your API keys in Settings (found in the sidebar).";
        } else {
            recordBtn.disabled = false;
            statusMessage.textContent = "Ready. Click the mic to start.";
        }
    }

    // --- Session Management ---
    async function loadAndRenderSessions() {
        try {
            const response = await fetch('/agent/sessions');
            if (!response.ok) return;
            const sessions = await response.json();
            sessionList.innerHTML = '';
            sessions.forEach(id => {
                const li = document.createElement('li');
                li.className = 'session-item';
                li.dataset.sessionId = id;
                li.textContent = `Chat - ${id.substring(8, 14)}`;
                if (id === sessionId) li.classList.add('active');
                li.onclick = () => window.location.search = `?session_id=${id}`;
                sessionList.appendChild(li);
            });
        } catch (error) {
            console.error("Failed to load sessions:", error);
        }
    }

    function createNewChat() {
        const newSessionId = `session_${Date.now()}`;
        window.location.search = `?session_id=${newSessionId}`;
    }

    // --- Chat History & UI ---
    async function loadChatHistory(id) {
        try {
            const response = await fetch(`/agent/chat/${id}`);
            showChatScreen();
            chatHistoryContainer.innerHTML = '';
            if (!response.ok) {
                addMessage("Start this new conversation by speaking.", 'ai');
                return;
            }
            const history = await response.json();
            history.forEach(msg => {
                addMessage(msg.parts[0].text, msg.role === 'user' ? 'user' : 'ai');
            });
        } catch (error) {
            console.error("Failed to load chat history:", error);
        }
    }

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

    function showWelcomeScreen() { welcomeScreen.style.display = 'flex'; chatScreen.style.display = 'none'; }
    function showChatScreen() { welcomeScreen.style.display = 'none'; chatScreen.style.display = 'flex'; }

    // --- WebSocket Logic ---
    function setupWebSocket() {
        return new Promise((resolve, reject) => {
            const keys = getApiKeys();
            const wsUrl = `ws://127.0.0.1:8000/ws?session_id=${sessionId}&assemblyai_key=${keys.assemblyai}&google_gemini_key=${keys.google_gemini}&murf_ai_key=${keys.murf_ai}`;
            
            webSocket = new WebSocket(wsUrl);
            webSocket.onopen = resolve;
            webSocket.onmessage = handleWebSocketMessage;
            webSocket.onerror = (error) => { console.error("WebSocket Error:", error); statusMessage.textContent = "Connection error."; reject(error); };
            webSocket.onclose = (event) => { 
                if (isRecording) { stopRecordingCleanup(); }
                statusMessage.textContent = event.reason || "Session finished. Ready for next chat.";
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
            const aiResponse = message.substring("AI_RESPONSE:".length);
            addMessage(aiResponse, 'ai');
            statusMessage.textContent = "Speaking...";
        } else if (message === "END_OF_TURN") {
            const liveBubble = chatHistoryContainer.querySelector('.user-bubble.live');
            if (liveBubble) {
                liveBubble.classList.remove('live');
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