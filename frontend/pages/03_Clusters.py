import streamlit as st
from utils.api import get_clusters
from utils.session import get_event_selection, init_session_state

# Initialize session and sidebar
init_session_state()
get_event_selection()

st.title("👥 Face Clusters")

# Check if event is selected
if not st.session_state.event_code:
    st.warning("Please select an event from the sidebar to continue.")
    st.stop()

# Get clusters
sample_size = st.slider("Sample size per cluster", min_value=1, max_value=20, value=5)

with st.spinner("Loading clusters..."):
    clusters, success = get_clusters(st.session_state.event_code, sample_size)

if success:
    if not clusters:
        st.info("No clusters found for this event.")
        st.stop()

    # Display each cluster
    for cluster in clusters:
        with st.expander(
            f"Cluster {cluster['cluster_id']} - {cluster['face_count']} faces"
        ):
            st.write(f"**Cluster ID:** {cluster['cluster_id']}")
            st.write(f"**Face Count:** {cluster['face_count']}")

            # Show sample faces in grid
            if cluster["samples"]:
                st.subheader("Sample Faces")
                cols = st.columns(min(5, len(cluster["samples"])))

                for i, sample in enumerate(cluster["samples"]):
                    with cols[i % len(cols)]:
                        st.image(sample["sample_blob_url"], use_container_width=True)
                        st.caption(f"Face ID: {sample['face_id']}")

            # Button to view all images with faces in this cluster
            if st.button(
                f"View All Images", key=f"view_cluster_{cluster['cluster_id']}"
            ):
                # Set up a filter in the session state and redirect to images page
                st.session_state.last_filter = {
                    "limit": 50,
                    "offset": 0,
                    "cluster_list_id": [cluster["cluster_id"]],
                }
                st.switch_page("pages/02_Browse.py")
else:
    st.error(clusters)  # Display error message
