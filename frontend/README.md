# Expo Frontend - Ephemeral Token & Recording App

A React Native Expo app that requests ephemeral tokens from the FastAPI backend and provides microphone recording functionality.

## Features

- **API Integration**: Calls `GET /realtime/ephemeral` endpoint
- **Audio Recording**: Records audio with microphone permissions
- **File Management**: Saves recordings locally with timestamps
- **Cross-Platform**: Runs on web, iOS, and Android

## Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment** (optional):
   - Edit `.env` file to change the API base URL if needed
   - Default: `API_BASE_URL=http://localhost:3001`

## Run Instructions

### Prerequisites
- Backend server running on `localhost:3001`
- Node.js 18+ (though 20+ recommended for better compatibility)

### Start the Development Server

**For Web (Recommended for Testing):**
```bash
npm run web
```
This will start Expo and open the app in your web browser at `http://localhost:19006` (or similar).

**For iOS Simulator:**
```bash
npm run ios
```
(Requires Xcode and iOS Simulator)

**For Android Emulator:**
```bash
npm run android
```
(Requires Android Studio and Android Emulator)

## App Interface

The app displays:
- **Title**: "Ephemeral Token & Recording Test"
- **Two Buttons**:
  - **Blue "Get Ephemeral Token"** - Calls the backend API
  - **Green "Start Recording"** - Begins audio recording (turns red when recording)
- **JSON Response Area** - Shows API response in formatted JSON

## Quick Sanity Test

### 1. Start Backend
```bash
# In your backend directory
uvicorn app:app --host 0.0.0.0 --port 3001
```

### 2. Start Frontend
```bash
# In frontend directory
npm run web
```

### 3. Test API Call
- Open browser to the Expo URL (usually `http://localhost:19006`)
- Click **"Get Ephemeral Token"** button
- Button should show "Loading..." briefly
- JSON response should appear below with ephemeral token data

### 4. Test Audio Recording
- Click **"Start Recording"** button (will request microphone permission)
- Button turns red and shows "Stop Recording"
- Speak into microphone
- Click **"Stop Recording"**
- Should see success alert with filename

## Expected Responses

### Successful API Response
```json
{
  "client_secret": {
    "value": "eph_...",
    "expires_at": 1694123456
  },
  "model": "gpt-4o-realtime-preview",
  "modalities": ["audio", "text"],
  "voice": "verse"
}
```

### Recording Success
- Alert: "Recording saved as recording-2025-09-12T02-30-45-123Z.m4a"
- Files saved to: `{DocumentDirectory}/recordings/`

## File Storage

Recordings are saved locally in:
- **iOS/Android**: App's document directory under `recordings/`
- **Web**: Browser's IndexedDB storage (limited persistence)

File naming format: `recording-{ISO-timestamp}.m4a`

## Troubleshooting

### API Issues
- **"Failed to fetch"**: Check backend is running on localhost:3001
- **CORS errors**: Verify backend CORS settings allow localhost:19006
- **500 errors**: Check backend has valid OPENAI_API_KEY

### Recording Issues
- **Permission denied**: Grant microphone access when prompted
- **Recording fails**: Try refreshing the app
- **No audio on web**: Use HTTPS or localhost (required for microphone access)

### Development Issues
- **Metro bundler errors**: Clear cache with `npx expo start --clear`
- **Dependency issues**: Delete `node_modules` and run `npm install`
- **Port conflicts**: Kill processes on ports 19000-19006

### Web-Specific Issues
- **Microphone not working**: Ensure you're on `localhost` or `https://`
- **Audio format issues**: Web saves as WebM, mobile as M4A
- **Storage limitations**: Web storage is temporary and limited

## Development Notes

- **Node Version**: App works on Node 18.5+ but shows engine warnings (20+ recommended)
- **Audio Permissions**: Automatically requested on app start
- **File System**: Uses Expo FileSystem for cross-platform file operations
- **Audio Library**: Uses Expo AV for recording functionality

## Architecture

```
App.tsx
├── API Client (fetch-based)
├── Audio Recording (expo-av)
├── File Management (expo-file-system)
└── UI Components (React Native)
```

## Environment Variables

- `API_BASE_URL`: Backend server URL (default: `http://localhost:3001`)

## Scripts

- `npm run web` - Start web development server
- `npm run ios` - Start iOS development
- `npm run android` - Start Android development
- `npm start` - Start Expo development server (choose platform)
