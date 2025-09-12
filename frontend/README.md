
1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment** (optional):
   - Edit `.env` file to change the API base URL if needed
   - Default: `API_BASE_URL=http://localhost:3001`


### Prerequisites
- Backend server running on `localhost:3001`
- Node.js 18+ (though 20+ recommended for better compatibility)

### Start the Development Server

**For Web (Recommended for Testing):**
```bash
npm run web
```


The app displays:
- **Two Buttons**:
  - **Blue "Get Ephemeral Token"** - Calls the backend API
  - **Green "Start Recording"** - Begins audio recording (turns red when recording)
- **JSON Response Area** - Shows API response in formatted JSON

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


