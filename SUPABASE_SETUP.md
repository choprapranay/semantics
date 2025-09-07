# Supabase Setup for Audio Recording

This app uses Supabase for cloud storage of audio recordings that will be processed by Whisper for speech-to-text.

## Setup Instructions

### 1. Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up/login and create a new project
3. Wait for the project to be ready (usually takes 1-2 minutes)

### 2. Get Project Credentials

1. Go to **Settings** > **API** in your Supabase dashboard
2. Copy the following values:
   - **Project URL** (e.g., `https://your-project.supabase.co`)
   - **Project API Key** (anon/public key)

### 3. Configure the App

1. Open `src/config/supabase.ts`
2. Replace the placeholder values:
   ```typescript
   export const SUPABASE_CONFIG = {
     url: 'https://your-actual-project.supabase.co',
     anonKey: 'your-actual-anon-key-here',
     // ... rest stays the same
   };
   ```

### 4. Set Up Storage Bucket

1. Go to **Storage** in your Supabase dashboard
2. Click **New bucket**
3. Name it: `audio-recordings`
4. Make it **Public** (so Whisper can access the files)
5. Set file size limit to **50MB**
6. Add allowed MIME types: `audio/m4a`, `audio/wav`, `audio/mp3`

### 5. Set Up Row Level Security (RLS)

1. Go to **Storage** > **audio-recordings** bucket
2. Click **Policies** tab
3. Add a new policy:
   - **Policy name**: `Allow public uploads`
   - **Target roles**: `public`
   - **Policy definition**:
     ```sql
     (bucket_id = 'audio-recordings'::text)
     ```
   - **Operation**: `INSERT`, `SELECT`

## How It Works

1. **User taps record button** → App requests microphone permission
2. **App records audio** → 5 seconds of audio captured
3. **Audio uploaded to Supabase** → File stored in `audio-recordings` bucket
4. **Success response** → App shows file URL and name
5. **Whisper engineer** → Can access files via Supabase API or direct URLs

## File Organization

Files are organized by user ID:
```
audio-recordings/
├── user123/
│   ├── recording-2024-01-15T10-30-00-000Z.m4a
│   └── recording-2024-01-15T10-35-00-000Z.m4a
└── user456/
    └── recording-2024-01-15T11-00-00-000Z.m4a
```

## For Whisper Engineer

### Access Files via Supabase API

```javascript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient('YOUR_URL', 'YOUR_KEY')

// Get all audio files
const { data, error } = await supabase.storage
  .from('audio-recordings')
  .list('', { limit: 100 })

// Download a specific file
const { data, error } = await supabase.storage
  .from('audio-recordings')
  .download('user123/recording-2024-01-15T10-30-00-000Z.m4a')
```

### Access Files via Direct URLs

Each uploaded file gets a public URL that can be accessed directly:
```
https://your-project.supabase.co/storage/v1/object/public/audio-recordings/user123/recording-2024-01-15T10-30-00-000Z.m4a
```

## Testing

1. Run the app: `npx expo start`
2. Scan QR code with Expo Go
3. Tap "Record & Upload (5s)"
4. Speak for 5 seconds
5. Check Supabase Storage dashboard for the uploaded file
6. Verify the file URL works by opening it in a browser
