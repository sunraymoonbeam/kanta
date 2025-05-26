import streamlit as st
from PIL import Image
from utils.api import upload_image
from utils.session import get_event_selection, init_session_state

# Initialize session and sidebar
init_session_state()
get_event_selection()

st.title("📤 Upload Images")

# Check if event is selected
if not st.session_state.event_code:
    st.warning("Please select an event from the sidebar to continue.")
    st.stop()

# Multiple image upload widget
uploaded_files = st.file_uploader(
    "Choose images", type=["jpg", "jpeg", "png"], accept_multiple_files=True
)

if uploaded_files:
    # Create columns for image previews
    cols = st.columns(3)

    # Display preview for each image
    for idx, uploaded_file in enumerate(uploaded_files):
        with cols[idx % 3]:
            img = Image.open(uploaded_file)
            st.image(img, caption=f"Preview {idx+1}", use_container_width=True)
            uploaded_file.seek(0)  # Reset file pointer

    st.info(f"Ready to upload {len(uploaded_files)} images")

    # Upload button
    if st.button("Upload Images"):
        with st.spinner("Uploading images..."):
            success_count = 0
            failed_uploads = []

            progress_bar = st.progress(0)
            for idx, uploaded_file in enumerate(uploaded_files):
                result, success = upload_image(
                    st.session_state.event_code, uploaded_file
                )

                if success:
                    success_count += 1
                else:
                    failed_uploads.append(f"Image {idx+1}: {result}")

                # Update progress bar
                progress_bar.progress((idx + 1) / len(uploaded_files))

            if success_count == len(uploaded_files):
                st.success(f"All {success_count} images uploaded successfully!")
            else:
                st.warning(
                    f"Uploaded {success_count} out of {len(uploaded_files)} images"
                )
                if failed_uploads:
                    st.error("Failed uploads:")
                    for error in failed_uploads:
                        st.error(error)
