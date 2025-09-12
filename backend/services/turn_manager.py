from datetime import datetime
from typing import List, Optional

from backend.models.session import Session, TurnData
from backend.models.feedback import ThoughtBubble, FeedbackResponse
from backend.services.session_manager import SessionManager
from backend.models.scenario import ScenarioContext
from backend.services.openai_service import OpenAIService
#from scoring import score_conversation


class TurnManager: 
    def __init__(self, session_manager: SessionManager, openai_service: OpenAIService):
        self.session_manager = session_manager
        self.openai_service = openai_service

    def process_user_turn(self, session_id, user_input: str) -> TurnData:
        session = self.session_manager.get_session(session_id)

        scenario: ScenarioContext = ScenarioContext(**session.context)
        
        ai_response = self.openai_service.generate_ai_response(user_input=user_input, scenario=scenario, conversation_history=session.turn_history)
        
        
        thought_suggestions = self.openai_service.generate_thought_bubbles(ai_response=ai_response, scenario=scenario)
        bubble_objs = [ThoughtBubble(suggestion_text=s, complexity_level=scenario.difficulty) for s in thought_suggestions]
        
        turn = TurnData(
            turn_number=len(session.turn_history) + 1,
            user_input=user_input,
            ai_response=ai_response,
            timestamp=datetime.now().isoformat(),
            feedback=None, #placeholder until replaced w/ real data
            bubble_suggestions=[b.dict() for b in bubble_objs]
        )


        session.turn_history.append(turn.dict())
        self.session_manager.update_session(session_id, {"turn_history":session.turn_history})

        return turn
    
    def get_conversation_context(self, session_id: str) -> List[TurnData]:
        session = self.session_manager.get_session(session_id)
        return [TurnData(**turn) for turn in session.turn_history]


    # def end_session_feedback(self, session_id: str):
    #     session = self.session_manager.get_session(session_id)
    #     scenario_vocab = session.context.get("vocabulary_focus", [])
    #
    #     scored = score_conversation(session.turn_history, scenario_vocab)
    #
    #     self.session_manager.update_session(session_id, {"final_feedback": {"metrics": scored["metrics"].dict(), "messages": scored["feedback_messages"]}})
    #
    #     session.status = "ended"
    #     self.session_manager.update_session(session_id, {"status": session.status})
    #
    #     return scored





