from PIL import Image
import os
from collections import deque

SRC = r'C:\exam\nmc-game\public\nmc.png'
OUT = r'C:\exam\nmc-game\public\items'
os.makedirs(OUT, exist_ok=True)

items = {
    "character_base":  (29,   25,  414, 624),
    "raito":           (591,  11,  987, 679),
    "detective":       (1160, 27,  1575, 648),
    "ajussi":          (1816, 3,   2244, 666),
    "strawberry":      (21,   831, 538, 1558),
    "bungae":          (587,  806, 1027, 1546),
    "wolf":            (1097, 814, 1526, 1463),
    "item_sword":      (1623, 706, 1907, 1232),
    "item_rose":       (2019, 781, 2392, 1092),
    "item_hat":        (1960, 1164, 2492, 1413),
    "item_chupachups": (1586, 1336, 1892, 1591),
    "item_magnifier":  (2026, 1434, 2217, 1632),
}

def remove_bg_floodfill(img, threshold=15):
    img = img.convert("RGBA")
    w, h = img.size
    pixels = img.load()
    visited = [[False] * h for _ in range(w)]
    queue = deque()

    def is_bg(r, g, b):
        return r >= 255 - threshold and g >= 255 - threshold and b >= 255 - threshold

    for x in range(w):
        for y in [0, h - 1]:
            r, g, b, a = pixels[x, y]
            if is_bg(r, g, b) and not visited[x][y]:
                queue.append((x, y))
                visited[x][y] = True
    for y in range(h):
        for x in [0, w - 1]:
            r, g, b, a = pixels[x, y]
            if is_bg(r, g, b) and not visited[x][y]:
                queue.append((x, y))
                visited[x][y] = True

    while queue:
        x, y = queue.popleft()
        pixels[x, y] = (255, 255, 255, 0)
        for nx, ny in [(x+1,y),(x-1,y),(x,y+1),(x,y-1)]:
            if 0 <= nx < w and 0 <= ny < h and not visited[nx][ny]:
                r, g, b, a = pixels[nx, ny]
                if is_bg(r, g, b):
                    visited[nx][ny] = True
                    queue.append((nx, ny))
    return img

def floodfill_from_point(img, seed_x, seed_y, threshold=15):
    w, h = img.size
    pixels = img.load()
    visited = [[False] * h for _ in range(w)]
    queue = deque()

    def is_white(r, g, b, a):
        return a > 0 and r >= 255 - threshold and g >= 255 - threshold and b >= 255 - threshold

    if 0 <= seed_x < w and 0 <= seed_y < h:
        r, g, b, a = pixels[seed_x, seed_y]
        if is_white(r, g, b, a):
            queue.append((seed_x, seed_y))
            visited[seed_x][seed_y] = True

    while queue:
        x, y = queue.popleft()
        pixels[x, y] = (255, 255, 255, 0)
        for nx, ny in [(x+1,y),(x-1,y),(x,y+1),(x,y-1)]:
            if 0 <= nx < w and 0 <= ny < h and not visited[nx][ny]:
                r, g, b, a = pixels[nx, ny]
                if is_white(r, g, b, a):
                    visited[nx][ny] = True
                    queue.append((nx, ny))
    return img

def make_lens_transparent(img, color_fn, alpha, region=None):
    pixels = img.load()
    w, h = img.size
    x0, y0, x1, y1 = region if region else (0, 0, w, h)
    for x in range(max(0, x0), min(w, x1)):
        for y in range(max(0, y0), min(h, y1)):
            r, g, b, a = pixels[x, y]
            if a > 0 and color_fn(r, g, b):
                pixels[x, y] = (r, g, b, alpha)
    return img

# 안경 렌즈 설정 (새 이미지 기준 — 크롭 후 좌표)
# 새 이미지가 구버전보다 약 1.86배 크므로 region 스케일 조정
lens_configs = {
    'raito': [
        dict(
            color_fn=lambda r, g, b: b > 100 and b > r + 10 and b >= g - 20,
            alpha=128,
            region=(0, 200, 400, 330),
        )
    ],
    'ajussi': [
        dict(
            color_fn=lambda r, g, b: r > 200 and g > 200 and b > 200,
            alpha=26,
            region=(0, 180, 430, 310),
        )
    ],
    'wolf': [
        dict(
            color_fn=lambda r, g, b: (
                (r > 130 and r > g + 25 and r > b + 25) or
                (r > 200 and g > 180 and b > 180)
            ),
            alpha=26,
            region=(0, 0, 430, 110),
        )
    ],
}

# 내부 구멍 시드 (크롭 이미지 기준)
interior_holes = {
    "strawberry": [(250, 350)],
}

# 특정 사각형 영역 강제 투명 처리
erase_regions = {
    "wolf": [(60, 375, 100, 415), (325, 365, 360, 415)],  # 양쪽 손 끝 둥근 부분
}

src_img = Image.open(SRC)
for name, box in items.items():
    cropped = src_img.crop(box)
    result = remove_bg_floodfill(cropped)
    if name in interior_holes:
        for sx, sy in interior_holes[name]:
            result = floodfill_from_point(result, sx, sy)
    if name in erase_regions:
        pixels = result.load()
        rw, rh = result.size
        for (ex0, ey0, ex1, ey1) in erase_regions[name]:
            for ex in range(ex0, ex1+1):
                for ey in range(ey0, ey1+1):
                    if 0 <= ex < rw and 0 <= ey < rh:
                        pixels[ex, ey] = (0, 0, 0, 0)
    if name in lens_configs:
        for cfg in lens_configs[name]:
            result = make_lens_transparent(result, cfg['color_fn'], cfg['alpha'], cfg.get('region'))
    result.save(os.path.join(OUT, f"{name}.png"))
    print(f"Saved: {name}.png")

print("\n완료!")
