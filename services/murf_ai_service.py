# services/murf_ai_service.py
import json
import websockets

async def stream_tts_audio(text: str, api_key: str, context_id: str, websocket):
    """
    Streams text to Murf using a context_id and forwards audio to the client.
    """
    uri = f"wss://api.murf.ai/v1/speech/stream-input?api-key={api_key}&sampleRate=24000&encoding=wav"

    try:
        async with websockets.connect(uri) as murf_ws:
            print("Connected to Murf AI WebSocket.")

            voice_config_msg = {
                "voice_config": {"voiceId": "en-US-amara"},
                "context_id": context_id
            }
            await murf_ws.send(json.dumps(voice_config_msg))

            text_payload = {
                "text": text,
                "end": True,
                "context_id": context_id
            }
            await murf_ws.send(json.dumps(text_payload))

            print("Text sent to Murf AI. Waiting for audio...")

            while True:
                message_str = await murf_ws.recv()
                message = json.loads(message_str)

                if 'audio' in message:
                    audio_chunk_b64 = message['audio']
                    # Don't log the full chunk, just confirm receipt
                    print(f"Received audio chunk from Murf, forwarding to client...")
                    await websocket.send_text(f"AUDIO_CHUNK:{audio_chunk_b64}")

                if message.get('final'):
                    print("Final audio chunk received from Murf AI.")
                    await websocket.send_text("AUDIO_END")
                    break

    except websockets.exceptions.ConnectionClosed as e:
        print(f"Murf AI WebSocket connection closed: {e.code} {e.reason}")
    except Exception as e:
        print(f"An error occurred with Murf AI WebSocket: {e}")