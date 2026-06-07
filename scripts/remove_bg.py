"""Make the mascot's outer white background transparent via border flood-fill.

Only the white region connected to the image border is removed, so the
character's interior white areas (face mask, robe highlights) are preserved.
"""
from collections import deque
from PIL import Image
import sys

SRC = sys.argv[1] if len(sys.argv) > 1 else "public/skincare-mascot.png"
DST = sys.argv[2] if len(sys.argv) > 2 else SRC

img = Image.open(SRC).convert("RGBA")
w, h = img.size
px = img.load()

WHITE = 232          # >= this on all channels counts as background white
SOFT = 200           # below this is clearly foreground

def is_white(r, g, b):
    return r >= WHITE and g >= WHITE and b >= WHITE

visited = bytearray(w * h)
q = deque()

# seed from all border pixels
for x in range(w):
    for y in (0, h - 1):
        q.append((x, y))
for y in range(h):
    for x in (0, w - 1):
        q.append((x, y))

while q:
    x, y = q.popleft()
    if x < 0 or y < 0 or x >= w or y >= h:
        continue
    idx = y * w + x
    if visited[idx]:
        continue
    r, g, b, a = px[x, y]
    if not is_white(r, g, b):
        continue
    visited[idx] = 1
    px[x, y] = (r, g, b, 0)
    q.append((x + 1, y))
    q.append((x - 1, y))
    q.append((x, y + 1))
    q.append((x, y - 1))

# soft edge feathering: any remaining light pixel that borders transparency
# gets partial alpha to avoid a hard white halo around the outline
for _ in range(2):
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            if r >= SOFT and g >= SOFT and b >= SOFT:
                neighbor_transparent = False
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < w and 0 <= ny < h and px[nx, ny][3] == 0:
                        neighbor_transparent = True
                        break
                if neighbor_transparent:
                    lightness = (r + g + b) / 3
                    fade = max(0, min(1, (255 - lightness) / (255 - SOFT)))
                    px[x, y] = (r, g, b, int(a * fade))

img.save(DST)
print(f"saved {DST} ({w}x{h})")
