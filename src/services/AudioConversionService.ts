/**
 * AudioConversionService - Converts M4A audio files to MP3
 * 
 * This service handles audio format conversion for better Whisper compatibility.
 * Uses Web Audio API for browser/Expo Web, and provides fallback options.
 */

export interface ConversionResult {
  success: boolean;
  mp3Uri?: string;
  originalUri?: string;
  error?: string;
  fileSize?: number;
}

class AudioConversionService {
  /**
   * Convert M4A audio file to MP3
   * @param m4aUri - Local URI of the M4A file
   * @returns Promise with conversion result
   */
  async convertToMp3(m4aUri: string): Promise<ConversionResult> {
    try {
      console.log('🎵 Converting M4A to MP3:', m4aUri);

      // For Expo Web - use browser-based conversion
      if (typeof window !== 'undefined' && window.AudioContext) {
        return await this.convertUsingWebAudio(m4aUri);
      }

      // For React Native - return original file (M4A works fine with Whisper)
      console.log('📱 Running on React Native - keeping M4A format (compatible with Whisper)');
      
      // Check file size to ensure we have audio data
      try {
        const response = await fetch(m4aUri);
        const blob = await response.blob();
        console.log('📏 Original M4A file size:', blob.size, 'bytes');
        
        if (blob.size === 0) {
          throw new Error('Audio file is empty (0 bytes)');
        }
        
        return {
          success: true,
          mp3Uri: m4aUri, // Return original M4A (Whisper supports it)
          originalUri: m4aUri,
          fileSize: blob.size,
        };
      } catch (fileError) {
        console.error('❌ Error checking M4A file:', fileError);
        return {
          success: false,
          error: `File check failed: ${fileError}`,
          originalUri: m4aUri,
        };
      }

    } catch (error) {
      console.error('Audio conversion error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown conversion error',
        originalUri: m4aUri,
      };
    }
  }

  /**
   * Web Audio API conversion (for Expo Web)
   */
  private async convertUsingWebAudio(m4aUri: string): Promise<ConversionResult> {
    try {
      // Fetch the M4A file
      const response = await fetch(m4aUri);
      const arrayBuffer = await response.arrayBuffer();

      // Decode audio data
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      // Convert to MP3 using MediaRecorder (if supported)
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/mp3')) {
        return await this.encodeToMp3WithMediaRecorder(audioBuffer, audioContext);
      }

      // Fallback: Convert to WAV (more universally supported)
      console.warn('⚠️ MP3 encoding not supported, converting to WAV instead');
      return await this.encodeToWav(audioBuffer);

    } catch (error) {
      console.error('Web Audio conversion error:', error);
      throw error;
    }
  }

  /**
   * Encode audio buffer to MP3 using MediaRecorder
   */
  private async encodeToMp3WithMediaRecorder(
    audioBuffer: AudioBuffer, 
    audioContext: AudioContext
  ): Promise<ConversionResult> {
    return new Promise((resolve, reject) => {
      try {
        // Create a MediaStreamAudioDestinationNode
        const destination = audioContext.createMediaStreamDestination();
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(destination);

        // Set up MediaRecorder
        const mediaRecorder = new MediaRecorder(destination.stream, {
          mimeType: 'audio/mp3'
        });

        const chunks: Blob[] = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunks.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          const mp3Blob = new Blob(chunks, { type: 'audio/mp3' });
          const mp3Uri = URL.createObjectURL(mp3Blob);
          
          resolve({
            success: true,
            mp3Uri: mp3Uri,
            fileSize: mp3Blob.size,
          });
        };

        mediaRecorder.onerror = (error) => {
          reject(error);
        };

        // Start recording and play the audio
        mediaRecorder.start();
        source.start();

        // Stop recording when audio finishes
        source.onended = () => {
          setTimeout(() => mediaRecorder.stop(), 100);
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Fallback: Encode to WAV format
   */
  private async encodeToWav(audioBuffer: AudioBuffer): Promise<ConversionResult> {
    try {
      // Simple WAV encoding
      const length = audioBuffer.length;
      const sampleRate = audioBuffer.sampleRate;
      const channels = audioBuffer.numberOfChannels;
      
      // Create WAV buffer
      const buffer = new ArrayBuffer(44 + length * channels * 2);
      const view = new DataView(buffer);
      
      // WAV header
      const writeString = (offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
          view.setUint8(offset + i, string.charCodeAt(i));
        }
      };
      
      writeString(0, 'RIFF');
      view.setUint32(4, 36 + length * channels * 2, true);
      writeString(8, 'WAVE');
      writeString(12, 'fmt ');
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true);
      view.setUint16(22, channels, true);
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, sampleRate * channels * 2, true);
      view.setUint16(32, channels * 2, true);
      view.setUint16(34, 16, true);
      writeString(36, 'data');
      view.setUint32(40, length * channels * 2, true);
      
      // Convert audio data
      let offset = 44;
      for (let i = 0; i < length; i++) {
        for (let channel = 0; channel < channels; channel++) {
          const sample = Math.max(-1, Math.min(1, audioBuffer.getChannelData(channel)[i]));
          view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
          offset += 2;
        }
      }
      
      const wavBlob = new Blob([buffer], { type: 'audio/wav' });
      const wavUri = URL.createObjectURL(wavBlob);
      
      return {
        success: true,
        mp3Uri: wavUri, // Actually WAV, but compatible
        fileSize: wavBlob.size,
      };

    } catch (error) {
      throw error;
    }
  }

  /**
   * Backend conversion approach - upload M4A and let server convert
   * This is the recommended approach for production
   */
  async convertOnBackend(m4aUri: string, backendEndpoint?: string): Promise<ConversionResult> {
    try {
      const endpoint = backendEndpoint || process.env.AUDIO_CONVERSION_ENDPOINT || 'http://localhost:8000/convert-audio';
      
      const formData = new FormData();
      const response = await fetch(m4aUri);
      const blob = await response.blob();
      formData.append('audio', blob, 'recording.m4a');
      formData.append('outputFormat', 'mp3');

      const conversionResponse = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      if (!conversionResponse.ok) {
        throw new Error(`Backend conversion failed: ${conversionResponse.status}`);
      }

      const convertedBlob = await conversionResponse.blob();
      const mp3Uri = URL.createObjectURL(convertedBlob);

      return {
        success: true,
        mp3Uri: mp3Uri,
        originalUri: m4aUri,
        fileSize: convertedBlob.size,
      };

    } catch (error) {
      console.error('Backend conversion error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Backend conversion failed',
        originalUri: m4aUri,
      };
    }
  }

  /**
   * Clean up blob URLs to prevent memory leaks
   */
  cleanupBlobUrl(blobUrl: string) {
    if (blobUrl && blobUrl.startsWith('blob:')) {
      URL.revokeObjectURL(blobUrl);
    }
  }
}

// Export singleton instance
export const audioConversionService = new AudioConversionService();
export default AudioConversionService;
