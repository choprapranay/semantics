import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Dimensions, Alert, KeyboardAvoidingView, Platform, ScrollView, TouchableWithoutFeedback, Keyboard } from 'react-native';

const { width, height } = Dimensions.get('window');

// Responsive calculations
const isSmallScreen = height < 700;

interface CreateScreenProps {
  onNavigateToPractice: (scenario: string) => void;
  onNavigateHome: () => void;
}

export default function CreateScreen({ onNavigateToPractice, onNavigateHome }: CreateScreenProps) {
  const [scenarioPrompt, setScenarioPrompt] = useState('');

  const handleCreateScenario = () => {
    if (scenarioPrompt.trim().length === 0) {
      Alert.alert('Please enter a scenario', 'You need to describe what kind of conversation you want to practice.');
      return;
    }

    if (scenarioPrompt.trim().length < 10) {
      Alert.alert('Too short', 'Please provide a more detailed scenario description.');
      return;
    }

    // TODO: This will be replaced with actual LLM scenario generation
    console.log('Creating scenario with prompt:', scenarioPrompt);
    
    // For now, navigate to practice with the user's prompt
    // Later this will: 1) Send to LLM, 2) Generate conversation, 3) Then navigate
    onNavigateToPractice(scenarioPrompt);
  };

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <TouchableWithoutFeedback onPress={dismissKeyboard}>
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.brandText}>semantic</Text>
            <Text style={styles.modeText}>create</Text>
          </View>

          {/* Main Content */}
          <View style={styles.content}>
            {/* Title */}
            <Text style={styles.titleText}>Create Your Scenario</Text>
            
            {/* Subtitle */}
            <Text style={styles.subtitleText}>
              Describe the conversation you'd like to practice
            </Text>

            {/* Text Input */}
            <TextInput
              style={styles.textInput}
              placeholder="e.g., Ordering coffee at a busy café, Job interview for a tech role, Asking for directions in a foreign city..."
              placeholderTextColor="#999999"
              value={scenarioPrompt}
              onChangeText={setScenarioPrompt}
              multiline={true}
              numberOfLines={6}
              textAlignVertical="top"
              maxLength={500}
              returnKeyType="done"
              blurOnSubmit={true}
            />

            {/* Character Count */}
            <Text style={styles.characterCount}>
              {scenarioPrompt.length}/500
            </Text>
          </View>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            {/* Create Button */}
            <TouchableOpacity 
              style={[
                styles.createButton,
                scenarioPrompt.trim().length === 0 && styles.createButtonDisabled
              ]} 
              onPress={handleCreateScenario}
              disabled={scenarioPrompt.trim().length === 0}
            >
              <Text style={[
                styles.createButtonText,
                scenarioPrompt.trim().length === 0 && styles.createButtonTextDisabled
              ]}>
                Create
              </Text>
            </TouchableOpacity>

            {/* Back Button */}
            <TouchableOpacity style={styles.backButton} onPress={onNavigateHome}>
              <Text style={styles.backButtonText}>Back to Home</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
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
  content: {
    flex: 1,
    alignItems: 'center',
    paddingTop: isSmallScreen ? 20 : 40,
  },
  titleText: {
    fontSize: isSmallScreen ? 24 : 28,
    fontFamily: 'RedHatDisplay-Bold',
    color: '#007AFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitleText: {
    fontSize: isSmallScreen ? 16 : 18,
    fontFamily: 'RedHatDisplay-Regular',
    color: '#666666',
    marginBottom: 40,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 24,
  },
  textInput: {
    width: '100%',
    height: isSmallScreen ? 120 : 150,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'RedHatDisplay-Regular',
    color: '#000000',
    backgroundColor: '#ffffff',
    textAlignVertical: 'top',
  },
  characterCount: {
    alignSelf: 'flex-end',
    marginTop: 8,
    fontSize: 14,
    fontFamily: 'RedHatDisplay-Regular',
    color: '#999999',
  },
  buttonContainer: {
    alignItems: 'center',
    gap: 16,
    marginTop: 20,
  },
  createButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 20,
    paddingHorizontal: 60,
    borderRadius: 16,
    minWidth: 200,
    alignItems: 'center',
  },
  createButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  createButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontFamily: 'RedHatDisplay-Bold',
  },
  createButtonTextDisabled: {
    color: '#999999',
  },
  backButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#007AFF',
    backgroundColor: 'transparent',
    minWidth: 160,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontFamily: 'RedHatDisplay-Regular',
  },
});
