// Supabase Configuration
// Replace these with your actual Supabase project credentials

export const SUPABASE_CONFIG = {
  // Get these from your Supabase project settings
  url: 'https://qmjucxwjurbdijbirzgt.supabase.co', // e.g., 'https://your-project.supabase.co'
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtanVjeHdqdXJiZGlqYmlyemd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxNzY0ODMsImV4cCI6MjA3Mjc1MjQ4M30.k399tyxHB840FDburTFot2bDUSuHUr090S9WXSshluQ', // Your public anon key
  
  // Storage bucket name for audio files
  audioBucket: 'audio-recordings',
  
  // File upload settings
  maxFileSize: 50 * 1024 * 1024, // 50MB
  allowedMimeTypes: ['audio/m4a', 'audio/wav', 'audio/mp3'],
};

// Instructions for setup:
// 1. Go to https://supabase.com and create a new project
// 2. Go to Settings > API to get your URL and anon key
// 3. Go to Storage and create a new bucket called 'audio-recordings'
// 4. Set the bucket to public and configure the allowed file types
// 5. Replace the values above with your actual credentials
