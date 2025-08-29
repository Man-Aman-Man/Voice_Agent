# services/stock_service.py
import requests
from fastapi import HTTPException

API_KEY = None

def initialize(api_key: str):
    global API_KEY
    API_KEY = api_key
    print("Alpha Vantage Service Initialized.")

def get_stock_price(ticker: str) -> str:
    """Fetches the latest stock price for a given ticker from Alpha Vantage."""
    url = f"https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol={ticker}&apikey={API_KEY}"
    try:
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()

        quote = data.get("Global Quote")
        if not quote or "05. price" not in quote:
            # Handle cases where the ticker is invalid or API limit is reached
            return f"I couldn't retrieve the price for {ticker}. Is that a valid stock symbol?"

        price = float(quote["05. price"])
        return f"The current price of {ticker} is ${price:.2f}."

    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Error calling stock API: {e}")
    except Exception as e:
        return f"An unexpected error occurred while fetching the stock price for {ticker}."