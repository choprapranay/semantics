import spacy 
from models.session import ScoreMetrics

nlp = spacy.load("en_core_web_sm")

def score_conversation(turn_history: list, vocabulary_focus: list) -> ScoreMetrics:

    vocab_set = set(word.lower() for word in vocabulary_focus)

    total_vocab_used = 0
    total_tokens = 0
    total_sentences = 0
    complete_sentences = 0
    naturalness_scores = []

    for turn in turn_history:
        user_input = turn["user_input"]
        doc = nlp(user_input)
        tokens = [t.text.lower() for t in doc if t.is_alpha]
        total_tokens += len(tokens)
        total_vocab_used += sum(1 for t in tokens if t in vocab_set)

        sentences = list(doc.sents)
        total_sentences += len(sentences)
        complete_sentences += sum(1 for s in sentences if len(s)>2)

        naturalness_scores.append(1.0 if all(t.is_alpha or t.is_punct for t in doc) else 0.7)

    vocab_score = total_vocab_used / max(total_tokens, 1)
    clarity_score = complete_sentences / max(total_sentences, 1)
    naturalness_score = sum(naturalness_scores) / max(len(naturalness_scores), 1)
    overall_score = (vocab_score + clarity_score + naturalness_score) / 3

    # Map to CEFR based on vocab score as a simple heuristic
    if vocab_score > 0.75:
        cefr = "B2"
    elif vocab_score > 0.5:
        cefr = "B1"
    else:
        cefr = "A2"
    
    feedback_messages = []
    if vocab_score < 0.5: 
        feedback_messages.append("Try using more words from vocabulary relevant to the scenario.")
    else: 
        feedback_messages.append("Great work using situational vocabulary!")

    if clarity_score < 0.7:
        feedback_messages.append("Try to be more clear, forming more complete sentences.")
    else: 
        feedback_messages.append("Well-articulated, great work!")

    if naturalness_score < 0.7:
        feedback_messages.append("Your speech could be more natural and authentic.")
    else: 
        feedback_messages.append("Great job speaking naturally!")
    
    feedback_messages.append("Aim for steady, clear delivery at all times.")

    return {
        "metrics": ScoreMetrics(
        naturalness=naturalness_score,
        clarity=clarity_score,
        vocabulary=vocab_score,
        pace=1.0,  # placeholder
        overall_score=overall_score,
        cefr_level=cefr),
        "feedback_messages": feedback_messages}





