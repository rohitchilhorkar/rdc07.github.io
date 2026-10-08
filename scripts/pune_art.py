#!/usr/bin/env python3
"""Original ink-and-watercolour illustration of Shaniwar Wada's Delhi Darwaza, Pune.

    python scripts/pune_art.py   ->  src/partials/pune.html

Deterministic: the same drawing every run.
"""
import random
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "src" / "partials" / "pune.html"
r = random.Random(42)
G = 262  # ground line
INK = "rgba(40,26,18,.55)"

STONE_HI, STONE, STONE_LO = "#d9b48a", "#c49a70", "#9c7350"
WOOD, IRON = "#5e3b27", "#2d221b"
LEAF = ["#6f8256", "#5f7349", "#7f9160", "#53663f"]
SAFFRON = "#ec8a2b"

fills, inks, front = [], [], []


def merlons(x0, x1, y, w=12, gap=7, h=11, fill=STONE_HI):
    x = x0
    while x + w <= x1:
        d = f"M{x} {y}v-{h - 6}q{w / 2:g} -{h + 2} {w} 0v{h - 6}z"
        fills.append(f'<path d="{d}" fill="{fill}"/>')
        inks.append(f'<path d="{d}"/>')
        x += w + gap


def courses(x0, x1, y0, y1, step=11):
    """Brick courses with staggered joints."""
    d, row = [], 0
    for y in range(int(y0) + step, int(y1), step):
        d.append(f"M{x0} {y}H{x1}")
        off = 0 if row % 2 else 14
        for x in range(int(x0) + off, int(x1) - 6, 28):
            d.append(f"M{x} {y}v{step}")
        row += 1
    return f'<path d="{" ".join(d)}" stroke="rgba(60,40,25,.18)" stroke-width=".8"/>'


def tower(x0, x1, top, taper=4):
    d = f"M{x0} {G}L{x0 + taper} {top}H{x1 - taper}L{x1} {G}Z"
    fills.append(f'<path d="{d}" fill="url(#pw-stone)"/>')
    mid = (x0 + x1) / 2
    fills.append(f'<path d="M{mid} {top}H{x1 - taper}L{x1} {G}H{mid}Z" fill="{STONE_LO}" opacity=".45"/>')
    fills.append(courses(x0 + taper, x1 - taper, top, G))
    inks.append(f'<path d="{d}"/>')
    inks.append(f'<path d="M{x0 + taper - 2} {top + 4}H{x1 - taper + 2}M{x0 + 2} {top + (G - top) * .45:.0f}H{x1 - 2}"/>')
    merlons(x0 + taper + 2, x1 - taper - 2, top, w=10, gap=5)


def wall(x0, x1, top):
    fills.append(f'<rect x="{x0}" y="{top}" width="{x1 - x0}" height="{G - top}" fill="url(#pw-stone)"/>')
    fills.append(courses(x0, x1, top, G))
    inks.append(f'<path d="M{x0} {top}H{x1}"/>')
    merlons(x0 + 4, x1 - 4, top)
    for x in range(int(x0) + 22, int(x1) - 10, 34):  # arrow loops
        fills.append(f'<rect x="{x}" y="{top + 16}" width="3" height="11" rx="1.5" fill="{IRON}" opacity=".6"/>')


def tree(x, y, s, kind="round"):
    front.append(f'<path d="M{x} {y}C{x - 2 * s:.1f} {y - 18 * s:.1f} {x + 2 * s:.1f} {y - 30 * s:.1f} {x} {y - 40 * s:.1f}" stroke="{WOOD}" stroke-width="{3 * s:.1f}" fill="none"/>')
    if kind == "cypress":
        front.append(f'<path d="M{x} {y - 78 * s:.1f}C{x + 14 * s:.1f} {y - 50 * s:.1f} {x + 12 * s:.1f} {y - 22 * s:.1f} {x} {y - 14 * s:.1f}C{x - 12 * s:.1f} {y - 22 * s:.1f} {x - 14 * s:.1f} {y - 50 * s:.1f} {x} {y - 78 * s:.1f}Z" fill="{LEAF[1]}" opacity=".95"/>')
        return
    for _ in range(9):
        cx = x + r.uniform(-24, 24) * s
        cy = y - 44 * s + r.uniform(-16, 12) * s
        rr = r.uniform(11, 17) * s
        front.append(f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{rr:.1f}" fill="{r.choice(LEAF)}" opacity="{r.uniform(.75, .95):.2f}"/>')


def person(x, s=1.0, lean=1):
    h = 26 * s
    head = f'<circle cx="{x}" cy="{G + 6 - h:.1f}" r="{3 * s:.1f}" fill="{IRON}"/>'
    hip_x, hip_y = x + lean * s, G - 4 * s
    body = (f"M{x} {G + 9 - h:.1f}L{hip_x:.1f} {hip_y:.1f}"
            f"M{hip_x:.1f} {hip_y:.1f}L{x - 3 * s:.1f} {G + 6}"
            f"M{hip_x:.1f} {hip_y:.1f}L{x + 4 * s:.1f} {G + 6}"
            f"M{x} {G + 12 - h:.1f}L{x - 4 * s:.1f} {G + 1 - h * .3:.1f}"
            f"M{x} {G + 12 - h:.1f}L{x + 4 * s:.1f} {G - h * .3:.1f}")
    return head + f'<path d="{body}" stroke="{IRON}" stroke-width="{2 * s:.1f}" stroke-linecap="round" fill="none"/>'


# ---------- background: sky wash, low sun, hills ----------
bg = [
    '<rect x="0" y="0" width="1200" height="270" fill="url(#pw-sky)"/>',
    '<circle cx="990" cy="128" r="70" fill="url(#pw-sun)"/>',
    '<circle cx="990" cy="128" r="30" fill="#f6c48f" opacity=".55"/>',
    f'<path d="M0 232Q120 196 260 220T560 212T860 216T1200 204V{G}H0Z" fill="#8a9a78" opacity=".28"/>',
    f'<path d="M0 244Q180 224 380 238T760 232T1200 230V{G}H0Z" fill="#6f8256" opacity=".3"/>',
]
birds = "".join(
    f'<path d="M{x} {y}q{s * 5:.1f} {-s * 5:.1f} {s * 10:.1f} 0q{s * 5:.1f} {-s * 5:.1f} {s * 10:.1f} 0"/>'
    for x, y, s in [(250, 70, 1), (282, 58, .8), (310, 76, .9), (840, 52, 1), (868, 64, .7)])

# ---------- the fort ----------
wall(150, 432, 172)
wall(768, 1050, 172)
tower(108, 172, 150)
tower(1028, 1092, 150)
tower(428, 524, 118, taper=6)
tower(676, 772, 118, taper=6)
for cx in (476, 724):  # jharokha windows on the gate bastions
    fills.append(f'<path d="M{cx - 9} 168V156q9 -12 18 0V168Z" fill="{IRON}" opacity=".7"/>')
    inks.append(f'<path d="M{cx - 13} 169H{cx + 13}"/>')

# gatehouse between the bastions
fills.append(f'<rect x="524" y="128" width="152" height="{G - 128}" fill="url(#pw-stone)"/>')
fills.append(courses(524, 676, 128, G))
inks.append('<path d="M524 128H676"/>')

# the great arch and its spiked wooden doors
arch = f"M556 {G}V176Q556 150 600 140Q644 150 644 176V{G}Z"
fills.append(f'<path d="{arch}" fill="{WOOD}"/>')
fills.append(f'<path d="M562 {G}V178Q562 156 600 147Q638 156 638 178V{G}" fill="none" stroke="{STONE_HI}" stroke-width="3" opacity=".6"/>')
planks = " ".join(f"M{x} 160V{G}" for x in range(568, 636, 8))
fills.append(f'<path d="{planks}" stroke="rgba(0,0,0,.25)" stroke-width="1"/>')
spikes = []
for y in range(176, G - 8, 15):
    for x in range(568, 636, 11):
        if abs(x - 600) > 3:
            spikes.append(f"M{x - 2.4:.1f} {y + 4}L{x} {y - 3}L{x + 2.4:.1f} {y + 4}Z")
fills.append(f'<path d="{" ".join(spikes)}" fill="#a9a29a"/>')
inks.append(f'<path d="{arch}"/><path d="M600 147V{G}"/>')

# Nagarkhana pavilion with arched windows, eave and chhatris
fills.append('<rect x="534" y="88" width="132" height="40" fill="#e2c39b"/>')
for x in range(546, 660, 22):
    fills.append(f'<path d="M{x} 124V104q8 -11 16 0V124Z" fill="{IRON}" opacity=".78"/>')
fills.append('<path d="M526 88H674L668 82H532Z" fill="#b58c62"/>')
inks.append('<path d="M534 128V88M666 128V88M526 88H674"/>')
for x in range(540, 664, 18):
    inks.append(f'<path d="M{x} 88l2 5"/>')
for cx, rr in ((548, 10), (600, 15), (652, 10)):
    top = 82 - rr * 1.75
    dome = f"M{cx - rr} 82Q{cx - rr} {82 - rr * 1.5:g} {cx} {top:g}Q{cx + rr} {82 - rr * 1.5:g} {cx + rr} 82Z"
    fills.append(f'<path d="{dome}" fill="{STONE_HI}"/>')
    fills.append(f'<path d="M{cx} {top:g}Q{cx + rr} {82 - rr * 1.5:g} {cx + rr} 82H{cx}Z" fill="{STONE_LO}" opacity=".35"/>')
    inks.append(f'<path d="{dome}"/><path d="M{cx} {top:g}v-5"/><circle cx="{cx}" cy="{top - 7:g}" r="1.8"/>')

# saffron Bhagwa flag above the central dome
inks.append('<path d="M600 50V14"/>')
fills.append(f'<path d="M600 15C612 12 622 20 636 16L626 25L637 33C623 37 612 30 600 33Z" fill="{SAFFRON}"/>')

# ---------- foreground ----------
ground = [
    f'<path d="M0 {G}H1200V300H0Z" fill="url(#pw-ground)"/>',
    f'<path d="M470 300Q560 {G + 8} 600 {G}Q640 {G + 8} 730 300Z" fill="#d8b98f" opacity=".35"/>',
]
tufts = " ".join(f"M{x} {G + y}l-3 -7M{x} {G + y}l1 -8M{x} {G + y}l4 -6"
                 for x, y in [(r.randint(10, 1190), r.randint(6, 30)) for _ in range(46)])
for x, y, s, k in [(36, G + 4, 1.15, "round"), (78, G + 2, .9, "cypress"), (210, G + 3, .75, "round"),
                   (1000, G + 3, .8, "round"), (1128, G + 4, 1.2, "round"), (1172, G + 2, .85, "cypress")]:
    tree(x, y, s, k)
people = person(512, .9, 1) + person(528, .8, -1) + person(812, 1.0, 1)

svg = f'''<svg viewBox="0 0 1200 300" role="img" aria-labelledby="pw-t" preserveAspectRatio="xMidYMax slice">
<title id="pw-t">Watercolour illustration of Shaniwar Wada's Delhi Darwaza in Pune at dusk</title>
<defs>
  <linearGradient id="pw-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e3916a" stop-opacity="0"/><stop offset=".7" stop-color="#e8a274" stop-opacity=".18"/><stop offset="1" stop-color="#f0b98a" stop-opacity=".32"/></linearGradient>
  <radialGradient id="pw-sun"><stop offset="0" stop-color="#f6c48f" stop-opacity=".55"/><stop offset="1" stop-color="#f6c48f" stop-opacity="0"/></radialGradient>
  <linearGradient id="pw-stone" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{STONE_HI}"/><stop offset="1" stop-color="{STONE}"/></linearGradient>
  <linearGradient id="pw-ground" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9a7b58" stop-opacity=".55"/><stop offset="1" stop-color="#9a7b58" stop-opacity="0"/></linearGradient>
  <linearGradient id="pw-fade" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".12" stop-color="#fff"/><stop offset=".88" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
  <mask id="pw-mask"><rect width="1200" height="300" fill="url(#pw-fade)"/></mask>
  <filter id="pw-wash" x="-2%" y="-2%" width="104%" height="104%"><feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves="3" seed="7" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="5" xChannelSelector="R" yChannelSelector="G"/></filter>
  <filter id="pw-ink" x="-2%" y="-2%" width="104%" height="104%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="1" seed="3" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="1.6"/></filter>
  <filter id="pw-grain"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 .5 0 0 0 0 .4 0 0 0 0 .3 0 0 0 .09 0"/></filter>
</defs>
<g mask="url(#pw-mask)">
  <g filter="url(#pw-wash)">{"".join(bg)}{"".join(ground)}{"".join(fills)}{"".join(front)}{people}</g>
  <g filter="url(#pw-ink)" fill="none" stroke="{INK}" stroke-width="1.3" stroke-linejoin="round" stroke-linecap="round">{"".join(inks)}<g stroke="rgba(40,26,18,.6)">{birds}</g><path d="{tufts}" stroke="#6f8256" stroke-width="1.2"/></g>
  <rect width="1200" height="300" filter="url(#pw-grain)"/>
</g>
</svg>
'''
OUT.write_text(svg, "utf-8")
print(f"pune.html: {len(svg)} bytes")
