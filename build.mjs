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
const FB = "https://www.facebook.com/ChemtrailsMusic";
const IG = "https://www.instagram.com/chemtrails.band";
const SPOTIFY = "https://open.spotify.com/artist/64kqKKXxzd2POSCzFz4utw";
const APPLE = "https://music.apple.com/us/artist/chemtrails/404715979";
// Footer icons: Simple Icons (CC0) brand paths; shop is a plain bag.
const ICONS = {
  "soundcloud": "M23.999 14.165c-.052 1.796-1.612 3.169-3.4 3.169h-8.18a.68.68 0 0 1-.675-.683V7.862a.747.747 0 0 1 .452-.724s.75-.513 2.333-.513a5.364 5.364 0 0 1 2.763.755 5.433 5.433 0 0 1 2.57 3.54c.282-.08.574-.121.868-.12.884 0 1.73.358 2.347.992s.948 1.49.922 2.373ZM10.721 8.421c.247 2.98.427 5.697 0 8.672a.264.264 0 0 1-.53 0c-.395-2.946-.22-5.718 0-8.672a.264.264 0 0 1 .53 0ZM9.072 9.448c.285 2.659.37 4.986-.006 7.655a.277.277 0 0 1-.55 0c-.331-2.63-.256-5.02 0-7.655a.277.277 0 0 1 .556 0Zm-1.663-.257c.27 2.726.39 5.171 0 7.904a.266.266 0 0 1-.532 0c-.38-2.69-.257-5.21 0-7.904a.266.266 0 0 1 .532 0Zm-1.647.77a26.108 26.108 0 0 1-.008 7.147.272.272 0 0 1-.542 0 27.955 27.955 0 0 1 0-7.147.275.275 0 0 1 .55 0Zm-1.67 1.769c.421 1.865.228 3.5-.029 5.388a.257.257 0 0 1-.514 0c-.21-1.858-.398-3.549 0-5.389a.272.272 0 0 1 .543 0Zm-1.655-.273c.388 1.897.26 3.508-.01 5.412-.026.28-.514.283-.54 0-.244-1.878-.347-3.54-.01-5.412a.283.283 0 0 1 .56 0Zm-1.668.911c.4 1.268.257 2.292-.026 3.572a.257.257 0 0 1-.514 0c-.241-1.262-.354-2.312-.023-3.572a.283.283 0 0 1 .563 0Z",
  "spotify": "M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z",
  "applemusic": "M23.994 6.124a9.23 9.23 0 00-.24-2.19c-.317-1.31-1.062-2.31-2.18-3.043a5.022 5.022 0 00-1.877-.726 10.496 10.496 0 00-1.564-.15c-.04-.003-.083-.01-.124-.013H5.986c-.152.01-.303.017-.455.026-.747.043-1.49.123-2.193.4-1.336.53-2.3 1.452-2.865 2.78-.192.448-.292.925-.363 1.408-.056.392-.088.785-.1 1.18 0 .032-.007.062-.01.093v12.223c.01.14.017.283.027.424.05.815.154 1.624.497 2.373.65 1.42 1.738 2.353 3.234 2.801.42.127.856.187 1.293.228.555.053 1.11.06 1.667.06h11.03a12.5 12.5 0 001.57-.1c.822-.106 1.596-.35 2.295-.81a5.046 5.046 0 001.88-2.207c.186-.42.293-.87.37-1.324.113-.675.138-1.358.137-2.04-.002-3.8 0-7.595-.003-11.393zm-6.423 3.99v5.712c0 .417-.058.827-.244 1.206-.29.59-.76.962-1.388 1.14-.35.1-.706.157-1.07.173-.95.045-1.773-.6-1.943-1.536a1.88 1.88 0 011.038-2.022c.323-.16.67-.25 1.018-.324.378-.082.758-.153 1.134-.24.274-.063.457-.23.51-.516a.904.904 0 00.02-.193c0-1.815 0-3.63-.002-5.443a.725.725 0 00-.026-.185c-.04-.15-.15-.243-.304-.234-.16.01-.318.035-.475.066-.76.15-1.52.303-2.28.456l-2.325.47-1.374.278c-.016.003-.032.01-.048.013-.277.077-.377.203-.39.49-.002.042 0 .086 0 .13-.002 2.602 0 5.204-.003 7.805 0 .42-.047.836-.215 1.227-.278.64-.77 1.04-1.434 1.233-.35.1-.71.16-1.075.172-.96.036-1.755-.6-1.92-1.544-.14-.812.23-1.685 1.154-2.075.357-.15.73-.232 1.108-.31.287-.06.575-.116.86-.177.383-.083.583-.323.6-.714v-.15c0-2.96 0-5.922.002-8.882 0-.123.013-.25.042-.37.07-.285.273-.448.546-.518.255-.066.515-.112.774-.165.733-.15 1.466-.296 2.2-.444l2.27-.46c.67-.134 1.34-.27 2.01-.403.22-.043.442-.088.663-.106.31-.025.523.17.554.482.008.073.012.148.012.223.002 1.91.002 3.822 0 5.732z",
  "youtube": "M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z",
  "instagram": "M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077",
  "facebook": "M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z",
  "suno": "M16.5 0C20.642 0 24 5.373 24 12h-9c0 6.627-3.358 12-7.5 12C3.358 24 0 18.627 0 12h9c0-6.627 3.358-12 7.5-12Z",
  "shop": "M6 7V6a6 6 0 0 1 12 0v1h3l-1.2 15H4.2L3 7h3zm2 0h8V6a4 4 0 0 0-8 0v1z"
};
const icon = (href, label, k, extra = "") =>
  `<a href="${href}" target="_blank" rel="noopener" aria-label="${label}" title="${label}"${extra}><svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="${ICONS[k]}"/></svg></a>`;
const GA = "G-CT6DLJGNE0";
const { records, singles } = JSON.parse(readFileSync(join(ROOT, "content/records.json"), "utf8"));

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const hash = (f) => createHash("md5").update(readFileSync(join(ROOT, f))).digest("hex").slice(0, 8);
const V = { css: hash("style.css"), js: hash("site.js") };
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];
const today = new Date().toISOString().slice(0, 10);
const scTrack = (p) => `https://soundcloud.com${p}`;
const SHARE_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M7.5 7.5 12 3l4.5 4.5M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const shareBtn = (title, url, cls = "") => `<button type="button" class="share${cls}" data-share="${esc(url)}" data-title="${esc(title)}" aria-label="Share ${esc(title)}" title="Share">${SHARE_ICON}</button>`;
const total = records.reduce((n, r) => n + r.tracks.length, 0);

// The music videos (YouTube, Chemtrails channel). Each gets a page at /videos/<slug>/ and plays in the one modal.
// VIDEOS[0] is the featured one: the hero button and #watch. Entries with `card` get a "Now showing" card, in list order.
const YT_CHANNEL = "https://www.youtube.com/channel/UCBp1ER64T6_AvGpECk63Z6g";
const VIDEOS = [
  {
    slug: "we-split-last-thursday",
    yt: "qYGg00EIdLw",
    title: "We Split Last, Thursday (Official Music Video)",
    song: "We Split Last, Thursday",
    track: "We Split Last Thursday", // as listed in records.json
    by: "Chemtrails",
    record: "spanish-for-night-owls",
    duration: "PT6M20S",
    length: "6:20",
    uploaded: "2026-11-24",
    desc: "Official music video for \"We Split Last, Thursday\" by Chemtrails, a synth-rock project from Portland, Oregon. A grieving woman in a flooded far-future village on the Oregon coast sings through a night of rain and fog, two moons over the kitchen sink, until first light.",
    meta: "Official music video for \"We Split Last, Thursday\" by Chemtrails, a synth-rock project from Portland, Oregon. Rain, fog and two moons over the kitchen sink, from grief to first light.",
    llms: "a grieving woman in a flooded far-future Oregon coast village, two moons over the kitchen sink, from grief to first light",
    alt: "A young woman in a black blazer at a stone kitchen sink, two moons over the sea in the window behind her, a still from the music video",
    card: "The music video. A grieving woman in a flooded far-future village on the Oregon coast, two moons over the kitchen sink, from grief to first light.",
    credits: [["Music", "Chemtrails"]],
    madeWith: "AI-generated footage, edited by hand. The song was made with Suno.",
  },
  {
    slug: "lesbian-pet-wedding",
    yt: "5M-bsChciaY",
    title: "Lesbian Pet Wedding (Official Music Video)",
    song: "Lesbian Pet Wedding",
    by: "Chemtrails",
    record: "companion-weather",
    duration: "PT4M31S",
    length: "4:31",
    uploaded: "2026-11-07",
    desc: "Official music video for \"Lesbian Pet Wedding\" by Chemtrails, a synth-rock project from Portland, Oregon. A 1970s home-movie wedding for Olive and Mika, with the band playing the reception.",
    meta: "Official music video for \"Lesbian Pet Wedding\" by Chemtrails, a synth-rock project from Portland, Oregon. A 1970s home-movie wedding for Olive and Mika.",
    llms: "a 1970s home-movie wedding for Olive and Mika",
    alt: "Olive the dog and Mika the cat in wedding veils, a still from the music video",
    card: "The music video. A 1970s home-movie wedding for Olive and Mika, with the band playing the reception.",
    credits: [["Music", "Chemtrails"], ["Starring", "Mika and Olive"]],
    madeWith: "AI-generated footage, edited by hand. The song was made with Suno.",
  },
  {
    slug: "our-glass-lake",
    yt: "Sdu90JjIPB0",
    title: "Our Glass Lake - Venus In Spurs (Official Music Video)",
    song: "Our Glass Lake",
    by: "Venus In Spurs",
    record: "venus-in-spurs",
    recordCta: true, // a "Watch the video" button in that record's section
    duration: "PT4M15S",
    length: "4:15",
    uploaded: "2026-11-14",
    desc: "Official music video for \"Our Glass Lake\" by Venus In Spurs, the San Francisco alt-rock band. Four men in black suits, a boiler room full of steam, gas masks at the Cliff House, and an airship nobody ordered.",
    meta: "Official music video for \"Our Glass Lake\" by Venus In Spurs, the San Francisco alt-rock band. Black suits, a steam-filled boiler room and gas masks at the Cliff House.",
    llms: "black suits, a steam-filled boiler room and gas masks at the Cliff House",
    alt: "Four men in black suits and gas masks on the beach below the Cliff House, an airship overhead, a still from the music video",
    credits: [["Music", "Venus In Spurs"], ["The band", "Scott Burgess (vocals, guitar), Raul Vargas (bass), Greg Piper (drums), The Gamecat (keys)"]],
    madeWith: "AI-generated footage, edited by hand. The song is the band's own recording.",
  },
];
for (const v of VIDEOS) {
  v.path = `/videos/${v.slug}/`;
  v.poster = `/assets/video/${v.slug}.webp?v=${hash(`assets/video/${v.slug}.webp`)}`;
  v.og = `/assets/video/${v.slug}-og.jpeg`;
}
const VIDEO = VIDEOS[0];
const YT = { id: VIDEO.yt, channel: YT_CHANNEL };
const VIDEO_PATH = VIDEO.path;
// What site.js needs to play any of them in the modal.
const VIDEO_DATA = Object.fromEntries(VIDEOS.map((v) => [v.slug, { yt: v.yt, title: v.title, page: v.path }]));
const watchBtn = (v, placement, cls = "btn btn-line") => `<button type="button" class="${cls}" data-video-open="${placement}" data-video="${v.slug}">▶&nbsp;&nbsp;Watch the video</button>`;
const BAND_ID = SITE + "/#band";
const crumbs = (items) => ({ "@type": "BreadcrumbList", itemListElement: items.map(([name, path], i) => ({ "@type": "ListItem", position: i + 1, name, item: SITE + path })) });
const videoDialog = `
  <dialog class="vmodal" id="video-modal" data-videos="${esc(JSON.stringify(VIDEO_DATA))}" data-default="${VIDEO.slug}" aria-label="${esc(VIDEO.title)}">
    <div class="vm-in">
      <div class="vm-bar"><span class="vm-title">${esc(VIDEO.title)}</span><button type="button" class="vm-close" data-video-close aria-label="Close video">✕</button></div>
      <div class="vm-frame" id="vm-frame"></div>
      <p class="vm-foot"><a href="${VIDEO_PATH}" data-vm-page>Video page</a><a href="https://youtu.be/${YT.id}" target="_blank" rel="noopener" data-ev="youtube_click" data-vm-yt>Watch on YouTube ↗</a></p>
    </div>
  </dialog>`;

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
    .map(([t, p], k) => `<li><button type="button" data-i="${k}"><span class="n">${String(k + 1).padStart(2, "0")}</span><span class="t">${esc(t)}</span><span class="d"></span></button>${shareBtn(t, scTrack(p))}</li>`)
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
      <img src="/assets/records/${r.slug}-thumb.webp" srcset="/assets/records/${r.slug}-thumb.webp 480w, /assets/records/${r.slug}.webp 1200w" sizes="(max-width: 900px) 80vw, 440px" width="480" height="480" alt="${esc(r.title)} album cover art by Chemtrails"${page ? ' fetchpriority="high"' : i > 0 ? ' loading="lazy"' : ""} decoding="async">
      <span class="rec-no">No.&nbsp;${ROMAN[i]}</span>
    </div>
    <div class="rec-body">
      <p class="rec-meta">${esc(meta(r))}</p>
      ${title}
      ${r.by ? `<p class="rec-by">${esc(r.by)}</p>` : ""}
      <div class="rec-notes">${notes || ""}</div>
      <div class="rec-actions">
        <button type="button" class="btn btn-solid" data-play-rec>▶&nbsp;&nbsp;Play record</button>${VIDEOS.filter((v) => v.recordCta && v.record === r.slug).map((v) => "\n        " + watchBtn(v, page ? "record-page" : "record")).join("")}
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
      ? `<div class="s-item"><button type="button" class="single" data-i="${k}">${img}${label}</button>${t.sc ? shareBtn(t.title, scTrack(t.sc), " share--card") : ""}</div>`
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

function layout({ title, description, path, jsonld, body, home = false, ogType = home ? "website" : "music.album", image = "/assets/og-image.jpeg", modal = false }) {
  const url = SITE + path;
  const img = SITE + image;
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
  <meta property="og:image" content="${img}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:url" content="${url}">
  <meta property="og:type" content="${ogType}">
  <meta property="og:locale" content="en_US">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(title)}">
  <meta name="twitter:description" content="${esc(description)}">
  <meta name="twitter:image" content="${img}">
  <meta name="theme-color" content="#0d0907">
  <script type="application/ld+json">${JSON.stringify(jsonld)}</script>
  <script async src="https://www.googletagmanager.com/gtag/js?id=${GA}"></script>
  <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${GA}');</script>
  <link rel="icon" href="/assets/favicon.png" type="image/png">
  <link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
  <link rel="preload" href="/assets/fonts/anton-latin.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/assets/fonts/space-grotesk-latin.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="/style.css?v=${V.css}">
</head>
<body${home ? ' class="home"' : ""}>
  <div class="grain" aria-hidden="true"></div>
  <nav class="nav">
    <a href="/" class="nav-logo">CHEMTRAILS</a>
    <div class="nav-links">
      <a href="/#video">Video</a>
      <a href="/#singles">Singles</a>
      <a href="/#records">Records</a>
      <a href="/#signal">The Signal</a>
      <a href="/#about">About</a>
      <a href="${SC_USER}" target="_blank" rel="noopener">SoundCloud ↗</a>
    </div>
  </nav>
${body}
  <footer class="footer">
    <span>© 2026 Chemtrails</span>
    <div class="footer-links">
      ${icon(SC_USER, "SoundCloud", "soundcloud")}
      ${icon(SPOTIFY, "Spotify", "spotify")}
      ${icon(APPLE, "Apple Music", "applemusic")}
      ${icon(YT.channel, "YouTube", "youtube", ' data-ev="youtube_click"')}
      ${icon(IG, "Instagram", "instagram")}
      ${icon(FB, "Facebook", "facebook")}
      ${icon(SUNO, "Suno", "suno")}
      ${icon(`${SHOP}?utm_source=chemtrails-music.com&utm_medium=footer&utm_campaign=merch`, "Shop", "shop")}
    </div>
  </footer>${modal ? videoDialog : ""}
  <div class="player" id="player" hidden>
    <img class="player-art" id="p-art" src="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==" alt="" width="52" height="52">
    <div class="player-meta"><span class="player-title" id="p-title"></span><span class="player-rec" id="p-rec"></span></div>
    <div class="player-controls">
      <button type="button" id="p-prev" aria-label="Previous track">⏮</button>
      <button type="button" id="p-play" class="player-play" aria-label="Play or pause">▶</button>
      <button type="button" id="p-next" aria-label="Next track">⏭</button>
      <button type="button" id="p-share" class="share" aria-label="Share this track" title="Share">${SHARE_ICON}</button>
    </div>
    <div class="player-progress">
      <span class="time" id="p-now">0:00</span>
      <div class="rail" id="p-rail"><div class="rail-fill" id="p-fill"></div></div>
      <span class="time" id="p-total">–:––</span>
    </div>
    <a class="player-sc" id="p-sc" href="${SC_USER}" target="_blank" rel="noopener">SoundCloud ↗</a>
  </div>
  <div id="sc-host" aria-hidden="true"></div>
  <div id="share-live" class="sr-only" role="status" aria-live="polite"></div>
  <script src="/site.js?v=${V.js}" defer></script>
</body>
</html>
`;
}

const artist = { "@type": "MusicGroup", "@id": BAND_ID, name: "Chemtrails", url: SITE + "/" };
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
          <button type="button" class="btn btn-line" data-video-open="hero">▶&nbsp;&nbsp;Watch the video</button>
          <a class="btn btn-line" href="#records">The records</a>
        </div>
      </div>
    </div>
    <div class="hero-foot" aria-hidden="true"><span>${records.length} records · ${total} tracks</span><span>Scroll ↓</span></div>
  </header>
  <main>
    <section class="section nowshowing" id="video">${VIDEOS.filter((v) => v.card).map((v) => `
      <div class="ns-grid">
        <button type="button" class="ns-poster" data-video-open="card" data-video="${v.slug}" aria-label="Watch the music video for ${esc(v.song)} (${v.length})">
          <img src="${v.poster}" alt="${esc(v.alt)}" width="1280" height="720" loading="lazy" decoding="async">
          <span class="ns-play" aria-hidden="true">▶</span><span class="ns-time" aria-hidden="true">${v.length}</span>
        </button>
        <div class="ns-copy">
          <p class="kicker">Now showing</p>
          <h2>${esc(v.song)}</h2>
          <p>${esc(v.card)}</p>
          <div class="rec-actions">
            <button type="button" class="btn btn-solid" data-video-open="card-button" data-video="${v.slug}">▶&nbsp;&nbsp;Watch the video</button>
            <a class="btn-link" href="${v.path}">Video page</a>
          </div>
        </div>
      </div>`).join("")}
    </section>

    <section class="section singles" id="singles"${singles.sc ? ` data-rec="singles" data-sc="${esc(singles.sc)}" data-title="Singles" data-art="/assets/orbitz.webp?v=${hash("assets/orbitz.webp")}"` : ""}>
      <div class="sec-head">
        <p class="kicker">Singles</p>
        <h2>Loose transmissions</h2>
      </div>
      <div class="single-grid">${singleCards}</div>
      <button type="button" class="btn btn-line singles-more" data-more hidden>Show all ${singles.tracks.length} songs</button>
    </section>

    <section class="records" id="records">
      <div class="sec-head">
        <p class="kicker">The records</p>
        <h2>${records.length} records.<br>Played straight from SoundCloud.</h2>
      </div>
${records.map((r, i) => recPanel(r, i)).join("\n")}
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
          <dl class="glance">
            <dt>Chemtrails is</dt><dd>a synth-rock music project from Portland, Oregon</dd>
            <dt>Sound</dt><dd>dreamy synth rock, cosmic disco, psychedelic pop, vintage science fiction</dd>
            <dt>Catalog</dt><dd>${records.length} records (${total} tracks) and ${singles.tracks.length} singles</dd>
            <dt>Newest</dt><dd>the music video for "${esc(VIDEO.song)}" (2026)</dd>
            <dt>Listen</dt><dd><a href="${SC_USER}" target="_blank" rel="noopener">SoundCloud</a>, <a href="${SPOTIFY}" target="_blank" rel="noopener">Spotify</a>, <a href="${APPLE}" target="_blank" rel="noopener">Apple Music</a> and <a href="${YT.channel}" target="_blank" rel="noopener" data-ev="youtube_click">YouTube</a></dd>
            <dt>Follow</dt><dd><a href="${IG}" target="_blank" rel="noopener">Instagram</a> and <a href="${FB}" target="_blank" rel="noopener">Facebook</a></dd>
          </dl>
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
  title: "Chemtrails: Synth-Rock Band from Portland, Oregon",
  description: `Chemtrails is a synth-rock band from Portland, Oregon. Watch the music video, stream ${records.length} records and ${singles.tracks.length} singles, and shop the merch.`,
  path: "/",
  home: true,
  modal: true,
  body: homeBody,
  jsonld: {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebSite", "@id": SITE + "/#site", url: SITE + "/", name: "Chemtrails", alternateName: ["Chemtrails Music", "Chemtrails band"], inLanguage: "en", publisher: { "@id": BAND_ID } },
      {
        ...artist,
        alternateName: ["Chemtrails band", "Chemtrails Music"],
        disambiguatingDescription: "A synth-rock music project from Portland, Oregon. Not related to the chemtrail conspiracy theory.",
        image: `${SITE}/assets/avatar.jpeg`,
        logo: `${SITE}/assets/avatar.jpeg`,
        description: "A retro-futuristic synth-rock project exploring the strange space between memory, technology, desire, and the unknown. Dreamy synth rock, cosmic disco, psychedelic pop, and vintage science fiction from the Pacific Northwest.",
        genre: ["Synth-Rock", "Ambient", "Cosmic Disco", "Psychedelic Pop"],
        foundingLocation: { "@type": "Place", name: "Portland, Oregon, United States" },
        sameAs: [SC_USER, SPOTIFY, APPLE, YT.channel, IG, FB, SUNO, SHOP],
        album: records.map((r) => ({ "@type": "MusicAlbum", name: r.title, url: `${SITE}/records/${r.slug}/`, numTracks: r.tracks.length })),
      },
    ],
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
    modal: VIDEOS.some((v) => v.recordCta && v.record === r.slug),
    body: `\n  <main class="record-page">${recPanel(r, i, true)}\n    <section class="section more-records"><p class="kicker">More records</p><div class="more-grid">${others}</div></section>\n  </main>`,
    jsonld: { "@context": "https://schema.org", "@graph": [albumLd(r), crumbs([["Chemtrails", "/"], [r.title, `/records/${r.slug}/`]])] },
  });
  mkdirSync(join(ROOT, "records", r.slug), { recursive: true });
  writeFileSync(join(ROOT, "records", r.slug, "index.html"), page);
});

// ---------- video pages ----------
const videoPages = VIDEOS.map((v) => {
  const vRecord = records.find((r) => r.slug === v.record);
  const songUrl = scTrack(vRecord.tracks.find(([t]) => t === (v.track || v.song))[1]); // `track` when the record lists the title differently
  const videoUrl = SITE + v.path;
  const band = v.by === "Chemtrails" ? artist : { "@type": "MusicGroup", name: v.by };
  const videoLd = {
    "@type": "VideoObject",
    "@id": videoUrl + "#video",
    name: v.title,
    description: v.desc,
    url: videoUrl,
    thumbnailUrl: [SITE + v.og, `${SITE}/assets/video/${v.slug}.webp`],
    uploadDate: v.uploaded,
    duration: v.duration,
    embedUrl: `https://www.youtube.com/embed/${v.yt}`,
    inLanguage: "en",
    musicBy: band,
    publisher: artist,
    about: { "@type": "MusicRecording", name: v.song, url: songUrl, byArtist: band, inAlbum: { "@type": "MusicAlbum", name: vRecord.title, url: `${SITE}/records/${vRecord.slug}/` } },
  };
  const body = `
  <main class="video-page">
    <article class="section vp">
      <div class="vp-inner">
        <p class="kicker">Music video · ${v.length}</p>
        <h1 class="vp-title">${esc(v.song)}</h1>
        <p class="vp-by">Official music video · ${esc(v.by)}</p>
        <div class="vp-player" id="vp-player" data-yt="${v.yt}" data-title="${esc(v.title)}" data-video="${v.slug}">
          <button type="button" class="ns-poster" data-vp-play aria-label="Play the music video for ${esc(v.song)}">
            <img src="${v.poster}" alt="${esc(v.alt)}" width="1280" height="720" fetchpriority="high" decoding="async">
            <span class="ns-play" aria-hidden="true">▶</span><span class="ns-time" aria-hidden="true">${v.length}</span>
          </button>
          <noscript><iframe src="https://www.youtube-nocookie.com/embed/${v.yt}?rel=0" title="${esc(v.title)}" allow="encrypted-media; picture-in-picture; fullscreen" allowfullscreen loading="lazy"></iframe></noscript>
        </div>
        <div class="vp-text">
          <p>${esc(v.desc)}</p>
          <dl class="glance">
            ${v.credits.map(([k, val]) => `<dt>${esc(k)}</dt><dd>${esc(val)}</dd>`).join("\n            ")}
            <dt>Length</dt><dd>${v.length}</dd>
            <dt>Released</dt><dd>2026</dd>
            <dt>The song</dt><dd><a href="/records/${vRecord.slug}/">${esc(v.song)}</a>, from the record ${esc(vRecord.title)}</dd>
            <dt>Made with</dt><dd>${esc(v.madeWith)}</dd>
          </dl>
          <div class="rec-actions">
            <a class="btn btn-solid" href="https://youtu.be/${v.yt}" target="_blank" rel="noopener" data-ev="youtube_click">Watch on YouTube ↗</a>
            <a class="btn btn-line" href="${songUrl}" target="_blank" rel="noopener" data-ev="soundcloud_click">Listen on SoundCloud ↗</a>
            <a class="btn-link" href="/">More Chemtrails</a>
          </div>
        </div>
      </div>
    </article>
  </main>`;
  const html = layout({
    title: `${v.title} | Chemtrails`,
    description: v.meta,
    path: v.path,
    ogType: "video.other",
    image: v.og,
    body,
    jsonld: { "@context": "https://schema.org", "@graph": [videoLd, crumbs([["Chemtrails", "/"], [v.song + " (music video)", v.path]])] },
  });
  mkdirSync(join(ROOT, "videos", v.slug), { recursive: true });
  writeFileSync(join(ROOT, "videos", v.slug, "index.html"), html);
  return html;
});

// ---------- sitemap + llms.txt ----------
const urls = ["/", ...VIDEOS.map((v) => v.path), ...records.map((r) => `/records/${r.slug}/`)];
writeFileSync(
  join(ROOT, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `  <url>\n    <loc>${SITE}${u}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${u === "/" ? "weekly" : "monthly"}</changefreq>\n    <priority>${u === "/" ? "1.0" : "0.8"}</priority>\n  </url>`)
    .join("\n")}\n</urlset>\n`
);
writeFileSync(
  join(ROOT, "llms.txt"),
  `# Chemtrails

> Chemtrails is a retro-futuristic synth-rock music project from Portland, Oregon, exploring the strange space between memory, technology, desire, and the unknown. The music blends dreamy synth rock, cosmic disco, psychedelic pop, and vintage science fiction. It is not related to the chemtrail conspiracy theory.

## Key facts

- Genre: synth-rock, cosmic disco, psychedelic pop, ambient
- Based in: Portland, Oregon, United States
- Catalog: ${records.length} records (${total} tracks) and ${singles.tracks.length} singles, streamable on SoundCloud
- Newest: the music video for "${VIDEO.song}" (2026, ${VIDEO.length})

## Pages

- [Chemtrails home](${SITE}/): the records, the singles shelf, the video, merch and about
${VIDEOS.map((v) => `- [${v.song} (official music video${v.by === "Chemtrails" ? "" : ", " + v.by})](${SITE}${v.path}): ${v.llms}, ${v.length}, with credits and links to the song`).join("\n")}

## Records (streamable on the site, hosted on SoundCloud)

${records.map((r) => `- [${r.title}](${SITE}/records/${r.slug}/): ${[r.year, r.genre, `${r.tracks.length} tracks`].filter(Boolean).join(", ")}`).join("\n")}

## Listen and support

- [SoundCloud](${SC_USER}): the full catalog
- [Spotify](${SPOTIFY}): the store releases
- [Apple Music](${APPLE}): the store releases
- [YouTube](${YT.channel}): the music videos
- [Instagram](${IG}): clips and news
- [Facebook](${FB}): clips and news
- [Suno](${SUNO}): singles made with Suno
- [Merch](${SHOP}): hoodies, tees and mugs, printed on demand
- [Tip jar](https://www.paypal.com/ncp/payment/W5HUHU7FYFXY8): support new recordings

## About

The artist behind Chemtrails is a West Coast musician and producer born on the Oregon coast, formerly guitarist, keyboardist, and producer with Venus In Spurs and Terra Firma. The solo work is built on ambient texture, cinematic atmosphere, and Pacific Northwest fog.
`
);

// Fail loudly on a broken internal link.
const known = new Set(["/", ...VIDEOS.map((v) => v.path), ...records.map((r) => `/records/${r.slug}/`)]);
for (const html of [home, ...videoPages, ...records.map((r) => readFileSync(join(ROOT, "records", r.slug, "index.html"), "utf8"))]) {
  for (const [, href] of html.matchAll(/href="(\/[^"#?]*)/g)) {
    if (!/\.\w+$/.test(href) && !known.has(href)) throw new Error(`broken internal link: ${href}`);
  }
}
console.log(`built: ${urls.length} pages (incl. ${VIDEOS.length} video pages), ${records.length} records, ${total} tracks, ${singles.tracks.length} singles`);
