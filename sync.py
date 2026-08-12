#!/usr/bin/env python3
"""Sync the site's track list with the Suno profile (suno.com/@gamecat2300).

Scrapes the profile page's embedded "Songs" feed and adds any track NEWER
than the newest track already on the site. Existing entries are never edited
or removed, so manual curation (custom titles, genres, art, excluded older
tracks) survives every run. Updates:

  - player.js   TRACKS array (new entries prepended after the Featured track)
  - index.html  JSON-LD MusicRecording ItemList
  - llms.txt    "Featured tracks" line
  - sitemap.xml <lastmod>
  - assets/     cover art, downloaded and converted to 640px webp (cwebp)

Usage:
  python3 sync.py            # sync + git commit if anything changed
  python3 sync.py --dry-run  # show what would change, touch nothing
  python3 sync.py --push     # sync + commit + git push (deploys via Vercel)

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
    """Return the profile's Songs feed, newest first."""
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
    chunks = re.split(r'"content_id":"', arr)[1:]
    for chunk in chunks:
        sid = chunk[:36]
        if not re.fullmatch(r"[0-9a-f-]{36}", sid):
            continue
        title = re.search(r'"title":"(.*?)","play_count"', chunk)
        created = re.search(r'"created_at":"(.*?)"', chunk)
        img = re.search(r'"image_large_url":"(https://[^"]+)"', chunk)
        tags = re.search(r'"tags":"(.*?)","prompt"', chunk)
        if not (title and created):
            continue
        songs.append({
            "id": sid,
            "title": unescape_title(title.group(1)),
            "created_at": created.group(1),
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


def download_art(song, slug):
    dest = ROOT / "assets" / f"{slug}.webp"
    if dest.exists():
        return f"assets/{slug}.webp"
    if not song["image_url"]:
        return "assets/avatar.webp"
    tmp = ROOT / "assets" / f".{slug}.tmp.jpeg"
    r = subprocess.run(
        ["curl", "-s", "--max-time", "30", "-A", USER_AGENT,
         song["image_url"], "-o", str(tmp)],
        capture_output=True,
    )
    if r.returncode != 0 or not tmp.exists() or tmp.stat().st_size < 1000:
        tmp.unlink(missing_ok=True)
        die(f"failed to download art for {song['title']}")
    r = subprocess.run(
        [CWEBP, "-quiet", "-q", "82", "-resize", "640", "640",
         str(tmp), "-o", str(dest)],
        capture_output=True,
    )
    tmp.unlink(missing_ok=True)
    if r.returncode != 0 or not dest.exists():
        die(f"cwebp failed for {song['title']}: {r.stderr.decode()[:200]}")
    return f"assets/{slug}.webp"


def main():
    player_path = ROOT / "player.js"
    index_path = ROOT / "index.html"
    llms_path = ROOT / "llms.txt"
    sitemap_path = ROOT / "sitemap.xml"

    player_src = player_path.read_text()
    existing = parse_tracks(player_src)
    known_ids = {sid for sid, _ in existing}

    songs = parse_songs_feed(fetch_profile())
    by_id = {s["id"]: s for s in songs}

    known_dates = [by_id[sid]["created_at"] for sid in known_ids if sid in by_id]
    if not known_dates:
        die("none of the site's tracks appear in the Suno Songs feed — refusing to guess")
    cutoff = max(known_dates)

    new_songs = [
        s for s in songs
        if s["id"] not in known_ids and s["id"] not in EXCLUDE
        and s["created_at"] > cutoff
    ]
    skipped_old = [
        s for s in songs
        if s["id"] not in known_ids and s["id"] not in EXCLUDE
        and s["created_at"] <= cutoff
    ]

    if skipped_old:
        names = ", ".join(s["title"] for s in skipped_old)
        print(f"leaving off {len(skipped_old)} pre-existing uncurated track(s): {names}")
    if not new_songs:
        print("in sync — no new tracks on Suno")
        return
    print(f"{len(new_songs)} new track(s): " + ", ".join(s["title"] for s in new_songs))
    if DRY_RUN:
        return

    # oldest-first so each prepend keeps newest at the top
    new_lines = []
    for s in new_songs:
        slug = slugify(s["title"])
        art = download_art(s, slug)
        genre = genre_from_tags(s["tags"])
        entry = ("{ id: %s, title: %s, genre: %s, art: %s },") % (
            json.dumps(s["id"]), json.dumps(s["title"]),
            json.dumps(genre), json.dumps(art),
        )
        new_lines.append((s["id"], entry))

    # final order: Featured entry first, then new (newest first), then the rest
    featured = [e for e in existing if '"Featured"' in e[1]][:1]
    rest = [e for e in existing if e not in featured]
    final = featured + new_lines + rest

    body = "\n".join(f"  {line}" for _, line in final)
    player_src = re.sub(
        r"const TRACKS = \[\n.*?\n\];",
        f"const TRACKS = [\n{body}\n];",
        player_src, count=1, flags=re.S,
    )
    player_path.write_text(player_src)

    # titles for JSON-LD / llms.txt come from the regenerated entries
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

    names = ", ".join(s["title"] for s in new_songs)
    subprocess.run(["git", "-C", str(ROOT), "add", "-A"], check=True)
    subprocess.run(
        ["git", "-C", str(ROOT), "commit", "-m",
         f"Sync from Suno: add {names}"],
        check=True,
    )
    print(f"committed: {names}")
    if PUSH:
        subprocess.run(["git", "-C", str(ROOT), "push"], check=True)
        print("pushed — Vercel will deploy")


if __name__ == "__main__":
    main()
