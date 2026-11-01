#!/usr/bin/env python3
"""Sync the Singles shelf with the Suno profile.

Scrapes the profile page's embedded "Songs" feed (suno.com/@gamecat2300 —
everything Suno exposes publicly, currently the 20 newest) and, in
content/records.json:

  - adds every public song not already in "singles" (cover art via cwebp)
  - refreshes cover art for existing songs when it changed on Suno
    (source image URLs are remembered in sync-state.json)

Existing entries are never edited or removed, so manual curation survives.
Then it runs build.mjs to regenerate the pages. Suno audio can no longer be
hotlinked (signed CDN), so singles link to their Suno page until a SoundCloud
set exists (set "singles.sc" in records.json).

Usage:
  python3 sync.py            # sync + git commit if anything changed
  python3 sync.py --dry-run  # show what would change, touch nothing
  python3 sync.py --push     # sync + commit + git push (Vercel deploys)

Pause: create a file named .paused next to this script (the launchd job then
exits at once). Delete it to resume. To keep a song off the site, add its id
to EXCLUDE below.
"""

import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

PROFILE_URL = "https://suno.com/@gamecat2300"
USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"
)
CWEBP = "/opt/homebrew/bin/cwebp"
ROOT = Path(__file__).resolve().parent
CATALOG = ROOT / "content" / "records.json"
STATE_PATH = ROOT / "sync-state.json"

# Song ids that must never be auto-added.
EXCLUDE: set[str] = set()

DRY_RUN = "--dry-run" in sys.argv
PUSH = "--push" in sys.argv


def die(msg):
    sys.exit(f"sync.py: {msg}")


def unescape_title(s):
    s = re.sub(r"\\u([0-9a-fA-F]{4})", lambda m: chr(int(m.group(1), 16)), s)
    return s.replace('\\"', '"').replace("\\\\", "\\")


def fetch_profile():
    r = subprocess.run(
        ["curl", "-s", "--max-time", "30", "-A", USER_AGENT, PROFILE_URL],
        capture_output=True, text=True,
    )
    if r.returncode != 0 or len(r.stdout) < 10000:
        die(f"could not fetch {PROFILE_URL} (curl rc={r.returncode}, {len(r.stdout)} bytes)")
    return r.stdout


def parse_songs_feed(html):
    """Return the profile's public Songs feed, newest first."""
    un = html.replace('\\"', '"')
    i = un.find('"feed_title":"Songs"')
    if i == -1:
        die('profile layout changed: no "Songs" feed in page payload')
    k = un.find("[", un.find('"items":', i))
    depth = 0
    for m in range(k, len(un)):
        if un[m] == "[":
            depth += 1
        elif un[m] == "]":
            depth -= 1
            if depth == 0:
                break
    arr = un[k : m + 1]
    songs = []
    for chunk in re.split(r'"content_id":"', arr)[1:]:
        sid = chunk[:36]
        if not re.fullmatch(r"[0-9a-f-]{36}", sid):
            continue
        title = re.search(r'"title":"(.*?)","play_count"', chunk)
        img = re.search(r'"image_large_url":"(https://[^"]+)"', chunk)
        tags = re.search(r'"tags":"(.*?)","prompt"', chunk)
        if not title:
            continue
        songs.append({
            "id": sid,
            "title": unescape_title(title.group(1)),
            "image_url": img.group(1) if img else None,
            "tags": unescape_title(tags.group(1)) if tags else "",
        })
    if not songs:
        die("profile layout changed: Songs feed parsed to 0 items")
    return songs


def genre_from_tags(tags):
    """Short display genre from the first phrase of the style prompt."""
    if not tags:
        return ""
    seg = tags.split(",")[0].strip()
    for cut in (" with ", " at "):
        if cut in seg:
            seg = seg.split(cut)[0]
    seg = re.sub(r"\b\d{2,3}(-\d{2,3})?\s*bpm\b", "", seg, flags=re.I).strip(" ,-")
    if not seg or len(seg) > 34:
        return ""
    return " ".join(w if w.isupper() else w.capitalize() for w in seg.split())


def slugify(title):
    return re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-") or "track"


def download_art(image_url, rel_path, label):
    """Download + convert cover art, overwriting rel_path."""
    dest = ROOT / rel_path
    tmp = ROOT / "assets" / ".art.tmp.jpeg"
    r = subprocess.run(
        ["curl", "-s", "--max-time", "30", "-A", USER_AGENT, image_url, "-o", str(tmp)],
        capture_output=True,
    )
    if r.returncode != 0 or not tmp.exists() or tmp.stat().st_size < 1000:
        tmp.unlink(missing_ok=True)
        die(f"failed to download art for {label}")
    r = subprocess.run(
        [CWEBP, "-quiet", "-q", "82", "-resize", "640", "640", str(tmp), "-o", str(dest)],
        capture_output=True,
    )
    tmp.unlink(missing_ok=True)
    if r.returncode != 0 or not dest.exists():
        die(f"cwebp failed for {label}: {r.stderr.decode()[:200]}")


def node():
    # launchd's PATH has no nvm, so look for the newest nvm node when `node` isn't on PATH
    found = shutil.which("node") or sorted(Path.home().glob(".nvm/versions/node/*/bin/node"))[-1:]
    if not found:
        die("node not found (needed for build.mjs)")
    return str(found if isinstance(found, str) else found[0])


def main():
    if (ROOT / ".paused").exists() and not DRY_RUN:
        print("paused (.paused exists) — delete it to resume")
        return

    data = json.loads(CATALOG.read_text())
    tracks = data["singles"]["tracks"]
    known = {t["id"]: t for t in tracks}
    songs = parse_songs_feed(fetch_profile())
    state = json.loads(STATE_PATH.read_text()) if STATE_PATH.exists() else {}

    new_songs = [s for s in songs if s["id"] not in known and s["id"] not in EXCLUDE]
    stale_art = [
        s for s in songs
        if s["id"] in known and s["image_url"] and state.get(s["id"]) != s["image_url"]
    ]

    if not new_songs and not stale_art:
        print("in sync — no new tracks, artwork current")
        return
    if new_songs:
        print(f"{len(new_songs)} new track(s): " + ", ".join(s["title"] for s in new_songs))
    if stale_art:
        print(f"refreshing artwork for {len(stale_art)} track(s): "
              + ", ".join(s["title"] for s in stale_art))
    if DRY_RUN:
        return

    changed_assets = []
    for s in stale_art:
        rel = known[s["id"]]["art"]
        download_art(s["image_url"], rel, s["title"])
        changed_assets.append(rel)
        state[s["id"]] = s["image_url"]

    added = []
    for s in new_songs:
        rel = f"assets/{slugify(s['title'])}.webp"
        if s["image_url"]:
            download_art(s["image_url"], rel, s["title"])
            state[s["id"]] = s["image_url"]
            changed_assets.append(rel)
        else:
            rel = "assets/avatar.webp"
        added.append({"id": s["id"], "title": s["title"], "genre": genre_from_tags(s["tags"]), "art": rel})
    tracks[1:1] = added  # right after the featured entry, feed order (newest first)

    CATALOG.write_text(json.dumps(data, indent=1, ensure_ascii=False) + "\n")
    STATE_PATH.write_text(json.dumps(state, indent=2) + "\n")
    subprocess.run([node(), "build.mjs"], cwd=ROOT, check=True)

    parts = []
    if new_songs:
        parts.append("add " + ", ".join(s["title"] for s in new_songs))
    if stale_art:
        parts.append(f"refresh art x{len(stale_art)}")
    msg = "Sync from Suno: " + "; ".join(parts)

    touched = ["content/records.json", "sync-state.json", "index.html", "records",
               "sitemap.xml", "llms.txt"] + changed_assets
    subprocess.run(["git", "-C", str(ROOT), "add", "--"] + touched, check=True)
    if subprocess.run(["git", "-C", str(ROOT), "diff", "--cached", "--quiet"]).returncode == 0:
        print("nothing actually changed after regeneration")
        return
    subprocess.run(["git", "-C", str(ROOT), "commit", "-m", msg], check=True)
    print(f"committed: {msg}")
    if PUSH:
        subprocess.run(["git", "-C", str(ROOT), "pull", "--rebase", "--autostash"], check=True)
        subprocess.run(["git", "-C", str(ROOT), "push"], check=True)
        print("pushed — Vercel will deploy")


if __name__ == "__main__":
    main()
