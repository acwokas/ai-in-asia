#!/usr/bin/env python3
"""
AI in ASIA Social Media Design Generator

Generates professional branded social media images for the AI in ASIA publication.
Produces landscape, square, and vertical formats with hero stats, gradients, and CTAs.
"""

import argparse
import json
import os
import re
import sys
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Optional, Tuple
from urllib.parse import urlparse
from urllib.request import urlopen

from PIL import Image, ImageDraw, ImageFont


# ============================================================================
# CONSTANTS & CONFIGURATION
# ============================================================================

BRAND_COLORS = {
    "background": "#151923",
    "foreground": "#F2F2F2",
    "teal_dark": "#1AB8D6",
    "teal_light": "#0FA0B8",
    "blue": "#5F72FF",
    "amber": "#E5A54B",
}

CATEGORY_COLORS = {
    "NEWS": "#E06050",
    "BUSINESS": "#E5A54B",
    "LIFE": "#c084fc",
    "LEARN": "#5F72FF",
    "DEFAULT": "#0D9488",
}

GRADIENT_OVERLAY_COLORS = {
    "left_to_right": (21, 25, 35, 0.85),
    "bottom_to_top": (21, 25, 35, 0.95),
}

LOGO_URL = "https://aiinasia.com/assets/aiinasia-logo-NqgI9cBg.png"

FONT_URLS = {
    "jakarta_800": "https://fonts.gstatic.com/s/plusjakartasans/v12/LDIbaomQNQcsA88c7O9yZ4KMCoOg4IA6-91aHEjcWuA_KUnNSg.ttf",
    "jakarta_700": "https://fonts.gstatic.com/s/plusjakartasans/v12/LDIbaomQNQcsA88c7O9yZ4KMCoOg4IA6-91aHEjcWuA_TknNSg.ttf",
    "inter_500": "https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuI6fMZg.ttf",
    "inter_400": "https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfMZg.ttf",
}

CACHE_DIR = Path.home() / ".cache" / "aiinasia" / "fonts"


# ============================================================================
# DATA STRUCTURES
# ============================================================================

@dataclass
class TLDRSnapshot:
    """Represents the TLDR snapshot with bullet points."""
    bullets: list[str]


@dataclass
class ArticleMetadata:
    """Complete article metadata for design generation."""
    title: str
    slug: str
    excerpt: str
    category: str
    featured_image_url: str
    tldr_snapshot: TLDRSnapshot
    ai_tags: list[str] = None
    focus_keyphrase: str = None

    @staticmethod
    def from_dict(data: dict) -> "ArticleMetadata":
        """Create ArticleMetadata from dictionary."""
        if isinstance(data.get("tldr_snapshot"), dict):
            tldr = TLDRSnapshot(**data["tldr_snapshot"])
        else:
            tldr = data.get("tldr_snapshot", TLDRSnapshot([]))

        return ArticleMetadata(
            title=data.get("title", ""),
            slug=data.get("slug", ""),
            excerpt=data.get("excerpt", ""),
            category=data.get("category", "DEFAULT"),
            featured_image_url=data.get("featured_image_url", ""),
            tldr_snapshot=tldr,
            ai_tags=data.get("ai_tags", []),
            focus_keyphrase=data.get("focus_keyphrase", ""),
        )


# ============================================================================
# FONT MANAGEMENT
# ============================================================================

def ensure_font_cache_dir() -> Path:
    """Create and return the font cache directory."""
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    return CACHE_DIR


def download_font(url: str, font_name: str) -> Optional[Path]:
    """Download a font from CDN, with caching."""
    cache_dir = ensure_font_cache_dir()
    font_path = cache_dir / font_name

    if font_path.exists():
        return font_path

    try:
        print(f"  Downloading {font_name}...", end=" ", flush=True)
        with urlopen(url, timeout=10) as response:
            font_data = response.read()

        with open(font_path, "wb") as f:
            f.write(font_data)

        print("✓")
        return font_path
    except Exception as e:
        print(f"✗ ({e})")
        return None


def load_fonts() -> dict:
    """Load or download all required fonts."""
    print("Loading fonts...")
    fonts = {}

    font_files = {
        "jakarta_800": "plus-jakarta-sans-800.ttf",
        "jakarta_700": "plus-jakarta-sans-700.ttf",
        "inter_500": "inter-500.ttf",
        "inter_400": "inter-400.ttf",
    }

    for font_key, font_file in font_files.items():
        path = download_font(FONT_URLS[font_key], font_file)
        fonts[font_key] = path

    return fonts


# ============================================================================
# HERO STAT EXTRACTION
# ============================================================================

@dataclass
class HeroContent:
    """What to display as the hero visual element on the design."""
    mode: str  # "stat" or "headline"
    primary_text: str  # The big text: "81%" or "Charts in Chat"
    context_text: str  # Subtitle: "of enterprises use AI" or the full title
    has_stat: bool = True


def extract_hero_content(title: str, bullets: list[str], max_context_words: int = 10) -> HeroContent:
    """
    Determine the best hero content for the design.

    For stat-driven articles (e.g. "81% of enterprises use AI"):
        → mode="stat", primary="81%", context="of enterprises use AI"

    For headline-driven articles (e.g. "Claude Now Builds Interactive Charts in Chat"):
        → mode="headline", primary=title, context=first bullet

    Returns:
        HeroContent with mode, primary text, and context text
    """
    def _truncate(text: str, max_words: int) -> str:
        words = text.split()
        if len(words) <= max_words:
            return text
        return " ".join(words[:max_words])

    if not bullets:
        return HeroContent(mode="headline", primary_text=title, context_text="", has_stat=False)

    # Try percentage first (most visual impact)
    for bullet in bullets:
        match = re.search(r'(\d+(?:\.\d+)?%)', bullet)
        if match:
            stat = match.group(1)
            context = bullet.replace(stat, '').strip()
            context = re.sub(r'^[\s,\-–—:]+|[\s,\-–—:]+$', '', context)
            return HeroContent(
                mode="stat",
                primary_text=stat,
                context_text=_truncate(context, max_context_words),
                has_stat=True,
            )

    # Try large money amounts ($X billion, $XM, $XB)
    for bullet in bullets:
        match = re.search(r'(\$\d+(?:\.\d+)?\s*(?:billion|million|trillion|[KMBT])?\+?)', bullet, re.IGNORECASE)
        if match:
            stat = match.group(1).strip()
            context = bullet.replace(match.group(0), '').strip()
            context = re.sub(r'^[\s,\-–—:]+|[\s,\-–—:]+$', '', context)
            return HeroContent(
                mode="stat",
                primary_text=stat,
                context_text=_truncate(context, max_context_words),
                has_stat=True,
            )

    # Try standalone large numbers (1B+, 10 million, etc.)
    for bullet in bullets:
        match = re.search(r'(\d+(?:\.\d+)?\s*(?:billion|million|trillion|[KMBT])\+?)', bullet, re.IGNORECASE)
        if match:
            stat = match.group(1).strip()
            context = bullet.replace(match.group(0), '').strip()
            context = re.sub(r'^[\s,\-–—:]+|[\s,\-–—:]+$', '', context)
            return HeroContent(
                mode="stat",
                primary_text=stat,
                context_text=_truncate(context, max_context_words),
                has_stat=True,
            )

    # No stat found → HEADLINE MODE
    # Use the article title as the hero, first bullet as context
    return HeroContent(
        mode="headline",
        primary_text=title,
        context_text=_truncate(bullets[0], max_context_words),
        has_stat=False,
    )


# ============================================================================
# IMAGE UTILITIES
# ============================================================================

def download_image(url: str, timeout: int = 10, keep_alpha: bool = False) -> Optional[Image.Image]:
    """Download an image from URL."""
    try:
        from io import BytesIO
        with urlopen(url, timeout=timeout) as response:
            data = response.read()
        img = Image.open(BytesIO(data))
        img.load()
        if keep_alpha and img.mode == "RGBA":
            return img
        return img.convert("RGB")
    except Exception as e:
        print(f"  Warning: Failed to download image from {url}: {e}")
        return None


def create_solid_background(width: int, height: int, color: str = "#151923") -> Image.Image:
    """Create a solid-color background image."""
    rgb = tuple(int(color.lstrip("#")[i:i+2], 16) for i in (0, 2, 4))
    return Image.new("RGB", (width, height), rgb)


def hex_to_rgb(hex_color: str) -> Tuple[int, int, int]:
    """Convert hex color to RGB tuple."""
    hex_color = hex_color.lstrip("#")
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))


def hex_to_rgba(hex_color: str, alpha: float = 1.0) -> Tuple[int, int, int, int]:
    """Convert hex color to RGBA tuple."""
    rgb = hex_to_rgb(hex_color)
    return rgb + (int(alpha * 255),)


def center_crop_image(img: Image.Image, target_width: int, target_height: int) -> Image.Image:
    """Center-crop an image to target dimensions."""
    original_width, original_height = img.size

    # Calculate crop dimensions
    scale = max(target_width / original_width, target_height / original_height)
    scaled_width = int(original_width * scale)
    scaled_height = int(original_height * scale)

    # Scale image
    img = img.resize((scaled_width, scaled_height), Image.Resampling.LANCZOS)

    # Center crop
    left = (scaled_width - target_width) // 2
    top = (scaled_height - target_height) // 2
    right = left + target_width
    bottom = top + target_height

    return img.crop((left, top, right, bottom))


def apply_gradient_overlay(
    img: Image.Image,
    gradient_type: str = "both"
) -> Image.Image:
    """
    Apply dark gradient overlays to image for text readability.

    Args:
        img: Input image
        gradient_type: "left", "bottom", or "both"
    """
    width, height = img.size
    overlay = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    # Left-to-right gradient (0 to 50%)
    if gradient_type in ("left", "both"):
        left_width = width // 2
        for x in range(left_width):
            # Fade from opaque (0.85) to transparent
            alpha = int(255 * 0.85 * (1 - x / left_width))
            color = (21, 25, 35, alpha)
            draw.line([(x, 0), (x, height)], fill=color)

    # Bottom-to-top gradient (100% to 30%)
    if gradient_type in ("bottom", "both"):
        gradient_start = int(height * 0.3)  # gradient starts at 30% from top
        for y in range(gradient_start, height):
            # progress goes from 0 (at gradient_start) to 1 (at bottom)
            progress = (y - gradient_start) / (height - gradient_start)
            # Use smoothstep for more natural falloff
            smooth = progress * progress * (3 - 2 * progress)
            alpha = int(255 * 0.93 * smooth)
            color = (21, 25, 35, alpha)
            draw.line([(0, y), (width, y)], fill=color)

    # Composite overlay onto image
    img = img.convert("RGBA")
    img = Image.alpha_composite(img, overlay)
    return img.convert("RGB")


# ============================================================================
# TEXT RENDERING
# ============================================================================

def get_font(fonts_dict: dict, font_key: str, size: int) -> ImageFont.FreeTypeFont:
    """Get a font with fallback to default."""
    font_path = fonts_dict.get(font_key)

    if font_path and font_path.exists():
        try:
            return ImageFont.truetype(str(font_path), size)
        except Exception:
            pass

    # Fallback
    try:
        return ImageFont.load_default()
    except Exception:
        return ImageFont.load_default()


def draw_text_with_shadow(
    draw: ImageDraw.ImageDraw,
    text: str,
    position: Tuple[int, int],
    font: ImageFont.FreeTypeFont,
    fill_color: str = "#FFFFFF",
    shadow_color: str = "#000000",
    shadow_offset: int = 3
) -> None:
    """Draw text with a shadow effect."""
    x, y = position
    fill_rgb = hex_to_rgb(fill_color)
    shadow_rgb = hex_to_rgb(shadow_color)

    # Draw shadow
    draw.text((x + shadow_offset, y + shadow_offset), text, font=font, fill=shadow_rgb)
    # Draw main text
    draw.text((x, y), text, font=font, fill=fill_rgb)


def wrap_text(text: str, font: ImageFont.FreeTypeFont, max_width: int, draw: ImageDraw.ImageDraw) -> list[str]:
    """Wrap text to fit within max_width."""
    words = text.split()
    lines = []
    current_line = []

    for word in words:
        test_line = " ".join(current_line + [word])
        bbox = draw.textbbox((0, 0), test_line, font=font)
        line_width = bbox[2] - bbox[0]

        if line_width <= max_width:
            current_line.append(word)
        else:
            if current_line:
                lines.append(" ".join(current_line))
            current_line = [word]

    if current_line:
        lines.append(" ".join(current_line))

    return lines


def draw_wrapped_text(
    draw: ImageDraw.ImageDraw,
    text: str,
    position: Tuple[int, int],
    font: ImageFont.FreeTypeFont,
    max_width: int,
    fill_color: str = "#FFFFFF",
    max_lines: int = None
) -> int:
    """
    Draw wrapped text and return the height used.
    """
    x, y = position
    fill_rgb = hex_to_rgb(fill_color)

    lines = wrap_text(text, font, max_width, draw)
    if max_lines:
        lines = lines[:max_lines]

    line_height = int(font.size * 1.3)

    for i, line in enumerate(lines):
        draw.text((x, y + (i * line_height)), line, font=font, fill=fill_rgb)

    return len(lines) * line_height


# ============================================================================
# PILL DESIGN
# ============================================================================

def draw_logo_text(
    draw: ImageDraw.ImageDraw,
    fonts: dict,
    position: Tuple[int, int],
    size: int = 22
) -> int:
    """Draw 'AIinASIA' text as logo fallback. Returns width used."""
    x, y = position
    logo_font = get_font(fonts, "jakarta_800", size)
    teal_rgb = hex_to_rgb(BRAND_COLORS["teal_dark"])
    white_rgb = hex_to_rgb("#FFFFFF")

    # Draw "AI" in teal
    draw.text((x, y), "AI", font=logo_font, fill=teal_rgb)
    bbox = draw.textbbox((x, y), "AI", font=logo_font)
    ai_width = bbox[2] - bbox[0]

    # Draw "in" in white
    draw.text((x + ai_width, y), "in", font=logo_font, fill=white_rgb)
    bbox2 = draw.textbbox((x + ai_width, y), "in", font=logo_font)
    in_width = bbox2[2] - bbox2[0]

    # Draw "ASIA" in teal
    draw.text((x + ai_width + in_width, y), "ASIA", font=logo_font, fill=teal_rgb)
    bbox3 = draw.textbbox((x + ai_width + in_width, y), "ASIA", font=logo_font)
    asia_width = bbox3[2] - bbox3[0]

    return ai_width + in_width + asia_width


def draw_pill(
    draw: ImageDraw.ImageDraw,
    position: Tuple[int, int],
    width: int,
    height: int,
    text: str,
    font: ImageFont.FreeTypeFont,
    bg_color: str,
    text_color: str = "#FFFFFF"
) -> None:
    """Draw a rounded pill button."""
    x, y = position
    radius = height // 2

    # Draw rounded rectangle
    bbox = [(x, y), (x + width, y + height)]
    bg_rgb = hex_to_rgb(bg_color)
    draw.rounded_rectangle(bbox, radius=radius, fill=bg_rgb)

    # Draw text centered in pill
    text_rgb = hex_to_rgb(text_color)
    bbox_text = draw.textbbox((0, 0), text, font=font)
    text_width = bbox_text[2] - bbox_text[0]
    text_height = bbox_text[3] - bbox_text[1]

    text_x = x + (width - text_width) // 2
    text_y = y + (height - text_height) // 2

    draw.text((text_x, text_y), text, font=font, fill=text_rgb)


# ============================================================================
# DESIGN GENERATORS
# ============================================================================

def generate_landscape(
    metadata: ArticleMetadata,
    fonts: dict,
    hero: HeroContent,
    bg_image: Optional[Image.Image] = None
) -> Image.Image:
    """Generate 1200x675 landscape design for Facebook/LinkedIn/X."""
    WIDTH, HEIGHT = 1200, 675

    # Create or use background
    if bg_image:
        img = center_crop_image(bg_image, WIDTH, HEIGHT)
    else:
        img = create_solid_background(WIDTH, HEIGHT)

    # Apply gradient overlay
    img = apply_gradient_overlay(img, "both")

    draw = ImageDraw.Draw(img)

    # Category pill (top-left)
    category = metadata.category.upper()
    category_color = CATEGORY_COLORS.get(category, CATEGORY_COLORS["DEFAULT"])
    pill_font = get_font(fonts, "inter_500", 14)
    draw_pill(draw, (40, 30), 120, 36, category, pill_font, category_color)

    if hero.mode == "stat":
        # STAT MODE: Big number, context below
        stat_font = get_font(fonts, "jakarta_800", 140)
        stat_y = (HEIGHT - 140) // 2 - 40
        draw_text_with_shadow(draw, hero.primary_text, (60, stat_y), stat_font)

        context_font = get_font(fonts, "inter_500", 32)
        context_y = stat_y + 150
        draw_wrapped_text(draw, hero.context_text, (60, context_y), context_font, 500)
    else:
        # HEADLINE MODE: Title as hero text, first bullet as context
        title_font = get_font(fonts, "jakarta_800", 52)
        title_y = 100
        title_h = draw_wrapped_text(
            draw, hero.primary_text, (60, title_y), title_font, 700,
            fill_color="#FFFFFF", max_lines=3
        )

        if hero.context_text:
            context_font = get_font(fonts, "inter_500", 22)
            context_y = title_y + title_h + 20
            draw_wrapped_text(
                draw, hero.context_text, (60, context_y), context_font, 600,
                fill_color="#C5C9D0", max_lines=2
            )

    # Logo text (bottom-left)
    logo_width = draw_logo_text(draw, fonts, (40, HEIGHT - 58), size=20)
    url_font = get_font(fonts, "inter_400", 13)
    draw.text((40 + logo_width + 12, HEIGHT - 52), "aiinasia.com", font=url_font, fill=hex_to_rgb("#9ca3af"))

    # CTA pill (bottom-right)
    cta_font = get_font(fonts, "inter_500", 16)
    cta_width, cta_height = 160, 48
    draw_pill(
        draw,
        (WIDTH - cta_width - 40, HEIGHT - cta_height - 30),
        cta_width,
        cta_height,
        "Read more ›",
        cta_font,
        category_color
    )

    return img


def generate_square(
    metadata: ArticleMetadata,
    fonts: dict,
    hero: HeroContent,
    bg_image: Optional[Image.Image] = None
) -> Image.Image:
    """Generate 1080x1080 square design for Instagram feed."""
    WIDTH, HEIGHT = 1080, 1080

    if bg_image:
        img = center_crop_image(bg_image, WIDTH, HEIGHT)
    else:
        img = create_solid_background(WIDTH, HEIGHT)

    img = apply_gradient_overlay(img, "both")
    draw = ImageDraw.Draw(img)

    # Category pill (top-left)
    category = metadata.category.upper()
    category_color = CATEGORY_COLORS.get(category, CATEGORY_COLORS["DEFAULT"])
    pill_font = get_font(fonts, "inter_500", 14)
    draw_pill(draw, (40, 40), 120, 36, category, pill_font, category_color)

    if hero.mode == "stat":
        # STAT MODE
        stat_font = get_font(fonts, "jakarta_800", 160)
        stat_y = 280
        draw_text_with_shadow(draw, hero.primary_text, (60, stat_y), stat_font)

        context_font = get_font(fonts, "inter_500", 36)
        context_y = stat_y + 170
        ctx_h = draw_wrapped_text(draw, hero.context_text, (60, context_y), context_font, 600)

        if metadata.excerpt:
            excerpt_font = get_font(fonts, "inter_400", 22)
            excerpt_y = context_y + ctx_h + 40
            draw_wrapped_text(
                draw, metadata.excerpt, (60, excerpt_y), excerpt_font, 580,
                fill_color="#C5C9D0", max_lines=3
            )
    else:
        # HEADLINE MODE: Title as hero, excerpt as context
        title_font = get_font(fonts, "jakarta_800", 60)
        title_y = 200
        title_h = draw_wrapped_text(
            draw, hero.primary_text, (60, title_y), title_font, 700,
            fill_color="#FFFFFF", max_lines=4
        )

        if hero.context_text:
            context_font = get_font(fonts, "inter_500", 28)
            context_y = title_y + title_h + 30
            draw_wrapped_text(
                draw, hero.context_text, (60, context_y), context_font, 650,
                fill_color="#C5C9D0", max_lines=3
            )

        if metadata.excerpt:
            excerpt_font = get_font(fonts, "inter_400", 22)
            excerpt_y = title_y + title_h + 140
            draw_wrapped_text(
                draw, metadata.excerpt, (60, excerpt_y), excerpt_font, 600,
                fill_color="#A0A4AB", max_lines=2
            )

    # Logo text (bottom-left)
    draw_logo_text(draw, fonts, (40, HEIGHT - 68), size=24)

    # CTA pill (bottom-right)
    cta_font = get_font(fonts, "inter_500", 16)
    cta_width, cta_height = 160, 48
    draw_pill(
        draw,
        (WIDTH - cta_width - 40, HEIGHT - cta_height - 40),
        cta_width, cta_height, "Read more ›", cta_font, category_color
    )

    return img


def generate_vertical(
    metadata: ArticleMetadata,
    fonts: dict,
    hero: HeroContent,
    bg_image: Optional[Image.Image] = None
) -> Image.Image:
    """Generate 1080x1920 vertical design for Instagram Stories/TikTok/YouTube Shorts."""
    WIDTH, HEIGHT = 1080, 1920

    if bg_image:
        img = center_crop_image(bg_image, WIDTH, HEIGHT)
    else:
        img = create_solid_background(WIDTH, HEIGHT)

    img = apply_gradient_overlay(img, "both")
    draw = ImageDraw.Draw(img)

    # Category pill (top-left)
    category = metadata.category.upper()
    category_color = CATEGORY_COLORS.get(category, CATEGORY_COLORS["DEFAULT"])
    pill_font = get_font(fonts, "inter_500", 14)
    draw_pill(draw, (50, 80), 140, 40, category, pill_font, category_color)

    if hero.mode == "stat":
        # STAT MODE — big number in lower-middle
        stat_font = get_font(fonts, "jakarta_800", 180)
        stat_y = 900
        draw_text_with_shadow(draw, hero.primary_text, (60, stat_y), stat_font, shadow_offset=4)

        context_font = get_font(fonts, "inter_500", 36)
        context_y = stat_y + 200
        ctx_h = draw_wrapped_text(draw, hero.context_text, (60, context_y), context_font, 700, max_lines=2)

        title_font = get_font(fonts, "jakarta_700", 40)
        title_y = context_y + ctx_h + 40
        if metadata.title:
            title_h = draw_wrapped_text(
                draw, metadata.title, (60, title_y), title_font, 800,
                fill_color="#FFFFFF", max_lines=3
            )
        else:
            title_h = 0

        excerpt_font = get_font(fonts, "inter_400", 26)
        excerpt_y = title_y + title_h + 20
        if metadata.excerpt:
            draw_wrapped_text(
                draw, metadata.excerpt, (60, excerpt_y), excerpt_font, 800,
                fill_color="#C5C9D0", max_lines=2
            )
    else:
        # HEADLINE MODE — title is the hero, centred in middle
        title_font = get_font(fonts, "jakarta_800", 72)
        title_y = 700
        title_h = draw_wrapped_text(
            draw, hero.primary_text, (60, title_y), title_font, 900,
            fill_color="#FFFFFF", max_lines=5
        )

        if hero.context_text:
            context_font = get_font(fonts, "inter_500", 32)
            context_y = title_y + title_h + 40
            draw_wrapped_text(
                draw, hero.context_text, (60, context_y), context_font, 800,
                fill_color="#C5C9D0", max_lines=3
            )

        if metadata.excerpt:
            excerpt_font = get_font(fonts, "inter_400", 26)
            excerpt_y = title_y + title_h + 180
            draw_wrapped_text(
                draw, metadata.excerpt, (60, excerpt_y), excerpt_font, 800,
                fill_color="#A0A4AB", max_lines=2
            )

    # Logo text (bottom-left)
    draw_logo_text(draw, fonts, (50, HEIGHT - 130), size=28)

    # CTA pill (bottom-center)
    cta_font = get_font(fonts, "inter_500", 16)
    cta_width, cta_height = 200, 50
    cta_x = (WIDTH - cta_width) // 2
    draw_pill(
        draw, (cta_x, HEIGHT - 80), cta_width, cta_height,
        "Swipe up to read ›", cta_font, category_color
    )

    return img


# ============================================================================
# MAIN GENERATION
# ============================================================================

def generate_all_formats(
    metadata: ArticleMetadata,
    fonts: dict,
    output_dir: Path
) -> dict:
    """Generate all three formats and save them."""
    output_dir.mkdir(parents=True, exist_ok=True)

    # Download background image
    bg_image = None
    if metadata.featured_image_url:
        bg_image = download_image(metadata.featured_image_url)

    # Extract hero content (auto-detects stat vs headline mode)
    hero = extract_hero_content(metadata.title, metadata.tldr_snapshot.bullets)

    mode_label = "STAT" if hero.mode == "stat" else "HEADLINE"
    print(f"\n  Mode: {mode_label} | Primary: '{hero.primary_text}' | Context: '{hero.context_text}'")

    # Generate designs
    print("  Generating landscape (1200x675)...", end=" ", flush=True)
    landscape = generate_landscape(metadata, fonts, hero, bg_image)
    landscape_path = output_dir / "landscape.jpg"
    landscape.save(landscape_path, "JPEG", quality=92)
    print(f"✓ ({landscape_path.name})")

    print("  Generating square (1080x1080)...", end=" ", flush=True)
    square = generate_square(metadata, fonts, hero, bg_image)
    square_path = output_dir / "square.jpg"
    square.save(square_path, "JPEG", quality=92)
    print(f"✓ ({square_path.name})")

    print("  Generating vertical (1080x1920)...", end=" ", flush=True)
    vertical = generate_vertical(metadata, fonts, hero, bg_image)
    vertical_path = output_dir / "vertical.jpg"
    vertical.save(vertical_path, "JPEG", quality=92)
    print(f"✓ ({vertical_path.name})")

    return {
        "landscape": str(landscape_path),
        "square": str(square_path),
        "vertical": str(vertical_path),
    }


def generate_metadata_file(
    output_dir: Path,
    metadata: ArticleMetadata,
    design_paths: dict,
    hero: HeroContent,
) -> None:
    """Generate and save metadata JSON file."""
    metadata_json = {
        "generated_at": datetime.now().isoformat(),
        "article": {
            "title": metadata.title,
            "slug": metadata.slug,
            "category": metadata.category,
            "featured_image_url": metadata.featured_image_url,
        },
        "designs": design_paths,
        "hero": {
            "mode": hero.mode,
            "primary_text": hero.primary_text,
            "context_text": hero.context_text,
            "has_stat": hero.has_stat,
        },
        "output_directory": str(output_dir),
    }

    metadata_path = output_dir / "metadata.json"
    with open(metadata_path, "w") as f:
        json.dump(metadata_json, f, indent=2)

    print(f"  Metadata saved: {metadata_path.name}")


# ============================================================================
# CLI
# ============================================================================

def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="AI in ASIA Social Media Design Generator",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Using inline JSON metadata
  python generate_designs.py \\
    --article-metadata '{
      "title": "Enterprise AI Adoption Reaches New Heights",
      "slug": "enterprise-ai-adoption",
      "excerpt": "New research shows 81% of enterprises are implementing AI",
      "category": "BUSINESS",
      "featured_image_url": "https://example.com/image.jpg",
      "tldr_snapshot": {
        "bullets": [
          "81% of enterprises now use AI",
          "ML cuts operational costs by 40%",
          "Revenue growth accelerates by 30%"
        ]
      }
    }' \\
    --output-dir ./social-outputs

  # Using JSON file
  python generate_designs.py \\
    --article-json ./article.json \\
    --output-dir ./social-outputs
        """
    )

    parser.add_argument(
        "--article-metadata",
        type=str,
        help="Article metadata as JSON string"
    )
    parser.add_argument(
        "--article-json",
        type=str,
        help="Path to article JSON file"
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default="./social-outputs",
        help="Output directory for generated designs (default: ./social-outputs)"
    )

    args = parser.parse_args()

    # Validate input
    if not args.article_metadata and not args.article_json:
        parser.error("Must provide either --article-metadata or --article-json")

    if args.article_metadata and args.article_json:
        parser.error("Cannot provide both --article-metadata and --article-json")

    # Load metadata
    print("Loading article metadata...")
    try:
        if args.article_metadata:
            metadata_dict = json.loads(args.article_metadata)
        else:
            with open(args.article_json, "r") as f:
                metadata_dict = json.load(f)

        metadata = ArticleMetadata.from_dict(metadata_dict)
    except (json.JSONDecodeError, FileNotFoundError) as e:
        print(f"Error: Failed to load metadata: {e}", file=sys.stderr)
        sys.exit(1)

    # Load fonts
    fonts = load_fonts()

    # Prepare output directory
    output_dir = Path(args.output_dir) / metadata.slug
    print(f"\nGenerating designs for: {metadata.title}")
    print(f"Output directory: {output_dir}")

    # Generate designs
    design_paths = generate_all_formats(metadata, fonts, output_dir)

    # Generate metadata file
    hero = extract_hero_content(metadata.title, metadata.tldr_snapshot.bullets)
    generate_metadata_file(output_dir, metadata, design_paths, hero)

    print(f"\n✓ All designs generated successfully!")
    print(f"  Output: {output_dir}")


if __name__ == "__main__":
    main()
