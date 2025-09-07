import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, ScrollView, Dimensions } from 'react-native';
import { flushSync } from 'react-dom';
import { audioService } from '../services/AudioService';
import { SupabaseService } from '../services/SupabaseService';

const { width, height } = Dimensions.get('window');

// Responsive calculations
const isSmallScreen = height < 700;
const isMediumScreen = height >= 700 && height < 900;
const previousMessageTop = isSmallScreen ? '30%' : '35%';
const currentMessageTop = isSmallScreen ? '40%' : '45%'; // Moved up to reduce gap by ~5cm
const suggestionsTop = isSmallScreen ? '55%' : '60%';

// Responsive font sizes
const aiMessageFontSize = isSmallScreen ? 24 : 28;
const historyMessageFontSize = isSmallScreen ? 20 : 24;

interface PracticeScreenProps {
  onExit: () => void;
  customScenario?: string | null;
}

interface ConversationStep {
  id: number;
  aiMessage: string;
  userPrompt: string;
  userResponse?: string; // What the user actually said
  suggestions: string[];
  isUserTurn: boolean;
}

const HARDCODED_SCRIPT: ConversationStep[] = [
  {
    id: 1,
    aiMessage: "Hey, how can I help you today?",
    userPrompt: "Respond to the greeting",
    suggestions: ["I'm good", "PC", "I need help with something", "Just browsing"],
    isUserTurn: true,
  },
  {
    id: 2,
    aiMessage: "What's the weather looking like outside?",
    userPrompt: "Answer about the weather",
    suggestions: ["It's sunny", "It's raining", "Pretty cloudy", "Nice and warm"],
    isUserTurn: true,
  },
  {
    id: 3,
    aiMessage: "That sounds nice! Are you planning to go out today?",
    userPrompt: "Share your plans",
    suggestions: ["Yes, I'm going shopping", "Just staying home", "Maybe later", "Not sure yet"],
    isUserTurn: true,
  },
  {
    id: 4,
    aiMessage: "What kind of things do you usually like to do on weekends?",
    userPrompt: "Talk about your weekend activities",
    suggestions: ["I love hiking", "Netflix and chill", "Hang out with friends", "Work on hobbies"],
    isUserTurn: true,
  },
  {
    id: 5,
    aiMessage: "That sounds really fun! Do you have any favorite spots for that?",
    userPrompt: "Share your favorite places",
    suggestions: ["There's a great park nearby", "I prefer staying home", "Downtown is always nice", "The beach is my go-to"],
    isUserTurn: true,
  },
  {
    id: 6,
    aiMessage: "Have you been there recently, or has it been a while?",
    userPrompt: "Talk about recent visits",
    suggestions: ["Just went last week", "It's been months", "I go there all the time", "Planning to go soon"],
    isUserTurn: true,
  },
];

// Placeholder user responses (will be replaced with actual speech-to-text)
const PLACEHOLDER_USER_RESPONSES = [
  "I'm good, thanks for asking!",
  "It's pretty cloudy today, might rain later",
  "Yeah, I'm thinking about going to the mall",
  "I love hiking and being outdoors",
  "There's a great park nearby that I always go to",
  "Just went last week actually, it was amazing"
];

export default function PracticeScreen({ onExit, customScenario }: PracticeScreenProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [showUserPrompt, setShowUserPrompt] = useState(false);
  const [waveAnimation] = useState(new Animated.Value(0));
  const [conversationHistory, setConversationHistory] = useState<{type: 'ai' | 'user', message: string, stepIndex: number}[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);

  const currentConversation = HARDCODED_SCRIPT[currentStep];

  // TODO: When LLM is integrated, replace this with actual scenario generation
  const isCustomScenario = customScenario !== null && customScenario !== undefined;
  
  // Log custom scenario for debugging (remove when LLM integrated)
  React.useEffect(() => {
    if (isCustomScenario) {
      console.log('Custom scenario provided:', customScenario);
      // TODO: Send customScenario to LLM to generate conversation
      // TODO: Replace HARDCODED_SCRIPT with LLM-generated conversation
    }
  }, [customScenario, isCustomScenario]);

  useEffect(() => {
    // AI speaks, then immediately show user prompt (TTS will add natural delay later)
    if (currentConversation) {
      setIsAISpeaking(true);
      setShowUserPrompt(false);
      
      // Immediately show user prompt (no artificial delay)
      setIsAISpeaking(false);
      if (currentConversation.isUserTurn) {
        setShowUserPrompt(true);
        startWaveAnimation();
        // Auto-start recording when user should speak
        handleStartRecording();
      }
    }
  }, [currentStep]);

  const startWaveAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(waveAnimation, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(waveAnimation, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const stopWaveAnimation = () => {
    waveAnimation.stopAnimation();
    waveAnimation.setValue(0);
  };


  const handleStartRecording = async () => {
    try {
      await audioService.startRecording();
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  const handleStopRecording = async () => {
    try {
      setIsRecording(false);
      setIsUploading(true);
      setShowUserPrompt(false);
      stopWaveAnimation();
      
      const audioUri = await audioService.stopRecording();
      
      if (audioUri) {
        // Upload to Supabase
        const result = await SupabaseService.uploadAudioFile(audioUri, 'user123');
        console.log('Upload result:', result);
      }
      
      setIsUploading(false);
      
      // IMMEDIATELY add the AI message you're responding to and your response
      const userResponse = PLACEHOLDER_USER_RESPONSES[currentStep] || "I understand";
      
      // Use flushSync to force immediate React update
      flushSync(() => {
        setConversationHistory(prev => {
          // Add the AI message you're responding to (current one in center) and your response
          const newHistory = [
            ...prev,
            { type: 'ai', message: currentConversation.aiMessage, stepIndex: currentStep },
            { type: 'user', message: userResponse, stepIndex: currentStep }
          ];
          console.log('Added AI question and user response to history:', newHistory);
          return newHistory;
        });
      });
      
      // Use setTimeout to ensure history update renders before step change
      setTimeout(() => {
        if (currentStep < HARDCODED_SCRIPT.length - 1) {
          setCurrentStep(currentStep + 1);
        } else {
          // Conversation ended
          onExit();
        }
      }, 10); // Minimal delay just to ensure rendering
      
    } catch (error) {
      setIsRecording(false);
      setIsUploading(false);
      console.error('Recording failed:', error);
    }
  };

  const handleSuggestionPress = (suggestion: string) => {
    // For now, just move to next step
    // Later this will be replaced with actual speech
    setShowUserPrompt(false);
    stopWaveAnimation();
    
    // IMMEDIATELY add the AI message you're responding to and your response
    
    // Use flushSync to force immediate React update
    flushSync(() => {
      setConversationHistory(prev => {
        // Add the AI message you're responding to (current one in center) and your response
        const newHistory = [
          ...prev,
          { type: 'ai', message: currentConversation.aiMessage, stepIndex: currentStep },
          { type: 'user', message: suggestion, stepIndex: currentStep }
        ];
        console.log('Added AI question and user response to history:', newHistory);
        return newHistory;
      });
    });
    
    // Use setTimeout to ensure history update renders before step change
    setTimeout(() => {
      if (currentStep < HARDCODED_SCRIPT.length - 1) {
        setCurrentStep(currentStep + 1);
      } else {
        onExit();
      }
    }, 10); // Minimal delay just to ensure rendering
  };

  const handleScreenTap = () => {
    if (isRecording) {
      handleStopRecording();
    }
  };

  const waveOpacity = waveAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 0.8],
  });

  const waveScale = waveAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.05],
  });

  return (
    <View style={styles.container}>
      {/* Full screen blue border with wave animation */}
      {showUserPrompt && (
        <Animated.View 
          style={[
            styles.fullScreenBorder,
            {
              opacity: waveOpacity,
              transform: [{ scale: waveAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 1.02],
              })}],
            }
          ]}
        />
      )}

      <View style={styles.header}>
        <Text style={styles.brandText}>semantic</Text>
        <Text style={styles.modeText}>
          {isCustomScenario ? 'custom practice' : 'practice'}
        </Text>
      </View>

      {/* Scrollable conversation history - ABOVE current message */}
      <ScrollView 
        ref={scrollViewRef}
        style={styles.historyScrollView}
        contentContainerStyle={styles.historyContent}
        showsVerticalScrollIndicator={true}
        scrollIndicatorInsets={{ right: 1 }}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {/* Show ALL conversation history, not just last 4 */}
        {conversationHistory.map((item, index) => (
          <Text 
            key={`${item.stepIndex}-${item.type}-${index}`}
            style={[
              item.type === 'ai' ? styles.historyAiMessage : styles.historyUserMessage
            ]}
          >
            {item.message}
          </Text>
        ))}
        {/* Spacer at bottom to ensure proper spacing */}
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Current AI message - FIXED in center */}
      <View style={styles.currentMessageContainer}>
        <Text style={[
          styles.aiMessage,
          isAISpeaking && styles.aiSpeakingMessage
        ]}>
          {currentConversation?.aiMessage}
        </Text>
      </View>

      {/* Thought bubble suggestions - COMPLETELY SEPARATE */}
      {showUserPrompt && currentConversation?.suggestions && (
        <View style={styles.suggestionsContainer}>
          {currentConversation.suggestions.map((suggestion, index) => (
            <View key={index} style={styles.suggestionButton}>
              <Text style={styles.suggestionText}>{suggestion}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Tap to stop recording overlay */}
      {isRecording && (
        <TouchableOpacity 
          style={styles.tapOverlay} 
          onPress={handleScreenTap}
          activeOpacity={1}
        />
      )}

      {/* Exit button */}
      <View style={styles.actionContainer}>
        <TouchableOpacity style={styles.exitButton} onPress={onExit}>
          <Text style={styles.exitButtonText}>Exit</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  fullScreenBorder: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    borderWidth: 15,
    borderColor: '#007AFF',
    borderRadius: 35,
    zIndex: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: 60,
    zIndex: 2,
  },
  brandText: {
    fontSize: 32,
    fontFamily: 'RedHatDisplay-Bold',
    fontStyle: 'italic',
    color: '#000000',
    marginBottom: 4,
  },
  modeText: {
    fontSize: 18,
    fontFamily: 'RedHatDisplay-Regular',
    fontStyle: 'italic',
    color: '#007AFF',
  },
  historyScrollView: {
    position: 'absolute',
    top: 120, // Below header
    left: 0,
    right: 0,
    bottom: isSmallScreen ? '60%' : '55%', // Stops well above current message
    zIndex: 1,
  },
  historyContent: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    flexGrow: 1,
    justifyContent: 'flex-end', // Push content to bottom when history is short
  },
  currentMessageContainer: {
    position: 'absolute',
    top: currentMessageTop,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 3,
    paddingVertical: 20,
  },
  aiMessage: {
    fontSize: aiMessageFontSize,
    fontFamily: 'RedHatDisplay-Regular',
    color: '#007AFF',
    textAlign: 'center',
    lineHeight: aiMessageFontSize + 8,
    paddingHorizontal: 20,
  },
  aiSpeakingMessage: {
    opacity: 0.6,
  },
  historyAiMessage: {
    fontSize: historyMessageFontSize,
    fontFamily: 'RedHatDisplay-Regular',
    color: '#007AFF',
    textAlign: 'center',
    lineHeight: historyMessageFontSize + 8,
    marginBottom: 15,
    opacity: 0.6,
  },
  historyUserMessage: {
    fontSize: historyMessageFontSize - 2,
    fontFamily: 'RedHatDisplay-Regular',
    color: '#9B7EDE', // Light purple/blue color
    textAlign: 'center',
    lineHeight: historyMessageFontSize + 6,
    marginBottom: 20,
    fontStyle: 'italic',
    opacity: 0.8,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: suggestionsTop,
    left: 0,
    right: 0,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 20,
    zIndex: 3,
  },
  suggestionButton: {
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#ffffff',
  },
  suggestionText: {
    fontSize: 16,
    fontFamily: 'RedHatDisplay-Regular',
    color: '#007AFF',
    textAlign: 'center',
  },
  tapOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 10,
  },
  actionContainer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 2,
  },
  exitButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 20,
    paddingHorizontal: 40,
    borderRadius: 16,
    minWidth: 200,
    alignItems: 'center',
  },
  exitButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontFamily: 'RedHatDisplay-Bold',
  },
});
