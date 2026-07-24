import io
import requests
import torch
from bs4 import BeautifulSoup
from PIL import Image
from torchvision import transforms


def get_direct_gif_url(url):
    """If the JavaScript extracts the landing page URL instead of the direct

    media asset, this helper scrapes the meta tags to find the raw GIF.
    """
    if url.endswith(".gif"):
        return url

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }
    response = requests.get(url, headers=headers)
    response.raise_for_status()

    soup = BeautifulSoup(response.text, "html.parser")

    # Look for standard open graph tags used by Tenor and Giphy
    og_image = soup.find("meta", property="og:image")
    if og_image and "content" in og_image.attrs:
        gif_url = og_image["content"]
        # Ensure we are getting the animated version if Giphy tries to serve a static preview
        if "giphy.com" in gif_url and not gif_url.endswith(".gif"):
            # Fallback to alternative media tags if present
            og_url = soup.find("meta", property="og:url")
            if og_url:
                return og_url["content"]
        return gif_url

    return url


def gif_url_to_tensor(url, target_size=(128, 128), max_frames=32, normalize=True):
    """Downloads a GIF from a Tenor/Giphy link and converts it into a PyTorch tensor.

    Returns:
        A tensor of shape (num_frames, channels, height, width) -> (T, C, H, W)
    """
    # 1. Resolve to the direct asset URL
    direct_url = get_direct_gif_url(url)

    # 2. Download the GIF bytes
    response = requests.get(direct_url)
    response.raise_for_status()
    gif_bytes = io.BytesIO(response.content)

    # 3. Open the image with PIL
    with Image.open(gif_bytes) as img:
        frames = []

        # Define the image transformations (Resizing and standardizing channels)
        transform_list = [
            transforms.Resize(target_size),
            transforms.ToTensor(),  # Scales pixels to [0.0, 1.0]
        ]
        if normalize:
            # Standard ImageNet normalization coefficients
            transform_list.append(
                transforms.Normalize(
                    mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]
                )
            )

        preprocess = transforms.Compose(transform_list)

        # 4. Extract and process each frame
        frame_idx = 0
        try:
            while frame_idx < max_frames:
                # Convert frame to RGB (handles transparency/palettes gracefully)
                frame_rgb = img.convert("RGB")
                frame_tensor = preprocess(frame_rgb)
                frames.append(frame_tensor)

                frame_idx += 1
                img.seek(img.tell() + 1)  # Move to the next frame
        except EOFError:
            pass  # Reached the end of the GIF early

        # 5. Handle variable lengths (Padding or Truncating)
        # If the GIF is shorter than max_frames, loop the frames to pad it
        if len(frames) < max_frames:
            orig_len = len(frames)
            while len(frames) < max_frames:
                frames.append(frames[len(frames) % orig_len])

        # Stack into a single tensor: (T, C, H, W)
        video_tensor = torch.stack(frames)

        return video_tensor
