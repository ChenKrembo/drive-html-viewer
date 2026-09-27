"""Rasterise the app icon to the PNG sizes Google's consoles ask for.

Usage: uv run --with pillow==11.3.0 scripts/generate_icons.py
Geometry mirrors public/icons/icon.svg (256x256 viewBox).
"""

from pathlib import Path

from PIL import Image, ImageDraw

ICON_SIZES = (16, 32, 48, 64, 96, 120, 128, 256)
VIEWBOX_SIZE = 256
SUPERSAMPLE_FACTOR = 8

BACKGROUND_COLOR = "#0b57d0"
BRACKET_COLOR = "#ffffff"
SLASH_COLOR = "#a8c7fa"

CORNER_RADIUS = 56
BRACKET_WIDTH = 20
SLASH_WIDTH = 16
LEFT_BRACKET = ((100, 84), (56, 128), (100, 172))
RIGHT_BRACKET = ((156, 84), (200, 128), (156, 172))
SLASH = ((140, 68), (116, 188))

OUTPUT_DIR = Path(__file__).resolve().parent.parent / "public" / "icons"


def draw_round_polyline(draw, points, width, color, scale):
    scaled_points = [(x * scale, y * scale) for x, y in points]
    scaled_width = round(width * scale)
    draw.line(scaled_points, fill=color, width=scaled_width, joint="curve")
    cap_radius = scaled_width / 2
    for x, y in scaled_points:
        bounds = (x - cap_radius, y - cap_radius, x + cap_radius, y + cap_radius)
        draw.ellipse(bounds, fill=color)


def render_master_icon():
    scale = SUPERSAMPLE_FACTOR
    canvas_size = VIEWBOX_SIZE * scale
    image = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle(
        (0, 0, canvas_size - 1, canvas_size - 1),
        radius=CORNER_RADIUS * scale,
        fill=BACKGROUND_COLOR,
    )
    draw_round_polyline(draw, SLASH, SLASH_WIDTH, SLASH_COLOR, scale)
    draw_round_polyline(draw, LEFT_BRACKET, BRACKET_WIDTH, BRACKET_COLOR, scale)
    draw_round_polyline(draw, RIGHT_BRACKET, BRACKET_WIDTH, BRACKET_COLOR, scale)
    return image


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    master_icon = render_master_icon()
    for size in ICON_SIZES:
        output_path = OUTPUT_DIR / f"icon-{size}.png"
        master_icon.resize((size, size), Image.LANCZOS).save(output_path)
        print(f"wrote {output_path}")


if __name__ == "__main__":
    main()
