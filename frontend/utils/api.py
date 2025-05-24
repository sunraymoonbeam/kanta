import requests
import streamlit as st
from typing import Dict, Any, Tuple, List, Optional

# API Configuration
API_BASE_URL = "http://localhost:8000"  # Adjust if your backend API is on a different URL

def get_events():
    """
    Fetch all available events from the API
    """
    try:
        response = requests.get(f"{API_BASE_URL}/events")
        if response.status_code == 200:
            return response.json().get("events", [])
        else:
            st.error(f"Error fetching events: {response.status_code}")
            return []
    except Exception as e:
        st.error(f"API connection error: {str(e)}")
        return []

def upload_image(event_code: str, image_file):
    """
    Upload an image to the API
    """
    try:
        files = {"image": (image_file.name, image_file, "image/jpeg")}
        response = requests.post(
            f"{API_BASE_URL}/pics?event_code={event_code}",
            files=files
        )
        
        if response.status_code == 201:
            return response.json(), True
        else:
            return f"Error uploading image: {response.status_code} - {response.text}", False
    except Exception as e:
        return f"API connection error: {str(e)}", False

def get_images(event_code: str, limit: int = 50, offset: int = 0, **filter_params):
    """
    Fetch images from the API with optional filters
    """
    try:
        # Build query parameters
        params = {
            "event_code": event_code,
            "limit": limit,
            "offset": offset,
            **{k: v for k, v in filter_params.items() if v is not None}
        }
        
        response = requests.get(f"{API_BASE_URL}/pics", params=params)
        
        if response.status_code == 200:
            return response.json(), True
        else:
            return f"Error fetching images: {response.status_code} - {response.text}", False
    except Exception as e:
        return f"API connection error: {str(e)}", False

def get_image_detail(image_uuid: str):
    """
    Fetch detailed information about a specific image
    """
    try:
        response = requests.get(f"{API_BASE_URL}/pics/{image_uuid}")
        
        if response.status_code == 200:
            return response.json(), True
        else:
            return f"Error fetching image details: {response.status_code}", False
    except Exception as e:
        return f"API connection error: {str(e)}", False

def get_clusters(event_code: str, sample_size: int = 5):
    """
    Fetch cluster information for an event
    """
    try:
        params = {
            "event_code": event_code,
            "sample_size": sample_size
        }
        
        response = requests.get(f"{API_BASE_URL}/clusters", params=params)
        
        if response.status_code == 200:
            return response.json(), True
        else:
            return f"Error fetching clusters: {response.status_code} - {response.text}", False
    except Exception as e:
        return f"API connection error: {str(e)}", False