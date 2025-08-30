# Kratosni - A Real-time Conversational AI Voice Agent

Kratosni is a sophisticated, end-to-end streaming conversational AI built as the final project for the **#30DaysofVoiceAgents** challenge by Murf AI. It features a complete voice-in, voice-out pipeline with a polished UI, client-side configuration, and special skills powered by function calling.

---

### 🚀 [Try the Live Demo Here!](https://kratosni-voice-agent.onrender.com)

---

## ✨ Features

* **Real-time Voice Conversation:** Speak to the agent and receive a spoken response with low latency.
* **Intelligent Persona:** Interacts with the witty and helpful personality of "Kratosni."
* **Advanced Special Skills:** Uses Google Gemini's function calling to:
    * 📈 Fetch live stock prices.
    * 💱 Perform real-time currency conversions.
* **Polished UI:** A professional, dark-themed interface with a persistent chat history display.
* **Client-Side API Key Management:** A settings modal allows users to securely enter their own API keys, which are stored in the browser's local storage.
* **Natural Interruptions:** The agent immediately stops speaking and starts listening the moment the user begins to speak, allowing for fluid conversation.
* **End-to-End Streaming Pipeline:**
    * **Speech-to-Text:** Live transcription via **AssemblyAI**.
    * **LLM Logic:** Contextual understanding and tool use by **Google Gemini**.
    * **Text-to-Speech:** High-quality, streaming voice output from **Murf AI**.

## 🏛️ Architecture

The application uses a decoupled frontend-backend architecture:

1.  **Frontend (Vanilla JS):** A single-page application that handles all user interaction. It performs client-side audio conversion to PCM using the Web Audio API, manages the UI, and communicates with the backend via a single WebSocket connection.
2.  **Backend (Python/FastAPI):** An asynchronous API server that orchestrates the entire AI pipeline. It receives the PCM audio stream from the client and manages the real-time, bidirectional communication with all external AI services.

## 🛠️ Tech Stack

* **Backend:** Python, FastAPI, Uvicorn, WebSockets
* **Frontend:** HTML5, CSS3, JavaScript (Web Audio API)
* **Python Libraries:** `google-generativeai`, `assemblyai`, `websockets`, `requests`
* **Services:** Murf AI, AssemblyAI, Google Gemini, Alpha Vantage (Stocks), ExchangeRate-API (Currency)

## 🚀 Getting Started

The easiest way to try Kratosni is to use the live version deployed on Render.

**[➡️ Click here to access the live demo.](https://kratosni-voice-agent.onrender.com)**

### Local Installation

If you wish to run the project on your local machine, follow these instructions.

**Prerequisites**
* Python 3.8+
* An active internet connection

### **Installation & Setup**

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/Man-Aman-Man/Voice_Agent.git](https://github.com/Man-Aman-Man/Voice_Agent.git)
    cd Voice_Agent
    ```

2.  **Create and activate a virtual environment:**
    ```bash
    # Windows
    python -m venv venv
    .\venv\Scripts\activate

    # macOS / Linux
    python3 -m venv venv
    source venv/bin/activate
    ```

3.  **Install dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

### **Running the Application**

1.  Run the FastAPI server from the root directory:
    ```bash
    uvicorn main:app --reload
    ```
2.  Open your web browser and navigate to `http://127.0.0.1:8000`.
3.  Click the **⚙️ Settings** icon in the UI to enter your API keys for all the required services. The keys will be saved in your browser.
4.  Click the microphone button to start a conversation.