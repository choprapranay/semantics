from datetime import datetime, timedelta
import uuid 
from utils.redis_client import save_session, load_session, delete_session
from models.session import Session, TurnData
from models.scenario import ScenarioContext

class SessionManager: 
    def __init__(self, redis_client):
        self.redis = redis_client

    def create_session(self, user_name: str, difficulty_choice: str, chosen_duration_seconds: int):
        session_id = str(uuid.uuid4())
        cefr_level = {"easy":"A2","medium":"B1","hard":"B2"}[difficulty_choice]

        scenario = ScenarioContext(
        category="",
        description="",
        role="",
        objectives=[],
        vocabulary_focus=[],
        difficulty=cefr_level
        )
        
        session = Session(
            session_id = session_id,
            user_name = user_name,
            cefr_level = cefr_level,
            context = scenario.dict(),
            turn_history = [],
            current_scores = {},
            start_time = datetime.now().isoformat(),
            duration_seconds = chosen_duration_seconds,
            status = "active",

        )
        
        save_session(self.redis, session_id, session.dict())
        return session_id
    
    def get_session(self, session_id: str):
        data = load_session(self.redis, session_id)
        if not data: 
            raise Exception("Session not found")
        return Session(**data)
    
    def update_session(self, session_id: str, updates: dict):
        session = self.get_session(session_id)
        for key, value in updates.items():
            setattr(session, key, value)

        save_session(self.redis, session_id, session.dict())

    def end_session(self, session_id: str):
        session = self.get_session(session_id)
        session.status = "ended"
        save_session(self.redis, session_id, session.dict())
        delete_session(self.redis, session_id)

    def check_session_timeout(self, session_id: str): 
        session = self.get_session(session_id)
        start_dt = datetime.fromisoformat(session.start_time)
        now = datetime.now()

        elapsed = (now - start_dt).total_seconds()
        
        if elapsed >= session.duration_seconds:
            self.end_session(session_id)
            return False
        return True
    

