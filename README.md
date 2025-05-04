# YouTube Playlist Sorter

(This project was entirely vibe-coded, just for fun)

A React + Flask application that allows you to view and manage YouTube playlists.

## Prerequisites

- Python 3.8+
- Node.js 14+
- A Google Cloud Project with YouTube Data API enabled
- YouTube Data API v3 API Key

## Setup

### Backend Setup

1. Create a virtual environment and activate it:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies from the backend directory:
```bash
pip install -r requirements.txt
```

3. Create a `.env` file in the backend directory with your YouTube API key:
```
YOUTUBE_API_KEY=your_api_key_here
```

4. Start the Flask server:
```bash
python app.py
```

### Frontend Setup

1. Install dependencies:
```bash
cd frontend
npm install
```

2. Start the development server:
```bash
npm start
```

## Usage

1. Open your browser to `http://localhost:3000`
2. Enter a YouTube channel ID in the input field
3. Click "Fetch Playlists" to view the channel's playlists
4. Select a playlist to view and manage its videos
