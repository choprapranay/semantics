import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface HomeScreenProps {
  userName: string;
  onNavigateToPractice: () => void;
  onNavigateToCreate: () => void;
}

export default function HomeScreen({ userName, onNavigateToPractice, onNavigateToCreate }: HomeScreenProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.brandText}>semantic</Text>
      
      <View style={styles.content}>
        <View style={styles.welcomeContainer}>
          <Text style={styles.welcomeText}>Welcome,</Text>
          <Text style={styles.userNameText}>{userName}</Text>
        </View>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.primaryButton} onPress={onNavigateToPractice}>
            <Text style={styles.buttonText}>Practice</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.primaryButton} onPress={onNavigateToCreate}>
            <Text style={styles.buttonText}>Create</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingTop: 80,
    paddingHorizontal: 20,
  },
  brandText: {
    fontSize: 32,
    fontFamily: 'RedHatDisplay-Bold',
    fontStyle: 'italic',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 60,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
  },
  welcomeContainer: {
    marginBottom: 100,
    alignItems: 'flex-start',
  },
  welcomeText: {
    fontSize: 56,
    fontFamily: 'RedHatDisplay-Regular',
    color: '#000000',
    marginBottom: 8,
    textAlign: 'left',
  },
  userNameText: {
    fontSize: 72,
    fontFamily: 'RedHatDisplay-Bold',
    color: '#007AFF',
    textAlign: 'left',
  },
  buttonContainer: {
    width: '100%',
    gap: 24,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 32,
    paddingHorizontal: 80,
    borderRadius: 24,
    alignItems: 'center',
    minHeight: 100,
    minWidth: 320,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 32,
    fontFamily: 'RedHatDisplay-Bold',
  },
});
