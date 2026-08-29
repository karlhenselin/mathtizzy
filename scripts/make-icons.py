"""Rasterize the addition mark into Android launcher and Play Store PNGs."""

from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
TEAL = (13, 59, 62, 255)
SAND = (244, 162, 97, 255)

DENSITIES = {
    "mdpi": 48,
    "hdpi": 72,
    "xhdpi": 96,
    "xxhdpi": 144,
    "xxxhdpi": 192,
}

# Adaptive-icon foreground is 108dp (legacy launcher icons are 48dp).
FOREGROUND = {name: int(size * 108 / 48) for name, size in DENSITIES.items()}


def draw_plus(draw: ImageDraw.ImageDraw, size: int) -> None:
    scale = size / 32

    def bar(x: float, y: float, w: float, h: float, radius: float) -> None:
        draw.rounded_rectangle(
            [x * scale, y * scale, (x + w) * scale, (y + h) * scale],
            radius=max(1, radius * scale),
            fill=SAND,
        )

    bar(14.25, 6, 3.5, 20, 1.75)
    bar(6, 14.25, 20, 3.5, 1.75)


def square_icon(size: int) -> Image.Image:
    image = Image.new("RGBA", (size, size), TEAL)
    draw_plus(ImageDraw.Draw(image), size)
    return image


def round_icon(size: int) -> Image.Image:
    image = square_icon(size)
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, size - 1, size - 1), fill=255)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(image, mask=mask)
    return out


def foreground_icon(size: int) -> Image.Image:
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw_plus(ImageDraw.Draw(image), size)
    return image


def main() -> None:
    for density, size in DENSITIES.items():
        folder = ROOT / "android" / "app" / "src" / "main" / "res" / f"mipmap-{density}"
        square_icon(size).save(folder / "ic_launcher.png", "PNG")
        round_icon(size).save(folder / "ic_launcher_round.png", "PNG")
        foreground_icon(FOREGROUND[density]).save(folder / "ic_launcher_foreground.png", "PNG")

    square_icon(512).save(ROOT / "playStoreAssets" / "icon-512.png", "PNG")
    print("Wrote Android launcher icons and playStoreAssets/icon-512.png")


if __name__ == "__main__":
    main()
