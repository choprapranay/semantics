from pydantic import BaseModel
from typing import List, Dict, Optional
from datetime import time

difficulty_to_cefr = {"easy":"A2", "medium":"B1", "hard":"B2"}

class Session(BaseModel):
    session_id: str
    user_name: str
    cefr_level: str
    context: Dict
    turn_history: List[dict] = []
    current_scores: dict = {}
    start_time: str
    duration_seconds: int
    status: str = "active"

class TurnData(BaseModel):
    turn_number: int
    user_input: str
    ai_response: str
    timestamp: str
    feedback: Optional[Dict] = None
    bubble_suggestions: Optional[List[Dict]] = None

class ScoreMetrics(BaseModel):
    naturalness: float
    clarity: float
    vocabulary: float
    pace: float
    overall_score: float
    cefr_level: str



