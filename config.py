# config.py
import os
from pathlib import Path
from dotenv import load_dotenv

# Build the path to the .env file explicitly
# This ensures it's found regardless of where you run the script from
env_path = Path('.') / '.env'
load_dotenv(dotenv_path="D:/MURFAI_AGENT/.env")

# Load all API keys into constants
MURF_API_KEY = os.getenv("MURF_API_KEY")
ASSEMBLYAI_API_KEY = os.getenv("ASSEMBLYAI_API_KEY")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
ALPHA_VANTAGE_API_KEY = os.getenv("ALPHA_VANTAGE_API_KEY")
RAPIDAPI_KEY = os.getenv("RAPIDAPI_KEY")
EXCHANGE_RATE_API_KEY = os.getenv("EXCHANGE_RATE_API_KEY")

# Update the check
if not all([MURF_API_KEY, ASSEMBLYAI_API_KEY, GOOGLE_API_KEY, ALPHA_VANTAGE_API_KEY, RAPIDAPI_KEY, EXCHANGE_RATE_API_KEY]):
    raise RuntimeError("One or more required API keys are not set in the .env file.")