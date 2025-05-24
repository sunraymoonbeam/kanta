# Kanta Frontend - Streamlit App

This is a Streamlit frontend for the Kanta face recognition system. It provides a user interface to interact with the Kanta API.

## Features

- Upload images for face detection
- Browse images with various filters
- View face clusters detected in images

## Requirements

- Python 3.12+
- Streamlit
- Requests
- PIL (Pillow)

## Getting Started

1. Make sure the backend API is running (typically on http://localhost:8000)

2. Run the Streamlit app:
   ```bash
   cd /workspaces/kanta/frontend
   streamlit run main.py
   ```

3. Open the app in your browser (typically http://localhost:8501)

4. Select or enter an event code in the sidebar to start using the app

## Configuration

- The API base URL is configured at the top of `main.py`. Update it if your backend is running on a different host or port.
- For production deployment, consider using environment variables for API configuration.

## Troubleshooting

- If you can't connect to the API, ensure the backend server is running and the API_BASE_URL is correct.
- Check network access between the frontend and backend if they're running on different hosts.