# schemas/chat_schemas.py
from pydantic import BaseModel
from typing import List, Optional

class ChatResponse(BaseModel):
    audio_url: str
    user_query: str
    llm_response: str

class FallbackResponse(BaseModel):
    audio_url: str

class SessionListResponse(BaseModel):
    sessions: List[str]

class DeleteResponse(BaseModel):
    message: str