from pydantic import BaseModel # type: ignore
from typing import List, Dict, Optional

class FeedbackResponse(BaseModel):
    relevance_score: float #how relevant the user response is
    coherence_check: bool #if it makes sense, store as true
    grammar_issues: Optional[List[str]] = [] #list of grammar issues, if any
    suggestions: Optional[List[str]] = [] #corrections for future conversations, if any 

class ThoughtBubble(BaseModel):
    suggestion_text: str #the text that pops up as a thought bubble - will integrate into the UI design
    complexity_level: str #matches the CEFR rating we've done a prior mapping to


