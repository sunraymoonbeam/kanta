"""
People & Similarity Search page for Streamlit application.

Allows browsing identified people, filtering the gallery by person,
and finding similar faces via upload or camera capture.
"""

import json
from typing import List, Tuple

import streamlit as st
from PIL import Image
from requests import HTTPError
from utils.api import find_similar_faces, get_clusters
from utils.image import (
    crop_and_encode_face,
    fetch_image_bytes_from_url,
)
from utils.session import get_event_selection, init_session_state

# Page Configuration
st.set_page_config(page_title="People", page_icon="👥", layout="wide")


# Constants
CLUSTER_ID_UNASSIGNED = -1
CLUSTER_ID_PROCESSING = -2
PERSON_DISPLAY_COLS = 4  # Number of people to display per row
SAMPLE_FACE_SIZE: Tuple[int, int] = (100, 100)
SIMILAR_FACE_SIZE: Tuple[int, int] = (120, 120)
SWAP_INTERVAL_MS = 5_000

# Session State Initialization
init_session_state()
get_event_selection()
ss = st.session_state
ss.setdefault("people_sample_size", 1)
ss.setdefault("people_selected_clusters", {})
ss.setdefault("similarity_top_k", 3)
ss.setdefault("similarity_metric", "cosine")
ss.setdefault("similarity_results", None)
ss.setdefault("similarity_query_b64", None)


st.title("People")
st.markdown(
    "Browse identified people from the event and search for similar faces using an image or camera."
)
if not ss.get("event_code"):
    st.warning("Please select or create an event first to search for people.")
    st.stop()

# tabs
tab_people, tab_similarity = st.tabs(["Identified People", "Face Similarity Search"])

# --------------------------------------------------------------------
# TAB 1: IDENTIFIED PEOPLE
# --------------------------------------------------------------------
with tab_people:
    st.caption("_Select individuals below to filter the image gallery by person._")

    new_size = st.slider(
        "Sample faces per person",
        min_value=1,
        max_value=5,
        value=ss.people_sample_size,
        key="people_sample_size_slider",
        help="Number of sample face images to load and cycle for each identified person.",
    )
    if new_size != ss.people_sample_size:
        ss.people_sample_size = new_size

    st.markdown("---")

    with st.spinner(f"Loading {ss.people_sample_size} sample(s) per person..."):
        clusters_data = get_clusters(ss.event_code, ss.people_sample_size)

    if not clusters_data:
        st.info("No identified people data available for this event yet.")
    else:
        persons = [c for c in clusters_data if c.get("cluster_id", -3) >= 0]
        unassigned = next(
            (c for c in clusters_data if c.get("cluster_id") == CLUSTER_ID_UNASSIGNED),
            None,
        )
        processing = next(
            (c for c in clusters_data if c.get("cluster_id") == CLUSTER_ID_PROCESSING),
            None,
        )

        if not persons:
            st.info("No identified people to display.")
        else:
            st.markdown(f"Found **{len(persons)}** distinct people.")

            grid_layout_cols = st.columns(
                PERSON_DISPLAY_COLS, gap="large"
            )  # Increased gap for more visual separation

            for idx, person_cluster_info in enumerate(persons):
                with grid_layout_cols[idx % PERSON_DISPLAY_COLS]:
                    with st.container():  # Main container for each person item in the grid cell
                        cid = person_cluster_info["cluster_id"]
                        face_count = person_cluster_info.get("face_count", 0)
                        samples = person_cluster_info.get("samples", [])

                        sample_b64_urls: List[str] = []
                        if samples:
                            for sample_detail in samples:
                                image_data_stream = fetch_image_bytes_from_url(
                                    sample_detail.get("sample_blob_url")
                                )
                                if image_data_stream:
                                    b64_face = crop_and_encode_face(
                                        image_data_stream.getvalue(),
                                        sample_detail.get("sample_bbox", {}),
                                        SAMPLE_FACE_SIZE,
                                    )
                                    if b64_face:
                                        sample_b64_urls.append(b64_face)

                        initial_image_src = (
                            sample_b64_urls[0]
                            if sample_b64_urls
                            else "https://via.placeholder.com/100/F0F2F6/808080?Text=No+Sample"
                        )
                        js_img_id = f"person_img_{cid}_{idx}"

                        # 1. Image (centered)
                        st.markdown(
                            f"""
                            <div style='display:flex; justify-content:center; margin-bottom:8px;'>
                                <img id='{js_img_id}' src='{initial_image_src}' 
                                     style='width:{SAMPLE_FACE_SIZE[0]}px; height:{SAMPLE_FACE_SIZE[1]}px; border-radius:50%; object-fit:cover; border: 2px solid #eee;'>
                            </div>
                            <script>
                            if (!document.getElementById('{js_img_id}').dataset.swappingInitiated) {{
                                let images = {json.dumps(sample_b64_urls)};
                                let currentIndex = 0;
                                let imgElement = document.getElementById('{js_img_id}');
                                if (images.length > 1) {{
                                    setInterval(() => {{
                                        currentIndex = (currentIndex + 1) % images.length;
                                        imgElement.src = images[currentIndex];
                                    }}, {SWAP_INTERVAL_MS});
                                }}
                                imgElement.dataset.swappingInitiated = 'true';
                            }}
                            </script>
                            """,
                            unsafe_allow_html=True,
                        )

                        # 2. Text "Person X (Y items)" (centered)
                        st.markdown(
                            f"""
                            <div style='text-align:center; margin-bottom:5px;'>
                                <p style='margin:0; font-size:1.0em; white-space:nowrap;'>
                                    Person {cid} 
                                    <span style='font-size:0.85em; color:grey;'>({face_count} photos)</span>
                                </p>
                            </div>
                            """,
                            unsafe_allow_html=True,
                        )

                        # 3. Checkbox (Streamlit will try to center it within its allocated space)
                        # To ensure it's truly centered within this person item's visual block,
                        # we can wrap it in a div with text-align:center, though st.checkbox might do this.

                        # Create a small, centered column for the checkbox
                        # This gives more control over its horizontal position
                        # We use a list comprehension for columns for dynamic width if needed, but here just one.
                        check_cols = st.columns(
                            [1, 0.3, 1]
                        )  # Left_spacer, Checkbox, Right_spacer
                        with check_cols[1]:  # Place checkbox in the middle small column
                            checkbox_key = f"select_person_cb_{cid}_{idx}"
                            selected = st.checkbox(
                                "sel",  # No label, text is above
                                value=ss.people_selected_clusters.get(cid, False),
                                key=checkbox_key,
                                label_visibility="collapsed",
                                help=f"Select Person {cid} to filter images in the gallery",
                            )
                            ss.people_selected_clusters[cid] = selected

                        # Add vertical space after each person item within its grid cell
                        st.markdown(
                            "<div style='height: 15px;'></div>", unsafe_allow_html=True
                        )

            st.markdown("---")
            sel_ids = [cid for cid, sel in ss.people_selected_clusters.items() if sel]
            if st.button(
                f"Browse pictures for {len(sel_ids)} Selected People"
                if sel_ids
                else "Browse pictures of selected people in Gallery",
                key="view_selected_people_gallery",
                disabled=not sel_ids,
                type="primary",
                use_container_width=True,
            ):
                ss.gallery_filter_clusters = sel_ids
                ss.gallery_page = 1
                ss.gallery_date_from = None
                ss.gallery_date_to = None
                ss.gallery_min_faces = 0
                ss.gallery_max_faces = 0
                st.switch_page("pages/03_Gallery.py")

        # Unassigned faces section (remains the same)
        if unassigned and unassigned.get("face_count", 0) > 0:
            st.markdown("---")
            st.subheader(f"❓ Unidentified Faces ({unassigned['face_count']})")
            with st.expander("View samples of unidentified faces", expanded=False):
                unassigned_samples = unassigned.get("samples", [])
                if not unassigned_samples:
                    st.write("No samples available for unidentified faces.")
                else:
                    urls_unassigned_b64 = []
                    for sample_detail in unassigned_samples:
                        image_data_stream = fetch_image_bytes_from_url(
                            sample_detail.get("sample_blob_url")
                        )
                        if image_data_stream:
                            b64_face = crop_and_encode_face(
                                image_data_stream.getvalue(),
                                sample_detail.get("sample_bbox", {}),
                                (80, 80),
                            )
                            if b64_face:
                                urls_unassigned_b64.append(b64_face)

                    if urls_unassigned_b64:
                        cols_unassigned = st.columns(min(8, len(urls_unassigned_b64)))
                        for j, b64_url in enumerate(urls_unassigned_b64):
                            cols_unassigned[j % len(cols_unassigned)].image(
                                b64_url, width=80, caption=f"Sample {j+1}"
                            )
                    else:
                        st.write("Could not load samples for unidentified faces.")

        # Processing indicator (remains the same)
        if processing and processing.get("face_count", 0) > 0:
            st.info(
                f"Still processing approximately {processing['face_count']} new faces. Check back later for more updates."
            )


# --------------------------------------------------------------------
# TAB 2: FACE SIMILARITY SEARCH
# --------------------------------------------------------------------
with tab_similarity:
    st.caption(
        "_Upload an image or use your camera to find people with similar faces within this event._"
    )

    col_query_area, col_results_area = st.columns([2, 1], gap="large")

    with col_query_area:
        st.subheader("Query Image")
        uploaded_file = st.file_uploader(
            "Upload an image containing a face",
            type=["jpg", "jpeg", "png"],
            key="similarity_uploader",
            accept_multiple_files=False,
            help="Best results with clear, frontal faces.",
        )
        st.markdown(
            "<p style='text-align:center; margin: 10px 0;'>OR</p>",
            unsafe_allow_html=True,
        )
        camera_photo_buffer = st.camera_input(
            "Take a photo with your camera",
            key="similarity_camera_input",
            help="Ensure good lighting and a clear view of the face.",
        )
        query_image_data = uploaded_file or camera_photo_buffer

        if query_image_data:
            st.markdown("---")
            st.markdown("##### Query Image:")
            try:
                query_img_pil = Image.open(query_image_data).convert("RGB")
                query_img_pil.thumbnail((250, 250))
                st.image(query_img_pil, use_container_width=True)
            except Exception as e:
                st.error(f"Could not display query image: {e}")

    with col_results_area:
        st.subheader("Search Settings")
        control_cols = st.columns(2)
        with control_cols[0]:
            ss.similarity_top_k = st.number_input(
                "Top K",
                min_value=1,
                max_value=30,
                value=ss.similarity_top_k,
                key="similarity_top_k_slider",
                help="How many of the most similar faces to retrieve.",
            )
        with control_cols[1]:
            ss.similarity_metric = st.selectbox(
                "Similarity Metric",
                options=["cosine", "l2"],
                index=["cosine", "l2"].index(ss.similarity_metric),
                key="similarity_metric_select",
                help="Algorithm used to measure face similarity.",
            )

        if st.button(
            "🔍 Find Similar Faces",
            key="similarity_search_button",
            disabled=(query_image_data is None),
            type="primary",
            use_container_width=True,
        ):
            if query_image_data:
                query_image_data.seek(0)
                query_bytes = query_image_data.getvalue()
                query_filename = getattr(
                    query_image_data, "name", "camera_snapshot.jpg"
                )
                try:
                    with st.spinner("Analyzing query image and searching..."):
                        api_results = find_similar_faces(
                            event_code=ss.event_code,
                            image_bytes=query_bytes,
                            image_filename=query_filename,
                            metric=ss.similarity_metric,
                            top_k=ss.similarity_top_k,
                        )
                        ss.similarity_results = api_results if api_results else []
                except HTTPError as e:
                    error_detail = str(e)
                    try:
                        error_detail = e.response.json().get("detail", str(e))
                    except Exception:
                        pass
                    st.error(f"Search API Error: {error_detail}")
                    ss.similarity_results = []
                except Exception as e:
                    st.error(f"An unexpected error occurred during search: {e}")
                    ss.similarity_results = []
            else:
                st.warning("Please provide a query image first.")

        st.markdown("---")

        if ss.similarity_results is None:
            st.info("Search results will appear here.")
        elif not ss.similarity_results:
            st.warning("No similar faces found matching your query.")
        else:
            st.markdown(f"##### Top {len(ss.similarity_results)} Similar Faces Found:")
            num_result_cols = 3
            result_display_cols = st.columns(num_result_cols, gap="medium")
            for idx, result_face_info in enumerate(ss.similarity_results):
                with result_display_cols[idx % num_result_cols]:
                    with st.container():
                        result_image_stream = fetch_image_bytes_from_url(
                            result_face_info.get("azure_blob_url")
                        )
                        b64_result_face_thumb = None
                        if result_image_stream:
                            b64_result_face_thumb = crop_and_encode_face(
                                result_image_stream.getvalue(),
                                result_face_info.get("bbox", {}),
                                SIMILAR_FACE_SIZE,
                            )
                        if b64_result_face_thumb:
                            st.image(b64_result_face_thumb, use_container_width=True)
                        else:
                            st.markdown(
                                f"""
                                <div style='width:100%; aspect-ratio: {SIMILAR_FACE_SIZE[0]}/{SIMILAR_FACE_SIZE[1]};
                                            border-radius:8px; background:#f0f2f6; display:flex; 
                                            align-items:center; justify-content:center; text-align:center; color:grey;'>
                                    <small>Image<br/>Unavailable</small>
                                </div>
                                """,
                                unsafe_allow_html=True,
                            )
                        cluster_id_val = result_face_info.get("cluster_id", "N/A")
                        distance_val = result_face_info.get("distance", float("inf"))
                        similarity_score = (
                            (1 - distance_val) * 100
                            if ss.similarity_metric == "cosine" and distance_val <= 1.0
                            else (
                                100 - distance_val
                                if ss.similarity_metric == "l2" and distance_val >= 0
                                else distance_val
                            )
                        )
                        similarity_text = (
                            f"{similarity_score:.1f}%"
                            if isinstance(similarity_score, (int, float))
                            else "N/A"
                        )

                        st.caption(
                            f"Person ID: {cluster_id_val}<br>Similarity: {similarity_text}",
                            unsafe_allow_html=True,
                        )

# --------------------------------------------------------------------
# Custom CSS
# --------------------------------------------------------------------
st.markdown(
    """
<style>
    /* Identified People Tab */
    div[data-testid="stHorizontalBlock"] > div[data-testid="stVerticalBlock"] > div[data-testid="stVerticalBlock"] .stContainer {{
        /* This targets st.container specifically within the main grid columns for people.
           Adjust if Streamlit's internal structure changes the data-testid nesting.
           You might want to add a class to st.container if this becomes unreliable.
        */
        /* padding: 5px; */ /* Reduce padding if too much */
        /* margin-bottom: 10px; /* Overall bottom margin for each person item */
    }}

    /* Similarity Search Tab */
    div[data-testid="stHorizontalBlock"] .stContainer {{ 
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        padding: 10px;
        margin-bottom: 15px;
        background-color: #fdfdfd;
        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        display: flex;
        flex-direction: column;
        align-items: center;
    }}
    div[data-testid="stHorizontalBlock"] .stContainer img {{
        border-radius: 6px;
        object-fit: cover;
    }}
    div[data-testid="stHorizontalBlock"] .stContainer .stCaption {{
        text-align: center;
        margin-top: 8px;
        font-size: 0.85em;
    }}
</style>
""",
    unsafe_allow_html=True,
)
