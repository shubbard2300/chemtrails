// CHEMTRAILS — track data + custom player (audio streamed from Suno CDN)

const TRACKS = [
  { id: "e386b415-6631-4db4-a7e0-5a2f223763ad", title: "Orbitz", genre: "Featured", art: "assets/orbitz.webp" },
  { id: "c7a8cc47-2473-4f89-a687-080d9e71f0bd", title: "The World \"Jones\" Made", genre: "British 1980 Synth-Pop", art: "assets/jones.webp" },
  { id: "01450842-42c2-469d-b662-41d974601d05", title: "King Tides", genre: "Disco-Pop", art: "assets/king-tides.webp" },
  { id: "9c366f6b-951b-44e2-8e81-1770b89bf888", title: "Black Halo Signal", genre: "Trip-Hop", art: "assets/black-halo-signal.webp" },
  { id: "58b96d52-784f-46fc-8953-d5852c6ab7f4", title: "Coastal Cathedral", genre: "Disco", art: "assets/coastal-cathedral.webp" },
  { id: "b23ad991-6f07-45dc-9fe3-ac81f9101733", title: "The Last Space Boat To Mars", genre: "Retro Orchestral Pop", art: "assets/space-boat.webp" },
  { id: "c950f9a1-ea0f-4c4b-b43e-944acfe18d25", title: "The Last Space Boat To Mars (Instrumental)", genre: "Retro Orchestral Pop", art: "assets/space-boat-instrumental.webp" },
  { id: "29b38dd7-fa24-4880-963e-b2eb981b22b1", title: "Velvet Ferrari", genre: "Disco Rock", art: "assets/velvet-ferrari.webp" },
  { id: "0ae0553f-181c-4e66-a78e-62f894511678", title: "Black Cat", genre: "", art: "assets/black-cat.webp" },
  { id: "4cba3ba6-f7e5-4bb4-a421-d50d293eeb73", title: "The Creatures We Are All", genre: "", art: "assets/creatures.webp" },
];

const audioUrl = (t) => `https://cdn1.suno.ai/${t.id}.mp3`;

const audio = document.getElementById("audio");
const player = document.getElementById("player");
const playerArt = document.getElementById("player-art");
const playerTitle = document.getElementById("player-title");
const playerGenre = document.getElementById("player-genre");
const btnPlay = document.getElementById("btn-play");
const btnPrev = document.getElementById("btn-prev");
const btnNext = document.getElementById("btn-next");
const timeNow = document.getElementById("time-now");
const timeTotal = document.getElementById("time-total");
const rail = document.getElementById("progress-rail");
const fill = document.getElementById("progress-fill");
const grid = document.getElementById("track-grid");

let current = -1;

// build the track grid
TRACKS.forEach((t, i) => {
  const card = document.createElement("article");
  card.className = "track-card";
  card.dataset.index = i;
  card.innerHTML = `
    <div class="track-art">
      <img src="${t.art}" alt="${t.title} artwork" loading="lazy" decoding="async" width="640" height="640">
      <div class="play-badge">▶</div>
    </div>
    <div class="track-info">
      <h3 class="track-name">${t.title}</h3>
      ${t.genre ? `<div class="track-genre">${t.genre}</div>` : ""}
    </div>`;
  card.addEventListener("click", () => (i === current ? toggle() : play(i)));
  grid.appendChild(card);
});

function play(i) {
  current = i;
  const t = TRACKS[i];
  audio.src = audioUrl(t);
  audio.play();
  player.hidden = false;
  playerArt.src = t.art;
  playerTitle.textContent = t.title;
  playerGenre.textContent = t.genre || "Chemtrails";
  document.querySelectorAll(".track-card").forEach((c) => {
    const playing = Number(c.dataset.index) === i;
    c.classList.toggle("playing", playing);
    c.querySelector(".play-badge").textContent = playing ? "❚❚" : "▶";
  });
}

function toggle() {
  if (audio.paused) audio.play();
  else audio.pause();
}

function syncPlayState() {
  const paused = audio.paused;
  btnPlay.textContent = paused ? "▶" : "❚❚";
  if (current >= 0) {
    const card = grid.querySelector(`[data-index="${current}"] .play-badge`);
    if (card) card.textContent = paused ? "▶" : "❚❚";
  }
}

const fmt = (s) => (isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}` : "–:––");

audio.addEventListener("play", syncPlayState);
audio.addEventListener("pause", syncPlayState);
audio.addEventListener("loadedmetadata", () => (timeTotal.textContent = fmt(audio.duration)));
audio.addEventListener("timeupdate", () => {
  timeNow.textContent = fmt(audio.currentTime);
  if (audio.duration) fill.style.width = `${(audio.currentTime / audio.duration) * 100}%`;
});
audio.addEventListener("ended", () => play((current + 1) % TRACKS.length));

btnPlay.addEventListener("click", toggle);
btnPrev.addEventListener("click", () => play((current - 1 + TRACKS.length) % TRACKS.length));
btnNext.addEventListener("click", () => play((current + 1) % TRACKS.length));

rail.addEventListener("click", (e) => {
  if (!audio.duration) return;
  const r = rail.getBoundingClientRect();
  audio.currentTime = ((e.clientX - r.left) / r.width) * audio.duration;
});

document.getElementById("hero-play").addEventListener("click", () => {
  if (current === 0) toggle();
  else play(0);
});

document.addEventListener("keydown", (e) => {
  if (e.code === "Space" && current >= 0 && !["INPUT", "TEXTAREA", "BUTTON"].includes(e.target.tagName)) {
    e.preventDefault();
    toggle();
  }
});
