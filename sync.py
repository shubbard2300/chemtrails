#!/usr/bin/env python3
"""Sync the site's track list and artwork with the Suno profile.

Scrapes the profile page's embedded "Songs" feed (suno.com/@gamecat2300 —
everything Suno exposes publicly, currently the 20 newest) and:

  - adds every public track not already on the site
  - refreshes cover art for existing tracks when it changed on Suno
    (source image URLs are remembered in sync-state.json)

Existing track entries are never edited or removed, so manual curation
(custom titles, genres, art filenames) survives every run. Regenerates:

  - player.js   TRACKS array
  - index.html  JSON-LD MusicRecording ItemList
  - llms.txt    "Featured tracks" line
  - sitemap.xml <lastmod>
  - assets/     cover art, 640px webp via cwebp

Usage:
  python3 sync.py            # sync + git commit if anything changed
  python3 sync.py --dry-run  # show what would change, touch nothing
  python3 sync.py --push     # sync + commit + git push (Vercel deploys)

To keep a song off the site permanently, add its id to EXCLUDE below.
"""

import datetime
import json
import re
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
    s = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")
    return s or "track"


def parse_tracks(player_src):
    """Existing TRACKS entries as (id, verbatim_line) pairs, in order."""
    m = re.search(r"const TRACKS = \[\n(.*?)\n\];", player_src, re.S)
    if not m:
        die("player.js: could not locate TRACKS array")
    entries = []
    for line in m.group(1).split("\n"):
        idm = re.search(r'id:\s*"([0-9a-f-]{36})"', line)
        if idm:
            entries.append((idm.group(1), line.rstrip(",").strip().rstrip(",") + ","))
    return entries


def art_path_of(line):
    m = re.search(r'art:\s*"([^"]+)"', line)
    return m.group(1) if m else None


def download_art(image_url, rel_path, label):
    """Download + convert cover art, overwriting rel_path. True on success."""
    dest = ROOT / rel_path
    tmp = ROOT / "assets" / ".art.tmp.jpeg"
    r = subprocess.run(
        ["curl", "-s", "--max-time", "30", "-A", USER_AGENT,
         image_url, "-o", str(tmp)],
        capture_output=True,
    )
    if r.returncode != 0 or not tmp.exists() or tmp.stat().st_size < 1000:
        tmp.unlink(missing_ok=True)
        die(f"failed to download art for {label}")
    r = subprocess.run(
        [CWEBP, "-quiet", "-q", "82", "-resize", "640", "640",
         str(tmp), "-o", str(dest)],
        capture_output=True,
    )
    tmp.unlink(missing_ok=True)
    if r.returncode != 0 or not dest.exists():
        die(f"cwebp failed for {label}: {r.stderr.decode()[:200]}")


def main():
    player_path = ROOT / "player.js"
    index_path = ROOT / "index.html"
    llms_path = ROOT / "llms.txt"
    sitemap_path = ROOT / "sitemap.xml"

    player_src = player_path.read_text()
    existing = parse_tracks(player_src)
    known = dict(existing)

    songs = parse_songs_feed(fetch_profile())
    state = json.loads(STATE_PATH.read_text()) if STATE_PATH.exists() else {}

    new_songs = [s for s in songs if s["id"] not in known and s["id"] not in EXCLUDE]
    stale_art = [
        s for s in songs
        if s["id"] in known and s["image_url"]
        and state.get(s["id"]) != s["image_url"]
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
        rel = art_path_of(known[s["id"]])
        if rel:
            download_art(s["image_url"], rel, s["title"])
            changed_assets.append(rel)
        state[s["id"]] = s["image_url"]

    new_lines = {}
    for s in new_songs:
        rel = f"assets/{slugify(s['title'])}.webp"
        if s["image_url"]:
            download_art(s["image_url"], rel, s["title"])
            state[s["id"]] = s["image_url"]
            changed_assets.append(rel)
        else:
            rel = "assets/avatar.webp"
        new_lines[s["id"]] = ('{ id: %s, title: %s, genre: %s, art: %s },') % (
            json.dumps(s["id"]), json.dumps(s["title"]),
            json.dumps(genre_from_tags(s["tags"])), json.dumps(rel),
        )

    # final order: Featured entry first, then feed order (newest first),
    # then site tracks no longer in the public feed
    featured = [e for e in existing if '"Featured"' in e[1]][:1]
    featured_ids = {sid for sid, _ in featured}
    feed_part = [
        (s["id"], new_lines.get(s["id"], known.get(s["id"])))
        for s in songs
        if s["id"] not in featured_ids and (s["id"] in known or s["id"] in new_lines)
    ]
    feed_ids = {sid for sid, _ in feed_part}
    leftovers = [
        e for e in existing if e[0] not in feed_ids and e[0] not in featured_ids
    ]
    final = featured + feed_part + leftovers

    body = "\n".join(f"  {line}" for _, line in final)
    player_src = re.sub(
        r"const TRACKS = \[\n.*?\n\];",
        f"const TRACKS = [\n{body}\n];",
        player_src, count=1, flags=re.S,
    )
    player_path.write_text(player_src)

    titles = []
    for sid, line in final:
        tm = re.search(r'title:\s*("(?:[^"\\]|\\.)*")', line)
        titles.append((sid, json.loads(tm.group(1))))

    items = ",\n".join(
        '        { "@type": "MusicRecording", "position": %d, "name": %s, '
        '"url": "https://suno.com/song/%s", '
        '"byArtist": { "@type": "MusicGroup", "name": "Chemtrails" } }'
        % (i + 1, json.dumps(title), sid)
        for i, (sid, title) in enumerate(titles)
    )
    index_src = index_path.read_text()
    index_src, n = re.subn(
        r'("itemListElement": \[\n).*?(\n      \])',
        lambda m: m.group(1) + items + m.group(2),
        index_src, count=1, flags=re.S,
    )
    if n != 1:
        die("index.html: could not locate itemListElement block")
    index_path.write_text(index_src)

    llms_src = llms_path.read_text()
    track_line = "- Featured tracks (streamable on the site): " + ", ".join(
        t for _, t in titles
    )
    llms_src, n = re.subn(
        r"^- Featured tracks \(streamable on the site\):.*$",
        track_line, llms_src, count=1, flags=re.M,
    )
    if n != 1:
        die("llms.txt: could not locate Featured tracks line")
    llms_path.write_text(llms_src)

    today = datetime.date.today().isoformat()
    sitemap_path.write_text(
        re.sub(r"<lastmod>.*?</lastmod>", f"<lastmod>{today}</lastmod>",
               sitemap_path.read_text())
    )
    STATE_PATH.write_text(json.dumps(state, indent=2) + "\n")

    parts = []
    if new_songs:
        parts.append("add " + ", ".join(s["title"] for s in new_songs))
    if stale_art:
        parts.append(f"refresh art x{len(stale_art)}")
    msg = "Sync from Suno: " + "; ".join(parts)

    touched = ["player.js", "index.html", "llms.txt", "sitemap.xml",
               "sync-state.json"] + changed_assets
    subprocess.run(["git", "-C", str(ROOT), "add", "--"] + touched, check=True)
    r = subprocess.run(
        ["git", "-C", str(ROOT), "diff", "--cached", "--quiet"], cwd=ROOT
    )
    if r.returncode == 0:
        print("nothing actually changed after regeneration")
        return
    subprocess.run(["git", "-C", str(ROOT), "commit", "-m", msg], check=True)
    print(f"committed: {msg}")
    if PUSH:
        subprocess.run(
            ["git", "-C", str(ROOT), "pull", "--rebase", "--autostash"],
            check=True,
        )
        subprocess.run(["git", "-C", str(ROOT), "push"], check=True)
        print("pushed — Vercel will deploy")


if __name__ == "__main__":
    main()
