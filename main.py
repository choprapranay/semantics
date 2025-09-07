from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

from utils.redis_client import init_redis
from services.session_manager import SessionManager
from services.turn_manager import TurnManager
from services.scenario_generator import ScenarioGenerator
from services.openai_service import OpenAIService
from models.scenario import ScenarioRequest, ScenarioContext
from models.session import TurnData
from config import OPENAI_API_KEY, SUPABASE_KEY, SUPABASE_URL
from supabase import create_client, Client


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

redis_client = init_redis()
session_manager = SessionManager(redis_client)
openai_service = OpenAIService(api_key=OPENAI_API_KEY)
turn_manager = TurnManager(session_manager, openai_service)
scenario_generator = ScenarioGenerator()

class StartSessionRequest(BaseModel):
    user_name: str
    difficulty: str #E, M or H
    duration_seconds: int

class UserTurnRequest(BaseModel):
    session_id: str
    user_input: str

class GenerateScenarioRequest(BaseModel):
    scenario_type: str
    custom_input: Optional[str] = None
    difficulty: Optional[str] = None

class FeedbackRequest(BaseModel):
    session_id: str

#initialize the Supabase client here
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

class SpeechFileRequest(BaseModel):
    session_id: str
    file_id: str # the ID of the file in Supabase


@app.post("/start_session")
def start_session(req: StartSessionRequest):  
    try:
        session_id = session_manager.create_session(
        user_name=req.user_name,
        difficulty_choice=req.difficulty,
        chosen_duration_seconds=req.duration_seconds
        )
        return {"session_id": session_id}
    except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate-scenario")
def generate_scenario(req: GenerateScenarioRequest) -> dict:
     if req.scenario_type == "random":
        if not req.difficulty:
            raise HTTPException(status_code=400, detail="Difficulty required for random scenario")
        scenario = scenario_generator.generate_random_scenario(req.difficulty)
     elif req.scenario_type == "custom":
        if not req.custom_input:
            raise HTTPException(status_code=400, detail="Custom input required for custom scenario")
        scenario = scenario_generator.generate_custom_scenario(req.custom_input)
     else:
        raise HTTPException(status_code=400, detail="Invalid scenario type")
    
     return scenario.dict()

LLM_OUTPUT_BUCKET = "outputs"

@app.post("/user_turn")
def user_turn(req: UserTurnRequest):
    try:
        turn: TurnData = turn_manager.process_user_turn(
            session_id=req.session_id,
            user_input=req.user_input
        )
        
        supabase.storage.from_(LLM_OUTPUT_BUCKET).upload(
            path = f"{req.session_id}/turn_{turn.turn_number}.txt",
            file = turn.ai_response.encode("utf-8"),
            file_options={"content-type": "text/plain"}
        )

        return turn.dict()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.post("/end_session_feedback")
def end_feedback(req: FeedbackRequest):
    return turn_manager.end_session_feedback(req.session_id)

@app.post("/process-speech-file")
def process_speech_file(req: SpeechFileRequest):
    try: 
        result = supabase.storage.from_("transcriptions").download(req.file_id)
        if result is None: 
            raise HTTPException(status_code=404, detail="File not found in Supabase")

        transcription = result.decode("utf-8") if isinstance(result, bytes) else str(result)

        turn = turn_manager.process_user_turn(session_id=req.session_id, user_input=transcription)

        return {
            "transcribed_text": transcription,
            "turn": turn.dict()
        }    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)