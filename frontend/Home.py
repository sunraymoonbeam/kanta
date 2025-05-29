import streamlit as st
from utils.session import get_event_selection, init_session_state

st.set_page_config(
    page_title="Kanta | Collaborative Event Photos",
    page_icon="📸",
    layout="wide",
)


def render_step(step: dict) -> None:
    """Render one instruction step with fixed-size image + text in two columns.

    Args:
        step (dict): A dictionary containing the step details.
            Expected keys: title, description, page, link_label, icon, image_src, caption
    """
    col_img, col_txt = st.columns([3, 3])
    with col_img:
        st.image(
            step["image_src"],
            width=300,
            clamp=False,
            use_container_width=False,
            caption=step["caption"],
        )
    with col_txt:
        st.subheader(step["title"])
        st.write(step["description"])
        st.page_link(
            page=step["page"],
            label=step["link_label"],
            icon=step["icon"],
            use_container_width=True,
        )


def main():
    # init
    init_session_state()
    get_event_selection()

    # header
    st.title("Kanta | Collaborative Event Photos")
    st.markdown("_Transform your event into a live, shared photo album._")
    st.markdown(
        "Kanta lets event participants capture, share, and organize photos in a shared "
        "digital camera roll, automatically grouping moments by person."
    )
    st.divider()

    # instruction steps
    st.markdown("## How It Works")
    steps = [
        {
            "title": "1. Create Event & QR Code",
            "description": (
                "Set up your event and generate a custom QR code guests can scan to join instantly."
            ),
            "page": "pages/01_Events.py",
            "link_label": "Manage Events >",
            "icon": "🎭",
            "image_src": "https://cdn.prod.website-files.com/673d196dcbdffd5878aa34c3/67450441a62191954ce549e9_4-creative-qr-code-ideas-to-enhance-your-wedding-experience-wf.webp",
            "caption": "Generate and share your QR code",
        },
        {
            "title": "2. Snap or Upload Photos",
            "description": (
                "Scan the event QR code to open Kanta, then capture or upload photos directly from any device."
            ),
            "page": "pages/02_Camera.py",
            "link_label": "Snap & Upload Photos >",
            "icon": "📸",
            "image_src": "https://images.airtasker.com/v7/https://airtasker-seo-assets-prod.s3.amazonaws.com/en_AU/1715328328533-event-photographers-hero.jpg",
            "caption": "Capture moments live",
        },
        {
            "title": "3. Explore Your Gallery",
            "description": (
                "Browse all event photos in one place, filter by date or person, and mark your favorites."
            ),
            "page": "pages/03_Gallery.py",
            "link_label": "View Gallery >",
            "icon": "🖼️",
            "image_src": "https://photos.smugmug.com/BLOG/Blog-images/i-4DzMFWZ/0/NCg78ZfVGwLThZt3BVVJkBNq7VgL2LmzdVTHmXfnd/XL/%40RobHammPhoto%20%236%28c%292017RobertHamm-XL.jpg",
            "caption": "All your photos in one album",
        },
        {
            "title": "4. Find People Instantly",
            "description": (
                "Discover auto-detected faces, see every photo of a guest, and relive shared moments."
            ),
            "page": "pages/04_People.py",
            "link_label": "Discover People >",
            "icon": "👥",
            "image_src": "https://production-rhino-website-crm.s3.ap-southeast-1.amazonaws.com/Face_Recognition_17a30dc38b.png",
            "caption": "Smart face grouping",
        },
    ]

    for step in steps:
        render_step(step)
        st.divider()

    st.caption("Kanta: Creating memories together.")


if __name__ == "__main__":
    main()
