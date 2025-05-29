import time
from io import BytesIO

import streamlit as st
from PIL import Image
from utils.api import upload_image
from utils.image import apply_filter_to_image
from utils.session import get_event_selection, init_session_state

# Page Configuration
st.set_page_config(page_title="Event Film Cam", page_icon="📸", layout="wide")

# Constants
MAX_DISPOSABLE_SHOTS = 20
FILM_STRIP_ROWS = 4
FILM_STRIP_COLS = 5
IMAGE_FILTERS = ["Normal", "Black & White", "Warm", "Cool", "Sepia"]


def main() -> None:
    """
    Display the Event Film Cam interface.

    - Upload unlimited existing images.
    - Capture disposable shots with filters.
    - View and manage film-strip shots.
    """
    # Session State Initialization
    init_session_state()
    get_event_selection()
    ss = st.session_state
    ss.setdefault("pending_camera_shots", [])
    ss.setdefault("uploaded_camera_shots", [])
    ss.setdefault("current_image_filter", IMAGE_FILTERS[0])
    ss.setdefault("last_processed_camera_frame", None)

    # Instructions
    st.title("Event Film Cam")
    st.markdown(
        """
- Use the **film camera** for a limited roll of disposable shots.
- Separately, you can **upload existing images** from your device directly to the event (no limit).
        """
    )

    # Check event selection
    if not ss.get("event_code"):
        st.warning("Please select or create an event before uploading images.")
        return

    # --------------------------------------------------------------------
    # Upload Existing Photos: Allows users to upload images from their device
    # --------------------------------------------------------------------
    with st.expander(
        "Upload existing photos from your device (no shot limit)", expanded=False
    ):
        device_files = st.file_uploader(
            "Choose images",
            type=["jpg", "jpeg", "png"],
            accept_multiple_files=True,
            key="device_file_uploader",
        )
        if device_files:
            cols = st.columns(min(len(device_files), 4))
            for idx, file in enumerate(device_files):
                with cols[idx % len(cols)]:
                    try:
                        st.image(file, caption=file.name, use_container_width=True)
                    except Exception:
                        st.caption(f"Preview error: {file.name}")

        if st.button(
            "Upload selected images from device", key="btn_device_file_upload"
        ):
            if not device_files:
                st.warning("No files selected from device to upload.")
            else:
                total = len(device_files)
                progress = st.progress(
                    0.0, text=f"Preparing to upload {total} image(s)..."
                )
                successes, errors = 0, []
                for i, file in enumerate(device_files, start=1):
                    try:
                        file.seek(0)
                        progress.progress(
                            i / total, text=f"Uploading '{file.name}' ({i}/{total})..."
                        )
                        if upload_image(ss.event_code, file):
                            successes += 1
                        else:
                            errors.append(f"'{file.name}': server error")
                    except Exception as e:
                        errors.append(f"'{file.name}': {e}")
                progress.empty()
                if successes:
                    st.toast(
                        f"✅ Successfully uploaded {successes}/{total} image(s) from device.",
                        icon="📤",
                    )
                if errors:
                    st.error(f"❌ Failed to upload {len(errors)} image(s):")
                    for err in errors:
                        st.caption(f" - {err}")

    st.divider()

    # --------------------------------------------------------------------
    # Disposable Camera Counter
    # --------------------------------------------------------------------
    shots_used = len(ss.pending_camera_shots) + len(ss.uploaded_camera_shots)
    shots_left = MAX_DISPOSABLE_SHOTS - shots_used
    color = "#ef476f" if shots_left <= 5 else "#fca311" if shots_left <= 10 else "#eee"
    st.markdown(
        f"""
<div style='font-family:monospace;font-size:18px;padding:8px;background:#222;color:{color};border-radius:8px;text-align:center;margin-bottom:16px;'>
DISPOSABLE CAMERA: {shots_left} SHOT{'S' if shots_left != 1 else ''} REMAINING
</div>
        """,
        unsafe_allow_html=True,
    )

    # --------------------------------------------------------------------
    # Camera Input (with Filters) Component: Allows users to take new shots with filters
    # --------------------------------------------------------------------
    camera_col, film_col = st.columns([2, 3], gap="medium")
    with camera_col:
        st.subheader("📸 Film Camera")
        key = f"camera_input_{shots_left}"
        frame = (
            st.camera_input("Tap shutter (horizontal preferred)", key=key)
            if shots_left > 0
            else None
        )
        if shots_left <= 0:
            st.warning("🎞️ Disposable camera roll is full!")
            st.info("Delete some pending shots from the film strip to take more.")

        ss.current_image_filter = st.selectbox(
            "Apply filter to new shot:",
            IMAGE_FILTERS,
            index=IMAGE_FILTERS.index(ss.current_image_filter),
            key="image_filter_selector",
        )

        if frame and frame != ss.last_processed_camera_frame:
            with st.spinner("Processing image with filter..."):
                try:
                    img = Image.open(frame).convert("RGB")
                    filtered = apply_filter_to_image(img, ss.current_image_filter)
                    buf = BytesIO()
                    filtered.save(buf, "JPEG", quality=85)
                    buf.seek(0)
                    buf.name = f"shot_{int(time.time())}.jpg"
                    ss.pending_camera_shots.append(buf)
                    ss.last_processed_camera_frame = frame
                    st.toast(
                        f"📸 Shot captured with {ss.current_image_filter} filter!",
                        icon="✨",
                    )
                    st.rerun()
                except Exception as e:
                    st.error(f"Error processing camera image: {e}")

    # --------------------------------------------------------------------
    # Film Strip Component: Displays pending and uploaded shots in a film strip format
    # --------------------------------------------------------------------
    with film_col:
        st.subheader("🎞️ Film Strip")
        st.markdown(
            "Your captured shots. Upload or delete pending shots using the buttons below."
        )

        pending = ss.pending_camera_shots
        uploaded = ss.uploaded_camera_shots
        all_shots = pending + uploaded
        types = ["pending"] * len(pending) + ["uploaded"] * len(uploaded)
        slots = FILM_STRIP_ROWS * FILM_STRIP_COLS
        display = all_shots[:slots] + [None] * max(0, slots - len(all_shots))
        status = types[:slots] + ["empty"] * max(0, slots - len(types))

        for r in range(FILM_STRIP_ROWS):
            cols = st.columns(FILM_STRIP_COLS)
            for c, col in enumerate(cols):
                idx = r * FILM_STRIP_COLS + c
                shot, stype = display[idx], status[idx]
                with col:
                    if stype == "empty":
                        st.markdown(
                            "<div class='empty-film-slot'>Empty</div>",
                            unsafe_allow_html=True,
                        )
                    else:
                        shot.seek(0)
                        st.image(shot, use_container_width=True)
                        if stype == "uploaded":
                            st.markdown(
                                "<div class='uploaded-bar'>Uploaded</div>",
                                unsafe_allow_html=True,
                            )
                        else:
                            st.checkbox(
                                "",
                                key=f"sel_pending_shot_{idx}",
                                label_visibility="collapsed",
                            )

        st.divider()

        up_col, del_col = st.columns(2)
        with up_col:
            if st.button(
                "📤 Upload Selected Shots",
                key="btn_upload",
                use_container_width=True,
                type="secondary",
            ):
                selected = [
                    i for i in range(len(pending)) if ss.get(f"sel_pending_shot_{i}")
                ]
                if not selected:
                    st.warning(
                        "No pending shots selected from the film strip for upload."
                    )
                else:
                    files = [pending.pop(i) for i in sorted(selected, reverse=True)]
                    total = len(files)
                    progress = st.progress(0.0, text=f"Uploading {total} shot(s)...")
                    succ, errs = 0, []
                    for i, buf in enumerate(files, start=1):
                        try:
                            buf.seek(0)
                            progress.progress(i / total)
                            if upload_image(ss.event_code, buf):
                                succ += 1
                                ss.uploaded_camera_shots.insert(0, buf)
                            else:
                                errs.append(f"Shot idx {i}: server error")
                        except Exception as e:
                            errs.append(f"Shot idx {i}: {e}")
                    progress.empty()
                    if succ:
                        st.toast(f"✅ Uploaded {succ}/{total} shot(s)!", icon="🚀")
                    if errs:
                        st.error(f"❌ Failed {len(errs)} shot(s):")
                        for e in errs:
                            st.caption(f" - {e}")
                    st.rerun()
        with del_col:
            if st.button(
                "🗑️ Delete Selected Shots",
                key="btn_delete",
                use_container_width=True,
                type="secondary",
            ):
                to_del = [
                    i for i in range(len(pending)) if ss.get(f"sel_pending_shot_{i}")
                ]
                if not to_del:
                    st.warning(
                        "No pending shots selected from the film strip for deletion."
                    )
                else:
                    for i in sorted(to_del, reverse=True):
                        pending.pop(i)
                    st.toast(f"🗑️ Deleted {len(to_del)} pending shot(s).", icon="♻️")
                    st.rerun()

    # --------------------------------------------------------------------
    # Custom CSS
    # --------------------------------------------------------------------
    st.markdown(
        """
<style>
button[title=\"Clear photo\"] { display: none !important; }
button[data-testid=\"baseButton-primary\"] { background-color: #06d6a0 !important; color: white !important; border: none !important; font-weight: 600; border-radius: 8px; }
button[data-testid=\"baseButton-primary\"]:hover { background-color: #05c794 !important; transform: translateY(-1px); box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
button[data-testid=\"baseButton-secondary\"] { background-color: #ef476f !important; color: white !important; border: none !important; font-weight: 600; border-radius: 8px; }
button[data-testid=\"baseButton-secondary\"]:hover { background-color: #e63946 !important; transform: translateY(-1px); box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
.stImage > img { border-radius: 4px; object-fit: cover; }
.empty-film-slot { border: 2px dashed #555; height: 80px; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: #888; font-size: 12px; background-color: rgba(200,200,200,0.1); }
.uploaded-indicator-wrapper { position: relative; border-radius: 4px; overflow: hidden; line-height: 0; }
.uploaded-indicator-wrapper .stImage > img { display: block !important; }
.uploaded-bar { position: absolute; bottom: 0; left: 0; width: 100%; background-color: rgba(6, 214, 160, 0.85); color: white; text-align: center; font-weight: bold; padding: 4px 0; font-size: 0.75em; border-bottom-left-radius: 4px; border-bottom-right-radius: 4px; box-sizing: border-box; }
div[data-testid=\"stCheckbox\"] { padding-top: 2px; margin-left: auto; margin-right: auto; }
.stBlockLabel { font-weight: 500 !important; }
</style>
""",
        unsafe_allow_html=True,
    )


if __name__ == "__main__":
    main()
