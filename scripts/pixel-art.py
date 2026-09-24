"""Pixel-art scenes for /contact, drawn on a 64x36 grid and written as SVG.

Run from anywhere:  python scripts/pixel-art.py
Writes public/contact/pixel-chat.svg and public/contact/pixel-answers.svg.

Each object is drawn on its own layer, outlined automatically, then
composited, so outlines never bleed into neighbours. The sky is NOT in
the files: it is the slot's background on the page, so it follows the
light/dark theme. Colours are the site palette (orange, lime, blue, zinc).
"""
import random
from pathlib import Path

W, H = 64, 36
OUT = str(Path(__file__).resolve().parent.parent / "public" / "contact") + "/"

PAL = {
    "K": "#1c1917",  # outline
    "H": "#4a2e1a", "h": "#6b4226",  # hair
    "S": "#f1b98a", "s": "#d99a6c", "m": "#9a5a3c",  # skin, shade, mouth
    "W": "#ffffff", "E": "#3b82f6",  # eye white, iris
    "O": "#f97316", "o": "#c2410c", "P": "#fdba74",  # orange hoodie
    "L": "#1e40af", "l": "#1e3a8a", "Z": "#3f3f46",  # pants, shoes
    "G": "#84cc16", "g": "#65a30d",  # grass
    "D": "#8b5a2b", "d": "#6b4423",  # dirt
    "w": "#ffffff", "z": "#a1a1aa",  # white bubble, grey text
    "U": "#3b82f6", "u": "#1d4ed8",  # blue
    "T": "#b0793e", "t": "#8a5a2b", "y": "#d19a5a",  # wood
    "p": "#fef3c7", "q": "#d6b98a",  # pages, page lines
    "Y": "#facc15",  # sparkle
    "c": "#ffffff",  # cloud
    "A": "#a1a1aa", "a": "#71717a",  # grey metal
    "V": "#a3e635",  # lime light
}


class Layer:
    def __init__(self):
        self.px = {}

    def put(self, x, y, c):
        if 0 <= x < W and 0 <= y < H:
            self.px[(x, y)] = c

    def rect(self, x, y, w, h, c):
        for j in range(h):
            for i in range(w):
                self.put(x + i, y + j, c)

    def rows(self, x, y, rows):
        for j, row in enumerate(rows):
            for i, c in enumerate(row):
                if c != ".":
                    self.put(x + i, y + j, c)

    def outline(self, c="K"):
        add = {}
        for (x, y) in self.px:
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                n = (x + dx, y + dy)
                if n not in self.px and 0 <= n[0] < W and 0 <= n[1] < H:
                    add[n] = c
        self.px.update(add)
        return self


def compose(*layers):
    grid = {}
    for layer in layers:
        grid.update(layer.px)
    return grid


def ground(seed):
    r = random.Random(seed)
    g = Layer()
    g.rect(0, 31, W, 1, "G")
    g.rect(0, 32, W, 4, "D")
    for x in range(W):
        if r.random() < 0.3:
            g.put(x, 31, "g")
        if r.random() < 0.5:
            g.put(x, 32, "G")  # grass hanging over the edge, like the block
        for y in range(33, 36):
            if r.random() < 0.18:
                g.put(x, y, "d")
    return g


def cloud(x, y, w):
    c = Layer()
    c.rect(x + 2, y, w - 4, 1, "c")
    c.rect(x, y + 1, w, 2, "c")
    return c


def sparkle(layer, x, y, c="Y"):
    layer.put(x, y, "W")
    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        layer.put(x + dx, y + dy, c)


# ---------------------------------------------------------------- chat
def chat():
    person = Layer()
    person.rows(11, 6, [
        "HHHHHHHH",
        "HHHHHHHH",
        "HSSSSSSH",
        "SSSSSSSS",
        "SWESSEWS",
        "SSSssSSS",
        "SSSmmSSS",
        "SSSSSSSS",
    ])
    person.rows(11, 14, [
        "OOOSSOOO",
        "OOOOOOOO",
        "OPOOOOPO",
        "OPOOOOPO",
        "OOOOOOOO",
        "OooooooO",
        "OOOOOOOO",
        "OOOOOOOO",
        "oooooooo",
    ])
    # left arm down
    person.rows(8, 14, ["OOO"] * 6 + ["SSS"] * 3)
    # right arm raised: waving at the bubbles
    # one column away from the head, so the outline separates them
    person.rows(20, 6, ["SSS"] * 3 + ["OOO"] * 6)
    person.rect(19, 14, 1, 1, "O")  # shoulder
    person.rows(11, 23, [
        "LLLllLLL",
        "LLLllLLL",
        "LLLllLLL",
        "LLLllLLL",
        "LLLllLLL",
        "ZZZZZZZZ",
        "ZZZZZZZZ",
    ])
    person.outline()

    # white bubble: the visitor's message
    b1 = Layer()
    b1.rect(27, 3, 31, 11, "w")
    for (x, y) in ((27, 3), (57, 3), (27, 13), (57, 13)):
        b1.px.pop((x, y), None)
    b1.rows(24, 12, ["..ww", ".ww.", "ww.."])  # tail towards the hand
    b1.rect(30, 6, 22, 1, "z")
    b1.rect(30, 8, 16, 1, "z")
    b1.rect(30, 10, 25, 1, "z")
    b1.outline()

    # blue bubble: the reply
    b2 = Layer()
    b2.rect(33, 18, 22, 9, "U")
    for (x, y) in ((33, 18), (54, 18), (33, 26), (54, 26)):
        b2.px.pop((x, y), None)
    b2.rows(52, 27, ["UU", ".UU", "..U"])  # tail out to the right edge
    b2.rect(36, 21, 9, 1, "W")
    b2.rect(36, 23, 6, 1, "W")
    b2.rows(47, 20, [  # heart
        "WW.WW",
        "WWWWW",
        "WWWWW",
        ".WWW.",
        "..W..",
    ])
    b2.outline()

    clouds = compose(cloud(2, 1, 8), cloud(56, 16, 7))
    cl = Layer()
    cl.px = clouds
    return compose(cl, ground(3), person, b1, b2)


# ------------------------------------------------------------- answers
def answers():
    lectern = Layer()
    # base
    lectern.rect(22, 28, 20, 3, "T")
    lectern.rect(22, 30, 20, 1, "t")
    lectern.rect(22, 28, 20, 1, "y")
    # post
    lectern.rect(28, 21, 8, 7, "T")
    lectern.rect(28, 21, 2, 7, "y")
    lectern.rect(34, 21, 2, 7, "t")
    # top board
    lectern.rect(18, 18, 28, 3, "T")
    lectern.rect(18, 20, 28, 1, "t")
    lectern.outline()

    book = Layer()
    book.rect(16, 17, 32, 2, "U")  # cover edge under the pages
    book.rect(16, 18, 32, 1, "u")
    book.rect(17, 13, 14, 4, "p")
    book.rect(33, 13, 14, 4, "p")
    book.rect(18, 12, 12, 1, "p")  # pages curl up at the top
    book.rect(34, 12, 12, 1, "p")
    book.rect(31, 12, 2, 6, "u")  # spine
    for y in (14, 16):
        book.rect(19, y, 10, 1, "q")
        book.rect(35, y, 9, 1, "q")
    book.outline()

    mark = Layer()
    mark.rows(28, 1, [
        ".OOOOOO.",
        "OOPPPPOO",
        "OO....OO",
        "......OO",
        "....OOO.",
        "...OO...",
        "........",
        "...OO...",
    ])
    mark.outline()

    sparks = Layer()
    sparkle(sparks, 21, 4)
    sparkle(sparks, 42, 3, "V")
    sparkle(sparks, 47, 10)
    sparkle(sparks, 14, 9, "V")

    books = Layer()
    books.rect(5, 27, 12, 4, "O")
    books.rect(5, 29, 12, 1, "o")
    books.rect(6, 23, 10, 4, "G")
    books.rect(6, 25, 10, 1, "g")
    books.rect(5, 19, 11, 4, "U")
    books.rect(5, 21, 11, 1, "u")
    for y in (27, 23, 19):
        books.rect(15 if y != 23 else 14, y, 1, 4, "p")  # page edges
    books.outline()

    chest = Layer()
    chest.rect(49, 23, 11, 8, "T")
    chest.rect(49, 23, 11, 3, "y")
    chest.rect(49, 26, 11, 1, "t")
    chest.rect(53, 25, 3, 3, "A")
    chest.put(54, 26, "a")
    chest.outline()

    clouds = Layer()
    clouds.px = compose(cloud(3, 2, 9), cloud(52, 1, 8))
    return compose(clouds, ground(7), lectern, book, mark, sparks, books, chest)


def to_svg(grid, title):
    out = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" shape-rendering="crispEdges" role="img">',
        f"<title>{title}</title>",
    ]
    by_colour = {}
    for y in range(H):
        x = 0
        while x < W:
            c = grid.get((x, y))
            if c is None:
                x += 1
                continue
            run = 1
            while grid.get((x + run, y)) == c:
                run += 1
            by_colour.setdefault(PAL[c], []).append(f"M{x} {y}h{run}v1h-{run}z")
            x += run
    for colour, parts in by_colour.items():
        out.append(f'<path fill="{colour}" d="{"".join(parts)}"/>')
    out.append("</svg>")
    return "".join(out)


for name, grid, title in (
    ("pixel-chat", chat(), "A blocky builder waving at two chat bubbles"),
    ("pixel-answers", answers(), "An open book on a lectern under a big question mark"),
):
    svg = to_svg(grid, title)
    with open(OUT + name + ".svg", "w", encoding="utf-8") as f:
        f.write(svg)
    print(name, len(svg), "bytes")
