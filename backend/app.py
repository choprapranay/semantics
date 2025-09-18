import tempfile
from io import BytesIO
from typing import Optional

from fastapi import FastAPI, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import httpx, os
from dotenv import load_dotenv
from openai import OpenAI

from backend.services.openai_service import OpenAIService
from backend.services.scenario_generator import ScenarioGenerator
from backend.services.session_manager import SessionManager
from backend.services.turn_manager import TurnManager
from backend.utils import redis_client
from backend.services import scoring

load_dotenv()
from pydantic import BaseModel



OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
oai = OpenAI(api_key=OPENAI_API_KEY)
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

app = FastAPI(title="Semantics Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8081",
        "http://127.0.0.1:8081",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services for frontend
redis = redis_client.init_redis()
session_manager = SessionManager(redis_client=redis)
openai_service = OpenAIService(api_key=OPENAI_API_KEY)
turn_manager = TurnManager(session_manager=session_manager, openai_service=openai_service)
scenario_gen = ScenarioGenerator()

class CreateSessionBody(BaseModel):
    user_name: str = "Tester"
    difficulty: str = "medium"
    duration_seconds: int = 600
    custom_scenario: Optional[str] = None

class ScoreRequest(BaseModel):
    session_id: str

# Frontend connectors setup
@app.post("/sessions")
async def create_session(body: CreateSessionBody):
    session_id = session_manager.create_session(
        user_name=body.user_name,
        difficulty_choice=body.difficulty,
        chosen_duration_seconds=body.duration_seconds
    )

    if body.custom_scenario:
        scenario = scenario_gen.generate_custom_scenario(body.custom_scenario)
    else:
        scenario = scenario_gen.generate_random_scenario(difficulty=body.difficulty)

    session_manager.update_session(session_id, {"context": scenario.dict()})
    return {"session_id": session_id, "scenario": scenario.dict()}

class TurnBody(BaseModel):
    session_id: str
    user_input: str

@app.post("/turn")
async def turn(body: TurnBody):
    if not session_manager.check_session_timeout(body.session_id, turn_manager):
        raise HTTPException(410, "Session has expired")
    
    turn = turn_manager.process_user_turn(session_id=body.session_id, user_input=body.user_input)
    return {"turn": turn.dict()}

@app.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    audio_bytes = await file.read()
    print("filename:", file.filename, "size:", len(audio_bytes), "content_type:", file.content_type)

    bio = BytesIO(audio_bytes)
    tr = oai.audio.transcriptions.create(
        model="gpt-4o-transcribe",
        file=(file.filename, audio_bytes)

    )
    return {"text": tr.text.strip()}


@app.post("/speak")
async def speak_text(body: dict):
    text = body.get("text")
    if not text:
        raise HTTPException(400, "Missing 'text'")

    out = tempfile.mktemp(suffix=".wav")

    with oai.audio.speech.with_streaming_response.create(
        model="gpt-4o-mini-tts",
        voice="verse",
        input=text,
        response_format="wav",
    ) as resp:
        resp.stream_to_file(out)

    return FileResponse(out, media_type="audio/wav", filename="speech.wav")
@app.post("/sessions/{session_id}/end")
async def end_session_early(session_id: str):
    try:
        feedback = turn_manager.end_session_feedback(session_id)
        return {"feedback": feedback, "session_ended": True}
    except Exception as e:
        raise HTTPException(404, f"Session not found: str{e}") 

@app.post("/sessions/{session_id}/score")
async def score_session(session_id: str):
    result = turn_manager.end_session_feedback(session_id)
    return {
        "metrics": result["metrics"].dict(),
        "feedback_messages": result["feedback_messages"]
    }

@app.get("/health")
async def health():
    return {"ok": True}

# For Frontend Connection + Security
@app.post("/realtime/ephemeral")
async def realtime_ephemeral():
    if not OPENAI_API_KEY:
        raise HTTPException(500, "OPENAI_API_KEY not set")
    payload = {"model": "gpt-4o-realtime-preview", "voice": "verse", "modalities": ["audio","text"]}
    headers = {"Authorization": f"Bearer {OPENAI_API_KEY}", "Content-Type": "application/json"}
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.post("https://api.openai.com/v1/realtime/sessions", json=payload, headers=headers)
        if response.status_code >= 400:
            raise HTTPException(500, f"OpenAI error: {response.text}")
        return response.json()