from flask import Flask, request, jsonify, session, redirect
from flask_cors import CORS
from googleapiclient.discovery import build
from google_auth_oauthlib.flow import Flow, InstalledAppFlow
from google.oauth2.credentials import Credentials
import os
from dotenv import load_dotenv
import json

load_dotenv()

app = Flask(__name__)
CORS(app, supports_credentials=True)
app.secret_key = os.getenv('FLASK_SECRET_KEY', os.urandom(24))

# OAuth2 configuration
CLIENT_SECRETS_FILE = 'client_secrets.json'
SCOPES = [
    'https://www.googleapis.com/auth/youtube',
    'https://www.googleapis.com/auth/youtube.force-ssl'
]
API_SERVICE_NAME = 'youtube'
API_VERSION = 'v3'
REDIRECT_URI = 'http://localhost:5000/oauth2callback'

def get_credentials():
    if 'credentials' not in session:
        return None
    credentials_dict = json.loads(session['credentials'])
    return Credentials(
        credentials_dict['token'],
        refresh_token=credentials_dict['refresh_token'],
        token_uri=credentials_dict['token_uri'],
        client_id=credentials_dict['client_id'],
        client_secret=credentials_dict['client_secret'],
        scopes=credentials_dict['scopes']
    )

def get_youtube_service(credentials=None):
    if credentials:
        return build(API_SERVICE_NAME, API_VERSION, credentials=credentials)
    return build(API_SERVICE_NAME, API_VERSION, developerKey=os.getenv('YOUTUBE_API_KEY'))

@app.route('/api/auth', methods=['GET'])
def auth():
    try:
        flow = InstalledAppFlow.from_client_secrets_file(
            CLIENT_SECRETS_FILE,
            scopes=SCOPES
        )
        
        # Try multiple ports starting from 5001
        ports = [5001, 5002, 5003, 5004, 5005]
        credentials = None
        last_error = None
        
        for port in ports:
            try:
                credentials = flow.run_local_server(
                    port=port,
                    success_message='Authentication successful! You can close this window.',
                    open_browser=True
                )
                break  # If successful, exit the loop
            except OSError as e:
                last_error = e
                continue  # Try next port
        
        if not credentials:
            raise last_error or Exception("Failed to find an available port")
            
        session['credentials'] = json.dumps({
            'token': credentials.token,
            'refresh_token': credentials.refresh_token,
            'token_uri': credentials.token_uri,
            'client_id': credentials.client_id,
            'client_secret': credentials.client_secret,
            'scopes': credentials.scopes
        })
        
        return jsonify({'status': 'success'})
    except Exception as e:
        print(f"Auth error: {str(e)}")  # Add logging
        return jsonify({'error': str(e)}), 500

@app.route('/oauth2callback')
def oauth2callback():
    try:
        flow = Flow.from_client_secrets_file(
            CLIENT_SECRETS_FILE,
            scopes=SCOPES,
            redirect_uri=REDIRECT_URI
        )
        flow.fetch_token(authorization_response=request.url)
        credentials = flow.credentials
        
        session['credentials'] = json.dumps({
            'token': credentials.token,
            'refresh_token': credentials.refresh_token,
            'token_uri': credentials.token_uri,
            'client_id': credentials.client_id,
            'client_secret': credentials.client_secret,
            'scopes': credentials.scopes
        })
        
        return redirect('http://localhost:3000')
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/playlists', methods=['GET'])
def get_playlists():
    youtube = get_youtube_service()
    
    channel_id = request.args.get('channel_id')
    if not channel_id:
        return jsonify({'error': 'Channel ID is required'}), 400
        
    try:
        playlists_request = youtube.playlists().list(
            part='snippet,contentDetails',
            channelId=channel_id,
            maxResults=50
        )
        response = playlists_request.execute()
        return jsonify(response)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/playlist-items', methods=['GET'])
def get_playlist_items():
    youtube = get_youtube_service()
    
    playlist_id = request.args.get('playlist_id')
    if not playlist_id:
        return jsonify({'error': 'Playlist ID is required'}), 400

    try:
        # First, get the total number of items
        playlist_request = youtube.playlists().list(
            part='contentDetails',
            id=playlist_id
        )
        playlist_response = playlist_request.execute()
        total_items = int(playlist_response['items'][0]['contentDetails']['itemCount'])

        # Fetch all items in the playlist
        items = []
        next_page_token = None
        
        while len(items) < total_items:
            items_request = youtube.playlistItems().list(
                part='snippet',
                playlistId=playlist_id,
                maxResults=50,
                pageToken=next_page_token
            )
            items_response = items_request.execute()
            
            # Get video details to include thumbnails
            video_ids = [item['snippet']['resourceId']['videoId'] for item in items_response['items']]
            videos_request = youtube.videos().list(
                part='snippet',
                id=','.join(video_ids)
            )
            videos_response = videos_request.execute()
            
            # Create a map of video IDs to their thumbnails
            video_thumbnails = {video['id']: video['snippet']['thumbnails'] for video in videos_response['items']}
            
            # Add thumbnails to each item
            for item in items_response['items']:
                video_id = item['snippet']['resourceId']['videoId']
                item['snippet']['thumbnails'] = video_thumbnails.get(video_id, {})
            
            items.extend(items_response['items'])
            next_page_token = items_response.get('nextPageToken')
            
            if not next_page_token:
                break

        return jsonify({'items': items})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/sort', methods=['POST'])
def sort_playlist():
    data = request.json
    playlist_id = data.get('playlist_id')
    sort_by = data.get('sort_by')
    order = data.get('order')
    new_playlist_name = data.get('new_playlist_name')
    create_playlist = data.get('create_playlist', False)

    if not all([playlist_id, sort_by, order]):
        return jsonify({'error': 'Missing required parameters'}), 400

    try:
        youtube = get_youtube_service()
        
        # Get all items from the original playlist
        items = []
        next_page_token = None
        
        while True:
            items_request = youtube.playlistItems().list(
                part='snippet',
                playlistId=playlist_id,
                maxResults=50,
                pageToken=next_page_token
            )
            items_response = items_request.execute()
            items.extend(items_response['items'])
            
            next_page_token = items_response.get('nextPageToken')
            if not next_page_token:
                break

        # Sort items based on the selected option
        if sort_by == 'title':
            items.sort(key=lambda x: x['snippet']['title'], reverse=(order == 'desc'))
        elif sort_by == 'date':
            items.sort(key=lambda x: x['snippet']['publishedAt'], reverse=(order == 'desc'))
        elif sort_by == 'duration':
            return jsonify({'error': 'Duration sorting not implemented'}), 501

        if create_playlist:
            if not new_playlist_name:
                return jsonify({'error': 'New playlist name is required'}), 400

            credentials = get_credentials()
            if not credentials:
                return jsonify({'error': 'Not authenticated'}), 401

            youtube = get_youtube_service(credentials)
            
            # Create new playlist
            playlist_request = youtube.playlists().insert(
                part='snippet,status',
                body={
                    'snippet': {
                        'title': new_playlist_name,
                        'description': f'Sorted version of playlist {playlist_id}'
                    },
                    'status': {
                        'privacyStatus': 'private'
                    }
                }
            )
            new_playlist = playlist_request.execute()

            # Add items to the new playlist in sorted order
            for item in items:
                youtube.playlistItems().insert(
                    part='snippet',
                    body={
                        'snippet': {
                            'playlistId': new_playlist['id'],
                            'resourceId': {
                                'kind': 'youtube#video',
                                'videoId': item['snippet']['resourceId']['videoId']
                            }
                        }
                    }
                ).execute()

            return jsonify({
                'message': 'Playlist created successfully',
                'new_playlist_id': new_playlist['id']
            })

        return jsonify({'items': items})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
