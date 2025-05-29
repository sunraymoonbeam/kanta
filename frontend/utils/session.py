import streamlit as st

from utils.api import get_events


def init_session_state():
    """Initialize session state variables if they don't exist"""
    if "event_code" not in st.session_state:
        st.session_state.event_code = ""

    if "last_filter" not in st.session_state:
        st.session_state.last_filter = {"limit": 50, "offset": 0}


def get_event_selection():
    """Common event selection widget for sidebar"""
    st.sidebar.title("Kanta")
    st.sidebar.subheader("Collaborative Event Photos")

    # Event selection
    available_events = get_events()
    event_options = [""] + [event["code"] for event in available_events]

    st.sidebar.write("### Select Event")

    # Select box for events
    selected_event = st.sidebar.selectbox(
        "Choose an event",
        options=event_options,
        index=0,
        format_func=lambda x: x if x else "Select an event...",
        key="event_selector",
    )

    # Manual event code entry (for testing or if get_events fails)
    manual_event = st.sidebar.text_input("Or enter event code manually:")

    # Update event code in session state
    if selected_event:
        st.session_state.event_code = selected_event
    elif manual_event:
        st.session_state.event_code = manual_event

    # Show current event
    if st.session_state.event_code:
        st.sidebar.success(f"Current event: {st.session_state.event_code}")
    else:
        st.sidebar.warning("Please select an event")

    st.sidebar.divider()
