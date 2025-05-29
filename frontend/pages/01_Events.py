from datetime import date, datetime, time

import streamlit as st
from requests import HTTPError
from utils.api import create_event, get_events, update_event
from utils.session import get_event_selection, init_session_state

# Page Configuration
st.set_page_config(page_title="Events", page_icon="🎭", layout="wide")


def main() -> None:
    """
    Render the Events management UI with two tabs:
      1. Current Event: view & edit an existing event
      2. Create New Event
    """
    # Session State Initialization
    init_session_state()
    get_event_selection()
    ss = st.session_state
    ss.setdefault("edit_mode", False)

    st.title("Events")
    st.markdown(
        "Manage your events and create a collaborative photo album for participants."
    )
    tab_current, tab_create = st.tabs(["Current Event", "Create New Event"])

    # --------------------------------------------------------------------
    # Tab 1: Current Event
    # --------------------------------------------------------------------
    with tab_current:
        st.subheader("Current Event Details")
        if not ss.get("event_code"):
            st.warning("Please select or create an event first.")
        else:
            try:
                event = get_events(event_code=ss.event_code)[0]
            except HTTPError as err:
                st.error(f"Error fetching event: {err}")
                return
            except Exception as err:
                st.error(f"Unexpected error: {err}")
                return

            # Original values
            orig = {
                "name": event.get("name") or "",
                "desc": event.get("description") or "",
                "start": event.get("start_date_time", "").rstrip("Z"),
                "end": event.get("end_date_time", "").rstrip("Z"),
            }

            # Parse to datetime for defaults
            start_dt = datetime.fromisoformat(orig["start"]) if orig["start"] else None
            end_dt = datetime.fromisoformat(orig["end"]) if orig["end"] else None

            with st.form("event_form"):
                st.text_input("Event Code", value=event["code"], disabled=True)
                name = (
                    st.text_input(
                        "Event Name",
                        value=orig["name"],
                        disabled=not ss.edit_mode,
                    )
                    or ""
                ).strip()
                desc = (
                    st.text_area(
                        "Description",
                        value=orig["desc"],
                        disabled=not ss.edit_mode,
                    )
                    or ""
                ).strip()

                cols = st.columns(4)
                d0 = cols[0].date_input(
                    "Start Date",
                    value=start_dt.date() if start_dt else date.today(),
                    disabled=not ss.edit_mode,
                )
                t0 = cols[1].time_input(
                    "Start Time",
                    value=start_dt.time() if start_dt else time(9, 0),
                    step=1800,
                    disabled=not ss.edit_mode,
                )
                d1 = cols[2].date_input(
                    "End Date",
                    value=end_dt.date() if end_dt else date.today(),
                    disabled=not ss.edit_mode,
                )
                t1 = cols[3].time_input(
                    "End Time",
                    value=end_dt.time() if end_dt else time(17, 0),
                    step=1800,
                    disabled=not ss.edit_mode,
                )

                if ss.edit_mode:
                    save, cancel = st.columns(2)
                    if save.form_submit_button("💾 Save"):
                        new = {
                            "name": name,
                            "desc": desc,
                            "start": datetime.combine(d0, t0).isoformat(),
                            "end": datetime.combine(d1, t1).isoformat(),
                        }
                        if new == orig:
                            st.info("No changes detected.")
                        else:
                            try:
                                update_event(
                                    event_code=event["code"],
                                    name=new["name"] or None,
                                    description=new["desc"] or None,
                                    start_date_time=datetime.fromisoformat(
                                        new["start"]
                                    ),
                                    end_date_time=datetime.fromisoformat(new["end"]),
                                )
                                st.success("Event updated!")
                                ss.edit_mode = False
                                st.rerun()
                            except HTTPError as err:
                                st.error(f"Update failed: {err}")
                            except Exception as err:
                                st.error(f"Unexpected error: {err}")
                    if cancel.form_submit_button("✖️ Cancel"):
                        ss.edit_mode = False
                        st.rerun()
                else:
                    if st.form_submit_button("Edit Event"):
                        ss.edit_mode = True
                        st.rerun()

    # --------------------------------------------------------------------
    # Tab 2: Create New Event
    # --------------------------------------------------------------------
    with tab_create:
        st.subheader("Create New Event")
        with st.form("create_event_form"):
            code = (
                st.text_input(
                    "Event Code",
                    placeholder="E.g., MY_EVENT_24",
                    help="Must be unique and alphanumeric (underscores allowed).",
                )
                or ""
            ).strip()
            name = (
                st.text_input(
                    "Event Name",
                    placeholder="My Awesome Event",
                    help="Optional name for the event",
                )
                or ""
            ).strip()
            desc = (
                st.text_area(
                    "Description",
                    placeholder="My Awesome Event Description",
                    help="Optional longer description of the event",
                )
                or ""
            ).strip()

            cols = st.columns(4)
            d0 = cols[0].date_input(
                "Start Date",
                value=date.today(),
                help="Select the start date of the event.",
            )
            t0 = cols[1].time_input(
                "Start Time",
                value=time(9, 0),
                step=1800,
                help="Select the start time of the event.",
            )
            d1 = cols[2].date_input(
                "End Date", value=date.today(), help="Select the end date of the event."
            )
            t1 = cols[3].time_input(
                "End Time",
                value=time(17, 0),
                step=1800,
                help="Select the end time of the event.",
            )

            if st.form_submit_button("Create Event"):
                if not code:
                    st.error("Event Code is required.")
                else:
                    try:
                        created = create_event(
                            event_code=code,
                            name=name or None,
                            description=desc or None,
                            start_date_time=datetime.combine(d0, t0),
                            end_date_time=datetime.combine(d1, t1),
                        )
                        st.success(f"'{created.get('name', created['code'])}' created!")
                        st.session_state.event_code = created.get("code")
                        st.rerun()
                    except HTTPError as err:
                        st.error(f"Creation failed: {err}")
                    except Exception as err:
                        st.error(f"Unexpected error: {err}")


if __name__ == "__main__":
    main()
