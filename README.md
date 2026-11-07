# CHEMTRAILS

**Chemtrails is a retro-futuristic synth-rock project exploring the strange space between memory, technology, desire, and the unknown.**

Imagine a forgotten television broadcast from 1978 that somehow survived into the future: analog synthesizers humming beneath shimmering guitars, four-on-the-floor rhythms drifting through atmospheric haze, cinematic strings rising from the static, and voices that sound like they're transmitting from somewhere just beyond the edge of reality.

Chemtrails blends **dreamy synth rock, cosmic disco, psychedelic pop, and vintage science fiction** into songs that feel simultaneously nostalgic and otherworldly. The sound draws from the analog warmth of the 1970s and 1980s while looking toward a future that never quite arrived.

At the center of Chemtrails is a fascination with the mysterious: **strange signals in the night, forgotten places, alien transmissions, doomed romances, coastal fog, secret histories, parallel realities, and the possibility that the universe might be trying to tell us something.**

Every song is a little transmission.

Every record is a fragment of a larger story.

**Chemtrails isn't trying to recreate the past. It's imagining the future that the past thought it was going to become.**

---

## The site

Static site on Vercel at [chemtrails-music.com](https://www.chemtrails-music.com/). Redesigned 2026-11-01: a title-sequence look (Techniscope letterbox bars, 1960s-70s Italian space-age colour, spaghetti-western dusk, layered parallax). **Audio plays from SoundCloud**: six records, each a SoundCloud set, driven by a custom player over SoundCloud's Widget API. The Suno songs (62) are a Singles shelf played from the SoundCloud set `loose-transmissions` (Suno's audio CDN went private); `singles.tracks` must stay in the set's order, because card k plays set track k.

- `content/records.json` is the content: six records (title, colour, SoundCloud set URL, track list, liner notes) and the singles. Edit it, then `node build.mjs`
- `build.mjs` generates `index.html`, `records/<slug>/index.html`, `videos/<slug>/index.html`, `sitemap.xml` and `llms.txt`. Never hand-edit those
- `style.css` and `site.js` are hand-written (parallax, player, analytics, PayPal)
- Full catalog: [soundcloud.com/chemtrails](https://soundcloud.com/chemtrails) and [suno.com/@gamecat2300](https://suno.com/@gamecat2300)

## Adding a record

Add an entry to `records` in `content/records.json` (slug, title, `sc` set URL, `tracks` as `[title, "/chemtrails/<track-slug>"]` in set order, a `wash` colour), put its cover through `cwebp` as `assets/records/<slug>.webp` (1200px), `<slug>-thumb.webp` (480px) and `<slug>-wash.webp` (48px), run `node build.mjs`, push. Rules the site depends on: a song lives in exactly one record (the 7 repeats were removed 2026-11-03), and the site's order is the SoundCloud set's order, so **editing a SoundCloud playlist shifts the live site's rows until the matching `records.json` is pushed**; do the playlist edit and the push together. Every single in `singles.tracks` needs `sc` (its `/chemtrails/<slug>` path) for its share button. The singles section comes first on the home page; every track has a share button (the phone's share sheet where there is one, otherwise it copies the SoundCloud link).

## Syncing Suno singles

```bash
python3 sync.py --push
```

Adds public Suno songs missing from `singles` in `records.json`, refreshes changed cover art, runs the build, commits, and pushes. Runs every 6 hours via launchd (`com.hailie.chemtrails-sync.plist`, logs to `~/Library/Logs/chemtrails-sync.log`). **Paused 2026-11-01 by a `.paused` file** in this folder (the job exits at once while it exists; delete it to resume). The singles now play from a SoundCloud set (`singles.sc`), so keep the sync paused: it would append songs that are not in the set and break the card-to-track mapping, and its `-resize 640 640` squashes non-square Suno art.
