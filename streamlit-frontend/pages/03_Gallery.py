"""
Image Gallery page for Streamlit application.

Allows filtering, selection, bulk download, and detailed inspection of images.
"""

import os
import zipfile
from datetime import datetime
from io import BytesIO
from typing import List

import streamlit as st
from utils.api import delete_image, get_image_detail, get_images
from utils.image import crop_and_encode_face, fetch_image_bytes_from_url
from utils.session import get_event_selection, init_session_state

# Page Configuration
st.set_page_config(page_title="Image Gallery", page_icon="🖼️", layout="wide")

# Constants
IMAGES_PER_PAGE_OPTIONS: List[int] = [10, 20, 30, 40, 50, 100]
DEFAULT_IMAGES_PER_PAGE: int = 20
NUM_GRID_COLS: int = 5
THUMBNAIL_ASPECT_PADDING: str = "100%"
CLUSTER_ID_UNASSIGNED: int = -1
CLUSTER_ID_PROCESSING: int = -2

# Admin password for deleting images
ADMIN_PW = os.getenv("ADMIN_PASSWORD", "password123")

# Session State Initialization
init_session_state()
get_event_selection()
ss = st.session_state

# Initialize gallery-related session keys
ss.setdefault("gallery_date_from", None)
ss.setdefault("gallery_date_to", None)
ss.setdefault("gallery_min_faces", 0)
ss.setdefault("gallery_max_faces", 0)
ss.setdefault("gallery_limit", DEFAULT_IMAGES_PER_PAGE)
ss.setdefault("gallery_page", 1)
ss.setdefault("gallery_selected_images", {})  # { uuid_str: blob_url }
ss.setdefault("gallery_prepare_download", False)  # triggers download prep
ss.setdefault("gallery_download_data", None)  # BytesIO or zip
ss.setdefault("gallery_download_filename", None)
ss.setdefault("gallery_download_mime", None)
ss.setdefault("gallery_filter_clusters", None)  # list[int] or None
ss.setdefault("gallery_face_selections", {})  # for popover face checkboxes
ss.setdefault("gallery_show_delete_dialog", False)  # dialog flag
ss.setdefault("gallery_prev_count", 0)  # track previous selection count
ss.setdefault("gallery_reset_filters", False)  # flag to reset filters


# --------------------------------------------------------------------
# Dialog for deletion
# --------------------------------------------------------------------
@st.dialog("Confirm Delete", width="small")
def confirm_delete_dialog():
    """
    Modal dialog to confirm deletion of selected images.
    """
    selected = list(ss.gallery_selected_images.keys())
    count = len(selected)
    st.warning(
        f"You're about to permanently delete {count} image(s). This cannot be undone."
    )
    pwd = st.text_input(
        "Administrator Password",
        type="password",
        key="delete_pwd_input_dialog",
        help="You must be an administrator to delete images.",
    )
    cols = st.columns([1, 1], gap="small")
    with cols[0]:
        if st.button(
            "Confirm",
            key="confirm_delete_dialog",
            type="primary",
        ):
            if pwd != ADMIN_PW:
                st.error("Incorrect administrator password.")
            else:
                deleted_any = False
                errors = []
                for uuid in selected:
                    try:
                        delete_image(event_code=ss.event_code, image_uuid=uuid)
                        deleted_any = True
                        ss.gallery_selected_images.pop(uuid, None)
                    except Exception as e:
                        errors.append(f"- {uuid}: {e}")
                if deleted_any:
                    st.toast(f"Deleted {count} image(s).", icon="✅")
                if errors:
                    st.error("Some errors occurred:\n" + "\n".join(errors))
                ss.gallery_show_delete_dialog = False
                st.rerun()
    with cols[1]:
        if st.button("Cancel", key="cancel_delete_dialog"):
            ss.gallery_show_delete_dialog = False
            st.rerun()


# Page Title
st.title("Image Gallery")
st.markdown("View, filter, and download images from your event.")
active_clusters = ss.gallery_filter_clusters
if active_clusters:
    ids = ", ".join(map(str, sorted(set(active_clusters))))
    st.info(f"Showing images for persons: {ids}.")

# Ensure an event is selected
if not ss.get("event_code"):
    st.warning("Please select an event first to view its image gallery.")
    st.stop()

# Handle filter reset flag
if ss.gallery_reset_filters:
    ss.gallery_date_from = None
    ss.gallery_date_to = None
    ss.gallery_min_faces = 0
    ss.gallery_max_faces = 0
    ss.gallery_reset_filters = False

# --------------------------------------------------------------------
# Filter Bar: Date, Face Count, Pagination, and Actions
# --------------------------------------------------------------------
st.subheader("Filters")
filter_cols = st.columns([1.5, 1.5, 1, 1, 1, 1, 1])

# 1) Date filters
date_from = filter_cols[0].date_input(
    "From", ss.gallery_date_from, help="Select start date for filtering images."
)
date_to = filter_cols[1].date_input(
    "To", ss.gallery_date_to, help="Select end date for filtering images."
)


# 2) Face count filters
def _sync_max_to_min():
    if st.session_state.gallery_min_faces > st.session_state.gallery_max_faces:
        st.session_state.gallery_max_faces = st.session_state.gallery_min_faces


def _sync_min_to_max():
    if st.session_state.gallery_max_faces < st.session_state.gallery_min_faces:
        st.session_state.gallery_min_faces = st.session_state.gallery_max_faces


min_faces = filter_cols[2].number_input(
    "Min",
    min_value=0,
    key="gallery_min_faces",
    on_change=_sync_max_to_min,
    help="Minimum number of faces in the image.",
)
max_faces = filter_cols[3].number_input(
    "Max",
    min_value=0,
    key="gallery_max_faces",
    on_change=_sync_min_to_max,
    help="Maximum number of faces in the image.",
)

# 3) Pagination controls
limit = filter_cols[4].selectbox(
    "Limit",
    IMAGES_PER_PAGE_OPTIONS,
    index=IMAGES_PER_PAGE_OPTIONS.index(ss.gallery_limit),
    key="gallery_filter_limit",
    help="Number of images to display per page.",
)
page = filter_cols[5].number_input(
    "Page",
    min_value=1,
    value=ss.gallery_page,
    key="gallery_filter_page",
    help="Page number to display.",
)

# 4) Clear people filter or placeholder
action_col = filter_cols[6]
if active_clusters:
    if action_col.button(
        "Clear People Filter",
        key="clear_gallery_cluster_filter",
        use_container_width=True,
        help="Remove the person-based filter.",
    ):
        ss.gallery_filter_clusters = None
        ss.gallery_page = 1
        ss.gallery_face_selections.clear()
        st.rerun()
else:
    action_col.markdown("<div style='height:38px'></div>", unsafe_allow_html=True)

# Update session state if any filter value changed
filters_changed = False
for var, new in [
    ("gallery_date_from", date_from),
    ("gallery_date_to", date_to),
    ("gallery_min_faces", min_faces),
    ("gallery_max_faces", max_faces),
]:
    if ss.get(var) != new:
        ss[var] = new
        filters_changed = True

ss.gallery_limit = limit
ss.gallery_page = page

if filters_changed and ss.gallery_filter_clusters:
    ss.gallery_filter_clusters = None
    ss.gallery_face_selections.clear()
    ss.gallery_page = 1

# Prepare cluster_list_id_for_api (ensure tuple)
current_cluster_filter = ss.gallery_filter_clusters
if isinstance(current_cluster_filter, list):
    cluster_list_id_for_api = tuple(sorted(set(current_cluster_filter)))
else:
    cluster_list_id_for_api = None

# --------------------------------------------------------------------
# Download and Delete buttons directly below the filter bar
# --------------------------------------------------------------------
selected_count = len(ss.gallery_selected_images)

dl_col, del_col = st.columns([1, 1], gap="small")

# "Download Selected" button (always enabled)
if dl_col.button(
    "Download Selected",
    key="gallery_btn_prep_download_filter",
    type="primary",
    use_container_width=True,
):
    ss.gallery_prepare_download = True
    st.rerun()

# "Delete Selected" button (opens modal dialog)
if del_col.button(
    "Delete Selected",
    key="gallery_btn_show_delete_filter",
    type="primary",
    use_container_width=True,
):
    if selected_count > 0:
        ss.gallery_show_delete_dialog = True
        ss.gallery_prev_count = selected_count
        st.rerun()

st.markdown("---")

# --------------------------------------------------------------------
# Download Preparation Logic
# --------------------------------------------------------------------
if ss.gallery_prepare_download:
    selection = ss.gallery_selected_images
    count = len(selection)
    if count == 0:
        st.warning("No images selected.")
        ss.gallery_prepare_download = False
        st.rerun()

    with st.spinner(f"Preparing {count} image(s)..."):
        if count == 1:
            uuid, url = next(iter(selection.items()))
            data_bytesio = fetch_image_bytes_from_url(url)
            if data_bytesio:
                ext = url.split(".")[-1].lower()[:4]
                ss.gallery_download_data = data_bytesio
                ss.gallery_download_filename = f"{ss.event_code}_{uuid}.{ext}"
                ss.gallery_download_mime = f"image/{ext}"
        else:
            buf = BytesIO()
            with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
                for i, (uuid, url) in enumerate(selection.items()):
                    st.progress(
                        (i + 1) / count, text=f"Downloading image {i+1}/{count}"
                    )
                    data_bytesio = fetch_image_bytes_from_url(url)
                    if data_bytesio:
                        ext = url.split(".")[-1].lower()[:4]
                        zf.writestr(
                            f"{ss.event_code}_{uuid}.{ext}", data_bytesio.getvalue()
                        )
            buf.seek(0)
            ss.gallery_download_data = buf
            ss.gallery_download_filename = f"{ss.event_code}_selected.zip"
            ss.gallery_download_mime = "application/zip"

    ss.gallery_prepare_download = False
    st.toast("Download ready!", icon="✅")
    st.rerun()

# Show the download button once the zip/BytesIO is ready
if ss.gallery_download_data:
    st.download_button(
        label=f"Download: {ss.gallery_download_filename}",
        data=ss.gallery_download_data,
        file_name=ss.gallery_download_filename,
        mime=ss.gallery_download_mime,
        use_container_width=True,
        key="gallery_download_button",
        on_click=lambda: ss.update(
            gallery_download_data=None,
            gallery_download_filename=None,
            gallery_download_mime=None,
        ),
    )

# If deletion dialog is flagged, show it
if ss.gallery_show_delete_dialog:
    confirm_delete_dialog()


# --------------------------------------------------------------------
# Image Detail Popover Content (unchanged)
# --------------------------------------------------------------------
def image_detail_popover(image_uuid: str) -> None:
    """
    Display detailed view and face-selection for a given image UUID.
    get_image_detail and fetch_image_bytes_from_url are now cached.

    Args:
        image_uuid (str): The UUID of the image to display details for.
    """
    details = get_image_detail(image_uuid)
    if not details:
        st.error("Details unavailable.")
        return
    info = details.get("image", {})
    faces = details.get("faces", [])

    st.image(info.get("azure_blob_url"), use_container_width=True)
    created = info.get("created_at")
    if created:
        try:
            dt = datetime.fromisoformat(created.replace("Z", "+00:00"))
            st.caption(dt.strftime("%b %d, %Y %H:%M"))
        except Exception:
            st.caption(created)

    st.caption(f"Faces: {len(faces)} | Type: {info.get('file_extension','').upper()}")

    if not faces:
        st.caption("No faces detected in this image.")
        return

    st.markdown("##### Detected Faces:")

    image_stream_bytesio = fetch_image_bytes_from_url(info.get("azure_blob_url"))
    if not image_stream_bytesio:
        st.error("Cannot load image for face cropping.")
        for idx, face_info in enumerate(faces):
            cid = face_info.get("cluster_id")
            status_text = (
                f"Face {idx+1}: Person {cid}"
                if cid not in [CLUSTER_ID_UNASSIGNED, CLUSTER_ID_PROCESSING]
                else f"Face {idx+1}: Unidentified/Processing"
            )
            st.text(status_text)
            if idx < len(faces) - 1:
                st.markdown("---")
        return

    image_bytes_for_cropping = image_stream_bytesio.getvalue()
    selections = ss.gallery_face_selections.setdefault(image_uuid, {})
    valid_clusters: List[int] = []

    for idx, face in enumerate(faces):
        bbox = face.get("bbox", {})
        cid = face.get("cluster_id")
        fid = face.get("uuid", f"face_{idx}")

        if all(k in bbox for k in ("x", "y", "width", "height")):
            b64 = crop_and_encode_face(
                image_bytes_for_cropping, bbox, (60, 60), 0.15, 0.15
            )
            if b64:
                st.markdown(
                    f"<div class='popover-face-image'><img src='{b64}'></div>",
                    unsafe_allow_html=True,
                )
            else:
                st.markdown(
                    "<div class='popover-face-placeholder'>Face (crop failed)</div>",
                    unsafe_allow_html=True,
                )
        else:
            st.markdown(
                "<div class='popover-face-placeholder'>Face (no bbox)</div>",
                unsafe_allow_html=True,
            )

        key = f"filter_btn_popover_{image_uuid}_{fid}_{idx}"
        if cid in (CLUSTER_ID_UNASSIGNED, CLUSTER_ID_PROCESSING):
            text = "Unidentified" if cid == CLUSTER_ID_UNASSIGNED else "Processing"
            st.markdown(
                f"<div class='popover-face-status'>{text}</div>", unsafe_allow_html=True
            )
            selections[idx] = {"selected": False, "cluster_id": cid}
        else:
            prev = selections.get(idx, {}).get("selected", False)
            cur = st.checkbox(
                f"Person {cid}", value=prev, key=key, help=f"Select Person ID {cid}"
            )
            selections[idx] = {"selected": cur, "cluster_id": cid}
            if cur:
                valid_clusters.append(cid)

        if idx < len(faces) - 1:
            st.markdown("---")

    st.markdown("---")
    unique_clusters = sorted(set(valid_clusters))
    if st.button(
        f"Filter by these {len(unique_clusters)} Person(s)",
        key=f"apply_popover_filter_{image_uuid}",
        disabled=not unique_clusters,
        use_container_width=True,
        type="primary",
    ):
        ss.gallery_filter_clusters = unique_clusters
        ss.gallery_page = 1
        ss.gallery_reset_filters = True
        popover_content_requested_key = (
            f"gallery_popover_content_requested_{image_uuid}"
        )
        ss[popover_content_requested_key] = False
        st.rerun()


# --------------------------------------------------------------------
# Fetch and Display Image Grid
# --------------------------------------------------------------------
images_data = get_images(
    event_code=ss.event_code,
    date_from=f"{date_from}T00:00:00" if date_from else None,
    date_to=f"{date_to}T23:59:59" if date_to else None,
    min_faces=min_faces or None,
    max_faces=max_faces or None,
    limit=limit,
    offset=(page - 1) * limit,
    cluster_list_id=cluster_list_id_for_api,
)

if not isinstance(images_data, list):
    st.error(f"API Error: Expected list from get_images, got {type(images_data)}")
    st.stop()

if not images_data:
    msg = (
        "No images for selected people."
        if active_clusters
        else "No images match filters."
    )
    st.info(msg)
else:
    st.info(f"Displaying {len(images_data)} image(s).")

    grid_cols = st.columns(NUM_GRID_COLS)
    for idx, img in enumerate(images_data):
        with grid_cols[idx % NUM_GRID_COLS]:
            face_count_for_title = img.get("faces", img.get("faces_count", "N/A"))
            st.markdown(
                f"""
<div class='image-grid-cell' title='Faces: {face_count_for_title}'>
  <img src='{img['azure_blob_url']}' class='grid-thumbnail-image'>
</div>
""",
                unsafe_allow_html=True,
            )
            ctrl_cols = st.columns([0.7, 0.3])
            with ctrl_cols[0]:
                popover_content_requested_key = (
                    f"gallery_popover_content_requested_{img['uuid']}"
                )
                ss.setdefault(popover_content_requested_key, False)

                with st.popover("View Photo", use_container_width=True):
                    if ss[popover_content_requested_key]:
                        image_detail_popover(img["uuid"])
                        if st.button(
                            "Hide Details",
                            key=f"hide_details_popover_{img['uuid']}",
                            use_container_width=True,
                        ):
                            ss[popover_content_requested_key] = False
                            st.rerun()
                    else:
                        if st.button(
                            "Load Photo Details",
                            key=f"load_details_popover_{img['uuid']}",
                            type="primary",
                            use_container_width=True,
                        ):
                            ss[popover_content_requested_key] = True
                            st.rerun()
            with ctrl_cols[1]:
                sel_key = f"gallery_select_{img['uuid']}"
                sel = img["uuid"] in ss.gallery_selected_images
                new = st.checkbox(
                    "sel", value=sel, key=sel_key, label_visibility="collapsed"
                )
                if new != sel:
                    # Reset dialog flag when selection changes
                    if ss.gallery_show_delete_dialog:
                        ss.gallery_show_delete_dialog = False

                    if new:
                        ss.gallery_selected_images[img["uuid"]] = img["azure_blob_url"]
                    else:
                        ss.gallery_selected_images.pop(img["uuid"], None)

# --------------------------------------------------------------------
# Custom CSS
# --------------------------------------------------------------------
st.markdown(
    f"""
<style>
.image-grid-cell {{ 
    width:100%; 
    padding-top: {THUMBNAIL_ASPECT_PADDING}; 
    position:relative; 
    border-radius:6px; 
    background:#f0f2f6; 
    box-shadow:0 1px 3px rgba(0,0,0,0.08); 
    overflow:hidden; 
    margin-bottom:5px; 
}}
.grid-thumbnail-image {{ 
    position:absolute; 
    top:0; 
    left:0; 
    width:100%; 
    height:100%; 
    object-fit:contain; 
}}
.popover-face-image {{ 
    display: flex; 
    justify-content: center; 
    align-items: center; 
    margin-bottom: 5px;
}}
.popover-face-image img {{ 
    border-radius:50%; 
    width:60px; 
    height:60px; 
    object-fit: cover;
}}
.popover-face-placeholder {{ 
    border:1px solid #ccc; 
    border-radius:50%; 
    width:60px; 
    height:60px; 
    background:#e0e0e0; 
    display:flex; 
    align-items:center; 
    justify-content:center; 
    color:#555; 
    font-size:0.8em; 
    margin: 0 auto 5px auto; /* Center placeholder */
}}
.popover-face-status {{ 
    text-align:center; 
    font-size:0.85em; 
    color:#6c757d; 
    margin-bottom:10px; 
}}
div[data-testid="stPopoverContent"] > div {{
    padding: 0.75rem; 
}}
</style>
""",
    unsafe_allow_html=True,
)
