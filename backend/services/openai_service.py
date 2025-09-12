from typing import List
from backend.models.scenario import ScenarioContext
from backend.models.feedback import ThoughtBubble
import openai

class OpenAIService: 

    def __init__(self, api_key: str):
        self.client = openai.OpenAI(api_key=api_key)

    def generate_ai_response(self, user_input: str, scenario: ScenarioContext, conversation_history: List[dict]) -> str:

        history_text = "\n".join([f"User: {t['user_input']}\nAI: {t['ai_response']}" for t in conversation_history])
        prompt = f"""
        Assume the role of a conversational assistant for language development. Scenario: {scenario.description}. Role: {scenario.role}. 
        Difficulty: {scenario.difficulty}. Conversation history: {history_text}. The individual has just said the following: {user_input}.
        Generate an appropriate, life-like, real, thoughtful response that's compliant with CEFR {scenario.difficulty}
        """
        
        response = self.client.chat.completions.create(model="gpt-5",  messages=[{"role": "user", "content": prompt}],temperature=1)

        return response.choices[0].message.content.strip()

    def generate_thought_bubbles(self, ai_response: str, scenario: ScenarioContext) -> List[str]:

        prompt = f"""
        Assume the role of a language tutor. Based on this response {ai_response}, suggest 4 possible responses that the user could say or 
        do in the conversation. Ensure suitability for a learner of CEFR {scenario.difficulty}. Each suggestion should be well thought-out, and
        1-2 sentences. Output as a numbered list.
        """

        response = self.client.chat.completions.create(model="gpt-5",  messages=[{"role": "user", "content": prompt}],temperature=1)

        content = response.choices[0].message.content.strip()
        suggestions = []
        for line in content.split("\n"):
            line = line.strip()
            if line and (line[0].isdigit() or line.startswith("-")):
                cleaned = line.lstrip("0123456789.- ").strip()
                if cleaned:
                    suggestions.append(cleaned)

        return suggestions[:4]
    

