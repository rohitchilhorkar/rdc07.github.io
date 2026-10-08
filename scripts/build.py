#!/usr/bin/env python3
"""Tiny static build. Standard library only, so Netlify needs no installs.

src/pages/**.html   pages; first line is  <!--meta {json}-->
src/partials/*.html included with  {{> name}}
src/static/**       copied as is
src/styles/         base.css plus one stylesheet per skin, scoped to
                    <html data-skin="..."> and bundled into assets/css/site.css
{{key}}             replaced with page meta, then site-wide values below

Output goes to dist/. CSS is minified and assets get a ?v=<hash> for caching.
Run locally:  python scripts/build.py
"""
import datetime
import hashlib
import json
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src"
DIST = ROOT / "dist"
SITE_URL = "https://rohit-chilhorkar.netlify.app"

site = {
    "site_url": SITE_URL,
    "built": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d"),
    "year": str(datetime.date.today().year),
}

META = re.compile(r"\A<!--meta (\{.*?\})-->\s*", re.S)
INCLUDE = re.compile(r"\{\{>\s*([\w-]+)\s*\}\}")
VAR = re.compile(r"\{\{\s*([\w-]+)\s*\}\}")


def render(text, ctx, depth=0):
    if depth > 5:
        raise RuntimeError("partials nested too deep")
    text = INCLUDE.sub(lambda m: render((SRC / "partials" / f"{m.group(1)}.html").read_text("utf-8"), ctx, depth + 1), text)

    def var(m):
        if m.group(1) not in ctx:
            raise KeyError(f"unknown template value: {m.group(1)}")
        return ctx[m.group(1)]

    return VAR.sub(var, text)


SKINS = ("warm", "knight")
COMMENT = re.compile(r"/\*.*?\*/", re.S)


def scope_selector(sel, skin):
    """Make one selector apply only while <html data-skin="skin"> is set."""
    sel = sel.strip()
    root = f':root[data-skin="{skin}"]'
    if sel.startswith(":root"):
        return root + sel[len(":root"):]
    if sel.startswith("html"):
        return root + sel[len("html"):]
    if sel.startswith(".no-js"):
        return root + sel
    return f"{root} {sel}"


def scope_css(css, skin):
    """Prefix every rule with the skin selector. Recurses into @media/@supports;
    @keyframes and other at-rules are copied as is."""
    css = COMMENT.sub("", css)
    out, i = [], 0
    while True:
        start = css.find("{", i)
        if start == -1:
            break
        prelude = css[i:start].strip()
        depth, j = 1, start + 1
        while depth:
            depth += {"{": 1, "}": -1}.get(css[j], 0)
            j += 1
        body = css[start + 1:j - 1]
        if prelude.startswith(("@media", "@supports")):
            out.append(f"{prelude} {{\n{scope_css(body, skin)}}}\n")
        elif prelude.startswith("@"):
            out.append(f"{prelude} {{{body}}}\n")
        else:
            sels = ", ".join(scope_selector(s, skin) for s in prelude.split(","))
            out.append(f"{sels} {{{body}}}\n")
        i = j
    return "".join(out)


def build_css():
    styles = SRC / "styles"
    parts = [(styles / "base.css").read_text("utf-8")]
    for skin in SKINS:
        parts.append(f"/* ===== skin: {skin} ===== */\n" + scope_css((styles / f"{skin}.css").read_text("utf-8"), skin))
    css = COMMENT.sub("", "\n".join(parts))
    css = re.sub(r"\s+", " ", css)
    css = re.sub(r"\s*([{};,>])\s*", r"\1", css).replace(";}", "}")
    target = DIST / "assets" / "css" / "site.css"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(css, "utf-8")


def fingerprint(path):
    """Short content hash used as ?v= so assets can be cached for a year."""
    return hashlib.sha256(path.read_bytes()).hexdigest()[:10]


def main():
    if DIST.exists():
        shutil.rmtree(DIST)
    shutil.copytree(SRC / "static", DIST)
    build_css()
    site["v_css"] = fingerprint(DIST / "assets" / "css" / "site.css")
    site["v_site"] = fingerprint(DIST / "assets" / "js" / "site.js")
    site["v_theme"] = fingerprint(DIST / "assets" / "js" / "theme.js")
    site["v_sim"] = fingerprint(DIST / "assets" / "js" / "sim.js")

    urls = []
    for page in sorted((SRC / "pages").rglob("*.html")):
        raw = page.read_text("utf-8")
        m = META.match(raw)
        if not m:
            raise ValueError(f"{page} is missing its <!--meta {{...}}--> header")
        meta = json.loads(m.group(1))
        rel = page.relative_to(SRC / "pages").with_suffix("").as_posix()
        if rel == "index":
            path, out = "/", DIST / "index.html"
        elif rel == "404":
            path, out = None, DIST / "404.html"
        else:
            path, out = f"/{rel}/", DIST / rel / "index.html"
        ctx = {**site, **meta, "path": path or "/404", "canonical": SITE_URL + (path or "/")}
        html = render(raw[m.end():], ctx)
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(html, "utf-8")
        if path:
            urls.append(path)
        print(f"  {out.relative_to(DIST)}")

    sitemap = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    sitemap += [f"  <url><loc>{SITE_URL}{u}</loc><lastmod>{site['built']}</lastmod></url>" for u in urls]
    sitemap.append("</urlset>")
    (DIST / "sitemap.xml").write_text("\n".join(sitemap) + "\n", "utf-8")
    print(f"built {len(urls)} pages")


if __name__ == "__main__":
    main()
