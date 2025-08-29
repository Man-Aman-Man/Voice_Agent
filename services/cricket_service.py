# services/cricket_service.py
import requests

API_KEY = None
API_HOST = "cricbuzz-cricket-match-api.p.rapidapi.com"

def initialize(api_key: str):
    global API_KEY
    API_KEY = api_key
    print("Cricket Service Initialized.")

def get_live_scores() -> str:
    """Fetches live cricket scores from the Cricbuzz API."""
    url = f"https://{API_HOST}/cricbuzz-android-widget/live-matches"
    headers = {
        "X-RapidAPI-Key": API_KEY,
        "X-RapidAPI-Host": API_HOST
    }
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        data = response.json()

        matches = data.get("matches", [])
        if not matches:
            return "There are no live cricket matches at the moment."

        # Format the scores into a readable string
        score_summary = "Here are the current live scores: "
        for match in matches[:3]: # Limit to the first 3 matches
            status = match.get("status", "")
            team1 = match.get("team1", {}).get("name", "N/A")
            team2 = match.get("team2", {}).get("name", "N/A")
            score_summary += f"{team1} versus {team2}, the status is: {status}. "

        return score_summary

    except Exception as e:
        print(f"Error fetching cricket scores: {e}")
        return "Sorry, I couldn't fetch the live cricket scores right now."