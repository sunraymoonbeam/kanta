import io
import os
import re
from datetime import date, datetime
from datetime import time as t

import requests
import streamlit as st
from utils.api import (
    create_event,
    get_events,
    update_event,
    upload_event_image,
    delete_event,
)
from utils.session import get_event_selection, init_session_state

# Page Configuration
st.set_page_config(page_title="Events Manager", page_icon="🎭", layout="centered")

# Constants
AZURE_CONTAINER_NAME_REGEX = re.compile(r"^[a-z0-9](?:[a-z0-9\-]{1,61}[a-z0-9])?$")
MIN_LEN = 3
MAX_LEN = 63
ADMIN_PW = os.getenv("ADMIN_PASSWORD", "password123")


def main() -> None:
    # Session State Initialization
    init_session_state()
    get_event_selection()
    ss = st.session_state
    ss.setdefault("edit_mode", False)
    ss.setdefault("just_created", False)

    # --------------------------------------------------------------------
    # Header
    # --------------------------------------------------------------------
    st.title("Events")
    st.markdown("Manage your events and maintain a collaborative photo album.")

    tab_current, tab_create, tab_delete = st.tabs(
        ["Current Event", "Create Event", "Delete Event"]
    )

    # --------------------------------------------------------------------
    # Current Event Tab
    # --------------------------------------------------------------------
    with tab_current:
        if not ss.get("event_code"):
            st.warning(
                "Select or create an event first to view or edit existing events."
            )
        else:
            st.caption("View and edit your current event details below.")
            code = ss.event_code
            event = get_events(event_code=ss.event_code)[0]

            # Get image and QR code URLs
            image_url = event.get("event_image_url") or None
            qr_url = event.get("qr_code_image_url") or None

            # Build columns for event image and QR code
            col1, col2 = st.columns([3, 2], gap="medium")

            # --------------------------------------------------------------------
            # Column 1: Event Image and Upload Form
            # --------------------------------------------------------------------
            with col1:
                st.subheader(event.get("name") or code)
                img_data = None
                if image_url:
                    try:
                        resp = requests.get(image_url)
                        resp.raise_for_status()
                        img_data = resp.content
                    except Exception:
                        pass
                # Display event image or blank if none
                if img_data:
                    st.image(
                        img_data,
                        caption=event.get("description") or "No description provided.",
                        use_container_width=True,
                    )
                else:
                    st.empty()

                # Image upload form
                with st.expander("Change Event Image"):
                    with st.form("upload_image_form", clear_on_submit=True):
                        uploaded = st.file_uploader(
                            "Select new event image", type=["jpg", "jpeg", "png"]
                        )
                        if st.form_submit_button("Upload"):
                            if not uploaded:
                                st.warning("Please select a file first.")
                            else:
                                buf = io.BytesIO(uploaded.getvalue())
                                buf.name = uploaded.name
                                try:
                                    upload_event_image(event_code=code, image_file=buf)
                                    st.success("Event image updated!")
                                    st.rerun()
                                except requests.HTTPError as err:
                                    detail = err.response.text or str(err)
                                    st.error(
                                        f"Upload failed ({err.response.status_code}): {detail}"
                                    )
                                except Exception as e:
                                    st.error(f"Unexpected error: {e}")

            # --------------------------------------------------------------------
            # Column 2: Event QR Code
            # --------------------------------------------------------------------
            with col2:
                st.subheader("Event QR Code")
                if qr_url:
                    qr_data = None
                    try:
                        qr_resp = requests.get(qr_url)
                        qr_resp.raise_for_status()
                        qr_data = qr_resp.content
                    except Exception:
                        pass
                    if qr_data:
                        st.image(
                            qr_data,
                            width=300,
                            caption="Scan this QR code to join the event",
                        )
                        st.download_button(
                            "Download QR Code",
                            data=qr_data,
                            file_name=f"{code}_qr.png",
                            mime="image/png",
                        )
                    else:
                        st.empty()

            # --------------------------------------------------------------------
            # Event Details and Edit Form
            # --------------------------------------------------------------------
            st.divider()
            st.subheader("Event Details")
            st.markdown("Here you can view and edit the event details.")

            with st.form("event_form", clear_on_submit=False):
                name = st.text_input(
                    "Name",
                    value=event.get("name") or "",
                    disabled=not ss.edit_mode,
                    help="Name of your event.",
                )
                desc = st.text_area(
                    "Description",
                    value=event.get("description") or "",
                    disabled=not ss.edit_mode,
                    help="Description of your event.",
                )
                c1, c2 = st.columns(2)
                start_date = c1.date_input(
                    "Start Date",
                    value=date.fromisoformat(event["start_date_time"][:10]),
                    disabled=not ss.edit_mode,
                    help="Start date of your event.",
                )
                start_time = c2.time_input(
                    "Start Time",
                    value=datetime.fromisoformat(event["start_date_time"]).time(),
                    disabled=not ss.edit_mode,
                    help="Start time of your event.",
                )
                c3, c4 = st.columns(2)
                end_date = c3.date_input(
                    "End Date",
                    value=date.fromisoformat(event["end_date_time"][:10]),
                    disabled=not ss.edit_mode,
                    help="End date of your event.",
                )
                end_time = c4.time_input(
                    "End Time",
                    value=datetime.fromisoformat(event["end_date_time"]).time(),
                    disabled=not ss.edit_mode,
                    help="End time of your event.",
                )
                # Editing mode
                if ss.edit_mode:
                    b1, b2 = st.columns(2)
                    if b1.form_submit_button("Save Changes"):
                        try:
                            update_event(
                                event_code=code,
                                name=name or None,
                                description=desc or None,
                                start_date_time=datetime.combine(
                                    start_date, start_time
                                ),
                                end_date_time=datetime.combine(end_date, end_time),
                            )
                            st.success("Event updated!")
                            ss.edit_mode = False
                            st.rerun()
                        except requests.HTTPError as err:
                            detail = err.response.text or str(err)
                            st.error(
                                f"Update failed ({err.response.status_code}): {detail}"
                            )
                        except Exception as e:
                            st.error(f"Unexpected error: {e}")
                    if b2.form_submit_button("Cancel"):
                        ss.edit_mode = False
                        st.rerun()
                else:
                    if st.form_submit_button("Edit Event"):
                        ss.edit_mode = True
                        st.rerun()

    # --------------------------------------------------------------------
    # Create New Event Tab
    # --------------------------------------------------------------------
    with tab_create:
        st.subheader("Create New Event")
        st.caption("_Create a new event to start collecting photos and memories!_")
        with st.form("create_form"):
            code = st.text_input(
                "Event Code",
                placeholder="myevent123",
                help="Unique identifier for your event. "
                "Must only consist of lowercase letters, numbers, and between 3 and 63 characters long.",
                max_chars=MAX_LEN,
            ).strip()
            name = st.text_input(
                "Event Name", placeholder="My Awesome Event", help="Name of your event."
            )
            desc = st.text_area(
                "Description",
                placeholder="A fun event for everyone",
                help="Description of your event.",
            )
            c1, c2 = st.columns(2)
            d0 = c1.date_input(
                "Start Date",
                value=date.today(),
                help="Start date of your event.",
            )
            t0 = c2.time_input(
                "Start Time",
                value=t(9, 0),
                step=1800,
                help="Start time of your event.",
            )
            c3, c4 = st.columns(2)
            d1 = c3.date_input(
                "End Date",
                value=date.today(),
                help="End date of your event.",
            )
            t1 = c4.time_input(
                "End Time",
                value=t(17, 0),
                step=1800,
                help="End time of your event.",
            )

            if st.form_submit_button("Create Event"):
                # Validation Checks, Ren Hwa: in the future, can use pydantic models for validation
                if not code:
                    st.toast("Event Code is required.", icon="🚨")
                if len(code) < MIN_LEN or len(code) > MAX_LEN:
                    st.toast(
                        f"Event Code must be between {MIN_LEN} and {MAX_LEN} characters.",
                        icon="🚨",
                    )
                if not AZURE_CONTAINER_NAME_REGEX.match(code):
                    st.toast(
                        "Invalid Event Code. "
                        "Must consist of lowercase letters, numbers, and single hyphens, "
                        "cannot begin or end with a hyphen, and cannot have consecutive hyphens.",
                        icon="🚨",
                    )
                if not name:
                    st.toast("Event Name is required.", icon="🚨")
                else:
                    try:
                        new_event = create_event(
                            event_code=code.strip(),
                            name=name or None,
                            description=desc or None,
                            start_date_time=datetime.combine(d0, t0),
                            end_date_time=datetime.combine(d1, t1),
                        )
                        ss.event_code = new_event["code"]
                        ss.just_created = True
                        st.rerun()

                    except requests.HTTPError as err:
                        detail = err.response.text or str(err)
                        st.error(
                            f"Creation failed ({err.response.status_code}): {detail}"
                        )

                    except Exception as e:
                        st.error(f"Unexpected error: {e}")

        if ss.just_created:
            # fetch the newly created event details
            new_event = get_events(event_code=code)[0]

            # congratulatory message
            st.balloons()
            st.success(
                f"Event **{new_event.get('name', code)}** created successfully! 🎉"
            )

            # Display newly created event QR code if available
            qr_url = new_event.get("qr_code_image_url")
            if qr_url:
                st.subheader("Event QR Code", divider="rainbow")
                st.divider()

                qr_data = None
                try:
                    qr_resp = requests.get(qr_url)
                    qr_resp.raise_for_status()
                    qr_data = qr_resp.content
                except Exception:
                    pass

                if qr_data:
                    st.image(
                        qr_data,
                        width=300,
                        caption="Scan this QR code to join the event",
                    )
                    st.download_button(
                        "Download Event QR Code",
                        data=qr_data,
                        file_name=f"{ss.event_code}_qr.png",
                        mime="image/png",
                    )
                else:
                    st.empty()

            # Reset just_created flag
            ss.just_created = False

    # --------------------------------------------------------------------
    # Delete Event Tab
    # --------------------------------------------------------------------
    with tab_delete:
        st.subheader("Delete Event")
        st.markdown(
            "Select an event to delete. **Warning:** This will delete all images, and this action is irreversible!"
        )

        # Fetch all events to populate the selectbox
        try:
            all_events = get_events()
        except Exception as e:
            st.error(f"Could not retrieve events: {e}")
            all_events = []

        if not all_events:
            st.info("No events available to delete.")
        else:
            # Build a mapping from display label to event code
            event_options = {
                f"{evt.get('name', evt['code'])} ({evt['code']})": evt["code"]
                for evt in all_events
            }
            display_labels = list(event_options.keys())

            selected_label = st.selectbox(
                "Select Event to Delete",
                options=display_labels,
                help="Choose the event you want to remove permanently.",
            )
            selected_code = event_options[selected_label]

            ss.setdefault("show_delete_event_dialog", False)
            ss.setdefault("prev_selected_event", "")

            # If user changes the selected event, reset the dialog flag
            if selected_code != ss.prev_selected_event:
                ss.show_delete_event_dialog = False
                ss.prev_selected_event = selected_code

            # Stage 1: Show “Delete Event” button
            if st.button(
                "Delete Event",
                use_container_width=True,
                type="primary",
            ):
                ss.show_delete_event_dialog = True
                st.rerun()

            st.markdown("---")

            # If dialog flag is set, open the modal dialog
            if ss.show_delete_event_dialog:

                @st.dialog("Confirm Delete Event", width="small")
                def confirm_delete_event(label: str, code: str):
                    """
                    Modal dialog to confirm deletion of the selected event.
                    """
                    st.warning(
                        f"You’re about to permanently delete the event **{label}**. This cannot be undone."
                    )
                    pwd = st.text_input(
                        "Administrator Password",
                        type="password",
                        key="delete_event_pwd_dialog",
                        help="You must be an administrator to delete events.",
                    )
                    confirm_text = st.text_input(
                        "Type Event Code to Confirm",
                        placeholder=code,
                        key="confirm_event_code_dialog",
                        help="Re-enter the event code exactly to confirm deletion.",
                    )

                    cols = st.columns([1, 1], gap="small")
                    with cols[0]:
                        if st.button(
                            "Confirm",
                            key="confirm_delete_event_button",
                            type="primary",
                        ):
                            ADMIN_PW = os.getenv(
                                "admin_password", "Reallysecurepassword123"
                            )

                            if pwd != ADMIN_PW:
                                st.error("Incorrect administrator password.")
                            elif confirm_text.strip() != code:
                                st.error(
                                    "Event code does not match. Deletion cancelled."
                                )
                            else:
                                # Proceed with deletion
                                try:
                                    delete_event(event_code=code)
                                except requests.HTTPError as err:
                                    detail = err.response.text or str(err)
                                    st.error(
                                        f"Deletion failed ({err.response.status_code}): {detail}"
                                    )
                                    return
                                except Exception as e:
                                    st.error(f"Unexpected error: {e}")
                                    return

                                # On success:
                                st.toast(f"Event **{label}** deleted.", icon="✅")

                                # Clear current selection if it matches the deleted event
                                if ss.get("event_code") == code:
                                    ss.event_code = None

                                # Reset dialog flag so it hides again
                                ss.show_delete_event_dialog = False
                                st.rerun()

                    with cols[1]:
                        if st.button("Cancel", key="cancel_delete_event_button"):
                            ss.show_delete_event_dialog = False
                            st.rerun()

                # Call the dialog, passing in label and code
                confirm_delete_event(selected_label, selected_code)


if __name__ == "__main__":
    main()
