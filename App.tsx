import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import HomeScreen from './src/screens/HomeScreen';
import PracticeScreen from './src/screens/PracticeScreen';
import FeedbackScreen from './src/screens/FeedbackScreen';
import CreateScreen from './src/screens/CreateScreen';
import { audioService } from './src/services/AudioService';

type Screen = 'home' | 'practice' | 'create' | 'feedback';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [customScenario, setCustomScenario] = useState<string | null>(null);

  useEffect(() => {
    // Request microphone permissions on app start
    audioService.requestPermissions();
  }, []);

  const handleNavigateToPractice = () => {
    setCustomScenario(null); // Clear any custom scenario for default practice
    setCurrentScreen('practice');
  };

  const handleNavigateToCreate = () => {
    setCurrentScreen('create');
  };

  const handleNavigateToPracticeWithScenario = (scenario: string) => {
    setCustomScenario(scenario);
    setCurrentScreen('practice');
  };

  const handleExitPractice = () => {
    setCurrentScreen('feedback');
  };

  const handleNavigateHome = () => {
    setCurrentScreen('home');
  };

  return (
    <>
      <StatusBar style="dark" />
      {currentScreen === 'home' && (
        <HomeScreen
          onNavigateToPractice={handleNavigateToPractice}
          onNavigateToCreate={handleNavigateToCreate}
        />
      )}
      {currentScreen === 'practice' && (
        <PracticeScreen 
          onExit={handleExitPractice} 
          customScenario={customScenario}
        />
      )}
      {currentScreen === 'create' && (
        <CreateScreen 
          onNavigateToPractice={handleNavigateToPracticeWithScenario}
          onNavigateHome={handleNavigateHome}
        />
      )}
      {currentScreen === 'feedback' && (
        <FeedbackScreen onNavigateHome={handleNavigateHome} />
      )}
    </>
  );
}

