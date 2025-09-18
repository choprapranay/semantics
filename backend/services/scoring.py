from typing import List, Dict, Any
from pydantic import BaseModel

class ScoreMetrics(BaseModel):
    overall_score: float
    naturalness: float
    clarity: float
    vocabulary: float
    pace: float

def score_conversation(turn_history: List[Dict[str, Any]], vocab_focus: List[str]) -> Dict[str, Any]:
    user_turns = [t for t in turn_history if t.get("user_input")]
    n_turns = len(user_turns)

    if n_turns == 0:
        metrics = ScoreMetrics(
            overall_score=0,
            naturalness=0,
            clarity=0,
            vocabulary=0,
            pace=0,
        )
        return {
            "metrics": metrics,
            "feedback_messages": [{"suggestions": ["No input detected. Try saying something next time 😄."]}],
        }

    word_counts = []
    for t in user_turns:
        wc = len(str(t.get("user_input", "")).split())
        word_counts.append(wc)
    avg_words = sum(word_counts) / max(1, len(word_counts))

    vocab_used = 0
    if vocab_focus:
        vocab_used = sum(
            1 for t in user_turns
            for w in str(t.get("user_input","")).lower().split()
            if w in {vf.lower() for vf in vocab_focus}
        )

    naturalness = min(10.0, 5.0 + (avg_words / 5.0))
    clarity = min(10.0, 6.0 + (n_turns * 0.4))
    vocabulary = min(10.0, 4.0 + (vocab_used * 0.5))
    pace = 7.0
    overall = round((naturalness + clarity + vocabulary + pace) / 4.0, 1)

    metrics = ScoreMetrics(
        overall_score=overall,
        naturalness=round(naturalness, 1),
        clarity=round(clarity, 1),
        vocabulary=round(vocabulary, 1),
        pace=round(pace, 1),
    )

    suggestions = []
    if avg_words < 6:
        suggestions.append("Try speaking in slightly longer sentences.")
    if vocab_used == 0 and vocab_focus:
        suggestions.append("Work in a few of the target vocabulary words.")
    suggestions.append("Great job keeping the conversation going!")

    return {
        "metrics": metrics,
        "feedback_messages": [{"suggestions": suggestions}],
    }