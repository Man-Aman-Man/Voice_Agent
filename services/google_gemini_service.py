# services/google_gemini_service.py
import google.generativeai as genai
from typing import List, Tuple
from config import GOOGLE_API_KEY # Import key from config

# Configure the SDK with the imported key
genai.configure(api_key=GOOGLE_API_KEY)

def get_chat_response(history: List, user_query: str) -> Tuple[str, List]:
    # ... (rest of the function is unchanged)
    model = genai.GenerativeModel('gemini-1.5-flash')
    chat = model.start_chat(history=history)
    response = chat.send_message(user_query)
    return response.text, chat.history