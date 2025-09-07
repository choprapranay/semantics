import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NameInputScreen from './src/screens/NameInputScreen';
import HomeScreen from './src/screens/HomeScreen';
import PracticeScreen from './src/screens/PracticeScreen';
import FeedbackScreen from './src/screens/FeedbackScreen';
import CreateScreen from './src/screens/CreateScreen';
import { audioService } from './src/services/AudioService';

type Screen = 'nameInput' | 'home' | 'practice' | 'create' | 'feedback';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('nameInput');
  const [customScenario, setCustomScenario] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Request microphone permissions - skip name check for dev testing
    const initializeApp = async () => {
      try {
        // Request microphone permissions
        await audioService.requestPermissions();
        
        // DEV TESTING: Always show name input screen
        // TODO: Uncomment the lines below to restore persistent name storage
        // const storedName = await AsyncStorage.getItem('userName');
        // if (storedName) {
        //   setUserName(storedName);
        //   setCurrentScreen('home');
        // }
      } catch (error) {
        console.error('Error initializing app:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();
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

  const handleNameSubmit = async (name: string) => {
    try {
      // Store the name locally
      await AsyncStorage.setItem('userName', name);
      setUserName(name);
      setCurrentScreen('home');
    } catch (error) {
      console.error('Error storing name:', error);
      // Still proceed even if storage fails
      setUserName(name);
      setCurrentScreen('home');
    }
  };

  // Show loading screen while checking for stored name
  if (isLoading) {
    return (
      <>
        <StatusBar style="dark" />
        {/* You can add a loading spinner here if desired */}
      </>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      {currentScreen === 'nameInput' && (
        <NameInputScreen onNameSubmit={handleNameSubmit} />
      )}
      {currentScreen === 'home' && (
        <HomeScreen
          userName={userName}
          onNavigateToPractice={handleNavigateToPractice}
          onNavigateToCreate={handleNavigateToCreate}
        />
      )}
      {currentScreen === 'practice' && (
        <PracticeScreen 
          onExit={handleExitPractice} 
          customScenario={customScenario}
          userName={userName}
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

