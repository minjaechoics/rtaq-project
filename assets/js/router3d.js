/* =========================================================================
   RTAQ — 3D router simulation (toy MoE).
   6 MoE layers x 64 routed experts, top-4 routing. A fixed set P of
   termination-aware experts is selected with the per-token rates measured
   in the paper (Fig. 5a): ~6% during reasoning, ~41% at ordinary line
   breaks and ~83% (here 80-93% per expert) at the closing position.
   Routed experts are drawn in ink; only at the closing position are the
   selected P experts shown, in red, and the run stops at </think>.
   ========================================================================= */
(function () {
  "use strict";
  var R = window.RTAQ;

  var L = 6, GX = 8, GZ = 8, E = GX * GZ, K = 4, LS = 1.55;
  var N = L * E;
  var RATE = { r: 0.06, n: 0.41, tag: 0.05, a: 0.04 };

  /* ---------- model: which experts are termination-aware ---------- */
  var mr = R.rng(20261113);
  var isP = new Array(N).fill(false), pClose = new Array(N).fill(0), near = new Array(N).fill(0);
  var Plist = [];
  [1, 2, 1, 2, 1, 1].forEach(function (cnt, l) {
    var picked = 0;
    while (picked < cnt) {
      var e = l * E + ((mr() * E) | 0);
      if (!isP[e]) { isP[e] = true; pClose[e] = 0.8 + mr() * 0.13; Plist.push(e); picked++; }
    }
  });
  for (var nm = 0; nm < 9; nm++) {
    var e2 = (mr() * N) | 0;
    if (!isP[e2]) near[e2] = 0.18 + mr() * 0.42;
  }
  var NP = Plist.length;

  /* ---------- traces ---------- */
  var TRACES = [
    { q: "A train travels 210 km in 3 hours. How far does it travel in one hour?",
      t: "<think>\nOkay, the user wants the distance covered in one hour.\nSpeed is distance over time, so 210 / 3.\n210 / 3 = 70.\nLet me double-check: 70 × 3 = 210. Correct.\nOkay, I'll output the answer.\n</think>\nThe answer is 70 km." },
    { q: "What is the sum of the first 10 positive odd numbers?",
      t: "<think>\nThe user asks for 1 + 3 + 5 + … + 19.\nThe sum of the first n odd numbers is n².\nWith n = 10, that is 100.\nQuick check: 1 + 3 + 5 + 7 + 9 = 25 = 5². Consistent.\nI'm confident in the result.\n</think>\nThe sum is 100." },
    { q: "How many diagonals does a convex hexagon have?",
      t: "<think>\nA hexagon has 6 vertices.\nEach vertex connects to 3 non-adjacent vertices.\nThat gives 6 × 3 = 18, but each diagonal is counted twice.\nSo there are 18 / 2 = 9 diagonals.\nFormula check: n(n − 3) / 2 = 6 · 3 / 2 = 9.\nDone.\n</think>\nA convex hexagon has 9 diagonals." }
  ];
  function tokenize(text) {
    var out = [], mode = "pre";
    text.split(/(\n)/).forEach(function (seg) {
      if (seg === "") return;
      if (seg === "\n") { out.push({ s: "\n", type: mode === "think" ? "n" : "a", nl: true }); return; }
      seg.split(" ").forEach(function (w, i, arr) {
        if (!w) return;
        if (w === "<think>") { out.push({ s: w, type: "tag", tag: "open" }); mode = "think"; return; }
        if (w === "</think>") { out.push({ s: w, type: "tag", tag: "close" }); mode = "ans"; return; }
        out.push({ s: w + (i < arr.length - 1 ? " " : ""), type: mode === "think" ? "r" : "a" });
      });
    });
    for (var i = 0; i < out.length; i++) if (out[i].tag === "close" && i > 0) out[i - 1].type = "c";
    return out;
  }
  /* each trace stops at </think>: everything before it is routed, </think> ends the run */
  TRACES.forEach(function (t) {
    var toks = tokenize(t.t), end = toks.length - 1;
    for (var i = 0; i < toks.length; i++) if (toks[i].tag === "close") { end = i; break; }
    t.tokens = toks.slice(0, end + 1);
    t.nRoute = end;
  });

  /* ---------- routing ---------- */
  function route(tok, ctx, rnd) {
    var sel = [];
    for (var l = 0; l < L; l++) {
      var chosen = [];
      for (var j = 0; j < NP; j++) {
        var e = Plist[j]; if (((e / E) | 0) !== l) continue;
        var p = tok.type === "c" ? pClose[e] : RATE[tok.type];
        if (rnd() < p) chosen.push(e);
      }
      if (tok.type === "c") for (var e3 = l * E; e3 < (l + 1) * E; e3++) if (near[e3] && chosen.length < K && rnd() < near[e3]) chosen.push(e3);
      var hr = R.rng(R.hash(tok.s.trim() + "|" + l + "|" + ctx));
      var cand = [];
      for (var x = l * E; x < (l + 1) * E; x++) if (!isP[x] && chosen.indexOf(x) < 0) cand.push([x, hr() + 0.45 * rnd()]);
      cand.sort(function (a, b) { return b[1] - a[1]; });
      for (var c = 0; chosen.length < K; c++) chosen.push(cand[c][0]);
      sel = sel.concat(chosen);
    }
    return sel;
  }

  /* ---------- colors ---------- */
  var C_IDLE = [232, 232, 228], C_INK = [26, 26, 30], C_RED = [215, 20, 28];
  function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function rgb(c, k) { k = k || 1; return "rgb(" + ((c[0] * k) | 0) + "," + ((c[1] * k) | 0) + "," + ((c[2] * k) | 0) + ")"; }
  function escapeHtml(s) { return s.replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }); }

  document.addEventListener("DOMContentLoaded", function () {
    var stage = R.$("#routerStage"), canvas = R.$("#routerCanvas");
    if (!stage || !canvas) return;
    var ctx = canvas.getContext("2d");
    var raster = R.$("#rasterCanvas"), rctx = raster.getContext("2d");
    var traceBody = R.$("#traceBody"), tracePrompt = R.$("#tracePrompt"), statusEl = R.$("#routerStatus");
    var tipEl = R.$("#routerTip"), flash = R.$("#routerFlash"), rasterCount = R.$("#rasterCount");
    var bNext = R.$("#rNext");

    var W = 0, H = 0, S = 1, dpr = 1;
    var yaw = -0.72, pitch = 0.55, dragging = false, lastX = 0, lastY = 0, autoRot = true;
    var v = new Float32Array(N), sel = new Uint8Array(N);
    var visible = false, running = false, closing = false, lastOn = 0;
    var traceIdx = 0, tokIdx = 0, playing = false, playT = null, rnd = R.rng(99), hist = [], tokSpans = [];
    var drawn = [];

    function resize() {
      var r = stage.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width; H = r.height;
      canvas.width = W * dpr; canvas.height = H * dpr;
      canvas.style.width = W + "px"; canvas.style.height = H + "px";
      var half = 4.3 * Math.SQRT2;
      var s1 = (W / 2 - 18) / half;
      var vert = ((L - 1) * LS + 1.3) * Math.cos(pitch) + 2 * half * Math.sin(pitch);
      var s2 = (H - 104) / vert;
      S = Math.max(8, Math.min(s1, s2));
      var rw = raster.getBoundingClientRect().width;
      raster.width = rw * dpr; raster.height = 70 * dpr;
      drawRaster();
    }

    /* ---------- projection ---------- */
    var cy_, sy_, cp_, sp_;
    function setCam() { cy_ = Math.cos(yaw); sy_ = Math.sin(yaw); cp_ = Math.cos(pitch); sp_ = Math.sin(pitch); }
    function P3(x, y, z) {
      var x1 = x * cy_ - z * sy_, z1 = x * sy_ + z * cy_;
      var y2 = y * cp_ + z1 * sp_, z2 = z1 * cp_ - y * sp_;
      return [W / 2 + x1 * S, H / 2 + 18 - y2 * S, z2];
    }
    function poly(pts, fill, stroke) {
      ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
      for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.closePath();
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
    }

    function frame() {
      if (!visible) { running = false; return; }
      requestAnimationFrame(frame);
      if (autoRot && !dragging && !R.reduced) yaw += 0.0019;
      setCam();
      for (var i = 0; i < N; i++) {
        var tgt = sel[i] ? 1 : 0;
        v[i] += (tgt - v[i]) * (tgt > v[i] ? 0.22 : 0.075);
      }
      draw();
    }

    function draw() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.lineWidth = 1; ctx.lineJoin = "round";
      drawn = [];
      var sides = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(function (n) {
        var x1 = n[0] * cy_ - n[1] * sy_, z1 = n[0] * sy_ + n[1] * cy_;
        return { n: n, vis: z1 < 0, shade: 0.7 + 0.17 * x1 };
      }).filter(function (s) { return s.vis; });
      var hs = 0.35;
      for (var l = 0; l < L; l++) {
        var yb = l * LS - (L - 1) * LS / 2;
        var m = 4.35;
        var pc = [P3(-m, yb, -m), P3(m, yb, -m), P3(m, yb, m), P3(-m, yb, m)];
        poly(pc, "rgba(11,11,12,0.035)", "rgba(11,11,12,0.11)");
        var lx = pc.reduce(function (a, b) { return b[0] < a[0] ? b : a; });
        ctx.fillStyle = "rgba(11,11,12,0.42)"; ctx.font = "600 10px 'JetBrains Mono', monospace";
        ctx.fillText("L" + (l + 1), lx[0] - 20, lx[1] + 3);
        var order = [];
        for (var e = 0; e < E; e++) {
          var idx = l * E + e, gx = e % GX, gz = (e / GX) | 0;
          var x = (gx - (GX - 1) / 2), z = (gz - (GZ - 1) / 2);
          order.push([idx, x, z, (x * sy_ + z * cy_) * cp_]);
        }
        order.sort(function (a, b) { return b[3] - a[3]; });
        for (var o = 0; o < order.length; o++) {
          var id = order[o][0], cx = order[o][1], cz = order[o][2];
          var t = v[id], red = isP[id] && closing;
          var h = 0.14 + 0.95 * t;
          var col = mix(C_IDLE, red ? C_RED : C_INK, t);
          var y0 = yb, y1 = yb + h;
          var a0 = P3(cx - hs, y0, cz - hs), b0 = P3(cx + hs, y0, cz - hs), c0 = P3(cx + hs, y0, cz + hs), d0 = P3(cx - hs, y0, cz + hs);
          var a1 = P3(cx - hs, y1, cz - hs), b1 = P3(cx + hs, y1, cz - hs), c1 = P3(cx + hs, y1, cz + hs), d1 = P3(cx - hs, y1, cz + hs);
          for (var si = 0; si < sides.length; si++) {
            var n = sides[si].n, f;
            if (n[0] === 1) f = [b0, c0, c1, b1];
            else if (n[0] === -1) f = [a0, d0, d1, a1];
            else if (n[1] === 1) f = [d0, c0, c1, d1];
            else f = [a0, b0, b1, a1];
            poly(f, rgb(col, sides[si].shade), null);
          }
          var top = [a1, b1, c1, d1];
          var glow = red && t > 0.35;
          if (glow) { ctx.save(); ctx.shadowColor = "rgba(255,59,59,0.75)"; ctx.shadowBlur = 14 * t; }
          poly(top, rgb(col), glow ? "rgba(215,20,28,0.9)" : "rgba(0,0,0,0.06)");
          if (glow) ctx.restore();
          drawn.push({ id: id, top: top });
        }
      }
    }

    /* ---------- token stepping ---------- */
    function curTrace() { return TRACES[traceIdx]; }
    function resetTrace() {
      var tr = curTrace();
      tokIdx = 0; hist = []; tokSpans = []; closing = false; lastOn = 0;
      sel.fill(0);
      tracePrompt.innerHTML = '<span class="qmark">Q</span><span>' + tr.q + "</span>";
      traceBody.innerHTML = '<span class="pending">Tokens will stream here…</span>';
      statusEl.innerHTML = ""; rasterCount.textContent = "";
      flash.textContent = "closing position"; flash.classList.remove("on");
      drawRaster();
    }
    function addSpan(cls, text, cur) {
      tokSpans.forEach(function (sp) { sp.classList.remove("cur"); });
      var sp = document.createElement("span");
      sp.className = "tok" + (cls ? " " + cls : "") + (cur ? " cur" : "");
      sp.textContent = text;
      traceBody.appendChild(sp);
      tokSpans.push(sp);
      return sp;
    }
    /* returns the token type, "end" once </think> is emitted, or null when finished */
    function step() {
      var tr = curTrace();
      if (tokIdx >= tr.tokens.length) return null;
      if (tokIdx === 0) traceBody.innerHTML = "";
      var tok = tr.tokens[tokIdx];

      if (tok.tag === "close") {
        /* </think>: keep the closing-position routing on screen and stop here */
        addSpan("think-end", "</think>", false);
        traceBody.scrollTop = traceBody.scrollHeight;
        tokIdx++;
        flash.textContent = "</think> emitted"; flash.classList.add("on");
        statusEl.innerHTML = "<b>&lt;/think&gt; emitted.</b> " + lastOn + " of " + NP + " 𝒫 experts fired together at the closing position, and reasoning stops here.";
        return "end";
      }

      var s = route(tok, traceIdx + ":" + tokIdx, rnd);
      closing = tok.type === "c";
      sel.fill(0);
      /* at the closing position only the termination-aware experts are shown */
      s.forEach(function (i) { if (!closing || isP[i]) sel[i] = 1; });
      var pOn = Plist.map(function (e) { return s.indexOf(e) >= 0 ? 1 : 0; });
      var nOn = pOn.reduce(function (a, b) { return a + b; }, 0);
      hist.push({ pOn: pOn, type: tok.type });

      if (closing) addSpan("close", "↵", false);
      else if (tok.nl) addSpan("nl", "↵", true);
      else if (tok.tag === "open") addSpan("think-tag", "<think>", true);
      else addSpan(tok.type === "a" ? "ans" : "", tok.s, true);
      if (tok.nl || tok.tag) traceBody.appendChild(document.createElement("br"));
      traceBody.scrollTop = traceBody.scrollHeight;

      rasterCount.textContent = nOn + " / " + NP;
      if (closing) {
        lastOn = nOn;
        statusEl.innerHTML = "<b>Closing position</b>: the router selects " + nOn + " of " + NP + " 𝒫 experts at once.";
        flash.textContent = "closing position"; flash.classList.add("on");
      } else {
        flash.classList.remove("on");
        var where = tok.type === "n" ? "line break inside reasoning" : tok.tag ? "tag" : "reasoning";
        statusEl.innerHTML = "Token " + (tokIdx + 1) + " · <span class='mono'>" + (tok.nl ? "\\n" : escapeHtml(tok.s.trim())) + "</span> · " + where;
      }
      tokIdx++;
      drawRaster();
      return tok.type;
    }

    function drawRaster() {
      var rw = raster.width / dpr, rh = 70;
      rctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      rctx.clearRect(0, 0, rw, rh);
      var tr = curTrace(), n = tr.nRoute, cw = (rw - 12) / n, ch = (rh - 12) / NP;
      for (var t = 0; t < n; t++) {
        var hcol = hist[t], isClose = tr.tokens[t].type === "c";
        var x = 6 + t * cw;
        if (isClose && hcol) { rctx.fillStyle = "rgba(215,20,28,0.10)"; rctx.fillRect(x - 1, 2, cw + 2, rh - 4); }
        for (var j = 0; j < NP; j++) {
          var y = 6 + j * ch;
          if (hcol && hcol.pOn[j]) rctx.fillStyle = isClose ? "#d7141c" : "rgba(11,11,12,0.36)";
          else rctx.fillStyle = hcol ? "rgba(11,11,12,0.07)" : "rgba(11,11,12,0.035)";
          rctx.fillRect(x + 0.6, y + 0.6, Math.max(1, cw - 1.2), Math.max(1, ch - 1.2));
        }
      }
    }

    /* ---------- playback: one trace, up to </think>, then stop ---------- */
    function setPlaying(p) {
      playing = p;
      clearTimeout(playT);
      if (p) loop();
    }
    function loop() {
      if (!playing) return;
      var type = step();
      if (type === "end" || type === null) { playing = false; return; }
      playT = setTimeout(loop, type === "c" ? 1400 : type === "tag" ? 600 : 260);
    }
    function runInstant() { for (;;) { var t = step(); if (t === "end" || t === null) break; } }
    function finished() { return tokIdx >= curTrace().tokens.length; }

    /* ---------- interaction ---------- */
    canvas.addEventListener("pointerdown", function (e) {
      dragging = true; autoRot = false; lastX = e.clientX; lastY = e.clientY;
      canvas.classList.add("dragging"); canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
      tipEl.classList.remove("on");
    });
    canvas.addEventListener("pointermove", function (e) {
      if (dragging) {
        yaw += (e.clientX - lastX) * 0.009;
        pitch = R.clamp(pitch - (e.clientY - lastY) * 0.005, 0.25, 1.05);
        lastX = e.clientX; lastY = e.clientY;
        if (!running && visible) { setCam(); draw(); }
        return;
      }
      var p = R.local(e, canvas), hit = null;
      for (var i = drawn.length - 1; i >= 0; i--) if (inPoly(p.x, p.y, drawn[i].top)) { hit = drawn[i].id; break; }
      if (hit == null) { tipEl.classList.remove("on"); return; }
      var txt = "Layer " + (((hit / E) | 0) + 1) + " · Expert " + (hit % E);
      if (isP[hit] && closing) txt += " · </think>-specific";
      tipEl.textContent = txt; tipEl.style.left = p.x + "px"; tipEl.style.top = p.y + "px"; tipEl.classList.add("on");
    });
    function endDrag() { dragging = false; canvas.classList.remove("dragging"); setTimeout(function () { autoRot = true; }, 2500); }
    canvas.addEventListener("pointerup", endDrag);
    canvas.addEventListener("pointercancel", endDrag);
    canvas.addEventListener("pointerleave", function () { tipEl.classList.remove("on"); });
    function inPoly(x, y, pts) {
      var c = false;
      for (var i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        if (((pts[i][1] > y) !== (pts[j][1] > y)) && (x < (pts[j][0] - pts[i][0]) * (y - pts[i][1]) / (pts[j][1] - pts[i][1]) + pts[i][0])) c = !c;
      }
      return c;
    }

    bNext.addEventListener("click", function () {
      setPlaying(false);
      traceIdx = (traceIdx + 1) % TRACES.length;
      resetTrace();
      if (R.reduced) runInstant(); else setPlaying(true);
    });

    /* ---------- boot ---------- */
    resize(); setCam(); resetTrace(); draw();
    R.onResize(function () { resize(); setCam(); draw(); });
    /* autoplay whenever an unplayed trace comes into view; pause off-screen, resume on return */
    var autoT = null, resume = false;
    R.onVisible(stage, function (vis) {
      visible = vis;
      if (vis && !running) { running = true; requestAnimationFrame(frame); }
      if (vis) {
        if (tokIdx === 0 && !playing) {
          if (R.reduced) runInstant();
          else { clearTimeout(autoT); autoT = setTimeout(function () { if (visible && !playing && tokIdx === 0) setPlaying(true); }, 500); }
        } else if (resume) { resume = false; if (!finished()) setPlaying(true); }
      } else {
        clearTimeout(autoT);
        if (playing) { resume = true; setPlaying(false); }
      }
    }, { threshold: 0.25 });
  });
})();
