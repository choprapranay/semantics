from pydantic import BaseModel # type: ignore
from typing import List, Dict, Optional

class ScenarioContext(BaseModel):
    category: str  #category of the conversation
    description: str #scenario description
    role: str #the role that the user is playing
    objectives: List[str]  #goals to achieve in scenario by user
    vocabulary_focus: List[str] #key words or hints to include
    difficulty: str #E/M/H mapped to CEHR

class ScenarioRequest(BaseModel):
    scenario_type: str #whether it's randomized or custom
    custom_input: Optional[str] = None #if they pick a custom scenario, stores it here
    difficulty: Optional[str] = None #easy, medium, hard - will default to medium if they pick custom, or else their choice

