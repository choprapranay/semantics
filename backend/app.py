from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import httpx, os
from dotenv import load_dotenv

from backend.services.openai_service import OpenAIService
from backend.services.scenario_generator import ScenarioGenerator
from backend.services.session_manager import SessionManager
from backend.services.turn_manager import TurnManager
from backend.utils import redis_client
load_dotenv()
from pydantic import BaseModel


OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

app = FastAPI(title="Semantics Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
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

# Frontend connectors setup
@app.post("/sessions")
async def create_session(body: CreateSessionBody):
    session_id = session_manager.create_session(
        user_name=body.user_name,
        difficulty_choice=body.difficulty,
        chosen_duration_seconds=body.duration_seconds
    )
    scenario = scenario_gen.generate_random_scenario(difficulty=body.difficulty)
    session_manager.update_session(session_id, {"context": scenario.dict()})
    return {"session_id": session_id, "scenario": scenario.dict()}

class TurnBody(BaseModel):
    session_id: str
    user_input: str

@app.post("/turn")
async def turn(body: TurnBody):
    turn = turn_manager.process_user_turn(session_id=body.session_id, user_input=body.user_input)
    return {"turn": turn.dict()}

@app.get("/health")
async def health():
    return {"ok": True}

# For Frontend Connection + Security
@app.get("/realtime/ephemeral")
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