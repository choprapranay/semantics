import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, Alert, Image, ScrollView, TextInput } from 'react-native';
import { useState, useEffect } from 'react';
import { Audio } from 'expo-av';
import { useFonts, RedHatDisplay_400Regular, RedHatDisplay_700Bold } from '@expo-google-fonts/red-hat-display';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

function MainMenu({ onNavigateToTest, onNavigateToConversation, onNavigateToScenario }: { onNavigateToTest: () => void; onNavigateToConversation: () => void; onNavigateToScenario: () => void }) {
    return (
        <SafeAreaView style={styles.mainMenuContainer}>
            <View style={styles.header}>
                <Text style={styles.appTitle}>semantic</Text>
            </View>
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

function ScenarioCreationScreen({
                                    onNavigateToMain,
                                    onStartConversation
                                }: {
    onNavigateToMain: () => void;
    onStartConversation: (scenarioText: string) => void;
}) {
    const [scenarioText, setScenarioText] = useState('');

    const handleStartConversation = () => {
        if (scenarioText.trim()) {
            console.log('Starting conversation with scenario:', scenarioText);
            onStartConversation(scenarioText);
        } else {
            Alert.alert('Please describe a situation', 'Enter a scenario to practice before starting the conversation.');
        }
    };

    return (
        <SafeAreaView style={styles.scenarioContainer}>
            <View style={styles.scenarioHeader}>
                <TouchableOpacity onPress={onNavigateToMain}>
                    <Text style={styles.scenarioCloseButton}>✕</Text>
                </TouchableOpacity>
            </View>

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
                            setScenarioText(scenarioText);
                        }}
                    />
                </View>
            </View>

            <View style={styles.scenarioFooter}>
                <TouchableOpacity style={styles.scenarioStartButton} onPress={handleStartConversation}>
                    <Text style={styles.scenarioStartText}>Start conversation</Text>
                    <Text style={styles.scenarioStartArrow}>→</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

function ConversationScreen({
                                onNavigateToMain,
                                isRandomConversation = true,
                                sessionId,
                                scenario
                            }: {
    onNavigateToMain: () => void;
    isRandomConversation?: boolean;
    sessionId: string | null;
    scenario: string | null;
}) {
    async function speakWithOpenAI(text: string) {
        try {
            const res = await fetch(`${API_BASE_URL}/speak`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text }),
            });

            if (!res.ok) {
                throw new Error(`TTS request failed: ${await res.text()}`);
            }

            const arrayBuffer = await res.arrayBuffer();
            const soundObject = new Audio.Sound();
            await soundObject.loadAsync({
                uri: URL.createObjectURL(new Blob([arrayBuffer], { type: 'audio/wav' })),
            });
            await soundObject.playAsync();
        } catch (err) {
            console.error('TTS error:', err);
        }
    }

    const [conversationStep, setConversationStep] = useState(0);
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [permissionResponse, requestPermission] = Audio.usePermissions();
    const [timeLeft, setTimeLeft] = useState(120);
    const [showFeedback, setShowFeedback] = useState(false);
    const [score, setScore] = useState<any>(null);
    const [transcript, setTranscript] = useState('');
    const [aiReply, setAiReply] = useState('');
    const [conversation, setConversation] =
        useState<{ speaker: 'AI' | 'You'; text: string }[]>([]);

    useEffect(() => {
        if (scenario) {
            setConversation([{ speaker: 'AI', text: scenario }]);
        }
    }, [scenario]);

    useEffect(() => {
        if (showFeedback && sessionId) {
            fetch(`${API_BASE_URL}/sessions/${sessionId}/score`, { method: 'POST' })
                .then(res => res.json())
                .then(data => {
                    console.log('🔎 Feedback payload from backend:', data);
                    setScore(data);
                })
                .catch(err => console.error('Scoring error', err));
        }
    }, [showFeedback, sessionId]);

    const startNewConversation = () => {
        setConversationStep(0);
        setTimeLeft(10);
        setShowFeedback(false);
        setIsRecording(false);
        setRecording(null);
        setTranscript('');
        setAiReply('');
    };

    const conversationFlow = [
        { barista: "Hi there! What can I get for you today?", userResponse: "I'd like a latte, please." },
        { barista: "Sure thing. Hot or iced?", userResponse: "Hot, please." },
        { barista: "Perfect! What size would you like?", userResponse: "Large, please." },
        { barista: "Great! Any milk preferences?", userResponse: "Oat milk, please." },
        { barista: "Excellent choice! That'll be $5.50. Anything else?", userResponse: "No, that's all. Thank you!" }
    ];

    const currentBaristaMessage = conversationFlow[conversationStep]?.barista;
    const isLastStep = conversationStep >= conversationFlow.length - 1;

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
            Alert.alert('Error', 'Failed to start recording: ' + err.message);
        }
    };

    const stopRecording = async () => {
        if (!recording) return;
        try {
            setIsRecording(false);
            await recording.stopAndUnloadAsync();
            await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

            const uri = recording.getURI();
            if (uri && sessionId) {
                const response = await fetch(uri);
                const blob = await response.blob();

                const formData = new FormData();
                formData.append('file', new File([blob], 'speech.webm', { type: 'audio/webm' }));

                const transcriptRes = await fetch(`${API_BASE_URL}/transcribe`, {
                    method: 'POST',
                    body: formData
                });
                const { text } = await transcriptRes.json();

                const turnRes = await fetch(`${API_BASE_URL}/turn`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        session_id: sessionId,
                        user_input: text
                    }),
                });

                const { turn } = await turnRes.json();
                console.log('User said:', text);
                console.log('AI replied:', turn.ai_response);

                setConversation(prev => [
                    ...prev,
                    { speaker: 'You', text },
                    { speaker: 'AI', text: turn.ai_response }
                ]);

                setTranscript(text);
                setAiReply(turn.ai_response);
                speakWithOpenAI(turn.ai_response);
            }
            setRecording(null);
        } catch (error: any) {
            Alert.alert('❌ Recording Error', 'Failed to stop recording: ' + error.message);
        }
    };

    const handleMicPress = () => {
        if (isRecording) stopRecording();
        else startRecording();
    };

    if (showFeedback) {
        return (
            <SafeAreaView style={styles.feedbackContainer}>
                <Text style={styles.feedbackTitle}>Feedback</Text>

                {score && (
                    <View style={styles.feedbackCard}>
                        <View style={styles.metricRow}>
                            <Text style={styles.metricLabel}>Overall</Text>
                            <Text style={styles.metricValue}>{score.metrics.overall_score}/10</Text>
                        </View>

                        <View style={styles.metricRow}>
                            <Text style={styles.metricLabel}>Naturalness</Text>
                            <Text style={styles.metricValue}>{score.metrics.naturalness}/10</Text>
                        </View>

                        <View style={styles.metricRow}>
                            <Text style={styles.metricLabel}>Clarity</Text>
                            <Text style={styles.metricValue}>{score.metrics.clarity}/10</Text>
                        </View>

                        <View style={styles.metricRow}>
                            <Text style={styles.metricLabel}>Vocabulary</Text>
                            <Text style={styles.metricValue}>{score.metrics.vocabulary}/10</Text>
                        </View>

                        <View style={styles.metricRow}>
                            <Text style={styles.metricLabel}>Pace</Text>
                            <Text style={styles.metricValue}>{score.metrics.pace}/10</Text>
                        </View>

                        <View style={styles.suggestionsContainer}>
                            {score.feedback_messages.map((f: any, i: number) => (
                                <Text key={i} style={styles.suggestionText}>
                                    • {f.suggestions.join('\n• ')}
                                </Text>
                            ))}
                        </View>
                    </View>
                )}
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.conversationContainer}>
            <View style={styles.conversationHeader}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity onPress={onNavigateToMain}>
                        <Text style={styles.closeButton}>✕</Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.headerCenter}>
                    <Text style={styles.conversationTitle}>
                        {scenario || 'Conversation'}
                    </Text>
                </View>
                <View style={styles.headerRight}>
                    {isRandomConversation && (
                        <TouchableOpacity onPress={startNewConversation}>
                            <Text style={styles.skipButton}>Skip</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <ScrollView
                style={styles.conversationArea}
                contentContainerStyle={styles.conversationScrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.conversationContent}>
                    {conversation.map((msg, idx) => (
                        <Text
                            key={idx}
                            style={{
                                fontSize: 18,
                                marginBottom: 12,
                                color: msg.speaker === 'You' ? '#7C4DFF' : '#135BEC',
                                textAlign: 'center'
                            }}
                        >
                            {msg.speaker}: {msg.text}
                        </Text>
                    ))}
                </View>
            </ScrollView>

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

            <View style={{alignItems:'center', marginBottom:20}}>
                <TouchableOpacity
                    onPress={() => setShowFeedback(true)}
                    style={{
                        backgroundColor: '#e5e7eb',
                        paddingHorizontal: 20,
                        paddingVertical: 10,
                        borderRadius: 8
                    }}
                >
                    <Text style={{ fontSize:16, color:'#111827' }}>End Conversation</Text>
                </TouchableOpacity>
            </View>

        </SafeAreaView>
    );
}

export default function App() {
    const [currentPage, setCurrentPage] = useState<'main' | 'test' | 'conversation' | 'scenario'>('main');
    const [isRandomConversation, setIsRandomConversation] = useState(true);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [scenario, setScenario] = useState<string | null>(null);

    async function startSession(customText?: string) {
        const res = await fetch(`${API_BASE_URL}/sessions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_name: 'Mobile User',
                difficulty: 'medium',
                duration_seconds: 600,
                custom_scenario: customText || null
            }),
        });
        const data = await res.json();
        setSessionId(data.session_id);
        setScenario(data.scenario.description);
        setIsRandomConversation(!customText);
        setCurrentPage('conversation');
    }

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
                    onNavigateToConversation={() => startSession()}
                    onNavigateToScenario={() => setCurrentPage('scenario')}
                />
            ) : currentPage === 'scenario' ? (
                <ScenarioCreationScreen
                    onNavigateToMain={() => setCurrentPage('main')}
                    onStartConversation={(text) => startSession(text)}
                />
            ) : (
                <ConversationScreen
                    onNavigateToMain={() => setCurrentPage('main')}
                    isRandomConversation={isRandomConversation}
                    sessionId={sessionId}
                    scenario={scenario}
                />
            )}
        </SafeAreaProvider>
    );
}

const styles = StyleSheet.create({
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
    feedbackCard: {
        backgroundColor: '#f9fafb',
        padding: 24,
        borderRadius: 16,
        width: '90%',
        marginTop: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 3,
    },
    metricRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    metricLabel: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
        fontFamily: 'RedHatDisplay_700Bold',
    },
    metricValue: {
        fontSize: 18,
        fontWeight: '700',
        color: '#135BEC',
        fontFamily: 'RedHatDisplay_700Bold',
    },
    suggestionsContainer: {
        marginTop: 20,
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
        paddingTop: 16,
    },
    suggestionText: {
        fontSize: 16,
        color: '#374151',
        marginBottom: 8,
        lineHeight: 22,
        fontFamily: 'RedHatDisplay_400Regular',
    },
});
