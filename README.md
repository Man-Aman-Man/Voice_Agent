# 🤖 AI Voice Agent - 30 Days of AI Challenge

This project is a fully conversational AI voice agent built as part of the **#30DaysofVoiceAgents** challenge by Murf AI. It features a complete voice-in, voice-out pipeline with persistent chat history, allowing for natural, context-aware conversations.

The application is built with a Python backend using FastAPI and a vanilla JavaScript frontend.



## ✨ Features

* **Real-time Voice Conversation:** Speak to the agent and receive a spoken response.
* **Context-Aware Memory:** The agent remembers previous turns in the conversation using a session-based chat history.
* **Persistent Chat Sessions:** Chat history is saved to disk using Python's `shelve` module and survives server restarts.
* **Session Management UI:** A sidebar displays all past conversations, allowing you to load and delete previous chats.
* **End-to-End AI Pipeline:**
    * **Speech-to-Text:** Powered by **AssemblyAI**.
    * **LLM Logic:** Intelligent and contextual responses from **Google Gemini**.
    * **Text-to-Speech:** Natural-sounding voice output from **Murf AI**.
* **Robust Error Handling:** The agent provides a spoken fallback message if it cannot connect to the LLM.

## 🏛️ Architectural Decisions & Tradeoffs

This section documents the reasoning behind the technical choices made during development.

* **Backend Framework: FastAPI**
    * **Decision:** FastAPI was chosen as recommended by the challenge.
    * **Justification:** Its modern, asynchronous nature is perfect for handling I/O-bound tasks like making API calls to external services. Features like automatic OpenAPI documentation (`/docs`) and Pydantic data validation are incredibly valuable for rapid development and debugging.

* **LLM: Google Gemini (`gemini-1.5-flash`)**
    * **Decision:** The Gemini API was used as the core intelligence layer.
    * **Justification:** It offers a very generous free tier (60 requests per minute) which is more than sufficient for development and prototyping. The `gemini-1.5-flash` model provides a great balance of speed and capability.

* **Datastore: Python `shelve` Module**
    * **Decision:** Instead of a full-fledged database, the built-in `shelve` module was used for persistence.
    * **Tradeoff:** The primary benefit is **simplicity**. It requires no external dependencies or setup and acts like a persistent dictionary, making it ideal for a prototype. The tradeoff is that it is **not suitable for production** with high concurrency, as file-based databases can run into locking issues. It was chosen over a simple in-memory dictionary, which was not persistent across server restarts.

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

3.  **Install dependencies:**
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

1.  From the root directory, run the FastAPI server:
    ```bash
    uvicorn main:app --reload
    ```
2.  Open your web browser and navigate to `http://127.0.0.1:8000`.