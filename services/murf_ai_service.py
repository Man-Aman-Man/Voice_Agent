# services/murf_ai_service.py
import requests
from fastapi import HTTPException
from config import MURF_API_KEY # Import key from config

def generate_audio(text: str) -> str:
    # ... (rest of the function is unchanged)
    headers = {"api-key": MURF_API_KEY, "Content-Type": "application/json"}
    body = {"text": text, "voiceId": "en-IN-priya", "format": "mp3"}
    try:
        response = requests.post("https://api.murf.ai/v1/speech/generate", headers=headers, json=body)
        response.raise_for_status()
        data = response.json()
        audio_url = data.get("audioFile")
        if not audio_url:
            raise HTTPException(status_code=500, detail="Murf API did not return an audio file URL.")
        return audio_url
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Error calling Murf API: {e}")