# services/assemblyai_service.py
import assemblyai as aai
from fastapi import HTTPException
from config import ASSEMBLYAI_API_KEY # Import key from config

# Configure the SDK with the imported key
aai.settings.api_key = ASSEMBLYAI_API_KEY

def transcribe_audio(audio_bytes: bytes) -> str:
    # ... (rest of the function is unchanged)
    try:
        transcriber = aai.Transcriber()
        transcript = transcriber.transcribe(audio_bytes)
        if transcript.status == aai.TranscriptStatus.error:
            raise HTTPException(status_code=500, detail=f"AssemblyAI Error: {transcript.error}")
        if not transcript.text:
            raise HTTPException(status_code=400, detail="Could not understand the audio.")
        return transcript.text
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AssemblyAI transcription failed: {e}")