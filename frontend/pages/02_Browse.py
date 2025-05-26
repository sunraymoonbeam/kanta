import streamlit as st
from utils.api import get_image_detail, get_images
from utils.session import get_event_selection, init_session_state

# Initialize session and sidebar
init_session_state()
get_event_selection()

st.title("🖼️ Browse Images")

# Check if event is selected
if not st.session_state.event_code:
    st.warning("Please select an event from the sidebar to continue.")
    st.stop()

# Sidebar filters
with st.sidebar:
    st.header("Filters")

    # Date filters
    st.subheader("Date Range")
    col1, col2 = st.columns(2)
    with col1:
        date_from = st.date_input("From", None)
    with col2:
        date_to = st.date_input("To", None)

    # Convert dates to datetime if provided
    date_from_param = f"{date_from}T00:00:00" if date_from else None
    date_to_param = f"{date_to}T23:59:59" if date_to else None

    # Face count filters
    st.subheader("Face Count")
    min_faces = st.number_input("Min Faces", min_value=0, value=0)
    max_faces = st.number_input("Max Faces", min_value=0, value=0)

    # Convert to None if zero
    min_faces = min_faces if min_faces > 0 else None
    max_faces = max_faces if max_faces > 0 else None

    # Pagination
    st.subheader("Pagination")
    limit = st.slider("Images per page", min_value=10, max_value=100, value=20)
    page = st.number_input("Page", min_value=1, value=1)
    offset = (page - 1) * limit

    # Apply filters button
    filter_applied = st.button("Apply Filters")

# Main content area
if filter_applied or "last_filter" not in st.session_state:
    # Create or update filter state
    st.session_state.last_filter = {
        "date_from": date_from_param,
        "date_to": date_to_param,
        "min_faces": min_faces,
        "max_faces": max_faces,
        "limit": limit,
        "offset": offset,
    }

# Fetch images with current filters
images, success = get_images(
    st.session_state.event_code, **st.session_state.last_filter
)

if success:
    if not images:
        st.info("No images found matching the criteria.")
        st.stop()

    # Display images in a grid
    cols = st.columns(3)

    for i, image in enumerate(images):
        with cols[i % 3]:
            st.image(
                image["azure_blob_url"],
                # caption=f"uuid: {image['uuid']}",
                use_container_width=True,  # Updated parameter
            )

            # Image details button
            if st.button(f"View Details", key=f"detail_{image['uuid']}"):
                st.session_state.selected_image = image["uuid"]
                st.rerun()

    # Show image details if selected
    if "selected_image" in st.session_state:
        image_details, success = get_image_detail(st.session_state.selected_image)

        if success:
            with st.expander("Image Details", expanded=True):
                col1, col2 = st.columns([1, 2])

                with col1:
                    st.image(image_details["image"]["azure_blob_url"])

                with col2:
                    st.write(f"**UUID:** {image_details["image"]['uuid']}")
                    st.write(f"**Upload Time:** {image_details["image"]['created_at']}")

                    # Face details
                    if image_details["faces"]:
                        st.subheader(f"{len(image_details['faces'])} Faces Detected")
                        # Create columns for face details instead of nested expanders
                        face_cols = st.columns(3)
                        for i, face in enumerate(image_details["faces"]):
                            with face_cols[i % 3]:
                                st.markdown(f"**Face #{i+1}**")
                                st.write(f"Face ID: {face['face_id']}")
                                st.write(f"Cluster ID: {face['cluster_id']}")
                                # You could add more face details here
                # Add a button to close the details
                if st.button("Close Details"):
                    del st.session_state.selected_image
                    st.rerun()
else:
    st.error(images)  # Display error message
