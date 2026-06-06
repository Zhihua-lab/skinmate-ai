"""Crop the mascot girl from the wide banner and knock out the light pink
background via a brightness-based border flood-fill.

The character has dark brown / grey outlines that enclose the lighter robe and
face-mask areas, so a flood-fill seeded from the border removes only the
background gradient (and the white sparkles) while preserving the figure.
"""
from collections import deque
from PIL import Image

SRC = "ChatGPT Image 2026年6月6日 18_07_57.png"
DST = "public/skincare-girl.png"
CROP = (900, 40, 1672, 941)

# any pixel brighter than this (and reachable from the border) is background
BRIGHT = 222
SOFT = 205  # feathering threshold for the anti-halo pass

img = Image.open(SRC).convert("RGBA").crop(CROP)
w, h = img.size
px = img.load()


def brightness(r, g, b):
    return (r + g + b) / 3


visited = bytearray(w * h)
q = deque()
for x in range(w):
    q.append((x, 0))
    q.append((x, h - 1))
for y in range(h):
    q.append((0, y))
    q.append((w - 1, y))

while q:
    x, y = q.popleft()
    if x < 0 or y < 0 or x >= w or y >= h:
        continue
    idx = y * w + x
    if visited[idx]:
        continue
    r, g, b, a = px[x, y]
    if brightness(r, g, b) < BRIGHT:
        continue
    visited[idx] = 1
    px[x, y] = (r, g, b, 0)
    q.append((x + 1, y))
    q.append((x - 1, y))
    q.append((x, y + 1))
    q.append((x, y - 1))

# soft edge feathering to avoid a hard halo around the outline
for _ in range(2):
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            if brightness(r, g, b) >= SOFT:
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < w and 0 <= ny < h and px[nx, ny][3] == 0:
                        light = brightness(r, g, b)
                        fade = max(0.0, min(1.0, (255 - light) / (255 - SOFT)))
                        px[x, y] = (r, g, b, int(a * fade))
                        break

# trim fully transparent margins so the figure sits flush
bbox = img.getbbox()
if bbox:
    img = img.crop(bbox)

img.save(DST)
print(f"saved {DST} ({img.size[0]}x{img.size[1]})")
