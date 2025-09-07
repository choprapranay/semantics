import { Audio } from 'expo-av';
import { AudioRecordingOptions, VUMeterData } from '../types';
import { SupabaseService, AudioUploadResult } from './SupabaseService';

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

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync({
        android: {
          extension: '.m4a',
          outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4,
          audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC,
          sampleRate: this.recordingOptions.sampleRate,
          numberOfChannels: this.recordingOptions.channels,
          bitRate: this.recordingOptions.bitRate,
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.RECORDING_OPTION_IOS_OUTPUT_FORMAT_MPEG4AAC,
          audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
          sampleRate: this.recordingOptions.sampleRate,
          numberOfChannels: this.recordingOptions.channels,
          bitRate: this.recordingOptions.bitRate,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: this.recordingOptions.bitRate,
        },
      });

      await recording.startAsync();
      this.recording = recording;
    } catch (error) {
      throw error;
    }
  }

  async stopRecording(): Promise<string | null> {
    try {
      if (!this.recording) {
        return null;
      }

      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();
      this.recording = null;
      return uri;
    } catch (error) {
      throw error;
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
