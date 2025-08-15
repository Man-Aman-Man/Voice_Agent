// --- Global State ---
let mediaRecorder;
let audioChunks = [];
let sessionId = null;
let isRecording = false;

// --- DOM Element References ---
const sessionList = document.getElementById('sessionList');
const newChatBtn = document.getElementById('newChatBtn');
const welcomeScreen = document.getElementById('welcomeScreen');
const chatScreen = document.getElementById('chatScreen');
const chatContainer = document.getElementById('chatContainer');
const recordBtn = document.getElementById('recordBtn');
const convoStatus = document.getElementById('convoStatus');
const audioPlayer = document.getElementById('convoAudioPlayer');

// --- Initialization ---
document.addEventListener('DOMContentLoaded', initializeApp);

/**
 * Main app initializer
 */
async function initializeApp() {
    await loadAndRenderSessions();
    setupEventListeners();
    const urlParams = new URLSearchParams(window.location.search);
    const currentSessionId = urlParams.get('session_id');
    if (currentSessionId) {
        // If a session ID is in the URL, try to load its history
        loadChatHistory(currentSessionId);
    } else {
        // Otherwise, show the welcome screen
        showWelcomeScreen();
    }
}

function setupEventListeners() {
    newChatBtn.addEventListener('click', createNewChat);
    recordBtn.addEventListener('click', toggleRecording);
    audioPlayer.addEventListener('ended', () => {
        if (isRecording) return;
        setTimeout(startRecording, 500);
    });
}

// --- Session Management ---
async function loadAndRenderSessions() {
    try {
        const response = await fetch('/agent/sessions');
        const sessions = await response.json();
        sessionList.innerHTML = '';
        sessions.forEach(id => {
            const li = document.createElement('li');
            li.className = 'session-item';
            li.dataset.sessionId = id;
            li.textContent = `Chat - ${id.substring(8, 14)}`;

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.innerHTML = '🗑️';
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                deleteSession(id);
            };

            li.appendChild(deleteBtn);
            li.onclick = () => {
                // Navigate to the new session URL, triggering initializeApp again
                window.location.search = `?session_id=${id}`;
            };
            sessionList.appendChild(li);
        });
    } catch (error) {
        console.error("Failed to load sessions:", error);
    }
}

/**
 * --- FIX: This function is simplified to prevent reloads and loops.
 * It now just generates a new session URL and navigates to it.
 */
function createNewChat() {
    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    window.location.search = `?session_id=${newSessionId}`;
}

async function deleteSession(id) {
    try {
        await fetch(`/agent/chat/${id}`, { method: 'DELETE' });
        const itemToRemove = sessionList.querySelector(`[data-session-id="${id}"]`);
        if (itemToRemove) itemToRemove.remove();
        if (sessionId === id) {
            // If we deleted the active chat, go to the welcome screen
            window.location.pathname = '/';
        }
    } catch (error) {
        console.error("Failed to delete session:", error);
    }
}

// --- Chat History Management ---
/**
 * --- MAJOR FIX: This function now correctly handles a 404 for new chats.
 */
async function loadChatHistory(id) {
    sessionId = id; // Set the global session ID immediately
    highlightActiveSession();
    
    try {
        const response = await fetch(`/agent/chat/${id}`);

        showChatScreen(); // Show the chat UI
        chatContainer.innerHTML = ''; // Always start with a clean slate

        if (response.status === 404) {
            // This is NOT an error. It's a new chat session.
            // The UI is already clean, so we just log it and wait for user input.
            console.log("Starting new chat session:", id);
            return;
        }
        
        if (!response.ok) {
            // Handle other, real errors (like 500)
            throw new Error(`Server error: ${response.status}`);
        }

        // If response is OK, render the history
        const history = await response.json();
        history.forEach(message => {
            appendBubble(message.parts[0].text, message.role === 'user' ? 'user' : 'ai');
        });

    } catch (error) {
        console.error("Failed to load chat history:", error);
        alert("Could not load the chat session. Please try again.");
        showWelcomeScreen(); // Show welcome screen on critical error
    }
}

function appendBubble(text, type) {
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${type}-bubble`;
    bubble.textContent = text;
    chatContainer.appendChild(bubble);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// --- UI State Management ---
function showWelcomeScreen() {
    welcomeScreen.style.display = 'flex';
    chatScreen.style.display = 'none';
}

function showChatScreen() {
    welcomeScreen.style.display = 'none';
    chatScreen.style.display = 'flex';
}

function highlightActiveSession() {
    document.querySelectorAll('.session-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.sessionId === sessionId) {
            item.classList.add('active');
        }
    });
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

// --- Recording & Conversation Logic ---
function toggleRecording() {
    if (!sessionId) {
        alert("Please start a new chat first.");
        return;
    }
    isRecording ? stopRecording() : startRecording();
}

async function startRecording() {
    if (isRecording) return;
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        mediaRecorder.ondataavailable = event => audioChunks.push(event.data);
        mediaRecorder.onstop = processConversation;
        mediaRecorder.start();
        isRecording = true;
        updateButtonUI(true);
        convoStatus.textContent = "Listening...";
    } catch (err) {
        convoStatus.textContent = "Microphone access denied.";
    }
}

function stopRecording() {
    if (mediaRecorder) {
        mediaRecorder.stop();
        isRecording = false;
        updateButtonUI(false);
    }
}

async function processConversation() {
    convoStatus.textContent = "Thinking...";
    const audioBlob = new Blob(audioChunks, { type: "audio/wav" });
    const formData = new FormData();
    formData.append("file", audioBlob, "recording.wav");
    
    // Check if the current session exists in the sidebar, if not, it's new
    const isNewSession = !sessionList.querySelector(`[data-session-id="${sessionId}"]`);
    
    try {
        const response = await fetch(`/agent/chat/${sessionId}`, { method: 'POST', body: formData });
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.detail);
        }
        const data = await response.json();
        
        // --- FIX: Logic to append bubbles correctly ---
        // If the chat container was empty, this is the first exchange
        if (chatContainer.innerHTML === '') {
             if (data.user_query) appendBubble(data.user_query, 'user');
        } else {
            // Otherwise, we only need to add the AI's response bubble because the user's bubble
            // was added optimistically right after recording stopped (in a future improvement)
            // For now, let's just add both.
             if (data.user_query) appendBubble(data.user_query, 'user');
        }
       
        if (data.llm_response) appendBubble(data.llm_response, 'ai');

        if (data.audio_url) {
            audioPlayer.src = data.audio_url;
            audioPlayer.play();
            convoStatus.textContent = "Responded. Listening for your reply...";
        }
    } catch (error) {
        convoStatus.textContent = `Error: ${error.message}`;
    } finally {
        isRecording = false;
        updateButtonUI(false);
        // If it was a new session, reload the session list to show it
        if (isNewSession) {
            loadAndRenderSessions();
        }
    }
}