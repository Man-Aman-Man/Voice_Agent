# services/currency_service.py
import requests
from fastapi import HTTPException

API_KEY = None

def initialize(api_key: str):
    global API_KEY
    API_KEY = api_key
    print("Currency Service Initialized.")

def convert_currency(amount: float, source_currency: str, target_currency: str) -> str:
    """Converts an amount from a source currency to a target currency."""
    url = f"https://v6.exchangerate-api.com/v6/{API_KEY}/pair/{source_currency}/{target_currency}/{amount}"
    try:
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()

        if data.get("result") == "error":
            error_type = data.get("error-type", "Unknown error")
            return f"I couldn't convert the currency. The API returned an error: {error_type}"

        conversion_result = data.get("conversion_result")
        return (
            f"{amount} {source_currency} is currently equal to "
            f"{conversion_result:.2f} {target_currency}."
        )

    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Error calling currency API: {e}")
    except Exception as e:
        return "An unexpected error occurred while converting the currency."