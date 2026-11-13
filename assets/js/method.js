/* =========================================================================
   RTAQ — Method: separation animation + stage tabs. Figures are computed
   in the browser; the only control is the K selector of Stage I.
   Stage I  : exact weighted 1-D k-means (DP) codebook on a synthetic row.
   Stage II : multiple-choice knapsack via Lagrangian bisection (toy experts).
   Stage III: GPTQ-style sequential code re-assignment in a fixed codebook
              (plays when its tab opens), plus the scalar output gain.
   ========================================================================= */
(function () {
  "use strict";
  var R = window.RTAQ;
  var RED = "#d7141c", INK = "#0b0b0c";
  var KCOL = { 3: "#dcdff6", 4: "#aeb3ec", 5: "#7076d8", 6: "#2f2bb0", 8: RED };
  var LOG2 = function (k) { return Math.log(k) / Math.LN2; };
  var stageShow = {};   /* stage id -> redraw/animate when its tab is shown */

  /* =================================================== separation anim */
  function separation() {
    var stage = R.$("#sepStage"); if (!stage) return;
    var steps = R.$$(".sep-step"), cap = R.$("#sepCaption"), legend = R.$("#sepLegend");
    var lblL = R.$("#sepLabelL"), lblR = R.$("#sepLabelR");
    var COLS = 13, ROWS = 6, NT = COLS * ROWS;
    var pIdx = [2, 9, 17, 30, 36, 49, 57, 71];
    var rnd = R.rng(4242), kOf = [];
    for (var i = 0; i < NT; i++) {
      var u = rnd();
      kOf.push(u < 0.5 ? 3 : u < 0.58 ? 4 : u < 0.67 ? 5 : 6);
    }
    var tiles = [];
    for (var t = 0; t < NT; t++) {
      var el = document.createElement("div");
      el.className = "sep-tile"; el.innerHTML = "<span></span>";
      stage.appendChild(el); tiles.push(el);
    }
    var cur = -1, flickT = null, autoT = null, auto = true, geo = {};
    var CAPS = [
      "Every token is routed to a few experts per layer — activity looks scattered.",
      "At the closing position, a small and consistent group fires together: the </think>-specific experts.",
      "RTAQ identifies them from routing statistics alone (ρe ≥ τ) and sets them apart.",
      "They are frozen at 3 bits (K = 8); the remaining experts share an average 2-bit mixed-precision budget."
    ];

    function layout() {
      var W = stage.clientWidth, H = stage.clientHeight;
      var gap = W < 520 ? 3 : 6;
      var ts = Math.floor(Math.min(30, (W - 60) / (COLS + 2 + 2.6) - gap));
      var pitch = ts + gap, gridW = COLS * pitch - gap, groupW = 2 * pitch - gap, sp = Math.max(30, pitch * 2.6);
      var totalW = gridW + sp + groupW, x0 = Math.max(0, (W - totalW) / 2);
      var gridH = ROWS * pitch - gap, y0 = Math.max(8, (H - 70 - gridH) / 2);
      geo = { ts: ts, pitch: pitch, x0: x0, y0: y0, gx: x0 + gridW + sp, gridW: gridW, groupW: groupW };
      tiles.forEach(function (el) { el.style.width = ts + "px"; el.style.height = ts + "px"; el.style.fontSize = Math.max(7, ts * 0.34) + "px"; });
      /* narrow screens: the two labels cannot sit side by side, so the right one moves above its group */
      var narrow = W < 600;
      stage.classList.toggle("narrow", narrow);
      lblL.style.left = x0 + "px"; lblL.style.width = (narrow ? Math.max(gridW, 170) : gridW) + "px";
      if (narrow) {
        lblR.style.left = "auto"; lblR.style.right = Math.max(0, W - (geo.gx + groupW)) + "px"; lblR.style.width = Math.min(260, W - 8) + "px";
      } else {
        lblR.style.right = "auto"; lblR.style.left = (geo.gx + groupW / 2 - 110) + "px"; lblR.style.width = "220px";
      }
      place(cur < 0 ? 0 : cur, true);
    }
    function homePos(i) { return [geo.x0 + (i % COLS) * geo.pitch, geo.y0 + ((i / COLS) | 0) * geo.pitch]; }
    function groupPos(j) { return [geo.gx + (j % 2) * geo.pitch, geo.y0 + ((j / 2) | 0) * geo.pitch + geo.pitch]; }
    function place(s, instant) {
      tiles.forEach(function (el, i) {
        var pj = pIdx.indexOf(i), pos = (s >= 2 && pj >= 0) ? groupPos(pj) : homePos(i);
        if (instant) el.style.transition = "none";
        el.style.transform = "translate(" + pos[0] + "px," + pos[1] + "px)";
        if (instant) { void el.offsetWidth; el.style.transition = ""; }
      });
    }
    function flick(on) {
      clearInterval(flickT);
      tiles.forEach(function (el) { el.classList.remove("flick"); });
      if (!on || R.reduced) return;
      flickT = setInterval(function () {
        tiles.forEach(function (el) { el.classList.remove("flick"); });
        for (var k = 0; k < 9; k++) {
          var i = (Math.random() * NT) | 0;
          if (pIdx.indexOf(i) < 0 || Math.random() < 0.08) tiles[i].classList.add("flick");
        }
      }, 260);
    }
    function go(s) {
      cur = s;
      steps.forEach(function (b, i) { b.classList.toggle("is-active", i === s); b.classList.toggle("done", i < s); });
      cap.textContent = CAPS[s];
      flick(s === 0);
      stage.classList.toggle("s3", s === 3);
      tiles.forEach(function (el, i) {
        var isP = pIdx.indexOf(i) >= 0;
        el.classList.toggle("p", isP && s >= 1);
        if (s === 3) {
          el.style.backgroundColor = isP ? "" : KCOL[kOf[i]];
          el.querySelector("span").textContent = isP ? "3b" : "";
          el.style.color = (!isP && kOf[i] <= 4) ? INK : "#fff";
        } else { el.style.backgroundColor = ""; el.querySelector("span").textContent = ""; }
      });
      place(s, false);
      lblL.classList.toggle("on", s >= 2); lblR.classList.toggle("on", s >= 2);
      lblR.querySelector("span").textContent = s === 3 ? "preserved in high bit-width (3-bit)" : "decide when to terminate reasoning";
      lblL.querySelector("span").textContent = s === 3 ? "avg 2-bit mixed precision" : "";
      legend.classList.toggle("on", s === 3);
    }
    function autoplay() {
      clearTimeout(autoT);
      if (!auto) return;
      var next = (cur + 1) % 4;
      autoT = setTimeout(function () { go(next); progress(); autoplay(); }, cur === 3 ? 4200 : 2700);
    }
    function progress() {
      steps.forEach(function (b) { b.style.setProperty("--p", "0%"); b.style.transition = "none"; });
    }
    steps.forEach(function (b, i) {
      b.addEventListener("click", function () { auto = false; clearTimeout(autoT); go(i); });
    });
    layout(); go(0);
    R.onResize(layout);
    R.onVisible(stage, function (v) {
      if (v && auto && !R.reduced) autoplay();
      if (!v) { clearTimeout(autoT); flick(false); } else if (cur === 0) flick(true);
    }, { threshold: 0.35 });
    if (R.reduced) { go(3); auto = false; }
  }

  /* =================================================== Stage I */
  function codebook() {
    var host = R.$("#cbChart"); if (!host) return;
    var rnd = R.rng(1234), n = 4096, Z = new Float64Array(n), S = new Float64Array(n);
    for (var j = 0; j < n; j++) {
      var hot = rnd() < 0.08;
      var g = R.gauss(rnd), chi = 0;
      for (var c = 0; c < 4; c++) { var q = R.gauss(rnd); chi += q * q; }
      Z[j] = g / Math.sqrt(chi / 4) * (hot ? 1.5 : 1);
      S[j] = Math.exp(0.6 * R.gauss(rnd)) * (hot ? 7 : 1);
    }
    var mu = 0, sd = 0;
    for (j = 0; j < n; j++) mu += Z[j]; mu /= n;
    for (j = 0; j < n; j++) sd += (Z[j] - mu) * (Z[j] - mu); sd = Math.sqrt(sd / n);
    for (j = 0; j < n; j++) Z[j] = (Z[j] - mu) / sd;
    var sorted = Array.prototype.slice.call(Z).sort(function (a, b) { return a - b; });
    var lo = sorted[Math.floor(n * 1e-4)], hi = sorted[Math.ceil(n * (1 - 1e-4)) - 1];
    var B = 2048, cache = {};

    function solve(weighted) {
      var key = weighted ? "w" : "u"; if (cache[key]) return cache[key];
      var wb = new Float64Array(B), xb = new Float64Array(B);
      for (var b = 0; b < B; b++) xb[b] = lo + (b + 0.5) * (hi - lo) / B;
      for (var j = 0; j < n; j++) {
        var b2 = Math.floor((R.clamp(Z[j], lo, hi) - lo) / (hi - lo) * B); if (b2 >= B) b2 = B - 1;
        wb[b2] += weighted ? S[j] : 1;
      }
      var P0 = new Float64Array(B + 1), P1 = new Float64Array(B + 1), P2 = new Float64Array(B + 1);
      for (b = 0; b < B; b++) { P0[b + 1] = P0[b] + wb[b]; P1[b + 1] = P1[b] + wb[b] * xb[b]; P2[b + 1] = P2[b] + wb[b] * xb[b] * xb[b]; }
      function cost(i, k) { var w = P0[k + 1] - P0[i]; if (w <= 0) return 0; var m1 = P1[k + 1] - P1[i]; return (P2[k + 1] - P2[i]) - m1 * m1 / w; }
      var KM = 8, Dp = [], Tb = [];
      Dp[1] = new Float64Array(B); for (var k = 0; k < B; k++) Dp[1][k] = cost(0, k);
      for (var kk = 2; kk <= KM; kk++) {
        Dp[kk] = new Float64Array(B); Tb[kk] = new Int32Array(B);
        for (k = 0; k < B; k++) {
          if (k < kk - 1) { Dp[kk][k] = Infinity; continue; }
          var best = Infinity, arg = kk - 1;
          for (var i = kk - 1; i <= k; i++) { var v = Dp[kk - 1][i - 1] + cost(i, k); if (v < best) { best = v; arg = i; } }
          Dp[kk][k] = best; Tb[kk][k] = arg;
        }
      }
      var levels = {};
      for (kk = 4; kk <= KM; kk++) {
        var cuts = [], end = B - 1;
        for (var z = kk; z >= 2; z--) { var st = Tb[z][end]; cuts.unshift([st, end]); end = st - 1; }
        cuts.unshift([0, end]);
        levels[kk] = cuts.map(function (r) { var w = P0[r[1] + 1] - P0[r[0]]; return w > 0 ? (P1[r[1] + 1] - P1[r[0]]) / w : xb[r[0]]; });
      }
      /* ternary (TWN init + 15 alternations), alpha refit with mass */
      var m = 0; for (j = 0; j < n; j++) m += Math.abs(Z[j]); m /= n;
      var mu3 = 0, delta = 0.75 * m, alpha = 1;
      for (var it = 0; it < 15; it++) {
        var num = 0, den = 0, res = 0;
        for (j = 0; j < n; j++) {
          var d = Z[j] - mu3, T = Math.abs(d) > delta ? (d > 0 ? 1 : -1) : 0, wj = weighted ? S[j] : 1;
          num += wj * T * d; den += wj * Math.abs(T);
        }
        alpha = den > 0 ? num / den : 1;
        for (j = 0; j < n; j++) { var d2 = Z[j] - mu3, T2 = Math.abs(d2) > delta ? (d2 > 0 ? 1 : -1) : 0; res += Z[j] - mu3 - alpha * T2; }
        mu3 += res / n;
      }
      levels[3] = [mu3 - alpha, mu3, mu3 + alpha];
      cache[key] = levels;
      return levels;
    }

    /* K buttons: the codewords glide from the current codebook to the selected one */
    var Ks = [3, 4, 5, 6, 8], curK = 4, shown = null, anim = null, animId = 0, el = null, stats = {};
    function nearestIn(lv, z) { var bi = 0, bd = Infinity; for (var i = 0; i < lv.length; i++) { var d = Math.abs(z - lv[i]); if (d < bd) { bd = d; bi = i; } } return bi; }
    function statsFor(k) {
      if (stats[k]) return stats[k];
      var lv = solve(true)[k], errs = 0, sig = 0, mass = 0;
      for (var j = 0; j < n; j++) { var e = Z[j] - lv[nearestIn(lv, Z[j])]; errs += S[j] * e * e; sig += S[j] * Z[j] * Z[j]; mass += S[j]; }
      return (stats[k] = { bits: LOG2(k), mse: errs / mass, sqnr: 10 * Math.log10(sig / errs) });
    }
    function build() {
      if (!host.clientWidth) return false;
      var w = host.clientWidth, h = Math.round(Math.min(230, Math.max(190, w * 0.4)));
      var m = { l: 10, r: 10, t: 16, b: 40 };
      var svg = R.newSvg(host, w, h), x = R.scale(-4.5, 4.5, m.l, w - m.r), y = R.scale(0, 1, h - m.b, m.t);
      var NB = 90, hu = new Float64Array(NB), hw = new Float64Array(NB);
      for (var j = 0; j < n; j++) { var b = Math.floor((R.clamp(Z[j], -4.499, 4.499) + 4.5) / 9 * NB); hu[b] += 1; hw[b] += S[j]; }
      var mu = Math.max.apply(null, hu), mw = Math.max.apply(null, hw), bw = (w - m.l - m.r) / NB, bars = [];
      for (var b2 = 0; b2 < NB; b2++) {
        var hh = hu[b2] / mu;
        bars.push({ cx: -4.5 + (b2 + 0.5) * 9 / NB, r: R.svg("rect", { x: m.l + b2 * bw + 0.5, width: Math.max(0.6, bw - 1), y: y(hh), height: y(0) - y(hh), rx: 1 }, svg) });
      }
      var d = "M" + Array.prototype.map.call(hw, function (v, i2) { return (m.l + (i2 + 0.5) * bw) + "," + y(v / mw * 0.98); }).join("L");
      R.svg("path", { d: d, fill: "none", stroke: INK, "stroke-width": 1.3, opacity: 0.55 }, svg);
      R.svg("line", { x1: m.l, x2: w - m.r, y1: y(0), y2: y(0), stroke: "#cfcfca" }, svg);
      R.text(svg, w - m.r, m.t + 2, "line: activation-weighted mass", { "text-anchor": "end", "font-size": 10.5, fill: "#77777e" });
      el = { x: x, y: y, m: m, w: w, bars: bars, g: R.svg("g", {}, svg) };
      return true;
    }
    function draw(lv) {
      if (!el) return;
      var x = el.x, y = el.y, m = el.m, g = el.g;
      el.bars.forEach(function (b) { b.r.setAttribute("fill", nearestIn(lv, b.cx) % 2 ? "#b9bdf0" : "#d9dcf6"); });
      while (g.firstChild) g.removeChild(g.firstChild);
      for (var i = 0; i < lv.length - 1; i++) {
        var bx = x((lv[i] + lv[i + 1]) / 2);
        R.svg("line", { x1: bx, x2: bx, y1: m.t, y2: y(0), stroke: "#9a9aa2", "stroke-dasharray": "2 3" }, g);
      }
      lv.forEach(function (c) {
        var lx = x(c);
        R.svg("line", { x1: lx, x2: lx, y1: m.t - 4, y2: y(0) + 8, stroke: RED, "stroke-width": 2 }, g);
        R.svg("rect", { x: lx - 5, y: y(0) + 8, width: 10, height: 10, rx: 2, fill: RED }, g);
        if (el.w > 360 || lv.length <= 5) R.text(g, lx, y(0) + 31, c.toFixed(2), { "text-anchor": "middle", "font-size": 10, "font-family": "JetBrains Mono, monospace", fill: "#55555c" });
      });
    }
    function kpis(s) {
      R.$("#cbBits").textContent = s.bits.toFixed(2);
      R.$("#cbErr").textContent = s.mse.toFixed(4);
      R.$("#cbSqnr").textContent = s.sqnr.toFixed(1) + " dB";
    }
    function show(k, animate) {
      var prev = curK; curK = k;
      if (!el) return;
      var to = solve(true)[k], from = shown || to, s1 = statsFor(k), s0 = statsFor(prev);
      cancelAnimationFrame(anim);
      if (!animate || R.reduced || from === to) { shown = to; draw(to); kpis(s1); return; }
      /* each new codeword starts from the old codeword at the same relative rank: levels split or merge */
      var a = from.length, b = to.length;
      var start = to.map(function (_, j) { return from[b === 1 ? 0 : Math.round(j * (a - 1) / (b - 1))]; });
      var t0 = performance.now(), D = 750, token = ++animId;
      (function f(now) {
        if (token !== animId) return;
        var t = R.clamp((now - t0) / D, 0, 1), e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        shown = start.map(function (s, j) { return s + (to[j] - s) * e; });
        draw(shown);
        kpis({ bits: s0.bits + (s1.bits - s0.bits) * e, mse: s0.mse + (s1.mse - s0.mse) * e, sqnr: s0.sqnr + (s1.sqnr - s0.sqnr) * e });
        if (t < 1) anim = requestAnimationFrame(f); else shown = to;
      })(t0);
      /* make sure the figure lands on the exact solution even if frames are throttled */
      setTimeout(function () { if (token === animId && shown !== to) { cancelAnimationFrame(anim); shown = to; draw(to); kpis(s1); } }, D + 80);
    }
    R.tabs(R.$("#cbK"), Ks.map(function (k) {
      return { key: k, label: '<span class="kc-top"><i style="background:' + KCOL[k] + '"></i>K=' + k + '</span><small>' + (Math.round(LOG2(k) * 100) / 100) + '<span class="kc-unit"> bits</span><span class="kc-b">b</span></small>' };
    }), function (k) { show(k, true); }, 1);
    function render() {
      cancelAnimationFrame(anim); animId++;
      if (build()) { shown = solve(true)[curK]; draw(shown); kpis(statsFor(curK)); }
    }
    stageShow["1"] = render;
    R.once(host, render, 0.01); render();
    R.onResize(function () { if (host.clientWidth) render(); });
  }

  /* =================================================== stage tabs */
  function stageTabs() {
    var tabs = R.$$(".stage-tab"), panes = R.$$(".stage-pane");
    tabs.forEach(function (t) {
      t.addEventListener("click", function () {
        var s = t.dataset.stage;
        tabs.forEach(function (x) { x.classList.toggle("is-active", x === t); x.setAttribute("aria-selected", x === t ? "true" : "false"); });
        panes.forEach(function (p) { p.classList.toggle("is-active", p.dataset.stage === s); });
        if (stageShow[s]) stageShow[s]();
      });
    });
  }

  /* =================================================== Stage II */
  function allocator() {
    var grid = R.$("#allocGrid"); if (!grid) return;
    var N = 256, rnd = R.rng(777), MSE = { 3: 0.1902, 4: 0.1175, 5: 0.0799, 6: 0.0580, 8: 0.0345 };
    var Kset = [3, 4, 5, 6];
    var isP = new Array(N).fill(false), sens = [], cost = [];
    var pos = [21, 58, 99, 140, 187, 230];
    pos.forEach(function (p) { isP[p] = true; });
    for (var e = 0; e < N; e++) {
      var s = Math.exp(1.05 * R.gauss(rnd));
      if (isP[e]) s = 0.55 + rnd() * 0.5;
      sens.push(s);
      var row = {};
      Kset.forEach(function (k) { row[k] = s * MSE[k] * (1 + 0.18 * (rnd() - 0.5)); });
      row[8] = s * MSE[8];
      cost.push(row);
    }
    var cells = [];
    for (e = 0; e < N; e++) { var c = document.createElement("i"); if (isP[e]) c.className = "p"; grid.appendChild(c); cells.push(c); }
    var barsHost = R.$("#allocBars"), bars = {};
    [3, 4, 5, 6, 8].forEach(function (k) {
      var d = document.createElement("div"); d.className = "ab";
      d.innerHTML = '<span class="ab-v">0%</span><span class="ab-bar" style="background:' + KCOL[k] + '"></span><span class="ab-k">K=' + k + "</span>";
      barsHost.appendChild(d); bars[k] = d;
    });
    var msg = R.$("#allocMsg"), TARGET = 2.0;

    function allocate(target, pinOn) {
      var ids = [], fixedBits = 0, K = new Array(N);
      for (var e = 0; e < N; e++) { if (pinOn && isP[e]) { K[e] = 8; fixedBits += 3; } else ids.push(e); }
      var Bud = N * target - fixedBits;
      function pick(lam) {
        var bits = 0;
        ids.forEach(function (e) {
          var best = Infinity, bk = 3;
          Kset.forEach(function (k) { var v = cost[e][k] + lam * LOG2(k); if (v < best) { best = v; bk = k; } });
          K[e] = bk; bits += LOG2(bk);
        });
        return bits;
      }
      var lo = 0, hi = 10, lam = hi;
      if (pick(0) <= Bud) lam = 0;
      else {
        for (var it = 0; it < 60; it++) { var mid = (lo + hi) / 2; if (pick(mid) <= Bud) hi = mid; else lo = mid; }
        lam = hi;
      }
      var used = pick(lam);
      /* greedy slack fill */
      var guard = 0;
      while (guard++ < 2000) {
        var best = null, bestG = 0;
        ids.forEach(function (e) {
          var k = K[e], i = Kset.indexOf(k); if (i >= Kset.length - 1) return;
          var k2 = Kset[i + 1], db = LOG2(k2) - LOG2(k);
          if (used + db > Bud + 1e-9) return;
          var g = (cost[e][k] - cost[e][k2]) / db;
          if (g > bestG) { bestG = g; best = [e, k2, db]; }
        });
        if (!best) break;
        K[best[0]] = best[1]; used += best[2];
      }
      var total = 0, loss = 0;
      for (e = 0; e < N; e++) { total += LOG2(K[e]); loss += cost[e][K[e]]; }
      return { K: K, avg: total / N, lam: lam, loss: loss };
    }

    /* static figure: the allocation at 2.00 bits with the termination-aware experts pinned */
    function update() {
      var res = allocate(TARGET, true), cnt = { 3: 0, 4: 0, 5: 0, 6: 0, 8: 0 };
      res.K.forEach(function (k, e) {
        cnt[k]++;
        cells[e].style.backgroundColor = KCOL[k];
      });
      var mx = 0; [3, 4, 5, 6, 8].forEach(function (k) { mx = Math.max(mx, cnt[k] / N * 100); });
      var scaleMax = Math.max(60, mx);
      [3, 4, 5, 6, 8].forEach(function (k) {
        var p = cnt[k] / N * 100;
        var bar = bars[k].querySelector(".ab-bar"); bar.dataset.h = (p / scaleMax * 86) + "%"; bar.style.height = bar.dataset.h;
        bars[k].querySelector(".ab-v").textContent = p.toFixed(1) + "%";
      });
      /* for the caption: what the same knapsack would do without pinning */
      var free = allocate(TARGET, false);
      var low = pos.filter(function (p) { return free.K[p] <= 4; }).length;
      msg.className = "alloc-msg good";
      msg.innerHTML = "𝒫 held at 3 bits · average <b>" + res.avg.toFixed(3) + "</b> bits/weight." +
        (low ? " Without pinning, the knapsack would push <b>" + low + " of " + pos.length + "</b> termination experts down to ≤ 2 bits." : "");
    }
    update();
    cells.forEach(function (c, e) { c.style.setProperty("--d", ((e % 32) * 12 + ((e / 32) | 0) * 22) + "ms"); });
    stageShow["2"] = function () {
      if (R.reduced) return;
      grid.classList.remove("anim"); void grid.offsetWidth; grid.classList.add("anim");
      [3, 4, 5, 6, 8].forEach(function (k) { var b = bars[k].querySelector(".ab-bar"); b.style.transition = "none"; b.style.height = "0%"; });
      void barsHost.offsetWidth;
      setTimeout(function () { [3, 4, 5, 6, 8].forEach(function (k) { var b = bars[k].querySelector(".ab-bar"); b.style.transition = ""; b.style.height = b.dataset.h; }); }, 380);
    };
  }

  /* =================================================== Stage III */
  function gptq() {
    var host = R.$("#gptqChart"); if (!host) return;
    var p = 16, C = [-1.510, -0.4528, 0.4528, 1.510], seed = 11;
    var H, w0, qNear, qG, states, step = -1, timer = null;

    function chol(A) {
      var n = A.length, Lm = A.map(function () { return new Float64Array(n); });
      for (var i = 0; i < n; i++) for (var j = 0; j <= i; j++) {
        var s = A[i][j]; for (var k = 0; k < j; k++) s -= Lm[i][k] * Lm[j][k];
        Lm[i][j] = i === j ? Math.sqrt(Math.max(s, 1e-12)) : s / Lm[j][j];
      }
      return Lm;
    }
    function inv(A) {
      var n = A.length, M = A.map(function (r, i) { var x = Array.prototype.slice.call(r); for (var j = 0; j < n; j++) x.push(i === j ? 1 : 0); return x; });
      for (var c = 0; c < n; c++) {
        var piv = c; for (var r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
        var tmp = M[c]; M[c] = M[piv]; M[piv] = tmp;
        var d = M[c][c]; for (var j = 0; j < 2 * n; j++) M[c][j] /= d;
        for (r = 0; r < n; r++) if (r !== c) { var f = M[r][c]; if (f) for (j = 0; j < 2 * n; j++) M[r][j] -= f * M[c][j]; }
      }
      return M.map(function (r) { return r.slice(n); });
    }
    function nearestIdx(v) { var bi = 0, bd = Infinity; C.forEach(function (c, i) { var d = Math.abs(v - c); if (d < bd) { bd = d; bi = i; } }); return bi; }
    function outErr(w, q) {
      var d = w.map(function (v, i) { return v - C[q[i]]; }), s = 0;
      for (var i = 0; i < p; i++) for (var j = 0; j < p; j++) s += d[i] * H[i][j] * d[j];
      return s;
    }
    function setup() {
      var rnd = R.rng(seed), t = 96, X = [];
      for (var s = 0; s < t; s++) {
        var row = [], prev = R.gauss(rnd);
        for (var i = 0; i < p; i++) { prev = 0.82 * prev + Math.sqrt(1 - 0.82 * 0.82) * R.gauss(rnd); row.push(prev * (0.6 + 0.8 * ((i * 7) % 5) / 4)); }
        X.push(row);
      }
      H = []; var md = 0;
      for (var a = 0; a < p; a++) { H.push(new Float64Array(p)); for (var b = 0; b < p; b++) { var v = 0; for (s = 0; s < t; s++) v += X[s][a] * X[s][b]; H[a][b] = v / t; } md += H[a][a]; }
      md /= p; for (a = 0; a < p; a++) H[a][a] += 0.01 * md;
      w0 = []; for (a = 0; a < p; a++) w0.push(R.clamp(R.gauss(rnd) * 0.95, -2.3, 2.3));
      qNear = w0.map(nearestIdx);
      /* GPTQ: U = upper Cholesky of H^-1 */
      var Hi = inv(H), Lc = chol(Hi);
      var U = []; for (a = 0; a < p; a++) { U.push(new Float64Array(p)); for (b = 0; b < p; b++) U[a][b] = Lc[b][a]; }
      var w = w0.slice(); qG = []; states = [{ w: w.slice(), q: [] }];
      for (var j = 0; j < p; j++) {
        var qi = nearestIdx(w[j]); qG.push(qi);
        var err = (w[j] - C[qi]) / U[j][j];
        for (var k = j + 1; k < p; k++) w[k] -= err * U[j][k];
        states.push({ w: w.slice(), q: qG.slice() });
      }
      step = -1;
    }

    var svgEls = null;
    function render() {
      if (!host.clientWidth) return;
      var w = host.clientWidth, h = Math.round(Math.min(220, Math.max(190, w * 0.4)));
      var m = { l: 34, r: 8, t: 12, b: 26 };
      var svg = R.newSvg(host, w, h);
      var y = R.scale(-2.6, 2.6, h - m.b, m.t), cw = (w - m.l - m.r) / p;
      C.forEach(function (c, i) {
        R.svg("line", { x1: m.l, x2: w - m.r, y1: y(c), y2: y(c), stroke: "#e3e3df", "stroke-width": 1.2 }, svg);
        R.text(svg, m.l - 6, y(c) + 4, "c" + (i + 1), { "text-anchor": "end", "font-size": 10.5, fill: "#77777e", "font-family": "JetBrains Mono, monospace" });
      });
      R.svg("line", { x1: m.l, x2: w - m.r, y1: y(0), y2: y(0), stroke: "#c9c9c4", "stroke-dasharray": "2 3" }, svg);
      var band = R.svg("rect", { y: m.t, height: h - m.t - m.b, width: cw, fill: RED, opacity: 0, rx: 4 }, svg);
      var cols = [];
      for (var j = 0; j < p; j++) {
        var cx = m.l + cw * j + cw / 2, bwid = Math.max(3, cw * 0.18);
        R.svg("rect", { x: cx - bwid / 2, width: bwid, y: Math.min(y(0), y(w0[j])), height: Math.abs(y(w0[j]) - y(0)), fill: "#d6d6d1", rx: 1.5 }, svg);
        var code = R.svg("rect", { x: -Math.min(13, cw * 0.36), y: -6, width: Math.min(26, cw * 0.72), height: 12, rx: 3, fill: INK, opacity: 0 }, svg);
        var dot = R.svg("circle", { r: Math.min(5, cw * 0.2), fill: "#fff", stroke: INK, "stroke-width": 2 }, svg);
        dot.style.transition = "transform .32s cubic-bezier(.2,.7,.1,1)";
        code.style.transition = "transform .25s, opacity .25s";
        R.text(svg, cx, h - 8, j + 1, { "text-anchor": "middle", "font-size": 9.5, fill: "#9d9da4", "font-family": "JetBrains Mono, monospace" });
        cols.push({ cx: cx, dot: dot, code: code });
      }
      svgEls = { y: y, cw: cw, m: m, band: band, cols: cols };
      paint(true);
    }
    function paint(instant) {
      if (!svgEls) return;
      var st = states[Math.max(0, step + 1)] || states[0], y = svgEls.y;
      if (step < 0) st = states[0];
      svgEls.cols.forEach(function (c, j) {
        var val = st.w[j];
        if (instant) c.dot.style.transition = "none";
        c.dot.style.transform = "translate(" + c.cx + "px," + y(val) + "px)";
        if (instant) { void c.dot.getBoundingClientRect(); c.dot.style.transition = "transform .32s cubic-bezier(.2,.7,.1,1)"; }
        var qi = st.q[j];
        if (qi != null) {
          c.code.style.transform = "translate(" + c.cx + "px," + y(C[qi]) + "px)";
          c.code.setAttribute("opacity", 1);
          c.code.setAttribute("fill", qi !== qNear[j] ? RED : INK);
          c.dot.setAttribute("opacity", 0.35);
        } else {
          c.code.setAttribute("opacity", 0); c.dot.setAttribute("opacity", 1);
        }
      });
      var done = step >= p - 1;
      if (step >= 0 && !done) {
        svgEls.band.setAttribute("x", svgEls.m.l + svgEls.cw * step); svgEls.band.setAttribute("opacity", 0.08);
      } else svgEls.band.setAttribute("opacity", 0);
      var changed = 0; (st.q || []).forEach(function (q, j) { if (q !== qNear[j]) changed++; });
      R.$("#gChanged").textContent = changed + " / " + p;
      var eN = outErr(w0, qNear);
      R.$("#gErrN").textContent = "1.00×";
      R.$("#gErrG").textContent = done ? (outErr(w0, qG) / eN).toFixed(2) + "×" : "—";
    }
    /* no controls: the sweep plays once when the figure scrolls into view, then rests on the result */
    function run() {
      clearInterval(timer);
      if (R.reduced) { step = p - 1; paint(true); return; }
      step = -1; paint(true);
      timer = setInterval(function () {
        step++; paint(false);
        if (step >= p - 1) clearInterval(timer);
      }, 300);
    }
    setup();

    /* scalar gain: static before/after */
    var gHost = R.$("#gainChart");
    var gr = R.rng(55), ref = [], qo = [];
    for (var i = 0; i < 3000; i++) { var rv = R.gauss(gr); ref.push(rv); qo.push(0.84 * rv + 0.09 * R.gauss(gr)); }
    var num = 0, den = 0, nr = 0;
    for (i = 0; i < ref.length; i++) { num += qo[i] * ref[i]; den += qo[i] * qo[i]; nr += ref[i] * ref[i]; }
    var gamma = num / den, ratio = Math.sqrt(den / nr);
    function hist(arr, s) {
      var NB = 48, hb = new Float64Array(NB);
      arr.forEach(function (v) { var b = Math.floor((v * s + 3.6) / 7.2 * NB); if (b >= 0 && b < NB) hb[b]++; });
      return hb;
    }
    /* two panels side by side: before (q) and after (γe·q), each against the BF16 output r */
    function renderGain() {
      if (!gHost.clientWidth) return;
      var w = gHost.clientWidth, h = 122, gap = 18, pw = (w - gap) / 2, m = { t: 34, b: 20 };
      var svg = R.newSvg(gHost, w, h);
      var hr = hist(ref, 1), mx = Math.max(Math.max.apply(null, hr), Math.max.apply(null, hist(qo, 1)));
      var y = R.scale(0, mx, h - m.b, m.t);
      [{ s: 1, t: "before: q", c: "#9d9da4" }, { s: gamma, t: "after: γe · q", c: RED }].forEach(function (pn, k) {
        var x0 = k * (pw + gap), x = R.scale(0, 48, x0 + 4, x0 + pw - 4), hq = hist(qo, pn.s);
        function area(hb) { return "M" + x(0) + "," + y(0) + Array.prototype.map.call(hb, function (v, i2) { return "L" + x(i2) + "," + y(v) + "L" + x(i2 + 1) + "," + y(v); }).join("") + "L" + x(48) + "," + y(0) + "Z"; }
        R.svg("path", { d: area(hq), fill: pn.c, opacity: 0.55 }, svg);
        R.svg("path", { d: area(hr), fill: "none", stroke: INK, "stroke-width": 1.3 }, svg);
        R.svg("line", { x1: x0, x2: x0 + pw, y1: y(0), y2: y(0), stroke: "#cfcfca" }, svg);
        R.text(svg, x0 + 4, 13, pn.t, { "font-size": 11.5, "font-weight": 700, fill: k ? RED : "#55555c" });
        R.text(svg, x0 + 4, 27, "‖·‖ / ‖r‖ = " + (ratio * pn.s).toFixed(2), { "font-size": 10.5, fill: "#77777e", "font-family": "JetBrains Mono, monospace" });
      });
      R.text(svg, w / 2, h - 3, "outline: BF16 expert output r · γe = " + gamma.toFixed(3) + ", folded into the down-projection scale", { "font-size": 10.5, fill: "#77777e", "text-anchor": "middle" });
    }
    render(); renderGain();
    stageShow["3"] = function () { render(); renderGain(); run(); };
    R.onResize(function () { render(); renderGain(); });
  }

  document.addEventListener("DOMContentLoaded", function () {
    separation(); stageTabs(); codebook(); allocator(); gptq();
  });
})();
