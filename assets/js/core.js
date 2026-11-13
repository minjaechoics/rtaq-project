/* =========================================================================
   RTAQ — core helpers + page chrome (nav, progress, reveal, counters, links)
   ========================================================================= */
(function () {
  "use strict";
  var R = (window.RTAQ = window.RTAQ || {});
  document.documentElement.classList.remove("no-js");

  R.reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- tiny utils ---------- */
  R.$ = function (s, el) { return (el || document).querySelector(s); };
  R.$$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  R.clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  R.lerp = function (a, b, t) { return a + (b - a) * t; };
  R.fmt = function (v, d) { return Number(v).toFixed(d == null ? 1 : d); };
  R.comma = function (v) { return Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","); };
  R.easeOut = function (t) { return 1 - Math.pow(1 - t, 3); };

  /* deterministic RNG (mulberry32) */
  R.rng = function (seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  R.gauss = function (rand) {
    var u = 0, v = 0;
    while (u === 0) u = rand();
    while (v === 0) v = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  R.hash = function (str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  };

  /* ---------- SVG helpers ---------- */
  var NS = "http://www.w3.org/2000/svg";
  R.svg = function (tag, attrs, parent) {
    var el = document.createElementNS(NS, tag);
    if (attrs) for (var k in attrs) if (attrs[k] != null) el.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(el);
    return el;
  };
  R.text = function (parent, x, y, str, attrs) {
    var a = attrs || {}; a.x = x; a.y = y;
    var t = R.svg("text", a, parent); t.textContent = str; return t;
  };
  R.scale = function (d0, d1, r0, r1) {
    var f = function (v) { return r0 + (v - d0) / (d1 - d0) * (r1 - r0); };
    f.inv = function (p) { return d0 + (p - r0) / (r1 - r0) * (d1 - d0); };
    return f;
  };
  R.newSvg = function (container, w, h) {
    container.innerHTML = "";
    return R.svg("svg", { viewBox: "0 0 " + w + " " + h, width: w, height: h, preserveAspectRatio: "xMidYMid meet" }, container);
  };
  R.tip = function (container) {
    var t = container.querySelector(".chart-tip");
    if (!t) { t = document.createElement("div"); t.className = "chart-tip"; container.appendChild(t); }
    return {
      show: function (x, y, html) { t.innerHTML = html; t.style.left = x + "px"; t.style.top = y + "px"; t.classList.add("on"); },
      hide: function () { t.classList.remove("on"); }
    };
  };
  /* relative pointer position inside an element */
  R.local = function (ev, el) {
    var r = el.getBoundingClientRect();
    var p = ev.touches ? ev.touches[0] : ev;
    return { x: p.clientX - r.left, y: p.clientY - r.top, w: r.width, h: r.height };
  };

  /* ---------- visibility ---------- */
  R.onVisible = function (el, cb, opts) {
    if (!el) return;
    if (!("IntersectionObserver" in window)) { cb(true); return; }
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (e) { cb(e.isIntersecting, e); });
    }, opts || { threshold: 0.15 });
    io.observe(el);
    return io;
  };
  R.once = function (el, cb, threshold) {
    if (!el) return;
    if (!("IntersectionObserver" in window)) { cb(); return; }
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (e) { if (e.isIntersecting) { io.disconnect(); cb(); } });
    }, { threshold: threshold == null ? 0.25 : threshold });
    io.observe(el);
  };

  /* redraw on width change (debounced) */
  R.onResize = function (fn) {
    var last = window.innerWidth, t;
    window.addEventListener("resize", function () {
      clearTimeout(t);
      t = setTimeout(function () { if (window.innerWidth !== last) { last = window.innerWidth; fn(); } }, 140);
    });
  };

  /* simple tabs: buttons inside `wrap`, returns setter */
  R.tabs = function (wrap, items, onChange, initial) {
    wrap.innerHTML = "";
    var btns = items.map(function (it, i) {
      var b = document.createElement("button");
      b.type = "button"; b.setAttribute("role", "tab");
      b.innerHTML = it.label; b.dataset.key = it.key;
      b.addEventListener("click", function () { set(i); });
      wrap.appendChild(b); return b;
    });
    function set(i) {
      btns.forEach(function (b, j) { b.classList.toggle("is-active", i === j); b.setAttribute("aria-selected", i === j); });
      onChange(items[i].key, i);
    }
    set(initial || 0);
    return set;
  };

  /* slider fill track */
  R.fillRange = function (input) {
    var f = function () {
      var p = (input.value - input.min) / (input.max - input.min) * 100;
      input.style.setProperty("--fill", p + "%");
    };
    input.addEventListener("input", f); f();
  };

  /* ---------- toast ---------- */
  var toastT;
  R.toast = function (msg) {
    var t = R.$("#toast"); if (!t) return;
    t.textContent = msg; t.classList.add("on");
    clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove("on"); }, 2200);
  };

  /* ======================= page chrome ======================= */
  document.addEventListener("DOMContentLoaded", function () {
    /* links from data.js */
    var L = window.RTAQ_LINKS || {};
    R.$$("[data-link]").forEach(function (a) {
      var url = L[a.dataset.link];
      if (url) { a.href = url; a.target = "_blank"; a.rel = "noopener"; }
      else {
        a.classList.add("is-pending");
        a.addEventListener("click", function (e) { e.preventDefault(); R.toast(a.textContent.trim() + " — coming soon"); });
      }
    });

    /* nav toggle */
    var tog = R.$("#navToggle"), links = R.$("#navLinks");
    if (tog) tog.addEventListener("click", function () {
      var open = links.classList.toggle("open");
      tog.setAttribute("aria-expanded", open);
    });
    R.$$("#navLinks a").forEach(function (a) {
      a.addEventListener("click", function () { links.classList.remove("open"); tog.setAttribute("aria-expanded", "false"); });
    });

    /* active section */
    var navA = R.$$("#navLinks a");
    var secs = navA.map(function (a) { return R.$(a.getAttribute("href")); });
    function activeSec() {
      var y = window.scrollY + window.innerHeight * 0.35, idx = -1;
      secs.forEach(function (s, i) { if (s && s.offsetTop <= y) idx = i; });
      navA.forEach(function (a, i) { a.classList.toggle("is-active", i === idx); });
    }

    /* progress */
    var bar = R.$("#progressBar"), ticking = false;
    function onScroll() {
      if (ticking) return; ticking = true;
      requestAnimationFrame(function () {
        var h = document.documentElement.scrollHeight - window.innerHeight;
        bar.style.transform = "scaleX(" + (h > 0 ? window.scrollY / h : 0) + ")";
        activeSec(); ticking = false;
      });
    }
    window.addEventListener("scroll", onScroll, { passive: true }); onScroll();

    /* reveal */
    var rev = R.$$(".reveal");
    if (R.reduced || !("IntersectionObserver" in window)) rev.forEach(function (e) { e.classList.add("in"); });
    else {
      var io = new IntersectionObserver(function (ents) {
        ents.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
      }, { threshold: 0.08, rootMargin: "0px 0px -6% 0px" });
      rev.forEach(function (e) { io.observe(e); });
    }

    /* count-up */
    R.$$("[data-count]").forEach(function (el) {
      var target = parseFloat(el.dataset.count), dec = parseInt(el.dataset.decimals || "0", 10);
      if (R.reduced) { el.textContent = target.toFixed(dec); return; }
      el.textContent = (0).toFixed(dec);
      R.once(el, function () {
        var t0 = performance.now(), dur = 1400;
        (function step(now) {
          var t = R.clamp((now - t0) / dur, 0, 1);
          el.textContent = (target * R.easeOut(t)).toFixed(dec);
          if (t < 1) requestAnimationFrame(step);
        })(t0);
      }, 0.4);
    });

    /* copy bibtex */
    var cb = R.$("#copyBib");
    if (cb) cb.addEventListener("click", function () {
      var txt = R.$("#bibText").innerText;
      var done = function () { cb.classList.add("done"); cb.querySelector("span").textContent = "Copied"; setTimeout(function () { cb.classList.remove("done"); cb.querySelector("span").textContent = "Copy"; }, 1800); };
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(txt).then(done, fallback);
      else fallback();
      function fallback() {
        var ta = document.createElement("textarea"); ta.value = txt; ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta); ta.select();
        try { document.execCommand("copy"); done(); } catch (e) { R.toast("Select the text to copy"); }
        document.body.removeChild(ta);
      }
    });

    /* lightbox */
    var lb = R.$("#lightbox"), lbImg = R.$("#lbImg");
    function closeLb() { lb.hidden = true; document.body.style.overflow = ""; }
    R.$$("[data-zoom]").forEach(function (b) {
      b.addEventListener("click", function () {
        lbImg.src = b.dataset.zoom; lbImg.alt = (b.querySelector("img") || {}).alt || "";
        lb.hidden = false; document.body.style.overflow = "hidden";
        R.$("#lbClose").focus();
      });
    });
    if (lb) {
      R.$("#lbClose").addEventListener("click", closeLb);
      lb.addEventListener("click", function (e) { if (e.target === lb) closeLb(); });
      document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !lb.hidden) closeLb(); });
    }

    /* speed bars */
    R.$$(".speed-card").forEach(function (c) { R.once(c, function () { c.classList.add("in"); }, 0.4); });
  });
})();
