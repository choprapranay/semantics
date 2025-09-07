import { createClient } from '@supabase/supabase-js';
import * as FileSystem from 'expo-file-system';
import { SUPABASE_CONFIG } from '../config/supabase';

export const supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);

export interface AudioUploadResult {
  success: boolean;
  fileUrl?: string;
  fileName?: string;
  error?: string;
  recordId?: string; // Database record ID
}

// Types for database records
export interface AudioRecord {
  id: string;
  user_id: string;
  user_name: string;
  session_id?: string;
  file_url: string;
  file_name: string;
  file_size: number;
  duration?: number;
  created_at: string;
  transcription_status: 'pending' | 'processing' | 'completed' | 'failed';
  transcription_text?: string;
  transcription_confidence?: number;
  processing_started_at?: string;
  processing_completed_at?: string;
}

export interface ConversationSession {
  id: string;
  user_id: string;
  user_name: string;
  scenario_type: 'default' | 'custom';
  scenario_description?: string;
  started_at: string;
  ended_at?: string;
  total_interactions: number;
}

export class SupabaseService {
  private static readonly BUCKET_NAME = SUPABASE_CONFIG.audioBucket;

  /**
   * Upload audio file to Supabase Storage and create database record
   * @param audioUri - Local file URI from expo-av recording
   * @param userId - User ID for organization
   * @param userName - User name for the record
   * @param sessionId - Optional session ID to group recordings
   * @returns Promise with upload result
   */
  static async uploadAudioFile(
    audioUri: string, 
    userId: string,
    userName: string,
    sessionId?: string
  ): Promise<AudioUploadResult> {
    try {
      // Generate unique filename with timestamp - detect file type
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      
      // Detect file type from blob or URI
      let fileExtension = '.mp3'; // Default
      let contentType = 'audio/mp3'; // Default
      
      try {
        const response = await fetch(audioUri);
        const blob = await response.blob();
        
        if (blob.type.includes('m4a') || audioUri.includes('.m4a')) {
          fileExtension = '.m4a';
          contentType = 'audio/m4a';
        } else if (blob.type.includes('webm') || audioUri.includes('.webm')) {
          fileExtension = '.webm';
          contentType = 'audio/webm';
        } else if (blob.type.includes('wav') || audioUri.includes('.wav')) {
          fileExtension = '.wav';
          contentType = 'audio/wav';
        }
        
        console.log('🔍 Detected audio format:', { type: blob.type, extension: fileExtension, size: blob.size });
      } catch (error) {
        console.warn('⚠️ Could not detect audio type, using MP3 default');
      }
      
      const fileName = `recording-${timestamp}${fileExtension}`;
      
      // Create file path with optional user folder
      const filePath = userId ? `${userId}/${fileName}` : fileName;

      // Upload file directly using fetch (works better with React Native)
      const response = await fetch(audioUri);
      const blob = await response.blob();
      const fileSize = blob.size; // Get file size from the blob we already have

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(filePath, blob, {
          contentType: contentType,
          upsert: false, // Don't overwrite existing files
        });

      if (error) {
        console.error('Supabase upload error:', error);
        return {
          success: false,
          error: error.message,
        };
      }

      // Get public URL for the uploaded file
      const { data: urlData } = supabase.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(filePath);

      // Create database record for transcription processing
      const { data: dbRecord, error: dbError } = await supabase
        .from('audio_recordings')
        .insert({
          user_id: userId,
          user_name: userName,
          session_id: sessionId,
          file_url: urlData.publicUrl,
          file_name: fileName,
          file_size: fileSize,
          transcription_status: 'pending',
        })
        .select()
        .single();

      if (dbError) {
        console.error('Database insert error:', dbError);
        // File uploaded but DB record failed - still return success with warning
      }

      return {
        success: true,
        fileUrl: urlData.publicUrl,
        fileName: fileName,
        recordId: dbRecord?.id,
      };

    } catch (error) {
      console.error('Audio upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get list of audio files for a user
   * @param userId - User ID to filter files
   * @returns Promise with list of audio files
   */
  static async getAudioFiles(userId?: string) {
    try {
      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .list(userId || '', {
          limit: 100,
          sortBy: { column: 'created_at', order: 'desc' },
        });

      if (error) {
        console.error('Error fetching audio files:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching audio files:', error);
      return [];
    }
  }

  /**
   * Delete an audio file
   * @param filePath - Path to the file to delete
   * @returns Promise with deletion result
   */
  static async deleteAudioFile(filePath: string) {
    try {
      const { error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .remove([filePath]);

      if (error) {
        console.error('Error deleting audio file:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error deleting audio file:', error);
      return false;
    }
  }

  /**
   * Update transcription status and result
   * Called by the voice engineer's Whisper integration
   */
  static async updateTranscription(
    recordId: string,
    transcriptionText: string,
    confidence?: number
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('audio_recordings')
        .update({
          transcription_status: 'completed',
          transcription_text: transcriptionText,
          transcription_confidence: confidence,
          processing_completed_at: new Date().toISOString(),
        })
        .eq('id', recordId);

      if (error) {
        console.error('Error updating transcription:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error updating transcription:', error);
      return false;
    }
  }

  /**
   * Mark transcription as processing
   * Called when Whisper starts processing
   */
  static async markTranscriptionProcessing(recordId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('audio_recordings')
        .update({
          transcription_status: 'processing',
          processing_started_at: new Date().toISOString(),
        })
        .eq('id', recordId);

      if (error) {
        console.error('Error marking as processing:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error marking as processing:', error);
      return false;
    }
  }

  /**
   * Get pending transcriptions for Whisper processing
   * Your voice engineer can poll this endpoint
   */
  static async getPendingTranscriptions(): Promise<AudioRecord[]> {
    try {
      const { data, error } = await supabase
        .from('audio_recordings')
        .select('*')
        .eq('transcription_status', 'pending')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching pending transcriptions:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching pending transcriptions:', error);
      return [];
    }
  }

  /**
   * Get transcription by record ID
   * Used by frontend to check if transcription is ready
   */
  static async getTranscription(recordId: string): Promise<AudioRecord | null> {
    try {
      const { data, error } = await supabase
        .from('audio_recordings')
        .select('*')
        .eq('id', recordId)
        .single();

      if (error) {
        console.error('Error fetching transcription:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error fetching transcription:', error);
      return null;
    }
  }

  /**
   * Subscribe to transcription updates for real-time UI updates
   * Frontend can use this to show transcriptions as they complete
   */
  static subscribeToTranscriptionUpdates(
    recordId: string,
    callback: (record: AudioRecord) => void
  ) {
    return supabase
      .channel(`transcription-${recordId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'audio_recordings',
          filter: `id=eq.${recordId}`,
        },
        (payload) => {
          callback(payload.new as AudioRecord);
        }
      )
      .subscribe();
  }

  /**
   * Initialize Supabase storage bucket (run once to set up)
   * This should be called from your Supabase dashboard or backend
   */
  static async initializeBucket() {
    try {
      const { data, error } = await supabase.storage.createBucket(this.BUCKET_NAME, {
        public: true,
        allowedMimeTypes: ['audio/mp3', 'audio/wav', 'audio/m4a'],
        fileSizeLimit: 50 * 1024 * 1024, // 50MB limit
      });

      if (error) {
        console.error('Error creating bucket:', error);
        return false;
      }

      console.log('Bucket created successfully:', data);
      return true;
    } catch (error) {
      console.error('Error creating bucket:', error);
      return false;
    }
  }
}
