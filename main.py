import logging
import asyncio
import uuid
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
    BeginEvent
)

# We are no longer using the config.py file
# Services will be initialized with keys from the client
from services import google_gemini_service, murf_ai_service, stock_service, currency_service

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI()
app.mount("/static", StaticFiles(directory="frontend"), name="static")
templates = Jinja2Templates(directory="frontend")

@app.get("/")
async def read_index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    # Extract all 5 API keys from the WebSocket query parameters
    assemblyai_key = websocket.query_params.get('assemblyai_key')
    google_gemini_key = websocket.query_params.get('google_gemini_key')
    murf_ai_key = websocket.query_params.get('murf_ai_key')
    alpha_vantage_key = websocket.query_params.get('alpha_vantage_key')
    exchange_rate_key = websocket.query_params.get('exchange_rate_key')
    
    # Check if all keys are provided
    if not all([assemblyai_key, google_gemini_key, murf_ai_key, alpha_vantage_key, exchange_rate_key]):
        await websocket.close(code=1008, reason="One or more API keys are missing.")
        return

    await websocket.accept()
    logger.info("WebSocket connection established with client-provided keys.")

    # Initialize services with the keys from this specific client
    google_gemini_service.initialize(google_gemini_key)
    stock_service.initialize(alpha_vantage_key)
    #cricket_service.initialize(rapidapi_key) # Assuming you add this back
    currency_service.initialize(exchange_rate_key)

    audio_queue = asyncio.Queue()
    main_loop = asyncio.get_running_loop()
    full_transcript = ""
    chat_history = [] # Use a simple in-memory list for the session history

    def on_turn(self, event: TurnEvent):
        nonlocal full_transcript, chat_history
        transcript = event.transcript
        if transcript:
            full_transcript = transcript
            asyncio.run_coroutine_threadsafe(websocket.send_text(full_transcript), main_loop)
            
            if event.end_of_turn:
                logger.info(f"End of turn: '{full_transcript}'")
                async def get_gemini_and_respond_task(text):
                    nonlocal chat_history
                    try:
                        llm_response, new_history = await google_gemini_service.get_chat_response(chat_history, text)
                        chat_history = new_history # Update the in-memory history
                        
                        logger.info(f"Gemini Response: {llm_response}")
                        await websocket.send_text(f"AI_RESPONSE:{llm_response}")
                        
                        await murf_ai_service.stream_tts_audio(llm_response, murf_ai_key, str(uuid.uuid4()), websocket)
                    except Exception as e:
                        logger.error(f"Error in Gemini/Murf pipeline: {e}")

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

    try:
        await receive_audio()
    except Exception as e:
        logger.error(f"An error occurred: {e}")
    finally:
        await stream_task
        logger.info("Closing AssemblyAI connection.")
        client.disconnect()