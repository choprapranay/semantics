import os, tempfile, time
import numpy as np
import sounddevice as sd
from scipy.io import wavfile
from scipy.io.wavfile import write as wav_write

from dotenv import load_dotenv
load_dotenv()

from backend.utils.redis_client import init_redis
from backend.services.openai_service import OpenAIService
from backend.services.scenario_generator import ScenarioGenerator
from backend.services.session_manager import SessionManager
from backend.services.turn_manager import TurnManager
from openai import OpenAI
oai = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

SAMPLE_RATE = 16000

def record_push_to_talk(seconds: float = 4.0) -> str:
    print(f"\n🎙Recording for {seconds:.1f}s... (speak now)")
    audio = sd.rec(int(seconds * SAMPLE_RATE), samplerate=SAMPLE_RATE, channels=1, dtype="int16")
    sd.wait()
    fd, path = tempfile.mkstemp(suffix=".wav")
    os.close(fd)
    wav_write(path, SAMPLE_RATE, audio)
    print("recorded:", path)
    return path

def play_wav(path: str):
    try:
        sr, data = wavfile.read(path)
        sd.play(data, sr)
        sd.wait()
    except Exception as e:
        print("Audio playback error:", e)


def stt_transcribe(wav_path: str) -> str:
    with open(wav_path, "rb") as f:
        tr = oai.audio.transcriptions.create(
            model="gpt-4o-transcribe",  #TO-DO: look into other models
            file=f,
        )
    return tr.text.strip()

def tts_speak_to_file(text: str) -> str:
    out = tempfile.mktemp(suffix=".wav")
    with oai.audio.speech.with_streaming_response.create(
        model="gpt-4o-mini-tts",
        voice="verse",
        input=text,
        response_format="wav",
    ) as resp:
        resp.stream_to_file(out)
    return out

def bootstrap_services():
    redis = init_redis()
    session_mgr = SessionManager(redis_client=redis)
    openai_svc = OpenAIService(api_key=os.getenv("OPENAI_API_KEY"))
    turn_mgr = TurnManager(session_manager=session_mgr, openai_service=openai_svc)
    scenario = ScenarioGenerator().generate_random_scenario("medium")
    session_id = session_mgr.create_session("CLI Tester", "medium", 600)
    session_mgr.update_session(session_id, {"context": scenario.dict()})
    return session_id, turn_mgr

def main():
    if not os.getenv("OPENAI_API_KEY"):
        raise RuntimeError("OPENAI_API_KEY not set")

    session_id, turn_mgr = bootstrap_services()
    print("\nSession started:", session_id)
    print("Press Enter to record 4s… (type 'quit' to exit)")

    while True:
        cmd = input("\n<Enter> to speak, or 'quit': ").strip().lower()
        if cmd == "quit":
            break

        wav_in = record_push_to_talk(4.0)
        user_text = stt_transcribe(wav_in)
        print(f"You said: {user_text!r}")

        turn = turn_mgr.process_user_turn(session_id=session_id, user_input=user_text)
        ai_text = turn.ai_response
        print(f"LLM: {ai_text}")

        wav_out = tts_speak_to_file(ai_text)
        print("Speaking response…")
        play_wav(wav_out)

    print("\ndone!")

if __name__ == "__main__":
    main()