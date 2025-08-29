# services/google_gemini_service.py
import google.generativeai as genai
from typing import List, Tuple
# Import all three of your special skill services
from services import stock_service, cricket_service, currency_service

def initialize(api_key: str):
    genai.configure(api_key=api_key)
    print("Google Gemini Service Initialized.")

async def get_chat_response(history: List, user_query: str) -> Tuple[str, List]:
    # --- Define ALL available tools for the LLM ---
    tools = [
        genai.protos.Tool(
            function_declarations=[
                # Skill 1: Stock Price Checker
                genai.protos.FunctionDeclaration(
                    name="get_stock_price",
                    description="Get the latest price for a stock using its ticker symbol.",
                    parameters=genai.protos.Schema(
                        type=genai.protos.Type.OBJECT,
                        properties={
                            "ticker": genai.protos.Schema(
                                type=genai.protos.Type.STRING,
                                description="The stock ticker symbol, e.g., GOOGL for Google."
                            )
                        },
                        required=["ticker"]
                    )
                ),
                # Skill 2: Live Cricket Scores
                genai.protos.FunctionDeclaration(
                    name="get_live_scores",
                    description="Get the scores of current live cricket matches.",
                ),
                # Skill 3: Currency Converter
                genai.protos.FunctionDeclaration(
                    name="convert_currency",
                    description="Converts a specific amount from a source currency to a target currency.",
                    parameters=genai.protos.Schema(
                        type=genai.protos.Type.OBJECT,
                        properties={
                            "amount": genai.protos.Schema(type=genai.protos.Type.NUMBER),
                            "source_currency": genai.protos.Schema(
                                type=genai.protos.Type.STRING,
                                description="The 3-letter currency code to convert from, e.g., 'USD'."
                            ),
                            "target_currency": genai.protos.Schema(
                                type=genai.protos.Type.STRING,
                                description="The 3-letter currency code to convert to, e.g., 'INR'."
                            )
                        },
                        required=["amount", "source_currency", "target_currency"]
                    )
                )
            ]
        )
    ]

    model = genai.GenerativeModel('gemini-1.5-flash', tools=tools)

    # Update the persona to mention all skills
    persona = (
        "You are Kratosni, a witty and helpful robot assistant. "
        "You have access to several tools: you can get real-time stock prices, find live cricket scores, "
        "and convert currency. You must use these tools when a user asks a relevant question."
    )

    if not history:
        full_query = f"{persona}\n\nUSER: {user_query}\nKratosni:"
    else:
        full_query = user_query

    chat = model.start_chat(history=history, enable_automatic_function_calling=False)
    response = await chat.send_message_async(full_query)

    try:
        function_call = response.candidates[0].content.parts[0].function_call
        result = None
        function_name = function_call.name

        print(f"Gemini wants to call function: {function_name}")

        # --- Handle all three possible function calls ---
        if function_name == "get_stock_price":
            ticker = function_call.args["ticker"]
            result = stock_service.get_stock_price(ticker)

        elif function_name == "get_live_scores":
            result = cricket_service.get_live_scores()

        elif function_name == "convert_currency":
            args = function_call.args
            result = currency_service.convert_currency(
                amount=args["amount"],
                source_currency=args["source_currency"],
                target_currency=args["target_currency"]
            )

        if result:
            final_response = await chat.send_message_async(
                genai.protos.Part(
                    function_response=genai.protos.FunctionResponse(
                        name=function_name,
                        response={"result": result}
                    )
                )
            )
            return final_response.text, chat.history

    except (ValueError, AttributeError):
        # Not a function call, return the direct text response
        pass

    return response.text, chat.history