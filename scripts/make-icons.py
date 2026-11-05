"""Generates all app icons (PWA, Tauri desktop, Capacitor asset sources) with Pillow.
Replace assets/icon-only.png etc. with your own art any time; this script is just a starting point."""
import math, os
from PIL import Image, ImageDraw

S = 2048  # supersample
COLORS = [(255,95,162),(111,139,255),(47,224,196),(255,179,71)]

def gradient(size, c1=(123,108,255), c2=(255,95,162)):
    img = Image.new("RGB", (size, size))
    px = img.load()
    for y in range(size):
        for x in range(size):
            t = (x + y) / (2 * size)
            px[x, y] = tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3))
    return img

def wheel(size, scale=1.0):
    """Transparent RGBA image containing just the wheel glyph, scaled inside the canvas."""
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    cx = cy = size / 2
    r = size * 0.36 * scale
    d.ellipse([cx-r-size*0.02*scale, cy-r-size*0.02*scale, cx+r+size*0.02*scale, cy+r+size*0.02*scale], fill=(255,255,255,255))
    n = 8
    for i in range(n):
        a0 = -90 + i * 360 / n
        d.pieslice([cx-r, cy-r, cx+r, cy+r], a0, a0 + 360 / n, fill=COLORS[i % 4] + (255,))
    h = r * 0.2
    d.ellipse([cx-h, cy-h, cx+h, cy+h], fill=(255,255,255,255))
    # pointer
    pw, ph = r * 0.22, r * 0.34
    top = cy - r - size*0.02*scale
    d.polygon([(cx-pw, top-ph*0.55), (cx+pw, top-ph*0.55), (cx, top+ph*0.55)], fill=(29,19,64,255))
    return im

def compose(size, scale=1.0, rounded=True):
    bg = gradient(S).convert("RGBA")
    bg.alpha_composite(wheel(S, scale))
    if rounded:
        mask = Image.new("L", (S, S), 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, S-1, S-1], radius=int(S*0.22), fill=255)
        bg.putalpha(mask)
    return bg.resize((size, size), Image.LANCZOS)

os.makedirs("www/icons", exist_ok=True)
os.makedirs("assets", exist_ok=True)
os.makedirs("src-tauri/icons", exist_ok=True)

# PWA
compose(192).save("www/icons/icon-192.png")
compose(512).save("www/icons/icon-512.png")
compose(512, scale=0.78, rounded=False).save("www/icons/icon-maskable-512.png")
compose(180, rounded=False).convert("RGB").save("www/icons/apple-touch-icon.png")
compose(32).save("www/icons/favicon.png")

# Capacitor asset sources (for `npx @capacitor/assets generate --android`)
compose(1024).save("assets/icon-only.png")
compose(1024, rounded=False).convert("RGB").save("assets/icon-background.png") if False else None
gradient(1024).save("assets/icon-background.png")
fg = wheel(S, 0.78).resize((1024, 1024), Image.LANCZOS)
fg.save("assets/icon-foreground.png")

# Splash screens for `npx @capacitor/assets` (2732px square, glyph kept inside the central safe area)
for name in ("splash.png", "splash-dark.png"):
    sp = Image.new("RGBA", (2732, 2732), (12, 9, 34, 255))
    g = wheel(S, 0.55).resize((2732, 2732), Image.LANCZOS)
    sp.alpha_composite(g)
    sp.convert("RGB").save("assets/" + name)

# Tauri
master = compose(1024)
master.save("src-tauri/icons/icon.png")
for name, sz in [("32x32.png", 32), ("128x128.png", 128), ("128x128@2x.png", 256)]:
    master.resize((sz, sz), Image.LANCZOS).save(f"src-tauri/icons/{name}")
master.save("src-tauri/icons/icon.ico", sizes=[(16,16),(24,24),(32,32),(48,48),(64,64),(128,128),(256,256)])
master.save("src-tauri/icons/icon.icns")
print("icons written")
