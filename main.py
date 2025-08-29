# main.py
import logging
import asyncio
import uuid
import shelve
import atexit
from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from assemblyai.streaming.v3 import (
    StreamingClient,
    StreamingClientOptions,
    StreamingEvents,
    StreamingParameters,
    StreamingError,
    TurnEvent,
)

# Import all your services
from services import google_gemini_service, murf_ai_service, stock_service, currency_service

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI()
app.mount("/static", StaticFiles(directory="frontend"), name="static")
templates = Jinja2Templates(directory="frontend")

db = shelve.open("chat_history.db", writeback=True)
atexit.register(db.close)

@app.get("/")
async def read_index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/agent/sessions")
async def get_sessions():
    return list(db.keys())

@app.get("/agent/chat/{session_id}")
async def get_chat_history(session_id: str):
    history = db.get(session_id, [])
    serializable_history = [part.to_dict() for part in history]
    return serializable_history

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    # Accept the connection ONCE, at the beginning
    await websocket.accept()
    logger.info("WebSocket connection accepted. Waiting for a session to start.")

    try:
        # This loop handles the entire lifecycle of a single client session
        # When the client disconnects, the loop will break, and the endpoint will finish

        # Extract keys and session ID from query parameters
        assemblyai_key = websocket.query_params.get('assemblyai_key')
        google_gemini_key = websocket.query_params.get('google_gemini_key')
        murf_ai_key = websocket.query_params.get('murf_ai_key')
        alpha_vantage_key = websocket.query_params.get('alpha_vantage_key')
        exchange_rate_key = websocket.query_params.get('exchange_rate_key')
        session_id = websocket.query_params.get('session_id')

        if not all([assemblyai_key, google_gemini_key, murf_ai_key, alpha_vantage_key, exchange_rate_key, session_id]):
            logger.warning("Connection attempt with missing API keys or session_id.")
            await websocket.close(code=1008, reason="API keys or session_id are missing.")
            return

        # Initialize services with client-provided keys
        google_gemini_service.initialize(google_gemini_key)
        stock_service.initialize(alpha_vantage_key)
        currency_service.initialize(exchange_rate_key)

        audio_queue = asyncio.Queue()
        main_loop = asyncio.get_running_loop()
        full_transcript = ""

        def on_turn(self, event: TurnEvent):
            nonlocal full_transcript
            transcript = event.transcript
            if transcript:
                full_transcript = transcript
                asyncio.run_coroutine_threadsafe(websocket.send_text(full_transcript), main_loop)
                if event.end_of_turn:
                    logger.info(f"End of turn for session {session_id}: '{full_transcript}'")
                    async def get_gemini_and_respond_task(text):
                        try:
                            history = db.get(session_id, [])
                            llm_response, new_history = await google_gemini_service.get_chat_response(history, text)
                            db[session_id] = new_history
                            db.sync()
                            await websocket.send_text(f"AI_RESPONSE:{llm_response}")
                            await murf_ai_service.stream_tts_audio(llm_response, murf_ai_key, str(uuid.uuid4()), websocket)
                        except Exception as e:
                            logger.error(f"Error in Gemini/Murf pipeline for session {session_id}: {e}")
                    asyncio.run_coroutine_threadsafe(get_gemini_and_respond_task(full_transcript), main_loop)
                    full_transcript = ""

        def on_error(self, error: StreamingError):
            logger.error(f"AssemblyAI Streaming Error: {error}")

        client = StreamingClient(
            StreamingClientOptions(api_key=assemblyai_key)
        )

        client.on(StreamingEvents.Turn, on_turn)
        client.on(StreamingEvents.Error, on_error)

        client.connect(StreamingParameters(sample_rate=16000))

        def audio_generator():
            while True:
                try:
                    future = asyncio.run_coroutine_threadsafe(audio_queue.get(), main_loop)
                    chunk = future.result()
                    if chunk is None: break
                    yield chunk
                except Exception as e:
                    logger.error(f"Error in audio generator: {e}")
                    break

        async def receive_audio():
            try:
                while True:
                    data = await websocket.receive_bytes()
                    await audio_queue.put(data)
            except WebSocketDisconnect:
                logger.info("Client disconnected. Signaling end of audio stream.")
                await audio_queue.put(None)

        stream_task = main_loop.run_in_executor(
            None,
            client.stream,
            audio_generator()
        )

        await receive_audio()
        await stream_task

    except WebSocketDisconnect:
        logger.info("Client disconnected gracefully.")
    except Exception as e:
        logger.error(f"An unexpected error occurred in WebSocket endpoint: {e}")
    finally:
        logger.info("WebSocket endpoint finished. Ready for new connection.")