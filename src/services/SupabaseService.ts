import { createClient } from '@supabase/supabase-js';
import * as FileSystem from 'expo-file-system';
import { SUPABASE_CONFIG } from '../config/supabase';

export const supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);

export interface AudioUploadResult {
  success: boolean;
  fileUrl?: string;
  fileName?: string;
  error?: string;
}

export class SupabaseService {
  private static readonly BUCKET_NAME = SUPABASE_CONFIG.audioBucket;

  /**
   * Upload audio file to Supabase Storage
   * @param audioUri - Local file URI from expo-av recording
   * @param userId - Optional user ID for organization
   * @returns Promise with upload result
   */
  static async uploadAudioFile(
    audioUri: string, 
    userId?: string
  ): Promise<AudioUploadResult> {
    try {
      // Generate unique filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `recording-${timestamp}.m4a`;
      
      // Create file path with optional user folder
      const filePath = userId ? `${userId}/${fileName}` : fileName;

      // Upload file directly using fetch (works better with React Native)
      const response = await fetch(audioUri);
      const blob = await response.blob();

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(filePath, blob, {
          contentType: 'audio/m4a',
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

      return {
        success: true,
        fileUrl: urlData.publicUrl,
        fileName: fileName,
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
   * Initialize Supabase storage bucket (run once to set up)
   * This should be called from your Supabase dashboard or backend
   */
  static async initializeBucket() {
    try {
      const { data, error } = await supabase.storage.createBucket(this.BUCKET_NAME, {
        public: true,
        allowedMimeTypes: ['audio/m4a', 'audio/wav', 'audio/mp3'],
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
