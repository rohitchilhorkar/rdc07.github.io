#!/usr/bin/env python3
"""Generates the original night-city artwork partials (deterministic).

    python scripts/art.py   ->  src/partials/{skyline,hero-sky,car}.html
"""
import random
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "src" / "partials"


def skyline(seed, width, base, hmin, hmax, windows=True, figure=None):
    """Gothic and art deco towers. Returns (silhouette path, window rects, figure svg)."""
    r = random.Random(seed)
    d, wins, x, roofs = [], [], 0, []
    while x < width:
        w = r.randint(34, 92)
        h = r.randint(hmin, hmax)
        top = base - h
        kind = r.random()
        d.append(f"M{x} {base}V{top}")
        if kind < 0.22:  # gothic spire
            d.append(f"H{x + w * 0.3:.0f}L{x + w / 2:.0f} {top - r.randint(30, 60)}L{x + w * 0.7:.0f} {top}H{x + w}")
        elif kind < 0.45:  # art deco steps
            s = w / 6
            d.append(f"H{x + s:.0f}V{top - 10}H{x + 2 * s:.0f}V{top - 20}H{x + 4 * s:.0f}V{top - 10}H{x + 5 * s:.0f}V{top}H{x + w}")
        elif kind < 0.6:  # antenna
            ax = x + w * r.uniform(0.3, 0.7)
            d.append(f"H{ax - 2:.0f}V{top - 34}H{ax + 2:.0f}V{top}H{x + w}")
        elif kind < 0.72:  # pointed gables
            d.append(f"L{x + w / 4:.0f} {top - 16}L{x + w / 2:.0f} {top}L{x + 3 * w / 4:.0f} {top - 16}L{x + w} {top}")
        else:
            d.append(f"H{x + w}")
        d.append(f"V{base}Z")
        roofs.append((x, w, top))
        if windows:
            for wy in range(top + 10, base - 8, 12):
                for wx in range(x + 6, x + w - 8, 10):
                    if r.random() < 0.075:
                        wins.append(f'<rect x="{wx}" y="{wy}" width="4" height="6"/>')
        x += w + r.choice((0, 0, 2, 4))
    fig = ""
    if figure is not None:
        # an anonymous caped figure keeping watch on a rooftop ledge
        fx, fw, ft = max(roofs[2:-2], key=lambda t: t[2] * -1 if figure == "high" else 0)
        cx, cy = fx + fw / 2, ft
        fig = (f'<path class="watcher" d="M{cx - 9:.0f} {cy}L{cx - 6:.0f} {cy - 14}L{cx - 3:.0f} {cy - 19}'
               f'Q{cx:.0f} {cy - 25} {cx + 3:.0f} {cy - 19}L{cx + 6:.0f} {cy - 14}L{cx + 12:.0f} {cy}Z"/>'
               f'<circle class="watcher" cx="{cx:.0f}" cy="{cy - 22}" r="3.2"/>')
    return " ".join(d), wins, fig


def write(name, svg):
    (OUT / f"{name}.html").write_text(svg, "utf-8")
    print(f"{name}: {len(svg)} bytes")


# Hero sky: stars, moon, clouds, searchlight beam and the signal
r = random.Random(7)
stars = "".join(
    f'<circle cx="{r.randint(0, 1200)}" cy="{r.randint(0, 300)}" r="{r.choice((0.6, 0.8, 1, 1.3))}" opacity="{r.uniform(.25, .9):.2f}"/>'
    for _ in range(90))
sky_d, sky_w, watcher = skyline(11, 1260, 540, 70, 230, figure="high")
write("hero-sky", f'''<svg class="sky" viewBox="0 0 1200 540" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
  <defs>
    <radialGradient id="sky-glow" cx="70%" cy="20%" r="70%"><stop offset="0" stop-color="#1b2433"/><stop offset="1" stop-color="#07090c"/></radialGradient>
    <linearGradient id="beam" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ffd34d" stop-opacity=".55"/><stop offset="1" stop-color="#ffd34d" stop-opacity=".04"/></linearGradient>
    <radialGradient id="signal" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ffe08a" stop-opacity=".95"/><stop offset=".7" stop-color="#ffc93c" stop-opacity=".55"/><stop offset="1" stop-color="#ffc93c" stop-opacity="0"/></radialGradient>
    <filter id="soft"><feGaussianBlur stdDeviation="14"/></filter>
  </defs>
  <rect width="1200" height="540" fill="url(#sky-glow)"/>
  <g fill="#e9e4d6">{stars}</g>
  <circle cx="1080" cy="86" r="34" fill="#e9e4d6" opacity=".9"/>
  <circle cx="1093" cy="78" r="30" fill="#0e131b" opacity=".85"/>
  <g fill="#1a2230" filter="url(#soft)" opacity=".9">
    <ellipse cx="820" cy="140" rx="260" ry="46"/><ellipse cx="560" cy="90" rx="200" ry="34"/><ellipse cx="1050" cy="190" rx="220" ry="40"/>
  </g>
  <g class="beam-g">
    <path class="beam" d="M968 470L742 112L882 104Z" fill="url(#beam)"/>
    <g class="signal">
      <ellipse cx="812" cy="112" rx="104" ry="66" fill="url(#signal)"/>
      <text x="812" y="134" text-anchor="middle" class="signal-mark">RC</text>
    </g>
  </g>
  <rect x="954" y="462" width="28" height="14" rx="3" fill="#2a3240"/>
  <g class="city"><path d="{sky_d}"/>{watcher}</g>
  <g class="lit">{"".join(sky_w)}</g>
</svg>
''')

# Footer skyline with a road
foot_d, foot_w, _ = skyline(23, 1220, 200, 40, 170)
write("skyline", f'''<svg class="skyline" viewBox="0 0 1200 236" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
  <path class="city" d="{foot_d}"/>
  <g class="lit">{"".join(foot_w)}</g>
  <rect class="road" x="0" y="200" width="1200" height="36"/>
  <path class="lane" d="M0 219H1200"/>
</svg>
''')

# Original armored night car, side view, drives to the right
write("car", '''<svg class="car" viewBox="0 0 300 84" aria-hidden="true">
  <defs><linearGradient id="hl" x1="0" x2="1"><stop offset="0" stop-color="#ffd34d" stop-opacity=".7"/><stop offset="1" stop-color="#ffd34d" stop-opacity="0"/></linearGradient></defs>
  <path d="M262 50L300 40V66L262 58Z" fill="url(#hl)"/>
  <ellipse class="exhaust" cx="10" cy="49" rx="10" ry="4"/>
  <path class="body" d="M14 56L18 42L66 37L102 25L150 21L188 31L238 40L262 50L258 60L14 60Z"/>
  <path class="glass" d="M110 26L136 17L168 20L184 30Z"/>
  <path class="trim" d="M30 47H120M150 44L230 44M66 37L74 56M196 34L204 56"/>
  <rect class="lamp" x="252" y="46" width="8" height="4" rx="1"/>
  <rect class="tail" x="15" y="44" width="5" height="4" rx="1"/>
  <g class="wheel" transform="translate(58 62)"><circle r="15"/><g class="spin"><circle class="hub" r="6"/><path class="spoke" d="M0-12V12M-12 0H12"/></g></g>
  <g class="wheel" transform="translate(214 62)"><circle r="14"/><g class="spin"><circle class="hub" r="6"/><path class="spoke" d="M0-11V11M-11 0H11"/></g></g>
</svg>
''')
