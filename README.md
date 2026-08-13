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

Static one-pager, deployed on Vercel at [chemtrails.vercel.app](https://chemtrails.vercel.app/).

- `index.html` / `style.css` / `player.js` — no build step
- Custom audio player streaming tracks from the Suno CDN
- Full catalog: [suno.com/@gamecat2300](https://suno.com/@gamecat2300)

## Syncing new tracks from Suno

```bash
python3 sync.py --push
```

Scrapes the Suno profile's public Songs feed and adds every track not already
on the site, and re-downloads cover art whenever it changes on Suno
(tracked in `sync-state.json`). Regenerates `player.js`, the JSON-LD in
`index.html`, `llms.txt`, and `sitemap.xml`, then commits and pushes (Vercel
deploys automatically). Existing entries are never edited, so manual titles
and genres survive. `--dry-run` previews; block a song forever via `EXCLUDE`
in `sync.py`.

Runs automatically every 6 hours via launchd
(`com.hailie.chemtrails-sync.plist`, installed in `~/Library/LaunchAgents/`,
logs to `~/Library/Logs/chemtrails-sync.log`). Reinstall after editing:

```bash
cp com.hailie.chemtrails-sync.plist ~/Library/LaunchAgents/ && launchctl bootout gui/501/com.hailie.chemtrails-sync; launchctl bootstrap gui/501 ~/Library/LaunchAgents/com.hailie.chemtrails-sync.plist
```

Note: the profile only exposes the 20 newest public songs to anonymous
visitors — tracks made public later are picked up on future syncs, and
nothing is ever removed from the site.
