# 🤖 AI Voice Agent - 30 Days of AI Challenge

This project is a fully conversational AI voice agent built as part of the **[30 Days of AI Voice Agents](https://www.linkedin.com/company/murf-ai/)** challenge by Murf AI. It features a complete voice-in, voice-out pipeline with persistent chat history, allowing for natural, context-aware conversations.

The application is built with a Python backend using FastAPI and a vanilla JavaScript frontend.



## ✨ Features

* **Real-time Voice Conversation:** Speak to the agent and receive a spoken response.
* **Context-Aware Memory:** The agent remembers previous turns in the conversation using a session-based chat history.
* **Persistent Chat Sessions:** Chat history is saved to disk and survives server restarts.
* **Session Management UI:** A sidebar displays all past conversations, allowing you to load and delete previous chats.
* **End-to-End AI Pipeline:**
    * **Speech-to-Text:** Powered by **AssemblyAI**.
    * **LLM Logic:** Intelligent and contextual responses from **Google Gemini**.
    * **Text-to-Speech:** Natural-sounding voice output from **Murf AI**.
* **Robust Error Handling:** The agent provides a spoken fallback message if it cannot connect to the LLM.
* **Modern UI:** A clean, revamped interface focused on the conversation, featuring a single, animated recording button.

## 🏛️ Architecture

The application uses a decoupled frontend-backend architecture:

1.  **Frontend (Vanilla JS):** A single-page application that captures microphone audio, manages the UI, and communicates with the backend.
2.  **Backend (Python/FastAPI):** An API server that orchestrates the entire AI pipeline. It receives audio from the frontend and makes sequential calls to the external AI services.
3.  **Datastore (`shelve`):** A simple file-based persistent dictionary to store chat session histories.
4.  **External Services:**
    * **AssemblyAI:** For accurate speech transcription.
    * **Google Gemini:** For generative AI responses.
    * **Murf AI:** For high-quality text-to-speech conversion.

## 🛠️ Tech Stack

* **Backend:** Python, FastAPI, Uvicorn
* **Frontend:** HTML5, CSS3, JavaScript
* **Python Libraries:** `google-generativeai`, `assemblyai`, `requests`, `python-dotenv`, `uvicorn`
* **Services:** Google Cloud (for Gemini), Murf AI, AssemblyAI

## 🚀 Getting Started

Follow these instructions to set up and run the project on your local machine.

### Prerequisites

* Python 3.8+
* An active internet connection

### Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone <your-repository-url>
    cd <your-repository-name>
    ```

2.  **Create and activate a virtual environment:**
    * **Windows:**
        ```bash
        python -m venv venv
        .\venv\Scripts\activate
        ```
    * **macOS / Linux:**
        ```bash
        python3 -m venv venv
        source venv/bin/activate
        ```

3.  **Create a `requirements.txt` file:**
    Before installing dependencies, it's best practice to list them. You can generate this file automatically with the following command (run this after you've `pip install`ed all the libraries yourself):
    ```bash
    pip freeze > requirements.txt
    ```
    Then, install the dependencies from this file:
    ```bash
    pip install -r requirements.txt
    ```

4.  **Set up environment variables:**
    Create a file named `.env` in the root project directory and add your API keys:
    ```env
    MURF_API_KEY="your_murf_api_key_here"
    ASSEMBLYAI_API_KEY="your_assemblyai_api_key_here"
    GOOGLE_API_KEY="your_google_gemini_api_key_here"
    ```

### Running the Application

1.  Make sure your virtual environment is activated.
2.  Run the FastAPI server from the root directory:
    ```bash
    uvicorn main:app --reload
    ```
3.  The server will start, and you'll see a message like:
    `INFO: Uvicorn running on http://127.0.0.1:8000`

### Usage

1.  Open your web browser and navigate to `http://127.0.0.1:8000`.
2.  Click the **"+ New Chat"** button in the sidebar to start a new conversation.
3.  Click the microphone button to start recording, speak your query, and click it again to stop.
4.  The agent will process your request and respond with voice. The conversation will appear in the chat window.
