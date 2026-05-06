#!/usr/bin/env python3
"Generate the local app icon PNG used for the macOS icns bundle."

import math
import struct
import zlib
from pathlib import Path

SIZE = 1024
SCALE = 2
W = SIZE * SCALE
H = SIZE * SCALE


def clamp(value):
    return max(0, min(255, int(round(value))))


def mix(a, b, t):
    return tuple(a[i] * (1 - t) + b[i] * t for i in range(4))


def rounded_rect_alpha(x, y, left, top, right, bottom, radius):
    if x < left or x >= right or y < top or y >= bottom:
        return 0.0
    cx = min(max(x, left + radius), right - radius)
    cy = min(max(y, top + radius), bottom - radius)
    distance = math.hypot(x - cx, y - cy)
    return max(0.0, min(1.0, radius + 0.5 - distance))


def circle_alpha(x, y, cx, cy, radius):
    return max(0.0, min(1.0, radius + 0.5 - math.hypot(x - cx, y - cy)))


def stroke_circle_alpha(x, y, cx, cy, radius, width):
    distance = abs(math.hypot(x - cx, y - cy) - radius)
    return max(0.0, min(1.0, width / 2 + 0.5 - distance))


def blend(dst, src):
    sr, sg, sb, sa = src
    dr, dg, db, da = dst
    out_a = sa + da * (1 - sa)
    if out_a <= 0:
        return (0, 0, 0, 0)
    return (
        (sr * sa + dr * da * (1 - sa)) / out_a,
        (sg * sa + dg * da * (1 - sa)) / out_a,
        (sb * sa + db * da * (1 - sa)) / out_a,
        out_a,
    )


def draw():
    pixels = [(0.0, 0.0, 0.0, 0.0)] * (W * H)
    bg1 = (12, 43, 37, 255)
    bg2 = (48, 112, 98, 255)
    cream1 = (255, 252, 243, 255)
    cream2 = (235, 229, 216, 255)
    ring = (143, 174, 158, 255)

    margin = 150 * SCALE
    radius = 136 * SCALE
    left, top, right, bottom = margin, margin, W - margin, H - margin
    cx = cy = W / 2

    # Drop shadow around the app tile.
    for y in range(H):
        for x in range(W):
            sx = x - 18 * SCALE
            sy = y - 32 * SCALE
            shadow_alpha = rounded_rect_alpha(sx, sy, left, top, right, bottom, radius)
            if shadow_alpha <= 0:
                continue
            blur = max(0.0, 1.0 - math.hypot(x - cx, y - (cy + 110 * SCALE)) / (620 * SCALE))
            pixels[y * W + x] = blend(pixels[y * W + x], (0, 0, 0, 0.18 * shadow_alpha * blur))

    for y in range(H):
        for x in range(W):
            alpha = rounded_rect_alpha(x, y, left, top, right, bottom, radius)
            if alpha <= 0:
                continue
            gx = (x - left) / (right - left)
            gy = (y - top) / (bottom - top)
            color = mix(bg1 + (255,), bg2 + (255,), 0.38 * gx + 0.34 * (1 - gy))
            highlight = max(0.0, 1.0 - math.hypot(x - (cx + 248 * SCALE), y - (cy - 326 * SCALE)) / (470 * SCALE))
            shade = max(0.0, 1.0 - math.hypot(x - (cx - 260 * SCALE), y - (cy + 264 * SCALE)) / (500 * SCALE))
            grain = ((x * 13 + y * 17 + (x * y) % 29) % 29 - 14) * 0.52
            base = (
                color[0] + 18 * highlight - 18 * shade + grain,
                color[1] + 22 * highlight - 18 * shade + grain,
                color[2] + 18 * highlight - 16 * shade + grain,
                alpha,
            )
            pixels[y * W + x] = blend(pixels[y * W + x], base)

    # Subtle inner bevel and bottom weight.
    for y in range(H):
        for x in range(W):
            inside = rounded_rect_alpha(x, y, left, top, right, bottom, radius)
            if inside <= 0:
                continue
            shade = max(0, (y - H * 0.68) / (H * 0.26)) * 0.12
            if shade:
                pixels[y * W + x] = blend(pixels[y * W + x], (0, 0, 0, shade * inside))

    # Orbit ring.
    for y in range(H):
        for x in range(W):
            a = stroke_circle_alpha(x, y, cx, cy + 20 * SCALE, 276 * SCALE, 4 * SCALE)
            if a:
                pixels[y * W + x] = blend(pixels[y * W + x], (ring[0], ring[1], ring[2], 0.32 * a))

    # Small orbit dot.
    dot_x = cx + 210 * SCALE
    dot_y = cy - 164 * SCALE
    for y in range(int(dot_y - 26 * SCALE), int(dot_y + 26 * SCALE)):
        for x in range(int(dot_x - 26 * SCALE), int(dot_x + 26 * SCALE)):
            if 0 <= x < W and 0 <= y < H:
                a = circle_alpha(x, y, dot_x, dot_y, 18 * SCALE)
                if a:
                    pixels[y * W + x] = blend(pixels[y * W + x], (35, 50, 42, 0.20 * a))
                    pixels[y * W + x] = blend(pixels[y * W + x], (179, 207, 191, 0.76 * a))

    # Main lowercase i: dot and stem.
    dot_cy = cy - 132 * SCALE
    for y in range(int(dot_cy - 50 * SCALE), int(dot_cy + 50 * SCALE)):
        for x in range(int(cx - 50 * SCALE), int(cx + 50 * SCALE)):
            if 0 <= x < W and 0 <= y < H:
                a = circle_alpha(x, y, cx, dot_cy, 40 * SCALE)
                if a:
                    pixels[y * W + x] = blend(pixels[y * W + x], (0, 0, 0, 0.24 * a))
                    gy = (y - (dot_cy - 40 * SCALE)) / (80 * SCALE)
                    color = mix(cream1, cream2, max(0.0, min(1.0, gy * 0.48)))
                    pixels[y * W + x] = blend(pixels[y * W + x], (color[0], color[1], color[2], a))

    stem_left = cx - 38 * SCALE
    stem_top = cy - 44 * SCALE
    stem_right = cx + 38 * SCALE
    stem_bottom = cy + 216 * SCALE
    for y in range(int(stem_top - 4 * SCALE), int(stem_bottom + 4 * SCALE)):
        for x in range(int(stem_left - 4 * SCALE), int(stem_right + 4 * SCALE)):
            if 0 <= x < W and 0 <= y < H:
                a = rounded_rect_alpha(x, y, stem_left, stem_top, stem_right, stem_bottom, 8 * SCALE)
                if a:
                    pixels[y * W + x] = blend(pixels[y * W + x], (0, 0, 0, 0.22 * a))
                    gx = (x - stem_left) / (stem_right - stem_left)
                    gy = (y - stem_top) / (stem_bottom - stem_top)
                    color = mix(cream1, cream2, 0.30 * gy + 0.16 * gx)
                    pixels[y * W + x] = blend(pixels[y * W + x], (color[0], color[1], color[2], a))

    return pixels


def downsample(pixels):
    out = bytearray()
    for y in range(SIZE):
        for x in range(SIZE):
            acc = [0.0, 0.0, 0.0, 0.0]
            for sy in range(SCALE):
                for sx in range(SCALE):
                    px = pixels[(y * SCALE + sy) * W + x * SCALE + sx]
                    for i in range(4):
                        acc[i] += px[i]
            for i in range(4):
                acc[i] /= SCALE * SCALE
            out.extend([clamp(acc[0]), clamp(acc[1]), clamp(acc[2]), clamp(acc[3] * 255)])
    return out


def png_chunk(kind, data):
    body = kind + data
    return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body) & 0xFFFFFFFF)


def write_png(path, rgba):
    raw = bytearray()
    stride = SIZE * 4
    for y in range(SIZE):
        raw.append(0)
        raw.extend(rgba[y * stride:(y + 1) * stride])
    data = b"".join([
        b"\x89PNG\r\n\x1a\n",
        png_chunk(b"IHDR", struct.pack(">IIBBBBB", SIZE, SIZE, 8, 6, 0, 0, 0)),
        png_chunk(b"IDAT", zlib.compress(bytes(raw), 9)),
        png_chunk(b"IEND", b""),
    ])
    path.write_bytes(data)


def main():
    root = Path(__file__).resolve().parents[1]
    assets = root / "assets"
    renderer_assets = root / "src" / "renderer" / "assets"
    assets.mkdir(exist_ok=True)
    renderer_assets.mkdir(parents=True, exist_ok=True)
    rgba = downsample(draw())
    write_png(assets / "app-icon.png", rgba)
    write_png(assets / "icon.png", rgba)
    write_png(renderer_assets / "app-icon.png", rgba)


if __name__ == "__main__":
    main()
