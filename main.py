# main.py
import shelve
import atexit
import logging
from fastapi import FastAPI, Request, HTTPException, UploadFile, File
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

import config
from services import murf_ai_service, assemblyai_service, google_gemini_service
from schemas import chat_schemas

# --- New: Configure Logging ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# --- Initialization & Configuration ---
app = FastAPI()
app.mount("/static", StaticFiles(directory="frontend"), name="static")
templates = Jinja2Templates(directory="frontend")

db = shelve.open("chat_history.db", writeback=True)
atexit.register(db.close)

# --- API Endpoints ---
@app.get("/", response_class=HTMLResponse)
async def read_index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/agent/sessions", response_model=chat_schemas.SessionListResponse)
async def get_sessions():
    return chat_schemas.SessionListResponse(sessions=list(db.keys()))

@app.get("/agent/chat/{session_id}")
async def get_chat_history(session_id: str):
    if session_id not in db:
        raise HTTPException(status_code=404, detail="Session not found")
    serializable_history = [h.to_dict() for h in db[session_id]]
    return JSONResponse(content=serializable_history)

@app.delete("/agent/chat/{session_id}", response_model=chat_schemas.DeleteResponse)
async def delete_chat_session(session_id: str):
    if session_id in db:
        del db[session_id]
        db.sync()
        return chat_schemas.DeleteResponse(message=f"Session {session_id} deleted.")
    raise HTTPException(status_code=404, detail="Session not found")

@app.post("/agent/chat/{session_id}", response_model=chat_schemas.ChatResponse | chat_schemas.FallbackResponse)
async def agent_chat(session_id: str, file: UploadFile = File(...)):
    audio_bytes = await file.read()
    
    # Pipeline Step 1: Transcribe Audio
    user_query = assemblyai_service.transcribe_audio(audio_bytes)
    logger.info(f"[{session_id}] User Query: {user_query}")
    
    try:
        # Pipeline Step 2: Get Chat History and LLM Response
        history = db.get(session_id, [])
        llm_text, new_history = google_gemini_service.get_chat_response(history, user_query)
        db[session_id] = new_history
        db.sync()
        logger.info(f"[{session_id}] LLM Response: {llm_text}")
        
        # Pipeline Step 3: Generate Audio for the Response
        audio_url = murf_ai_service.generate_audio(llm_text)
        
        return chat_schemas.ChatResponse(
            audio_url=audio_url,
            user_query=user_query,
            llm_response=llm_text
        )
    except Exception as e:
        logger.error(f"Gemini API Error in session {session_id}: {e}")
        fallback_text = "I'm having trouble connecting right now. Please try again."
        
        # Generate and return fallback audio
        fallback_audio_url = murf_ai_service.generate_audio(fallback_text)
        return chat_schemas.FallbackResponse(audio_url=fallback_audio_url)