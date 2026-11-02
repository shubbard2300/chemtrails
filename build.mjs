#!/usr/bin/env node
// Generates index.html, records/<slug>/index.html, sitemap.xml and llms.txt
// from content/records.json. Zero dependencies: `node build.mjs`.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const SITE = "https://www.chemtrails-music.com";
const SC_USER = "https://soundcloud.com/chemtrails";
const SUNO = "https://suno.com/@gamecat2300";
const SHOP = "https://chemtrails-music.myspreadshop.com/";
const GA = "G-CT6DLJGNE0";
const { records, singles } = JSON.parse(readFileSync(join(ROOT, "content/records.json"), "utf8"));

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const hash = (f) => createHash("md5").update(readFileSync(join(ROOT, f))).digest("hex").slice(0, 8);
const V = { css: hash("style.css"), js: hash("site.js") };
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];
const today = new Date().toISOString().slice(0, 10);
const scTrack = (p) => `https://soundcloud.com${p}`;
const total = records.reduce((n, r) => n + r.tracks.length, 0);

// First paragraph, cut at a sentence end inside ~260 chars (always at least one sentence).
function blurb(desc) {
  const para = (desc.split(/\n\s*\n/)[0] || "").replace(/\s*\n\s*/g, " ").trim();
  const sentences = para.match(/.+?[.!?]["”’]?(?=\s+[A-Z“"]|$)/gs) || [para];
  let out = sentences[0];
  for (const s of sentences.slice(1)) {
    if ((out + " " + s).length > 260) break;
    out += " " + s;
  }
  return out.trim();
}

const meta = (r) => [r.year, r.genre, `${r.tracks.length} tracks`, r.total].filter(Boolean).join(" · ");

function recPanel(r, i, page = false) {
  const flip = i % 2 ? " rec--flip" : "";
  const rows = r.tracks
    .map(([t], k) => `<li><button type="button" data-i="${k}"><span class="n">${String(k + 1).padStart(2, "0")}</span><span class="t">${esc(t)}</span><span class="d"></span></button></li>`)
    .join("");
  const notes = page
    ? r.desc.split(/\n\s*\n/).map((p) => `<p>${esc(p.replace(/\s*\n\s*/g, " "))}</p>`).join("")
    : blurb(r.desc) && `<p>${esc(blurb(r.desc))}</p>`;
  const title = page ? `<h1 class="rec-title">${esc(r.title)}</h1>` : `<h3 class="rec-title"><a href="/records/${r.slug}/">${esc(r.title)}</a></h3>`;
  return `
<article class="rec${flip}${page ? " rec--page" : ""}" id="${r.slug}" data-rec="${r.slug}" data-sc="${esc(r.sc)}" data-title="${esc(r.title)}" data-art="/assets/records/${r.slug}-thumb.webp" style="--wash:${r.wash}">
  <div class="rec-bg" style="background-image:url(/assets/records/${r.slug}-wash.webp)" aria-hidden="true"></div>
  <div class="rec-ghost" aria-hidden="true">${esc(r.title)}</div>
  <div class="rec-inner">
    <div class="rec-poster">
      <img src="/assets/records/${r.slug}-thumb.webp" srcset="/assets/records/${r.slug}-thumb.webp 480w, /assets/records/${r.slug}.webp 1200w" sizes="(max-width: 900px) 80vw, 440px" width="480" height="480" alt="${esc(r.title)} cover art"${page ? ' fetchpriority="high"' : i > 0 ? ' loading="lazy"' : ""} decoding="async">
      <span class="rec-no">No.&nbsp;${ROMAN[i]}</span>
    </div>
    <div class="rec-body">
      <p class="rec-meta">${esc(meta(r))}</p>
      ${title}
      ${r.by ? `<p class="rec-by">${esc(r.by)}</p>` : ""}
      <div class="rec-notes">${notes || ""}</div>
      <div class="rec-actions">
        <button type="button" class="btn btn-solid" data-play-rec>▶&nbsp;&nbsp;Play record</button>
        ${page ? "" : `<a class="btn btn-line" href="/records/${r.slug}/">Liner notes</a>`}
        <a class="btn-link" href="${esc(r.sc)}" target="_blank" rel="noopener" data-ev="soundcloud_click">SoundCloud ↗</a>
      </div>
      <ol class="tracks">${rows}</ol>
    </div>
  </div>
</article>`;
}

const singleCards = singles.tracks
  .map((t, k) => {
    const img = `<img src="/${t.art}?v=${hash(t.art)}" alt="" width="320" height="320" loading="lazy" decoding="async">`;
    const label = `<span class="s-title">${esc(t.title)}</span>${t.genre ? `<span class="s-genre">${esc(t.genre)}</span>` : ""}`;
    return singles.sc
      ? `<button type="button" class="single" data-i="${k}">${img}${label}</button>`
      : `<a class="single" href="https://suno.com/song/${t.id}" target="_blank" rel="noopener" data-ev="suno_click">${img}${label}<span class="s-go">Listen on Suno ↗</span></a>`;
  })
  .join("");

const SCENE = `
<div class="scene" aria-hidden="true">
  <div class="layer l-sky" style="--d:.7"></div>
  <div class="layer l-sun" style="--d:.55;--px:6"><i class="rays"></i><i class="disc"></i></div>
  <svg class="layer l-trail" style="--d:.45;--px:10" viewBox="0 0 1600 600" preserveAspectRatio="xMidYMid slice">
    <defs><linearGradient id="tr" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#efe3cc" stop-opacity="0"/><stop offset=".65" stop-color="#efe3cc" stop-opacity=".85"/><stop offset="1" stop-color="#fff"/></linearGradient></defs>
    <g class="trails" stroke="url(#tr)" stroke-width="3" stroke-linecap="round" fill="none">
      <path pathLength="1" d="M-40 560 L1180 120"/><path pathLength="1" d="M-40 610 L1270 160"/><path pathLength="1" stroke-width="2" d="M240 610 L1030 250"/>
    </g>
  </svg>
  <svg class="layer l-m3" style="--d:.38;--px:14" viewBox="0 0 1600 500" preserveAspectRatio="xMidYMax slice"><path fill="#8a3a22" d="M0 500V330h90l20-30h150l25 35h135l20-45h160l30 50h130l30-25h190l30 30h140l25-65h155l30 50h120l20-25h100v195z"/></svg>
  <i class="layer l-haze" style="--d:.3"></i>
  <svg class="layer l-m2" style="--d:.24;--px:20" viewBox="0 0 1600 500" preserveAspectRatio="xMidYMax slice"><path fill="#4a1f14" d="M0 500V400h140l30-40h160l30 50h160l20-30h160l30 40h170l30-55h190l30 50h150l25-30h135l30 40h110v140z"/></svg>
  <svg class="layer l-m1" style="--d:.1;--px:30" viewBox="0 0 1600 500" preserveAspectRatio="xMidYMax slice">
    <g fill="none" stroke="#1b0d09" stroke-linecap="round">
      <path stroke-width="2" d="M-60 330Q90 372 240 322Q440 372 640 322Q840 372 1040 322Q1240 372 1440 322Q1540 350 1660 330"/>
      <g stroke-width="7"><path d="M240 322V470M640 322V470M1040 322V470M1440 322V470"/></g>
      <g stroke-width="5"><path d="M222 332H258M622 332H658M1022 332H1058M1422 332H1458"/></g>
      <g stroke-width="15"><path d="M930 480V352M930 428H900V392M930 408H962V376"/></g>
    </g>
    <path fill="#1b0d09" d="M0 500V458C200 440 400 472 640 456C900 440 1150 472 1380 452C1480 446 1560 456 1600 452V500z"/>
  </svg>
</div>`;

function layout({ title, description, path, jsonld, body, home = false }) {
  const url = SITE + path;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <link rel="canonical" href="${url}">
  <meta property="og:site_name" content="Chemtrails">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:image" content="${SITE}/assets/og-image.jpeg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:url" content="${url}">
  <meta property="og:type" content="${home ? "website" : "music.album"}">
  <meta property="og:locale" content="en_US">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(title)}">
  <meta name="twitter:description" content="${esc(description)}">
  <meta name="twitter:image" content="${SITE}/assets/og-image.jpeg">
  <meta name="theme-color" content="#0d0907">
  <script type="application/ld+json">${JSON.stringify(jsonld)}</script>
  <script async src="https://www.googletagmanager.com/gtag/js?id=${GA}"></script>
  <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${GA}');</script>
  <link rel="icon" href="/assets/favicon.png" type="image/png">
  <link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Anton&family=Space+Grotesk:wght@400;500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/style.css?v=${V.css}">
</head>
<body${home ? ' class="home"' : ""}>
  <div class="grain" aria-hidden="true"></div>
  <nav class="nav">
    <a href="/" class="nav-logo">CHEMTRAILS</a>
    <div class="nav-links">
      <a href="/#records">Records</a>
      <a href="/#singles">Singles</a>
      <a href="/#signal">The Signal</a>
      <a href="/#about">About</a>
      <a href="${SC_USER}" target="_blank" rel="noopener">SoundCloud ↗</a>
    </div>
  </nav>
${body}
  <footer class="footer">
    <span>© 2026 Chemtrails</span>
    <div class="footer-links">
      <a href="${SC_USER}" target="_blank" rel="noopener">SoundCloud</a>
      <a href="${SUNO}" target="_blank" rel="noopener">Suno</a>
      <a href="${SHOP}?utm_source=chemtrails-music.com&utm_medium=footer&utm_campaign=merch" target="_blank" rel="noopener">Shop</a>
    </div>
  </footer>
  <div class="player" id="player" hidden>
    <img class="player-art" id="p-art" src="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==" alt="" width="52" height="52">
    <div class="player-meta"><span class="player-title" id="p-title"></span><span class="player-rec" id="p-rec"></span></div>
    <div class="player-controls">
      <button type="button" id="p-prev" aria-label="Previous track">⏮</button>
      <button type="button" id="p-play" class="player-play" aria-label="Play or pause">▶</button>
      <button type="button" id="p-next" aria-label="Next track">⏭</button>
    </div>
    <div class="player-progress">
      <span class="time" id="p-now">0:00</span>
      <div class="rail" id="p-rail"><div class="rail-fill" id="p-fill"></div></div>
      <span class="time" id="p-total">–:––</span>
    </div>
    <a class="player-sc" id="p-sc" href="${SC_USER}" target="_blank" rel="noopener">SoundCloud ↗</a>
  </div>
  <div id="sc-host" aria-hidden="true"></div>
  <script src="/site.js?v=${V.js}" defer></script>
</body>
</html>
`;
}

const artist = { "@type": "MusicGroup", name: "Chemtrails", url: SITE + "/" };
const albumLd = (r) => ({
  "@type": "MusicAlbum",
  name: r.title,
  url: `${SITE}/records/${r.slug}/`,
  image: `${SITE}/assets/records/${r.slug}.webp`,
  byArtist: artist,
  numTracks: r.tracks.length,
  genre: r.genre,
  ...(r.year && { datePublished: r.year }),
  sameAs: r.sc,
  track: { "@type": "ItemList", itemListElement: r.tracks.map(([name, p], k) => ({ "@type": "MusicRecording", position: k + 1, name, url: scTrack(p), byArtist: artist })) },
});

// ---------- home ----------
const homeBody = `
  <header class="hero" id="top">
${SCENE}
    <div class="hero-copy" style="--d:-.12">
      <p class="hero-kicker">Portland, Oregon · Synth-rock</p>
      <h1 class="hero-title"><span>Chem</span><span>trails</span></h1>
      <div class="hero-row">
        <p class="hero-line">Imagining the future that the past thought it was going to become.</p>
        <div class="hero-actions">
          <button type="button" class="btn btn-solid" id="hero-play" data-rec-target="${records[0].slug}">▶&nbsp;&nbsp;Play ${esc(records[0].title)}</button>
          <a class="btn btn-line" href="#records">The records</a>
        </div>
      </div>
    </div>
    <div class="hero-foot" aria-hidden="true"><span>${records.length} records · ${total} tracks</span><span>Scroll ↓</span></div>
  </header>
  <main>
    <section class="records" id="records">
      <div class="sec-head">
        <p class="kicker">The records</p>
        <h2>${records.length} records.<br>Played straight from SoundCloud.</h2>
      </div>
${records.map((r, i) => recPanel(r, i)).join("\n")}
    </section>

    <section class="section singles" id="singles"${singles.sc ? ` data-rec="singles" data-sc="${esc(singles.sc)}" data-title="Singles" data-art="/assets/orbitz.webp?v=${hash("assets/orbitz.webp")}"` : ""}>
      <div class="sec-head">
        <p class="kicker">Singles</p>
        <h2>Loose transmissions</h2>
        <p class="sec-sub">${singles.tracks.length} songs made with Suno. ${singles.sc ? "Streaming from SoundCloud." : "They play on Suno for now and are moving to SoundCloud."}</p>
      </div>
      <div class="single-grid">${singleCards}</div>
      <button type="button" class="btn btn-line singles-more" data-more hidden>Show all ${singles.tracks.length} songs</button>
    </section>

    <section class="section" id="merch">
      <a class="merch-cta" href="${SHOP}?utm_source=chemtrails-music.com&utm_medium=merch-cta&utm_campaign=merch" target="_blank" rel="noopener">
        <div class="merch-thumbs" aria-hidden="true">
          <img src="/assets/merch/ct-hoodie.webp" alt="" loading="lazy" decoding="async" width="160" height="160">
          <img src="/assets/merch/owls-tee.webp" alt="" loading="lazy" decoding="async" width="160" height="160">
          <img src="/assets/merch/ct-mug.webp" alt="" loading="lazy" decoding="async" width="160" height="160">
        </div>
        <div class="merch-cta-copy">
          <span class="kicker">Official Chemtrails merch</span>
          <h2>Wearable transmissions</h2>
          <p>Hoodies, tees, mugs, and stickers from the Chemtrails universe, printed on demand and shipped worldwide. Every order goes straight into recording time and keeping the gear alive.</p>
        </div>
        <span class="btn btn-solid merch-cta-btn">Visit the shop&nbsp;↗</span>
      </a>
    </section>

    <section class="signal" id="signal">
      <div class="signal-inner">
        <p class="kicker">The Signal</p>
        <p class="signal-big">Every song is a little transmission.<br>Every record is a fragment of a larger story.</p>
        <p>Imagine a forgotten television broadcast from 1978 that somehow survived into the future: analog synthesizers humming beneath shimmering guitars, four-on-the-floor rhythms drifting through atmospheric haze, cinematic strings rising from the static, and voices that sound like they're transmitting from somewhere just beyond the edge of reality.</p>
        <p>Chemtrails blends <em>dreamy synth rock, cosmic disco, psychedelic pop, and vintage science fiction</em> into songs that feel simultaneously nostalgic and otherworldly: the analog warmth of the 1970s and 1980s, looking toward a future that never quite arrived.</p>
        <p>At the center is a fascination with the mysterious: strange signals in the night, forgotten places, alien transmissions, doomed romances, coastal fog, secret histories, parallel realities, and the possibility that the universe might be trying to tell us something.</p>
        <p class="signal-thesis">Chemtrails isn't trying to recreate the past. It's imagining the future that the past thought it was going to become.</p>
      </div>
    </section>

    <section class="support" id="support">
      <div class="support-card">
        <div class="onair"><span class="onair-lamp" aria-hidden="true"></span>On Air · Listener-Powered</div>
        <h2>Fuel the Transmissions</h2>
        <p class="support-copy">Chemtrails is a solo project: one person, a guitar, a keyboard, and a lot of Pacific Northwest weather. No label, no distributor cut, no ad revenue. If something here stuck with you, the tip jar is below. It goes to recording time, gear that hasn't died yet, and getting the next record out.</p>
        <div class="support-tiers">
          <a class="tier" href="https://www.paypal.com/ncp/payment/W5HUHU7FYFXY8" target="_blank" rel="noopener" data-tier="5"><span class="tier-amt">$5</span><span class="tier-desc">Late-night studio coffee. The 3&nbsp;a.m. mixes don't mix themselves.</span><span class="tier-cta">Send it ↗</span></a>
          <a class="tier" href="https://www.paypal.com/ncp/payment/W5HUHU7FYFXY8" target="_blank" rel="noopener" data-tier="15"><span class="tier-amt">$15</span><span class="tier-desc">A month of antenna maintenance. Keeps the signal clear through the fog.</span><span class="tier-cta">Send it ↗</span></a>
          <a class="tier" href="https://www.paypal.com/ncp/payment/W5HUHU7FYFXY8" target="_blank" rel="noopener" data-tier="50"><span class="tier-amt">$50</span><span class="tier-desc">Classified. We could tell you, but then the transmission would find <em>you</em>.</span><span class="tier-cta">Send it ↗</span></a>
        </div>
        <div id="paypal-container-W5HUHU7FYFXY8" class="paypal-slot"></div>
        <p class="support-fine">Not into PayPal? Streaming still helps, and so does telling one person about it. The transmissions continue either way. But the fog machine isn't free.</p>
      </div>
    </section>

    <section class="section about" id="about">
      <div class="about-grid">
        <div class="about-photo"><img src="/assets/avatar.webp" alt="Chemtrails" loading="lazy" decoding="async" width="640" height="640"></div>
        <div class="about-text">
          <p class="kicker">About</p>
          <p>A West Coast musician and producer who records as Chemtrails: a solo project built on ambient texture, cinematic atmosphere, and the gray weight of Pacific Northwest fog.</p>
          <p>Born on the Oregon coast, he picked up a trumpet at six and never really stopped chasing sound. His instincts formed early, shaped by the records that filled the rooms of his childhood, deepened by the rave and DJ culture of Portland and San Francisco, and refined across decades of band work, studio obsession, and an unrelenting appetite for what sound can do to a room.</p>
          <p>He's moved through bands, genres, and roles (guitarist, then keyboardist and producer with Venus In Spurs, into the experimental rock terrain of Terra Firma), each chapter pushing further into the territory where performance bleeds into atmosphere.</p>
          <p>As Chemtrails, the solo work resists easy classification: layered soundscapes built from keyboards, guitar, and ambient texture that feel less like songs and more like locations. Equal parts Pacific Northwest gloom, late-night studio instinct, and something faintly unsettling, like a place you've been but can't quite place.</p>
          <p class="about-sig">Cinematic without the pretension. Ambient without the distance.</p>
        </div>
      </div>
    </section>
  </main>`;

const home = layout({
  title: "CHEMTRAILS — Retro-Futuristic Synth-Rock from Portland, Oregon",
  description: "Retro-futuristic synth-rock from Portland, Oregon. Stream six records, including Companion Weather, Spanish For Night Owls and AM Radio.",
  path: "/",
  home: true,
  body: homeBody,
  jsonld: {
    "@context": "https://schema.org",
    ...artist,
    image: `${SITE}/assets/avatar.jpeg`,
    logo: `${SITE}/assets/avatar.jpeg`,
    description: "A retro-futuristic synth-rock project exploring the strange space between memory, technology, desire, and the unknown. Dreamy synth rock, cosmic disco, psychedelic pop, and vintage science fiction from the Pacific Northwest.",
    genre: ["Synth-Rock", "Ambient", "Cosmic Disco", "Psychedelic Pop"],
    foundingLocation: { "@type": "Place", name: "Portland, Oregon, United States" },
    sameAs: [SC_USER, SUNO, SHOP],
    album: records.map((r) => ({ "@type": "MusicAlbum", name: r.title, url: `${SITE}/records/${r.slug}/`, numTracks: r.tracks.length })),
  },
});
writeFileSync(join(ROOT, "index.html"), home);

// ---------- record pages ----------
records.forEach((r, i) => {
  const others = records
    .map((o, k) => (k === i ? "" : `<a href="/records/${o.slug}/"><img src="/assets/records/${o.slug}-thumb.webp" alt="" width="480" height="480" loading="lazy" decoding="async"><span>${esc(o.title)}</span></a>`))
    .join("");
  const desc = (blurb(r.desc) || `${r.title}, ${r.tracks.length} tracks by Chemtrails. Stream it on SoundCloud.`).slice(0, 158);
  const page = layout({
    title: `${r.title} — Chemtrails (${r.tracks.length} tracks)`,
    description: desc,
    path: `/records/${r.slug}/`,
    body: `\n  <main class="record-page">${recPanel(r, i, true)}\n    <section class="section more-records"><p class="kicker">More records</p><div class="more-grid">${others}</div></section>\n  </main>`,
    jsonld: { "@context": "https://schema.org", ...albumLd(r) },
  });
  mkdirSync(join(ROOT, "records", r.slug), { recursive: true });
  writeFileSync(join(ROOT, "records", r.slug, "index.html"), page);
});

// ---------- sitemap + llms.txt ----------
const urls = ["/", ...records.map((r) => `/records/${r.slug}/`)];
writeFileSync(
  join(ROOT, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `  <url>\n    <loc>${SITE}${u}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${u === "/" ? "weekly" : "monthly"}</changefreq>\n    <priority>${u === "/" ? "1.0" : "0.8"}</priority>\n  </url>`)
    .join("\n")}\n</urlset>\n`
);
writeFileSync(
  join(ROOT, "llms.txt"),
  `# Chemtrails

> Chemtrails is a retro-futuristic synth-rock project from Portland, Oregon, exploring the strange space between memory, technology, desire, and the unknown. The music blends dreamy synth rock, cosmic disco, psychedelic pop, and vintage science fiction.

## Records (streamable on the site, hosted on SoundCloud)

${records.map((r) => `- ${r.title}${r.year ? ` (${r.year})` : ""}, ${r.tracks.length} tracks: ${SITE}/records/${r.slug}/`).join("\n")}

## Music elsewhere

- SoundCloud: ${SC_USER}
- Singles made with Suno: ${SUNO}
- Support: tip jar via PayPal (https://www.paypal.com/ncp/payment/W5HUHU7FYFXY8) and merch at ${SHOP}

## About

The artist behind Chemtrails is a West Coast musician and producer born on the Oregon coast, formerly guitarist, keyboardist, and producer with Venus In Spurs and Terra Firma. The solo work is built on ambient texture, cinematic atmosphere, and Pacific Northwest fog.

## Links

- Website: ${SITE}/
`
);

// Fail loudly on a broken internal link.
const known = new Set(["/", ...records.map((r) => `/records/${r.slug}/`)]);
for (const html of [home, ...records.map((r) => readFileSync(join(ROOT, "records", r.slug, "index.html"), "utf8"))]) {
  for (const [, href] of html.matchAll(/href="(\/[^"#?]*)/g)) {
    if (!/\.\w+$/.test(href) && !known.has(href)) throw new Error(`broken internal link: ${href}`);
  }
}
console.log(`built: ${urls.length} pages, ${records.length} records, ${total} tracks, ${singles.tracks.length} singles`);
