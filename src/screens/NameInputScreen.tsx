import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Dimensions, Alert, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';

const { width, height } = Dimensions.get('window');

// Responsive calculations
const isSmallScreen = height < 700;

interface NameInputScreenProps {
  onNameSubmit: (name: string) => void;
}

export default function NameInputScreen({ onNameSubmit }: NameInputScreenProps) {
  const [name, setName] = useState('');

  const handleSubmit = () => {
    const trimmedName = name.trim();
    
    if (trimmedName.length === 0) {
      Alert.alert('Please enter your name', 'We need your name to personalize your experience.');
      return;
    }

    if (trimmedName.length < 2) {
      Alert.alert('Name too short', 'Please enter at least 2 characters.');
      return;
    }

    // Submit the name
    onNameSubmit(trimmedName);
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
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.welcomeText}>Welcome to</Text>
            <Text style={styles.brandText}>semantic</Text>
          </View>

          {/* Main Content */}
          <View style={styles.inputSection}>
            <Text style={styles.questionText}>What is your name?</Text>
            
            <TextInput
              style={styles.nameInput}
              placeholder="Enter your name"
              placeholderTextColor="#999999"
              value={name}
              onChangeText={setName}
              autoFocus={true}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
              maxLength={50}
              autoCapitalize="words"
              autoCorrect={false}
            />
          </View>

          {/* Submit Button */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[
                styles.submitButton,
                name.trim().length === 0 && styles.submitButtonDisabled
              ]} 
              onPress={handleSubmit}
              disabled={name.trim().length === 0}
            >
              <Text style={[
                styles.submitButtonText,
                name.trim().length === 0 && styles.submitButtonTextDisabled
              ]}>
                Continue
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: isSmallScreen ? 60 : 80,
  },
  welcomeText: {
    fontSize: isSmallScreen ? 18 : 22,
    fontFamily: 'RedHatDisplay-Regular',
    color: '#666666',
    marginBottom: 8,
  },
  brandText: {
    fontSize: isSmallScreen ? 36 : 42,
    fontFamily: 'RedHatDisplay-Bold',
    fontStyle: 'italic',
    color: '#000000',
  },
  inputSection: {
    alignItems: 'center',
    marginBottom: isSmallScreen ? 60 : 80,
  },
  questionText: {
    fontSize: isSmallScreen ? 20 : 24,
    fontFamily: 'RedHatDisplay-Regular',
    color: '#000000',
    marginBottom: 30,
    textAlign: 'center',
  },
  nameInput: {
    width: '100%',
    maxWidth: 300,
    height: 56,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 12,
    paddingHorizontal: 20,
    fontSize: 18,
    fontFamily: 'RedHatDisplay-Regular',
    color: '#000000',
    backgroundColor: '#ffffff',
    textAlign: 'center',
  },
  buttonContainer: {
    alignItems: 'center',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 18,
    paddingHorizontal: 50,
    borderRadius: 16,
    minWidth: 200,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontFamily: 'RedHatDisplay-Bold',
  },
  submitButtonTextDisabled: {
    color: '#999999',
  },
});
