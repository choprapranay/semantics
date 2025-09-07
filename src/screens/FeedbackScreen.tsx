import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

interface FeedbackScreenProps {
  onNavigateHome: () => void;
}

// Placeholder feedback data (will be replaced with actual LLM analysis)
const PLACEHOLDER_FEEDBACK = {
  score: 87,
  feedbackPoints: [
    "sumedh sumedh jklvdsjakfj;dkljaf",
    "pc pc pc pc fjdklfj klsajfjsdklfs",
    "vriti fjdklajflksdajfladjsklf"
  ]
};

export default function FeedbackScreen({ onNavigateHome }: FeedbackScreenProps) {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.brandText}>semantic</Text>
        <Text style={styles.modeText}>practice</Text>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Well Done Title */}
        <Text style={styles.wellDoneText}>Well Done!</Text>
        
        {/* Report Subtitle */}
        <Text style={styles.reportText}>Here's your report:</Text>

        {/* Score Section */}
        <View style={styles.scoreSection}>
          <Text style={styles.scoreLabel}>Score</Text>
          <View style={styles.scoreCircle}>
            <Text style={styles.scoreNumber}>{PLACEHOLDER_FEEDBACK.score}</Text>
          </View>
        </View>

        {/* Feedback Points */}
        <View style={styles.feedbackSection}>
          {PLACEHOLDER_FEEDBACK.feedbackPoints.map((point, index) => (
            <View key={index} style={styles.feedbackItem}>
              <Text style={styles.bulletPoint}>•</Text>
              <Text style={styles.feedbackText}>{point}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Home Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.homeButton} onPress={onNavigateHome}>
          <Text style={styles.homeButtonText}>Home</Text>
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
    paddingTop: 20,
  },
  wellDoneText: {
    fontSize: 32,
    fontFamily: 'RedHatDisplay-Bold',
    color: '#007AFF',
    marginBottom: 8,
  },
  reportText: {
    fontSize: 24,
    fontFamily: 'RedHatDisplay-Regular',
    color: '#000000',
    marginBottom: 40,
  },
  scoreSection: {
    alignItems: 'center',
    marginBottom: 60,
  },
  scoreLabel: {
    fontSize: 20,
    fontFamily: 'RedHatDisplay-Regular',
    color: '#000000',
    marginBottom: 20,
  },
  scoreCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreNumber: {
    fontSize: 48,
    fontFamily: 'RedHatDisplay-Bold',
    color: '#ffffff',
  },
  feedbackSection: {
    alignSelf: 'stretch',
    paddingHorizontal: 20,
  },
  feedbackItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  bulletPoint: {
    fontSize: 18,
    fontFamily: 'RedHatDisplay-Regular',
    color: '#000000',
    marginRight: 8,
    marginTop: 2,
  },
  feedbackText: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'RedHatDisplay-Regular',
    color: '#000000',
    lineHeight: 22,
  },
  buttonContainer: {
    paddingBottom: 40,
    alignItems: 'center',
  },
  homeButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 20,
    paddingHorizontal: 60,
    borderRadius: 16,
    minWidth: 200,
    alignItems: 'center',
  },
  homeButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontFamily: 'RedHatDisplay-Bold',
  },
});
