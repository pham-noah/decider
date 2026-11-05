#!/usr/bin/env python3
"""Renders Decider's app icons and splash screens into ./assets (Pillow).

    python scripts/make-icons.py

Draws at 4x and downsamples, so every edge is antialiased.
"""
import math
from PIL import Image, ImageDraw

S = 1024
SS = S * 4                      # supersampled canvas
PAL = ["#ff6fae", "#ffb347", "#ffe066", "#5eead4", "#69a7ff", "#a78bfa"]
A1, A2 = (255, 95, 162), (123, 108, 255)
DARK = (12, 9, 34)


def gradient(size, c1, c2):
    """Diagonal gradient, c1 top-left to c2 bottom-right."""
    img = Image.new("RGB", (size, size))
    px = img.load()
    for y in range(size):
        for x in range(size):
            t = (x + y) / (2 * (size - 1))
            px[x, y] = tuple(int(c1[k] + (c2[k] - c1[k]) * t) for k in range(3))
    return img


def rounded_mask(size, radius):
    m = Image.new("L", (size, size), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
    return m


def wheel(size, hole=True):
    """The wheel mark on a transparent canvas of side `size` (supersampled)."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    cx = cy = size / 2
    r = size * 0.44
    n = len(PAL)
    step = 360 / n
    for i, col in enumerate(PAL):
        d.pieslice([cx - r, cy - r, cx + r, cy + r], start=-90 + i * step, end=-90 + (i + 1) * step,
                   fill=col)
    # rim + slice separators
    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=(255, 255, 255, 235), width=int(size * 0.035))
    for i in range(n):
        a = math.radians(-90 + i * step)
        d.line([(cx, cy), (cx + r * math.cos(a), cy + r * math.sin(a))], fill=(255, 255, 255, 90),
               width=int(size * 0.012))
    if hole:
        hr = r * 0.17
        d.ellipse([cx - hr, cy - hr, cx + hr, cy + hr], fill=(255, 255, 255, 245),
                  outline=(255, 255, 255, 255), width=int(size * 0.02))
    # pointer: a drop that overlaps the rim, so it still reads at 48 px
    pw, ph = size * 0.19, size * 0.26
    px, py = cx, cy - r
    d.polygon([(px, py + ph * 0.30), (px - pw / 2, py - ph * 0.30), (px - pw * 0.26, py - ph * 0.62),
               (px + pw * 0.26, py - ph * 0.62), (px + pw / 2, py - ph * 0.30)], fill=(255, 255, 255, 252))
    d.line([(px, py + ph * 0.28), (px - pw / 2 + 2, py - ph * 0.30)], fill=(255, 190, 220, 200),
           width=int(size * 0.012))
    return img


def gloss(img):
    """Soft top-left highlight so the icon is not flat."""
    w, h = img.size
    hl = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(hl)
    d.ellipse([-w * 0.35, -h * 0.6, w * 0.85, h * 0.55], fill=(255, 255, 255, 46))
    return Image.alpha_composite(img, hl)


def save(img, path, size=S):
    img.resize((size, size), Image.LANCZOS).save(path)
    print("wrote", path)


def main():
    bg = gradient(SS, A1, A2).convert("RGBA")
    bg = gloss(bg)

    icon = bg.copy()
    icon.alpha_composite(wheel(int(SS * 0.86), hole=True), (int(SS * 0.07), int(SS * 0.07)))
    icon.putalpha(rounded_mask(SS, int(SS * 0.225)))
    save(icon, "assets/icon-only.png")

    # Android adaptive icon: logo sits inside the central 66 % safe zone
    fg = Image.new("RGBA", (SS, SS), (0, 0, 0, 0))
    fg.alpha_composite(wheel(int(SS * 0.60), hole=True), (int(SS * 0.20), int(SS * 0.20)))
    save(fg, "assets/icon-foreground.png")

    gbg = gradient(SS, A1, A2).convert("RGBA")
    gbg = gloss(gbg)
    save(gloss(gbg), "assets/icon-background.png")

    # splash: mark on the app's dark background
    for name, colour in (("assets/splash.png", DARK), ("assets/splash-dark.png", DARK)):
        sp = Image.new("RGBA", (SS, SS), colour + (255,))
        mark = wheel(int(SS * 0.46), hole=True)
        sp.alpha_composite(mark, (int(SS * 0.27), int(SS * 0.27)))
        save(sp, name, 2732)


if __name__ == "__main__":
    main()
