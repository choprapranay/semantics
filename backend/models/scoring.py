from typing import List, Dict, Any
from backend.models.session import ScoreMetrics
from backend.models.feedback import FeedbackResponse

def score_conversation(turn_history: List[Dict], scenario_vocab: List[str]) -> Dict[str, Any]: 

    FILLER_WORDS = {"um", "uh", "like", "you know", "so", "well", "hmm"}

    total_turns = len(turn_history)
    if total_turns == 0:
        return {
            "metrics": ScoreMetrics(naturalness=0, clarity=0, vocabulary=0, pace=0, overall_score=0, cefr_level="B1"),
            "feedback_messages": []
        }

    naturalness_score = 0.0
    clarity_score = 0.0
    vocab_score = 0.0
    pace_score = 0.0

    total_vocab_hits = 0
    total_tokens = 0
    total_filler_count = 0

    all_text = []

    for turn in turn_history:
        user_input = turn.get("user_input", "").strip()
        all_text.append(user_input)
        tokens = user_input.lower().split()
        num_tokens = len(tokens)
        total_tokens += num_tokens

        filler_count = sum(1 for t in tokens if t in FILLER_WORDS)
        total_filler_count += filler_count
        filler_ratio = filler_count / max(num_tokens, 1)

        naturalness_score += 1.0 if user_input.endswith(('.', '!', '?')) else 0.5
        naturalness_score -= min(filler_ratio, 0.5)
        naturalness_score = max(naturalness_score, 0.0)

        clarity_score += min(num_tokens / 20.0, 1.0) - min(filler_ratio, 0.5)
        clarity_score = max(clarity_score, 0.0)

        vocab_hits = sum(1 for word in scenario_vocab if word.lower() in user_input.lower())
        total_vocab_hits += vocab_hits
        vocab_score += min(vocab_hits / max(len(scenario_vocab), 1), 1.0)

        pace_score += 1.0 if 2 <= num_tokens <= 30 else 0.5

    avg_naturalness = round(naturalness_score / total_turns, 2)
    avg_clarity = round(clarity_score / total_turns, 2)
    avg_vocab = round(vocab_score / total_turns, 2)
    avg_pace = round(pace_score / total_turns, 2)
    overall_score = round((avg_naturalness + avg_clarity + avg_vocab + avg_pace) / 4, 2)

    cefr_level = turn_history[0].get("bubble_suggestions", [{}])[0].get("complexity_level", "B1")

    metrics = ScoreMetrics(
        naturalness=avg_naturalness,
        clarity=avg_clarity,
        vocabulary=avg_vocab,
        pace=avg_pace,
        overall_score=overall_score,
        cefr_level=cefr_level
    )

    # Consolidated feedback across all turns
    grammar_issues = []
    suggestions = []

    if total_vocab_hits == 0:
        grammar_issues.append("No target vocabulary used in the session.")
        suggestions.append(f"Try to include words like: {', '.join(scenario_vocab)}")

    if total_tokens / max(total_turns, 1) < 2:
        grammar_issues.append("Responses may be too short on average.")
        suggestions.append("Try to expand your answers for clarity.")

    if total_filler_count > 0:
        grammar_issues.append(f"Used filler words ({total_filler_count}) across the session")
        suggestions.append("Reduce filler words like 'um', 'uh', 'like', 'so'.")

    if any(not text.endswith(('.', '!', '?')) for text in all_text):
        grammar_issues.append("Some responses may lack proper ending punctuation.")
        suggestions.append("End sentences with '.', '!', or '?'")

    feedback_msgs = [
        FeedbackResponse(
            relevance_score=min(total_vocab_hits / max(len(scenario_vocab), 1), 1.0),
            coherence_check=(len(grammar_issues) == 0),
            grammar_issues=grammar_issues,
            suggestions=suggestions
        )
    ]

    return {"metrics": metrics, "feedback_messages": feedback_msgs}

