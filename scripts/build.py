#!/usr/bin/env python3
"""Tiny static build. Standard library only, so Netlify needs no installs.

src/pages/**.html   pages; first line is  <!--meta {json}-->
src/partials/*.html included with  {{> name}}
src/static/**       copied as is
{{key}}             replaced with page meta, then site-wide values below

Output goes to dist/. Run locally:  python scripts/build.py
"""
import datetime
import json
import os
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src"
DIST = ROOT / "dist"
SITE_URL = "https://rohit-chilhorkar.netlify.app"

commit = os.environ.get("COMMIT_REF", "")[:7] or "local"
site = {
    "site_url": SITE_URL,
    "commit": commit,
    "commit_url": f"https://github.com/rohitchilhorkar/rdc07.github.io/commit/{commit}" if commit != "local" else "https://github.com/rohitchilhorkar/rdc07.github.io",
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


def main():
    if DIST.exists():
        shutil.rmtree(DIST)
    shutil.copytree(SRC / "static", DIST)

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
    print(f"built {len(urls)} pages, commit {commit}")


if __name__ == "__main__":
    main()
