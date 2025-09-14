import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, Alert, Image, ScrollView, TextInput } from 'react-native';
import { useState, useEffect } from 'react';
import { Audio } from 'expo-av';
import { useFonts, RedHatDisplay_400Regular, RedHatDisplay_700Bold } from '@expo-google-fonts/red-hat-display';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

// Main Menu Component
function MainMenu({ onNavigateToTest, onNavigateToConversation, onNavigateToScenario }: { onNavigateToTest: () => void; onNavigateToConversation: () => void; onNavigateToScenario: () => void }) {
  return (
    <SafeAreaView style={styles.mainMenuContainer}>
      <View style={styles.header}>
        <Text style={styles.appTitle}>semantic</Text>
      </View>
      
      {/* <TouchableOpacity style={styles.settingsButton}>
        <Image source={require('./assets/control.png')} style={styles.settingsIcon} />
      </TouchableOpacity> */}
      
      <View style={styles.contentArea}>
        <Text style={styles.greeting}>Hey, ready to chat?</Text>
        <Text style={styles.subtitle}>Choose your path to practice your language skills.</Text>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.randomButton} onPress={onNavigateToConversation}>
            <Text style={styles.randomIcon}>↗️</Text>
            <Text style={styles.randomButtonText}>Random Conversation</Text>
            <Text style={styles.randomSubtext}>Jump into a spontaneous chat.</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.createButton} onPress={onNavigateToScenario}>
            <Text style={styles.createIcon}>✏️</Text>
            <Text style={styles.createButtonText}>Create Your Own Scenario</Text>
            <Text style={styles.createSubtext}>Craft a custom conversation.</Text>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity style={styles.testButton} onPress={onNavigateToTest}>
          <Text style={styles.testButtonText}>Developer Test Page</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// Test Page Component (existing functionality)
function TestPage({ onNavigateToMain }: { onNavigateToMain: () => void }) {
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [permissionResponse, requestPermission] = Audio.usePermissions();

  useEffect(() => {
    // Request audio permissions on app load
    if (!permissionResponse?.granted) {
      requestPermission();
    }
  }, []);

  const fetchEphemeralToken = async () => {
    setLoading(true);
    try {
      console.log('Calling:', `${API_BASE_URL}/realtime/ephemeral`);
      
      const result = await fetch(`${API_BASE_URL}/realtime/ephemeral`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      console.log('Response status:', result.status);
      console.log('Response ok:', result.ok);
      
      if (!result.ok) {
        const errorText = await result.text();
        console.log('Error response:', errorText);
        throw new Error(`HTTP ${result.status}: ${errorText}`);
      }
      
      const data = await result.json();
      console.log('Response data:', data);
      Alert.alert('✅ SUCCESS', JSON.stringify(data, null, 2));
      
    } catch (error: any) {
      console.error('❌ ERROR:', error);
      
      if (error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_REFUSED')) {
        Alert.alert('🚨 Backend Not Running', 
          `Cannot connect to backend at ${API_BASE_URL}\n\nPlease start your backend server:\n\ncd backend\npython3 -m uvicorn app:app --host 0.0.0.0 --port 3001`);
      } else {
        Alert.alert('❌ API Error', `${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      if (!permissionResponse?.granted) {
        const permission = await requestPermission();
        if (!permission.granted) {
          Alert.alert('Permission Required', 'Microphone permission is required for recording');
          return;
        }
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      setIsRecording(true);
    } catch (err: any) {
      console.error('Failed to start recording', err);
      Alert.alert('Error', 'Failed to start recording: ' + err.message);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      const uri = recording.getURI();
      if (uri) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `recording-${timestamp}.m4a`;
        
        // Just show success without file operations
        Alert.alert('🎤 Recording Complete!', 
          `Recording captured successfully!\n\nFile: ${fileName}\nTemp URI: ${uri}\n\n(File saved in browser memory)`);
        console.log('Recording completed:', { fileName, uri, timestamp });
      }

      setRecording(null);
    } catch (error: any) {
      console.error('Failed to stop recording', error);
      Alert.alert('❌ Recording Error', 'Failed to stop recording: ' + error.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity 
        style={styles.button} 
        onPress={fetchEphemeralToken}
        disabled={loading}
      >
        <Text>
          {loading ? 'Loading...' : 'Get Ephemeral Token'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.button} 
        onPress={isRecording ? stopRecording : startRecording}
      >
        <Text>
          {isRecording ? 'Stop Recording' : 'Start Recording'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.backButton} onPress={onNavigateToMain}>
        <Text style={styles.backButtonText}>← Back to Main Menu</Text>
      </TouchableOpacity>

      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

// Scenario Creation Screen Component
function ScenarioCreationScreen({ onNavigateToMain, onStartConversation }: { onNavigateToMain: () => void; onStartConversation: () => void }) {
  const [scenarioText, setScenarioText] = useState('');

  const handleStartConversation = () => {
    if (scenarioText.trim()) {
      console.log('Starting conversation with scenario:', scenarioText);
      // TODO: When LLM is integrated, this will send the scenario to the backend
      // For now, just start the conversation with the hardcoded flow
      onStartConversation();
    } else {
      Alert.alert('Please describe a situation', 'Enter a scenario to practice before starting the conversation.');
    }
  };

  return (
    <SafeAreaView style={styles.scenarioContainer}>
      {/* Header with close button */}
      <View style={styles.scenarioHeader}>
        <TouchableOpacity onPress={onNavigateToMain}>
          <Text style={styles.scenarioCloseButton}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Main content */}
      <View style={styles.scenarioMain}>
        <View style={styles.scenarioInputContainer}>
          <Text style={styles.scenarioLabel}>Describe a situation</Text>
          <TextInput
            style={styles.scenarioTextArea}
            placeholder="For example, 'I want to practice ordering food at a fancy restaurant.'"
            placeholderTextColor="#909090"
            value={scenarioText}
            onChangeText={setScenarioText}
            multiline={true}
            textAlignVertical="top"
            returnKeyType="done"
            blurOnSubmit={true}
            onSubmitEditing={() => {
              // This will close the keyboard when return is pressed
              setScenarioText(scenarioText);
            }}
          />
        </View>
      </View>

      {/* Footer with start button - always at bottom */}
      <View style={styles.scenarioFooter}>
        <TouchableOpacity style={styles.scenarioStartButton} onPress={handleStartConversation}>
          <Text style={styles.scenarioStartText}>Start conversation</Text>
          <Text style={styles.scenarioStartArrow}>→</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// Conversation Screen Component
function ConversationScreen({ onNavigateToMain, isRandomConversation = true }: { onNavigateToMain: () => void; isRandomConversation?: boolean }) {
  const [conversationStep, setConversationStep] = useState(0);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [permissionResponse, requestPermission] = Audio.usePermissions();
  const [timeLeft, setTimeLeft] = useState(10);
  const [showFeedback, setShowFeedback] = useState(false);

  // Function to start a new conversation
  const startNewConversation = () => {
    // TODO: When LLM is integrated, this will generate a new conversation scenario
    // For now, reset to the beginning of the hardcoded conversation
    setConversationStep(0);
    setTimeLeft(10);
    setShowFeedback(false);
    setIsRecording(false);
    setRecording(null);
    console.log('Starting new conversation...');
  };
  
  const conversationFlow = [
    { barista: "Hi there! What can I get for you today?", userResponse: "I'd like a latte, please." },
    { barista: "Sure thing. Hot or iced?", userResponse: "Hot, please." },
    { barista: "Perfect! What size would you like?", userResponse: "Large, please." },
    { barista: "Great! Any milk preferences?", userResponse: "Oat milk, please." },
    { barista: "Excellent choice! That'll be $5.50. Anything else?", userResponse: "No, that's all. Thank you!" }
  ];

  const currentBaristaMessage = conversationFlow[conversationStep]?.barista;
  const currentUserResponse = conversationFlow[conversationStep]?.userResponse;
  const isLastStep = conversationStep >= conversationFlow.length - 1;

  // Timer effect
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setShowFeedback(true);
    }
  }, [timeLeft]);

  const startRecording = async () => {
    try {
      if (!permissionResponse?.granted) {
        const permission = await requestPermission();
        if (!permission.granted) {
          Alert.alert('Permission Required', 'Microphone permission is required for recording');
          return;
        }
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      setIsRecording(true);
    } catch (err: any) {
      console.error('Failed to start recording', err);
      Alert.alert('Error', 'Failed to start recording: ' + err.message);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      const uri = recording.getURI();
      if (uri) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `recording-${timestamp}.m4a`;
        
        // For now, just log the recording location
        console.log('Recording completed:', { fileName, uri, timestamp });
        
        // Advance conversation step after recording
        if (!isLastStep) {
          setConversationStep(conversationStep + 1);
        }
      }

      setRecording(null);
    } catch (error: any) {
      console.error('Failed to stop recording', error);
      Alert.alert('❌ Recording Error', 'Failed to stop recording: ' + error.message);
    }
  };

  const handleMicPress = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // Show feedback screen when timer is done
  if (showFeedback) {
    return (
      <SafeAreaView style={styles.feedbackContainer}>
        <Text style={styles.feedbackTitle}>Feedback</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.conversationContainer}>
      {/* Header */}
      <View style={styles.conversationHeader}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={onNavigateToMain}>
            <Text style={styles.closeButton}>✕</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.headerCenter}>
          <Text style={styles.conversationTitle}>Ordering Coffee</Text>
        </View>
        <View style={styles.headerRight}>
          {isRandomConversation ? (
            <TouchableOpacity onPress={startNewConversation}>
              <Text style={styles.skipButton}>Skip</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Timer */}
      <View style={styles.timerContainer}>
        <Text style={styles.timerText}>{timeLeft}</Text>
      </View>

      {/* Conversation Area */}
      <ScrollView 
        style={styles.conversationArea}
        contentContainerStyle={styles.conversationScrollContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        <View style={styles.conversationContent}>
          {/* Current Message - Always Centered */}
          <View style={styles.currentMessageContainer}>
            <Text style={styles.baristaLabel}>Barista:</Text>
            <Text style={styles.baristaMessage}>{currentBaristaMessage}</Text>
          </View>

          {/* All Previous Messages - Below the centered message */}
          <View style={styles.previousMessagesContainer}>
            {/* Show all previous conversation history in reverse order */}
            {Array.from({ length: conversationStep }, (_, i) => {
              const stepIndex = conversationStep - 1 - i;
              const step = conversationFlow[stepIndex];
              if (!step) return null;
              
              return (
                <View key={stepIndex}>
                  {/* User response */}
                  <View style={[styles.messageContainer, i === 0 ? styles.previousMessage : styles.oldestMessage]}>
                    <Text style={i === 0 ? styles.userLabel : styles.userLabelOldest}>You:</Text>
                    <Text style={i === 0 ? styles.userMessage : styles.userMessageOldest}>{step.userResponse}</Text>
                  </View>
                  
                  {/* Barista message */}
                  <View style={[styles.messageContainer, i === 0 ? styles.previousMessage : styles.oldestMessage]}>
                    <Text style={i === 0 ? styles.baristaLabelPrevious : styles.baristaLabelOldest}>Barista:</Text>
                    <Text style={i === 0 ? styles.baristaMessagePrevious : styles.baristaMessageOldest}>{step.barista}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Microphone Button */}
      <View style={styles.micContainer}>
        <TouchableOpacity 
          style={[
            styles.micButton, 
            isRecording ? styles.micButtonRecording : 
            !isLastStep ? styles.micButtonActive : styles.micButtonInactive
          ]}
          onPress={handleMicPress}
        >
          <Text style={isRecording ? styles.micIconRecording : 
            !isLastStep ? styles.micIcon : styles.micIconInactive}>
            {isRecording ? '⏹️' : '🎤'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// Main App Component
export default function App() {
  const [currentPage, setCurrentPage] = useState<'main' | 'test' | 'conversation' | 'scenario'>('main');
  const [isRandomConversation, setIsRandomConversation] = useState(true);
  
  const [fontsLoaded] = useFonts({
    RedHatDisplay_400Regular,
    RedHatDisplay_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      {currentPage === 'main' ? (
        <MainMenu 
          onNavigateToTest={() => setCurrentPage('test')}
          onNavigateToConversation={() => {
            setIsRandomConversation(true);
            setCurrentPage('conversation');
          }}
          onNavigateToScenario={() => setCurrentPage('scenario')}
        />
      ) : currentPage === 'test' ? (
        <TestPage onNavigateToMain={() => setCurrentPage('main')} />
      ) : currentPage === 'scenario' ? (
        <ScenarioCreationScreen 
          onNavigateToMain={() => setCurrentPage('main')}
          onStartConversation={() => {
            setIsRandomConversation(false);
            setCurrentPage('conversation');
          }}
        />
      ) : (
        <ConversationScreen 
          onNavigateToMain={() => setCurrentPage('main')} 
          isRandomConversation={isRandomConversation}
        />
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  // Main Menu Styles
  mainMenuContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  headerText: {
    fontSize: 14,
    color: '#999',
    fontFamily: 'RedHatDisplay_400Regular',
  },
  appTitle: {
    top: -10,
    fontSize: 42,
    fontWeight: 'bold',
    color: '#000',
    fontFamily: 'RedHatDisplay_700Bold',
  },
  settingsButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    padding: 8,
    zIndex: 10,
  },
  settingsIcon: {
    width: 20,
    height: 20,
  },
  contentArea: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
    fontFamily: 'RedHatDisplay_700Bold',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
    textAlign: 'center',
    fontFamily: 'RedHatDisplay_400Regular',
  },
  buttonContainer: {
    width: '100%',
    gap: 16,
  },
  randomButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  randomIcon: {
    fontSize: 24,
    color: '#fff',
    marginBottom: 8,
  },
  randomButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
    fontFamily: 'RedHatDisplay_700Bold',
  },
  randomSubtext: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
    fontFamily: 'RedHatDisplay_400Regular',
  },
  createButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  createIcon: {
    fontSize: 24,
    color: '#000',
    marginBottom: 8,
  },
  createButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
    fontFamily: 'RedHatDisplay_700Bold',
  },
  createSubtext: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'RedHatDisplay_400Regular',
  },
  testButton: {
    marginTop: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
  },
  testButtonText: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'RedHatDisplay_400Regular',
  },
  
  // Test Page Styles (existing)
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    margin: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#000',
  },
  backButton: {
    marginTop: 20,
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontFamily: 'RedHatDisplay_400Regular',
  },

  // Conversation Screen Styles
  conversationContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  conversationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    minHeight: 20, // Increase the height of the white bar
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerLeft: {
    flex: 1,
    alignItems: 'flex-start',
  },
  headerCenter: {
    flex: 2,
    alignItems: 'center',
  },
  headerRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  timerContainer: {
    backgroundColor: '#135BEC',
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'RedHatDisplay_700Bold',
  },
  feedbackContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#000000',
    fontFamily: 'RedHatDisplay_700Bold',
  },
  closeButton: {
    fontSize: 20,
    color: '#6b7280',
    fontFamily: 'RedHatDisplay_400Regular',
  },
  conversationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    fontFamily: 'RedHatDisplay_700Bold',
  },
  skipButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#135BEC',
    fontFamily: 'RedHatDisplay_700Bold',
  },
  conversationArea: {
    flex: 1,
  },
  conversationScrollContent: {
    paddingHorizontal: 24,
    paddingVertical: 24,
    alignItems: 'center',
    minHeight: '100%',
  },
  conversationContent: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: '60%', // This pushes the current message to the center
    paddingBottom: 100, // Extra space at bottom for scrolling
  },
  currentMessageContainer: {
    alignItems: 'center',
    marginBottom: 40,
    maxWidth: 400,
  },
  previousMessagesContainer: {
    alignItems: 'center',
  },
  messageContainer: {
    alignItems: 'center',
    marginBottom: 32,
    maxWidth: 400,
  },
  baristaLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#135BEC',
    marginBottom: 16,
    fontFamily: 'RedHatDisplay_700Bold',
  },
  baristaMessage: {
    fontSize: 30,
    fontWeight: '500',
    color: '#374151',
    textAlign: 'center',
    lineHeight: 36,
    fontFamily: 'RedHatDisplay_400Regular',
  },
  userLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#7C4DFF',
    marginBottom: 16,
    fontFamily: 'RedHatDisplay_700Bold',
  },
  userMessage: {
    fontSize: 30,
    fontWeight: '500',
    color: '#7C4DFF',
    textAlign: 'center',
    lineHeight: 36,
    fontFamily: 'RedHatDisplay_400Regular',
  },
  previousMessage: {
    opacity: 0.5,
  },
  baristaLabelPrevious: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#135BEC',
    marginBottom: 16,
    fontFamily: 'RedHatDisplay_700Bold',
  },
  baristaMessagePrevious: {
    fontSize: 30,
    fontWeight: '500',
    color: '#374151',
    textAlign: 'center',
    lineHeight: 36,
    fontFamily: 'RedHatDisplay_400Regular',
  },
  oldestMessage: {
    opacity: 0.25,
  },
  baristaLabelOldest: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#135BEC',
    marginBottom: 16,
    fontFamily: 'RedHatDisplay_700Bold',
  },
  baristaMessageOldest: {
    fontSize: 30,
    fontWeight: '500',
    color: '#374151',
    textAlign: 'center',
    lineHeight: 36,
    fontFamily: 'RedHatDisplay_400Regular',
  },
  userLabelOldest: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#7C4DFF',
    marginBottom: 16,
    fontFamily: 'RedHatDisplay_700Bold',
  },
  userMessageOldest: {
    fontSize: 30,
    fontWeight: '500',
    color: '#7C4DFF',
    textAlign: 'center',
    lineHeight: 36,
    fontFamily: 'RedHatDisplay_400Regular',
  },
  micContainer: {
    paddingHorizontal: 24,
    paddingVertical: 24,
    minHeight: 100, // Increase the height of the white bar
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  micButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  micButtonActive: {
    backgroundColor: '#135BEC',
    shadowColor: '#135BEC',
    shadowOpacity: 0.4,
    shadowRadius: 20,
  },
  micButtonInactive: {
    backgroundColor: '#e5e7eb',
  },
  micButtonRecording: {
    backgroundColor: '#ef4444',
    shadowColor: '#ef4444',
    shadowOpacity: 0.4,
    shadowRadius: 20,
  },
  micIcon: {
    fontSize: 40,
    color: '#fff',
  },
  micIconInactive: {
    fontSize: 40,
    color: '#9ca3af',
  },
  micIconRecording: {
    fontSize: 40,
    color: '#fff',
  },
  // Scenario Creation Screen Styles
  scenarioContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scenarioHeader: {
    padding: 16,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
  scenarioCloseButton: {
    fontSize: 30,
    color: '#0D121B',
    fontFamily: 'RedHatDisplay_400Regular',
  },
  scenarioMain: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  scenarioInputContainer: {
    width: '100%',
  },
  scenarioLabel: {
    fontSize: 12,
    color: '#000000',
    fontFamily: 'RedHatDisplay_400Regular',
    marginBottom: 8,
  },
  scenarioTextArea: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '500',
    color: '#0D121B',
    fontFamily: 'RedHatDisplay_400Regular',
    height: 200,
    textAlignVertical: 'top',
    backgroundColor: 'transparent',
    borderWidth: 0,
    padding: 0,
  },
  scenarioFooter: {
    padding: 24,
    paddingBottom: 20,
  },
  scenarioStartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  scenarioStartText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#135BEC',
    fontFamily: 'RedHatDisplay_700Bold',
    marginRight: 8,
  },
  scenarioStartArrow: {
    fontSize: 18,
    color: '#135BEC',
    fontFamily: 'RedHatDisplay_700Bold',
  },
});
