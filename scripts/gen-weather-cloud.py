"""Generates the pixel-art cloud sprite used by the Future Farm Stories weather layer (40x20, crisp, opaque)."""
from pathlib import Path
from PIL import Image

ART = [
    "..............########..................",
    "............##wwwwwwww##................",
    "...........#wwwwwwwwwwww#...............",
    "......####.#wwwwwwwwwwwww#.#####........",
    ".....#wwww#wwwwwwwwwwwwwww#wwwww#.......",
    "....#wwwwwwwwwwwwwwwwwwwwwwwwwwwww#.....",
    "...#wwwwwwwwwwwwwwwwwwwwwwwwwwwwwww#....",
    "..#wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww#...",
    ".#wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww#..",
    "#wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww#.",
    "#wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww#.",
    "#lwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwl#.",
    "#llwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwll#.",
    "#lllllwwwwwwwwwwlllllwwwwwwwwwwwlllll#..",
    ".#lllllllllllllllllllllllllllllllllll#..",
    "..#sssssssssssssssssssssssssssssssss#...",
    "...##################################...",
]
COLORS = {"#": (120, 136, 160, 255), "w": (250, 252, 255, 255), "l": (214, 224, 238, 255), "s": (178, 192, 214, 255)}
width = max(len(row) for row in ART)
image = Image.new("RGBA", (width, len(ART)), (0, 0, 0, 0))
for y, row in enumerate(ART):
    for x, char in enumerate(row):
        if char in COLORS:
            image.putpixel((x, y), COLORS[char])
out = Path(__file__).resolve().parent.parent / "public/assets/farm-stories/weather/cloud.png"
image.save(out)
print(out, image.size)
