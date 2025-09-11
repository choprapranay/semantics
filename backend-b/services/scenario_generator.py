from typing import List, Optional
import random
from models.scenario import ScenarioContext, ScenarioRequest

class ScenarioGenerator: 
   
   def generate_random_scenario(self, difficulty: str) -> ScenarioContext:
        difficulty_to_cefr = {"easy": "A2", "medium": "B1", "hard": "B2"}
        cefr_level = difficulty_to_cefr[difficulty]

        categories = ['restaurant','travel booking','job interview', 'customer service','negotation of transaction']
        category = random.choice(categories)

        objectives = ['practice polite requests', 'use relevant vocabulary', 'maintain social conventions', 'ask for instructions']
        objective = random.choice(objectives)

        roles = ['customer', 'assistant', 'owner', 'manager','employee reporting to manager']
        role = random.choice(roles)

        vocabulary_focus = ['please','thank you','have a good day!','appointment', 'concern']
        
        scenario = ScenarioContext(
            category=category, 
            description=f"Generating a detailed, realistic scenario involving an aspect of {category}",
            role=role,
            objectives=[objective],
            vocabulary_focus=vocabulary_focus,
            difficulty=cefr_level
        )

        return scenario
   
   def generate_custom_scenario(self, user_input: str) -> ScenarioContext: 
       difficulty = "B1"
       category = user_input
       description=user_input
       role=user_input
       

       scenario = ScenarioContext(
           category=category,
           description=description,
           role=role,
           objectives=[],
           vocabulary_focus=[],
           difficulty=difficulty
       )

       return scenario