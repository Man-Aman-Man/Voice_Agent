import google.generativeai as genai
from typing import List, Tuple
from services import stock_service, cricket_service, currency_service

API_KEY = None

def initialize(api_key: str):
    global API_KEY
    if api_key:
        genai.configure(api_key=api_key)
        API_KEY = api_key
        print("Google Gemini Service Initialized.")

async def get_chat_response(history: List, user_query: str) -> Tuple[str, List]:
    if not API_KEY:
        raise ValueError("Gemini API key not initialized.")
    
    tools = [
        genai.protos.Tool(
            function_declarations=[
                genai.protos.FunctionDeclaration(
                    name="get_stock_price",
                    description="Get the latest price for a stock using its ticker symbol.",
                    parameters=genai.protos.Schema(
                        type=genai.protos.Type.OBJECT,
                        properties={"ticker": genai.protos.Schema(type=genai.protos.Type.STRING)},
                        required=["ticker"]
                    )
                ),
                genai.protos.FunctionDeclaration(
                    name="convert_currency",
                    description="Converts a specific amount from a source currency to a target currency.",
                    parameters=genai.protos.Schema(
                        type=genai.protos.Type.OBJECT,
                        properties={
                            "amount": genai.protos.Schema(type=genai.protos.Type.NUMBER),
                            "source_currency": genai.protos.Schema(type=genai.protos.Type.STRING),
                            "target_currency": genai.protos.Schema(type=genai.protos.Type.STRING)
                        },
                        required=["amount", "source_currency", "target_currency"]
                    )
                )
            ]
        )
    ]
    
    model = genai.GenerativeModel('gemini-1.5-flash', tools=tools)
    
    persona = "You are Kratosni, a witty and helpful robot assistant with access to real-time stock prices and currency conversion tools."
    
    if not history:
        full_query = f"{persona}\n\nUSER: {user_query}\nKRATOSNI:"
    else:
        full_query = user_query
        
    chat = model.start_chat(history=history, enable_automatic_function_calling=False)
    response = await chat.send_message_async(full_query)
    
    try:
        function_call = response.candidates[0].content.parts[0].function_call
        result = None
        function_name = function_call.name
        
        if function_name == "get_stock_price":
            ticker = function_call.args["ticker"]
            result = stock_service.get_stock_price(ticker)
        
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
        pass

    return response.text, chat.history