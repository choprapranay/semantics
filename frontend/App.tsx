import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

export default function App() {
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
      
    } catch (error) {
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
    } catch (err) {
      console.error('Failed to start recording', err);
      Alert.alert('Error', 'Failed to start recording');
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
    } catch (error) {
      console.error('Failed to stop recording', error);
      Alert.alert('❌ Recording Error', 'Failed to stop recording');
    }
  };

  return (
    <View style={styles.container}>
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

      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
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
});
