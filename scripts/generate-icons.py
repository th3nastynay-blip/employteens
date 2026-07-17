#!/usr/bin/env python3
"""
EMPLOYTEENS — icon pipeline
Input:  logo.png at repo root (1024x1024, opaque background — App Store
        icons cannot have transparency)
Output: every asset the web app, PWA manifest, and iOS shell need.

Run:    python3 scripts/generate-icons.py
"""

import os
import sys

try:
    from PIL import Image
except ImportError:
    sys.exit("pip install pillow --break-system-packages")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "logo.png")

if not os.path.exists(SRC):
    sys.exit("logo.png not found at repo root — save the 1024x1024 logo there first")

img = Image.open(SRC).convert("RGB")  # flatten any alpha: white background
if img.size != (1024, 1024):
    img = img.resize((1024, 1024), Image.LANCZOS)

ICONS_DIR = os.path.join(ROOT, "public", "icons")
BRAND_DIR = os.path.join(ROOT, "brand")
os.makedirs(ICONS_DIR, exist_ok=True)
os.makedirs(BRAND_DIR, exist_ok=True)

# PWA manifest sizes (matches public/manifest.json)
for size in (72, 96, 128, 144, 152, 192, 384, 512):
    img.resize((size, size), Image.LANCZOS).save(
        os.path.join(ICONS_DIR, f"icon-{size}x{size}.png"), optimize=True
    )

# Web basics
img.resize((180, 180), Image.LANCZOS).save(os.path.join(ROOT, "public", "apple-touch-icon.png"), optimize=True)
img.resize((32, 32), Image.LANCZOS).save(os.path.join(ROOT, "public", "favicon-32.png"), optimize=True)
img.resize((512, 512), Image.LANCZOS).save(os.path.join(ROOT, "public", "logo.png"), optimize=True)
ico = img.resize((48, 48), Image.LANCZOS)
ico.save(os.path.join(ROOT, "public", "favicon.ico"), sizes=[(16, 16), (32, 32), (48, 48)])

# iOS (Capacitor AppIcon set uses a single 1024 in modern Xcode)
img.save(os.path.join(BRAND_DIR, "appstore-icon-1024.png"), optimize=True)

# iOS splash: logo centered on white, 2732x2732 (Capacitor universal splash)
splash = Image.new("RGB", (2732, 2732), (250, 250, 250))
logo_s = img.resize((560, 560), Image.LANCZOS)
splash.paste(logo_s, ((2732 - 560) // 2, (2732 - 560) // 2))
splash.save(os.path.join(BRAND_DIR, "splash-2732.png"), optimize=True)

print("done: public/icons/*, apple-touch-icon, favicon, brand/appstore-icon-1024, brand/splash-2732")
