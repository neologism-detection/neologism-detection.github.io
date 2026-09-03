#!/usr/bin/env python3
"""Inline the site into one self-contained HTML file for preview.

The deployed site is an ordinary multi-file static site.  A Claude artifact
is served under a strict CSP that blocks every external host except Google
Fonts, so the preview build folds the stylesheets, fonts and figures into a
single document and rewrites the few links that cannot work there.

Usage::

    python tools/build_artifact.py [--out /tmp/site-preview.html]
"""

from __future__ import annotations

import argparse
import base64
import os
import re

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MIME = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
        ".gif": "image/gif", ".svg": "image/svg+xml",
        ".woff2": "font/woff2", ".woff": "font/woff", ".ttf": "font/ttf"}


def data_uri(path: str) -> str:
    ext = os.path.splitext(path)[1].lower()
    with open(path, "rb") as fh:
        b = base64.b64encode(fh.read()).decode("ascii")
    return f"data:{MIME.get(ext, 'application/octet-stream')};base64,{b}"


def inline_css(css_path: str) -> str:
    """Return the stylesheet with its url(...) references inlined."""
    css = open(css_path, encoding="utf-8").read()
    base = os.path.dirname(css_path)

    def sub(m: re.Match) -> str:
        raw = m.group(1).strip().strip('"\'')
        if raw.startswith(("http://", "https://", "data:")):
            return m.group(0)                       # Google Fonts stay remote
        target = os.path.normpath(os.path.join(base, raw.split("?")[0]))
        if not os.path.exists(target):
            return m.group(0)
        return f'url("{data_uri(target)}")'

    return re.sub(r'url\(([^)]*)\)', sub, css)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", default=os.path.join(HERE, "index.html"))
    ap.add_argument("--out", required=True)
    args = ap.parse_args()

    html = open(args.src, encoding="utf-8").read()

    # 1. fold every local stylesheet into a <style> block
    def css_sub(m: re.Match) -> str:
        href = m.group(1)
        if href.startswith(("http://", "https://")):
            return m.group(0)
        p = os.path.join(HERE, href)
        if not os.path.exists(p):
            return ""
        return "<style>\n/* ---- " + href + " ---- */\n" + inline_css(p) + "\n</style>"

    # attribute order varies between link tags, so match either arrangement
    html = re.sub(r'<link(?=[^>]*rel="stylesheet")[^>]*href="([^"]+)"[^>]*>',
                  css_sub, html)

    # 2. embed local images
    def img_sub(m: re.Match) -> str:
        src = m.group(1)
        if src.startswith(("http", "data:")):
            return m.group(0)
        p = os.path.join(HERE, src)
        return m.group(0).replace(src, data_uri(p)) if os.path.exists(p) else m.group(0)

    html = re.sub(r'<img[^>]*src="([^"]+)"', img_sub, html)

    # 3. scripts. teaser.js draws the hero figure and must travel with the
    #    page, so it is inlined. navbar.js and clarity.js are progressive
    #    enhancement the preview does not need, and clarity.js is a jQuery
    #    plugin -- drop those together with the CDN tag, which the artifact
    #    CSP blocks anyway.
    def js_sub(m: re.Match) -> str:
        src = m.group(1)
        if src.endswith("teaser.js"):
            p = os.path.join(HERE, src)
            return ("<script>\n/* ---- " + src + " ---- */\n"
                    + open(p, encoding="utf-8").read() + "\n</script>")
        return ""

    html = re.sub(r'<script src="((?:assets/scripts|clarity)/[^"]+)"[^>]*></script>\n?',
                  js_sub, html)
    html = re.sub(r'<script src="https://ajax\.googleapis\.com/[^"]+"></script>\n?', "", html)

    # 4. the PDF is not carried into the preview
    html = html.replace(
        '<a href="paper/paper.pdf" class="button icon"',
        '<a href="#" onclick="alert(\'The PDF is served from the deployed site.\'); '
        'return false;" class="button icon"')

    os.makedirs(os.path.dirname(os.path.abspath(args.out)) or ".", exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as fh:
        fh.write(html)
    print(f"Wrote {args.out}  ({os.path.getsize(args.out)/1e6:.2f} MB)")
    leftover = [u for u in re.findall(r'(?:src|href)="([^"#][^"]*)"', html)
                if not u.startswith(("http", "data:"))]
    print("unresolved local refs:", leftover or "none")


if __name__ == "__main__":
    main()
