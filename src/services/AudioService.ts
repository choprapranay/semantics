import { Audio } from 'expo-av';
import { AudioRecordingOptions, VUMeterData } from '../types';
import { SupabaseService, AudioUploadResult } from './SupabaseService';
import { audioConversionService, ConversionResult } from './AudioConversionService';

export class AudioService {
  private recording: Audio.Recording | null = null;
  private recordingOptions: AudioRecordingOptions = {
    quality: 'high',
    sampleRate: 44100,
    channels: 1,
    bitRate: 128000,
  };

  async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      return false;
    }
  }

  async startRecording(): Promise<void> {
    try {
      if (this.recording) {
        await this.stopRecording();
      }

      // Request permissions first
      const { status: permissionStatus } = await Audio.requestPermissionsAsync();
      if (permissionStatus !== 'granted') {
        throw new Error('Audio recording permission not granted');
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
      });

      const recording = new Audio.Recording();
      
      // More robust recording options
      const recordingOptions = {
        android: {
          extension: '.m4a',
          outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4,
          audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.RECORDING_OPTION_IOS_OUTPUT_FORMAT_MPEG4AAC,
          audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm;codecs=opus',
          bitsPerSecond: 128000,
        },
      };

      console.log('🎤 Preparing to record with options:', recordingOptions);
      await recording.prepareToRecordAsync(recordingOptions);
      
      console.log('🎤 Starting recording...');
      await recording.startAsync();
      this.recording = recording;
      
      // Verify recording status
      const status = await recording.getStatusAsync();
      console.log('🎤 Recording status:', status);
      
    } catch (error) {
      console.error('❌ Failed to start recording:', error);
      throw error;
    }
  }

  async stopRecording(): Promise<string | null> {
    try {
      if (!this.recording) {
        console.log('⚠️ No active recording to stop');
        return null;
      }

      console.log('🛑 Stopping recording...');
      
      // Get status before stopping
      const statusBefore = await this.recording.getStatusAsync();
      console.log('📊 Recording status before stop:', statusBefore);

      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();
      
      console.log('📁 Recording URI:', uri);
      
      // Check if we actually have a file
      if (uri) {
        try {
          const response = await fetch(uri);
          const blob = await response.blob();
          console.log('📏 Recording file size:', blob.size, 'bytes');
          
          if (blob.size === 0) {
            console.error('❌ Recording file is empty (0 bytes)');
          }
        } catch (fileError) {
          console.error('❌ Error checking file size:', fileError);
        }
      }
      
      this.recording = null;
      return uri;
    } catch (error) {
      console.error('❌ Error stopping recording:', error);
      this.recording = null;
      throw error;
    }
  }

  /**
   * Stop recording and convert to MP3
   * @returns Promise with MP3 file URI
   */
  async stopRecordingAndConvertToMp3(): Promise<ConversionResult> {
    try {
      const m4aUri = await this.stopRecording();
      
      if (!m4aUri) {
        return {
          success: false,
          error: 'No audio was recorded',
        };
      }

      // Convert M4A to MP3
      const conversionResult = await audioConversionService.convertToMp3(m4aUri);
      
      return {
        ...conversionResult,
        originalUri: m4aUri,
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Recording or conversion failed',
      };
    }
  }

  async playAudio(uri: string): Promise<void> {
    try {
      const { sound } = await Audio.Sound.createAsync({ uri });
      await sound.playAsync();
      
      // Clean up after playback
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    } catch (error) {
      throw error;
    }
  }

  // Mock VU meter data for development
  getVUMeterData(): VUMeterData {
    return {
      level: Math.random() * 0.8 + 0.2, // Random level between 0.2-1.0
      isActive: this.recording !== null,
    };
  }

  isRecording(): boolean {
    return this.recording !== null;
  }

  /**
   * Get detailed recording status for debugging
   */
  async getRecordingStatus(): Promise<any> {
    if (!this.recording) {
      return { isRecording: false, recording: null };
    }

    try {
      const status = await this.recording.getStatusAsync();
      return {
        isRecording: true,
        status: status,
        canRecord: status.canRecord,
        isRecording: status.isRecording,
        isDoneRecording: status.isDoneRecording,
        durationMillis: status.durationMillis,
      };
    } catch (error) {
      console.error('Error getting recording status:', error);
      return { isRecording: false, error: error };
    }
  }

  setRecordingOptions(options: Partial<AudioRecordingOptions>): void {
    this.recordingOptions = { ...this.recordingOptions, ...options };
  }

  /**
   * Record audio and upload to Supabase
   * @param duration - Recording duration in milliseconds (optional)
   * @param userId - User ID for organizing files (optional)
   * @returns Promise with upload result
   */
  async recordAndUpload(
    duration?: number, 
    userId?: string
  ): Promise<AudioUploadResult> {
    try {
      // Start recording
      await this.startRecording();

      // If duration is specified, wait for that duration
      if (duration) {
        await new Promise(resolve => setTimeout(resolve, duration));
      }

      // Stop recording and get file URI
      const audioUri = await this.stopRecording();
      
      if (!audioUri) {
        return {
          success: false,
          error: 'No audio was recorded',
        };
      }

      // Upload to Supabase
      const uploadResult = await SupabaseService.uploadAudioFile(audioUri, userId);
      
      return uploadResult;

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Recording failed',
      };
    }
  }

  /**
   * Record audio for a specific duration and upload
   * @param durationMs - Duration in milliseconds
   * @param userId - User ID for organizing files (optional)
   * @returns Promise with upload result
   */
  async recordForDuration(
    durationMs: number, 
    userId?: string
  ): Promise<AudioUploadResult> {
    return this.recordAndUpload(durationMs, userId);
  }
}

export const audioService = new AudioService();
