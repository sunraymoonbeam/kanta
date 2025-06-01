import streamlit as st
from utils.session import get_event_selection, init_session_state

# Page Configuration
st.set_page_config(
    page_title="Kanta | Collaborative Event Photos",
    page_icon="📸",
    layout="centered",
    initial_sidebar_state="expanded",
)


def main():
    # Session State Initialization
    init_session_state()
    get_event_selection()

    # --------------------------------------------------------------------
    # Header
    # --------------------------------------------------------------------
    st.title("Kanta | Collaborative Event Photos")
    st.markdown("_Transform your event into a live, shared photo album._")
    st.markdown(
        "Kanta lets event participants capture, share, and organize photos in a shared "
        "digital camera roll, automatically grouping moments by person."
    )
    st.divider()

    # --------------------------------------------------------------------
    # Instructions
    # --------------------------------------------------------------------
    st.markdown("## How It Works")

    # STEP 1
    col_img1, col_txt1 = st.columns([3, 4], gap="large")
    with col_img1:
        st.image(
            "https://cdn.prod.website-files.com/673d196dcbdffd5878aa34c3/67450441a62191954ce549e9_4-creative-qr-code-ideas-to-enhance-your-wedding-experience-wf.webp",
            width=300,
            clamp=False,
            use_container_width=False,
            caption="Generate and share your QR code",
        )
    with col_txt1:
        st.subheader(
            "1. Create Event & QR Code",
            divider="violet",
        )
        st.write(
            "Set up your event and generate a custom QR code guests can scan to join instantly."
        )
        st.page_link(
            page="pages/01_Events.py",
            label="Manage Events >",
            icon="🎭",
            use_container_width=True,
        )
    st.divider()

    # STEP 2
    col_img2, col_txt2 = st.columns([3, 4], gap="large")
    with col_img2:
        st.image(
            "https://images.airtasker.com/v7/https://airtasker-seo-assets-prod.s3.amazonaws.com/en_AU/1715328328533-event-photographers-hero.jpg",
            width=300,
            clamp=False,
            use_container_width=False,
            caption="Capture moments live",
        )
    with col_txt2:
        st.subheader("2. Snap or Upload Photos", divider="blue")
        st.write(
            "Scan the event QR code to open Kanta, then capture or upload photos directly from any device."
        )
        st.page_link(
            page="pages/02_Camera.py",
            label="Snap & Upload Photos >",
            icon="📸",
            use_container_width=True,
        )
    st.divider()

    # STEP 3
    col_img3, col_txt3 = st.columns([3, 4], gap="large")
    with col_img3:
        st.image(
            "https://photos.smugmug.com/BLOG/Blog-images/i-4DzMFWZ/0/NCg78ZfVGwLThZt3BVVJkBNq7VgL2LmzdVTHmXfnd/XL/%40RobHammPhoto%20%236%28c%292017RobertHamm-XL.jpg",
            width=300,
            clamp=False,
            use_container_width=False,
            caption="All your photos in one album",
        )
    with col_txt3:
        st.subheader("3. Explore Your Gallery", divider="red")
        st.write(
            "Browse all event photos in one place, filter by date or person, and mark your favorites."
        )
        st.page_link(
            page="pages/03_Gallery.py",
            label="View Gallery >",
            icon="🖼️",
            use_container_width=True,
        )
    st.divider()

    # STEP 4
    col_img4, col_txt4 = st.columns([3, 4], gap="large")
    with col_img4:
        st.image(
            "https://production-rhino-website-crm.s3.ap-southeast-1.amazonaws.com/Face_Recognition_17a30dc38b.png",
            width=300,
            clamp=False,
            use_container_width=False,
            caption="Smart face grouping",
        )
    with col_txt4:
        st.subheader("4. Find People Instantly", divider="orange")
        st.write(
            "Discover auto-detected faces, see every photo of a guest, and relive shared moments."
        )
        st.page_link(
            page="pages/04_People.py",
            label="Discover People >",
            icon="👥",
            use_container_width=True,
        )
    st.divider()

    # Footer
    st.caption("Kanta: Creating memories together, one picture at a time.")


if __name__ == "__main__":
    main()
