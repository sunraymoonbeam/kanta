import base64
from io import BytesIO
from typing import Dict, Optional, Tuple

import requests
import streamlit as st
from PIL import Image, ImageEnhance, ImageOps


def apply_filter_to_image(image: Image.Image, filter_mode: str) -> Image.Image:
    """
    Apply a visual filter to a PIL Image.

    Args:
        image: Original PIL Image.
        filter_mode: One of ['Normal', 'Black & White', 'Warm', 'Cool', 'Sepia'].

    Returns:
        A new PIL Image object with the filter applied.
    """
    if filter_mode == "Black & White":
        return image.convert("L").convert("RGB")

    if filter_mode == "Warm":
        enhancer = ImageEnhance.Color(image)
        warm_img = enhancer.enhance(1.3)
        overlay = Image.new("RGB", image.size, (255, 230, 200))
        return Image.blend(warm_img, overlay, 0.15)

    if filter_mode == "Cool":
        enhancer = ImageEnhance.Color(image)
        cool_img = enhancer.enhance(0.9)
        overlay = Image.new("RGB", image.size, (200, 230, 255))
        return Image.blend(cool_img, overlay, 0.15)

    if filter_mode == "Sepia":
        return ImageOps.colorize(image.convert("L"), black="#704214", white="#C0A080")

    return image


@st.cache_data
def fetch_image_bytes_from_url(url: str, timeout: int = 15) -> Optional[BytesIO]:
    """
    Download image data from a URL and return it as a BytesIO stream.

    Args:
        url: The web address of the image.
        timeout: Request timeout in seconds.

    Returns:
        BytesIO containing the image data, or None on failure.

    Raises:
        requests.HTTPError: On non-200 response codes.
        requests.RequestException: On network-related errors.
    """
    try:
        response = requests.get(url, timeout=timeout)
        response.raise_for_status()
        return BytesIO(response.content)

    except Exception:
        raise


def crop_and_encode_face(
    image_bytes: bytes,
    bbox: Dict[str, int],
    target_size: Tuple[int, int],
    pad_x_ratio: float = 0.3,
    pad_y_ratio: float = 0.3,
) -> Optional[str]:
    """
    Crops a face from image bytes, resizes with padding, and encodes it as base64.

    Args:
        image_bytes: Raw bytes of the image.
        bbox: Dictionary with bounding box coordinates:
            - x: X coordinate of the top-left corner
            - y: Y coordinate of the top-left corner
            - width: Width of the bounding box
            - height: Height of the bounding box
        target_size: Tuple (width, height) for the final image size.
        pad_x_ratio: Padding ratio for width (default 0.3).
        pad_y_ratio: Padding ratio for height (default 0.3).

    Returns:
        Base64-encoded string of the cropped and resized face image, or None on failure.
    """
    try:
        # --- THIS IS THE CRITICAL CHANGE ---
        # Wrap the image_bytes in BytesIO for Pillow
        img_stream = BytesIO(image_bytes)
        img = Image.open(img_stream)
        # --- END CRITICAL CHANGE ---

        img = img.convert("RGB")  # Ensure it's RGB

        # Original bounding box coordinates
        x, y, w, h = bbox["x"], bbox["y"], bbox["width"], bbox["height"]

        # Calculate padding in pixels
        pad_x_pixels = int(w * pad_x_ratio)
        pad_y_pixels = int(h * pad_y_ratio)

        # Calculate expanded bounding box, ensuring it's within image bounds
        x1 = max(0, x - pad_x_pixels)
        y1 = max(0, y - pad_y_pixels)
        x2 = min(img.width, x + w + pad_x_pixels)
        y2 = min(img.height, y + h + pad_y_pixels)

        # Crop the image
        cropped_face = img.crop((x1, y1, x2, y2))

        # Resize to target_size while maintaining aspect ratio (padding with black if necessary)
        # This uses ImageOps.fit for a "cover" like effect then resizes,
        # or you can use thumbnail and then pad.
        # For a simple resize then pad to make it square (if target_size is square):
        # cropped_face.thumbnail(target_size, Image.Resampling.LANCZOS)
        # new_image = Image.new("RGB", target_size, (0,0,0)) # Black background
        # paste_x = (target_size[0] - cropped_face.width) // 2
        # paste_y = (target_size[1] - cropped_face.height) // 2
        # new_image.paste(cropped_face, (paste_x, paste_y))
        # final_face = new_image

        # A more robust resize that fits within target_size and pads (letterboxing/pillarboxing)
        final_face = ImageOps.pad(
            cropped_face, target_size, color="black", method=Image.Resampling.LANCZOS
        )

        # Encode to base64
        buffered = BytesIO()
        final_face.save(buffered, format="PNG")  # Or JPEG
        img_str = base64.b64encode(buffered.getvalue()).decode()
        return f"data:image/png;base64,{img_str}"

    except Exception:
        raise
