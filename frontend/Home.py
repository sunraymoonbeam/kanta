import streamlit as st
from utils.session import init_session_state, get_event_selection

st.set_page_config(
    page_title="Kanta Face Recognition",
    page_icon="👥",
    layout="wide"
)

# Initialize session state
init_session_state()

# Display sidebar with event selection
get_event_selection()

# Main content for home page
st.title("👥 Kanta Face Recognition")
st.write("### Welcome to the Kanta Face Recognition System")

st.markdown("""
This application helps you manage and explore images with facial recognition capabilities.

### Features:
- **Upload Images**: Upload new photos to an event
- **Browse Images**: View and filter images by various criteria
- **View Clusters**: Explore automatically generated face clusters

Please select an event from the sidebar and use the navigation bar to access different features.
""")

# Check if event is selected
if not st.session_state.event_code:
    st.warning("👈 Please select an event from the sidebar to get started.")
else:
    st.success(f"You're working with event: {st.session_state.event_code}")
    st.info("Use the navigation menu on the left to explore features.")