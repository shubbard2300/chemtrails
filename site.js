// CHEMTRAILS — parallax, SoundCloud player, analytics
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const track = (name, params) => window.gtag && gtag("event", name, params);

  // ---------- parallax: two custom properties per frame, CSS does the rest ----------
  const hero = $(".hero");
  const panels = $$(".rec");
  const visible = new Set();
  let queued = false;

  function frame() {
    queued = false;
    const vh = innerHeight;
    if (hero && scrollY < vh * 1.3) hero.style.setProperty("--sy", scrollY.toFixed(1));
    visible.forEach((el) => {
      const r = el.getBoundingClientRect();
      const p = (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2);
      el.style.setProperty("--p", Math.max(-1, Math.min(1, p)).toFixed(3));
    });
  }
  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(frame); } };

  if (!still) {
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => (e.isIntersecting ? visible.add(e.target) : visible.delete(e.target)));
      queue();
    });
    panels.forEach((p) => io.observe(p));
    addEventListener("scroll", queue, { passive: true });
    addEventListener("resize", queue);
    if (hero) {
      hero.addEventListener("pointermove", (e) => {
        hero.style.setProperty("--mx", ((e.clientX / innerWidth) * 2 - 1).toFixed(3));
        hero.style.setProperty("--my", ((e.clientY / innerHeight) * 2 - 1).toFixed(3));
      });
    }
    queue();
  }

  // ---------- SoundCloud player ----------
  // One hidden widget per record, created as its panel scrolls near; a custom bar drives it.
  // ponytail: every visited record keeps its iframe; destroy idle ones if memory ever matters.
  const bar = { el: $("#player"), art: $("#p-art"), title: $("#p-title"), rec: $("#p-rec"), play: $("#p-play"), prev: $("#p-prev"), next: $("#p-next"), rail: $("#p-rail"), fill: $("#p-fill"), now: $("#p-now"), total: $("#p-total"), sc: $("#p-sc") };
  const recs = {};
  const order = [];
  $$("[data-rec]").forEach((el) => {
    const slug = el.dataset.rec;
    if (!el.dataset.sc) return;
    const rows = $$(".tracks li, .single[data-i]", el);
    recs[slug] = { slug, el, sc: el.dataset.sc, title: el.dataset.title, art: el.dataset.art, rows, widget: null, ready: false, pending: null, idx: -1, dur: 0 };
    order.push(slug);
  });
  let cur = null;
  const fmt = (ms) => { const s = Math.floor(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };

  let apiReady;
  const loadApi = () => apiReady || (apiReady = new Promise((res) => {
    const s = document.createElement("script");
    s.src = "https://w.soundcloud.com/player/api.js";
    s.onload = res;
    document.head.appendChild(s);
  }));

  function ensure(slug) {
    const r = recs[slug];
    if (!r || r.widget) return r;
    r.widget = {}; // placeholder so concurrent calls don't build twice
    loadApi().then(() => {
      const f = document.createElement("iframe");
      f.allow = "autoplay";
      f.title = `${r.title} on SoundCloud`;
      f.src = `https://w.soundcloud.com/player/?url=${encodeURIComponent(r.sc)}&auto_play=false&hide_related=true&show_comments=false&show_user=false&show_reposts=false&show_teaser=false&visual=false`;
      $("#sc-host").appendChild(f);
      const w = (r.widget = SC.Widget(f));
      const E = SC.Widget.Events;
      w.bind(E.READY, () => {
        w.getSounds((sounds) => {
          r.ready = true;
          // the widget only hydrates some tracks up front; show a duration only where it has one
          r.rows.forEach((li, i) => { const d = $(".d", li); if (d && sounds[i] && sounds[i].duration) d.textContent = fmt(sounds[i].duration); });
          if (r.pending !== null) { const i = r.pending; r.pending = null; start(r, i); }
        });
        w.bind(E.PLAY, (d) => onPlay(r, d));
        w.bind(E.PAUSE, () => (r === cur ? setPlaying(r, false) : r.rows.forEach((li) => li.classList.remove("is-playing"))));
        w.bind(E.FINISH, () => onFinish(r));
        w.bind(E.PLAY_PROGRESS, (d) => onProgress(r, d));
      });
    });
    return r;
  }

  function start(r, i) {
    r.widget.skip(i);
    r.widget.play();
  }

  function playTrack(slug, i) {
    const r = ensure(slug);
    if (!r) return;
    if (r.ready) start(r, i);
    else r.pending = i; // plays the moment the widget reports ready
  }

  function setPlaying(r, on) {
    bar.play.textContent = on ? "❚❚" : "▶";
    bar.play.setAttribute("aria-pressed", on);
    r.rows.forEach((li, i) => li.classList.toggle("is-playing", on && i === r.idx));
    if (!on) document.title = document.title.replace(/^▶ /, "");
  }

  function setCurrent(r, i, s) {
    r.idx = i;
    r.dur = s.duration || 0;
    r.rows.forEach((li, k) => li.classList.toggle("is-current", k === i));
    const d = r.rows[i] && $(".d", r.rows[i]);
    if (d && r.dur) d.textContent = fmt(r.dur);
    bar.el.hidden = false;
    document.body.classList.add("has-player");
    bar.art.src = r.art;
    bar.title.textContent = s.title || "";
    bar.rec.textContent = r.title;
    bar.total.textContent = r.dur ? fmt(r.dur) : "–:––";
    bar.sc.href = s.permalink_url || r.sc;
    document.title = `▶ ${bar.title.textContent} — CHEMTRAILS`;
    if ("mediaSession" in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({ title: bar.title.textContent, artist: "Chemtrails", album: r.title, artwork: [{ src: r.art, sizes: "480x480", type: "image/webp" }] });
    }
  }

  function onPlay(r) {
    if (cur && cur !== r) cur.widget.pause();
    const wasCurrent = cur === r;
    cur = r;
    r.widget.getCurrentSoundIndex((i) => r.widget.getCurrentSound((s) => {
      if (i !== r.idx || !wasCurrent) {
        setCurrent(r, i, s || {});
        track("track_play", { record: r.slug, track: (s || {}).title });
      }
      setPlaying(r, true);
    }));
  }

  function onProgress(r, d) {
    if (r !== cur) return;
    bar.fill.style.width = `${d.relativePosition * 100}%`;
    bar.now.textContent = fmt(d.currentPosition);
  }

  function onFinish(r) {
    if (r.idx >= r.rows.length - 1) step(r, 1); // last track: roll into the next record
  }

  // move to the neighbouring record when a record runs out
  function step(r, dir) {
    const n = order[order.indexOf(r.slug) + dir];
    if (n) playTrack(n, dir > 0 ? 0 : Math.max(0, recs[n].rows.length - 1));
    else setPlaying(r, false);
  }

  bar.play.addEventListener("click", () => cur && cur.widget.toggle());
  bar.next.addEventListener("click", () => {
    if (!cur) return;
    if (cur.idx >= cur.rows.length - 1) step(cur, 1);
    else cur.widget.next();
  });
  bar.prev.addEventListener("click", () => {
    if (!cur) return;
    if (cur.idx <= 0) step(cur, -1);
    else cur.widget.prev();
  });
  bar.rail.addEventListener("click", (e) => {
    if (!cur || !cur.dur) return;
    const b = bar.rail.getBoundingClientRect();
    cur.widget.seekTo(((e.clientX - b.left) / b.width) * cur.dur);
  });
  if ("mediaSession" in navigator) {
    const act = (n, fn) => navigator.mediaSession.setActionHandler(n, fn);
    act("play", () => cur && cur.widget.play());
    act("pause", () => cur && cur.widget.pause());
    act("previoustrack", () => bar.prev.click());
    act("nexttrack", () => bar.next.click());
  }

  document.addEventListener("click", (e) => {
    const row = e.target.closest(".tracks button[data-i], .single[data-i]");
    if (row) {
      const rec = row.closest("[data-rec]");
      const i = +(row.dataset.i ?? [...row.closest("ol").children].indexOf(row.parentElement));
      const r = recs[rec.dataset.rec];
      if (r && r === cur && i === r.idx) r.widget.toggle();
      else playTrack(rec.dataset.rec, i);
      return;
    }
    const rb = e.target.closest("[data-play-rec]");
    if (rb) {
      const slug = rb.closest("[data-rec]").dataset.rec;
      if (cur && cur.slug === slug) cur.widget.toggle();
      else playTrack(slug, 0);
      return;
    }
    const hp = e.target.closest("#hero-play");
    if (hp) {
      const slug = hp.dataset.recTarget;
      if (cur && cur.slug === slug) cur.widget.toggle();
      else playTrack(slug, 0);
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.code === "Space" && cur && !$("dialog[open]") && !["INPUT", "TEXTAREA", "BUTTON", "A"].includes(e.target.tagName)) {
      e.preventDefault();
      cur.widget.toggle();
    }
  });

  // hero play button: a random record each visit (the HTML default stays the first, for crawlers and no-JS)
  const heroPlay = $("#hero-play");
  if (heroPlay && panels.length) {
    const pick = panels[Math.floor(Math.random() * panels.length)];
    heroPlay.dataset.recTarget = pick.dataset.rec;
    heroPlay.textContent = `▶  Play ${pick.dataset.title}`;
  }

  // load a record's widget as its panel nears the viewport (a hero or track click loads it on demand)
  const preload = () => {
    const io2 = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) ensure(e.target.dataset.rec); }), { rootMargin: "300px" });
    Object.values(recs).forEach((r) => io2.observe(r.el));
  };
  if (document.readyState === "complete") preload();
  else addEventListener("load", preload);

  // ---------- singles shelf: first two rows, the rest on demand (every card stays in the HTML) ----------
  const more = $("[data-more]");
  if (more) {
    const items = $$(".single-grid > *");
    items.slice(14).forEach((c) => c.classList.add("is-extra"));
    more.hidden = false;
    more.addEventListener("click", () => {
      items.forEach((c) => c.classList.remove("is-extra"));
      more.hidden = true;
      (items[14].querySelector(".single") || items[14]).focus();
    });
  }

  // ---------- share: the native sheet where there is one, else copy the link ----------
  const live = $("#share-live");
  const flash = (btn) => {
    btn.classList.add("is-copied");
    if (live) live.textContent = "Link copied";
    setTimeout(() => { btn.classList.remove("is-copied"); if (live) live.textContent = ""; }, 1800);
  };
  async function share(btn, url, title) {
    let method = "share";
    try {
      await navigator.share({ title: `${title} — Chemtrails`, text: `${title} by Chemtrails`, url }); // throws when there is no share sheet
    } catch (e) {
      if (e && e.name === "AbortError") return; // closed the sheet
      method = "copy";
      try { await navigator.clipboard.writeText(url); flash(btn); } catch (_) { prompt("Copy this link", url); }
    }
    track("share_click", { method, track: title, link_url: url });
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-share], #p-share");
    if (!b) return;
    const inBar = b.id === "p-share";
    share(b, inBar ? bar.sc.href : b.dataset.share, inBar ? bar.title.textContent : b.dataset.title);
  });

  // ---------- music video: the YouTube player is created on open and removed on close, so nothing loads up front ----------
  const ytFrame = (id, title) => `<iframe src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1" title="${title}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
  const vm = $("#video-modal");
  if (vm) {
    const frame = $("#vm-frame");
    const openVideo = (placement) => {
      if (!vm.showModal) { location.href = vm.dataset.page; return; } // no <dialog>: go to the video page
      if (cur) cur.widget.pause(); // one thing playing at a time
      frame.innerHTML = ytFrame(vm.dataset.yt, vm.getAttribute("aria-label"));
      vm.showModal();
      history.replaceState(null, "", "#watch");
      track("video_open", { video: "lesbian-pet-wedding", placement });
    };
    vm.addEventListener("close", () => {
      frame.innerHTML = ""; // removing the iframe stops the video
      if (location.hash === "#watch") history.replaceState(null, "", location.pathname + location.search);
    });
    document.addEventListener("click", (e) => {
      const o = e.target.closest("[data-video-open]");
      if (o) { openVideo(o.dataset.videoOpen); return; }
      if (e.target === vm || e.target.closest("[data-video-close]")) vm.close(); // vm itself is only the backdrop
    });
    if (location.hash === "#watch") openVideo("link");
    addEventListener("hashchange", () => { if (location.hash === "#watch" && !vm.open) openVideo("link"); });
  }
  const vpPlay = $("[data-vp-play]");
  if (vpPlay) {
    vpPlay.addEventListener("click", () => {
      const box = $("#vp-player");
      if (cur) cur.widget.pause();
      box.innerHTML = ytFrame(box.dataset.yt, box.dataset.title);
      $("iframe", box).focus();
      track("video_open", { video: "lesbian-pet-wedding", placement: "video-page" });
    });
  }

  // ---------- analytics ----------
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a");
    if (a && a.href.includes("myspreadshop")) {
      const placement = a.closest("footer") ? "footer" : a.closest(".support") ? "support-alt" : "merch-cta";
      track("merch_click", { shop: "spreadshop", placement, link_url: a.href });
      return;
    }
    if (a && a.dataset.ev) { track(a.dataset.ev, { link_url: a.href }); return; }
    const tier = e.target.closest(".tier");
    if (tier) { track("donate_click", { method: "paypal_ncp_link", placement: "support-tier", tier: tier.dataset.tier }); return; }
    if (e.target.closest("#paypal-container-W5HUHU7FYFXY8")) track("donate_click", { method: "paypal_hosted_button", placement: "support-section" });
  }, true);

  // ---------- PayPal tip jar, loaded as its section nears the viewport ----------
  if ($("#paypal-container-W5HUHU7FYFXY8")) {
    let loaded = false;
    const loadPayPal = () => {
      if (loaded) return;
      loaded = true;
      const s = document.createElement("script");
      s.src = "https://www.paypal.com/sdk/js?client-id=BAAyiw5QmfubsaQCV48XZTRd8Fh3pSjA6s7pU_JaaiOaEiz0f9_mFL3SMmcT1RymLvmzUF-YuU1r9inkRU&components=hosted-buttons&enable-funding=venmo&currency=USD";
      s.onload = () => paypal.HostedButtons({ hostedButtonId: "W5HUHU7FYFXY8" }).render("#paypal-container-W5HUHU7FYFXY8");
      document.body.appendChild(s);
    };
    new IntersectionObserver((es, io) => { if (es[0].isIntersecting) { io.disconnect(); loadPayPal(); } }, { rootMargin: "800px" }).observe($("#paypal-container-W5HUHU7FYFXY8"));
  }
})();
