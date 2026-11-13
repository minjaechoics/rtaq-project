/* =========================================================================
   RTAQ — Observations: paper-data charts (Fig. 2a, Fig. 4 counts, Fig. 5a,
   Fig. 5b), drawn as responsive SVG.
   ========================================================================= */
(function () {
  "use strict";
  var R = window.RTAQ, D = window.RTAQ_DATA;
  var RED = "#d7141c", INK = "#0b0b0c", GREY = "#8d8d94";

  /* ------------------------------------------------------------ Fig 2a */
  function histogram() {
    var host = R.$("#histChart"); if (!host) return;
    var counts = D.fig2a.counts, nb = counts.length, total = counts.reduce(function (a, b) { return a + b; }, 0);
    var tau = 0.8, svg, bars = [], tline, tlabel, x, y, w, h, m;
    var tip = R.tip(host);

    function render() {
      w = Math.max(300, host.clientWidth); h = Math.round(Math.min(320, Math.max(240, w * 0.56)));
      m = { l: 46, r: 14, t: 26, b: 42 };
      svg = R.newSvg(host, w, h); tip = R.tip(host);
      x = R.scale(0, 1, m.l, w - m.r);
      y = R.scale(Math.log10(5), Math.log10(40000), h - m.b, m.t);
      var ax = R.svg("g", { "class": "ax" }, svg);
      [10, 100, 1000, 10000].forEach(function (v) {
        R.svg("line", { x1: m.l, x2: w - m.r, y1: y(Math.log10(v)), y2: y(Math.log10(v)), "class": "grid-l" }, ax);
        R.text(ax, m.l - 8, y(Math.log10(v)) + 4, v >= 1000 ? (v / 1000) + "k" : v, { "text-anchor": "end" });
      });
      [0, 0.2, 0.4, 0.6, 0.8, 1].forEach(function (v) { R.text(ax, x(v), h - m.b + 17, v.toFixed(1), { "text-anchor": "middle" }); });
      R.text(ax, (m.l + w - m.r) / 2, h - 6, "activation rate at closing positions  ρe(Ωclose)", { "text-anchor": "middle", "class": "ax-label" });
      R.text(ax, 12, m.t - 10, "# experts (log)", { "class": "ax-label" });
      R.svg("line", { x1: m.l, x2: w - m.r, y1: h - m.b, y2: h - m.b, stroke: "#cfcfca" }, svg);

      bars = counts.map(function (c, i) {
        var x0 = x(i / nb) + 0.8, x1 = x((i + 1) / nb) - 0.8;
        var rect = R.svg("rect", { x: x0, width: Math.max(1, x1 - x0), y: y(Math.log10(c)), height: (h - m.b) - y(Math.log10(c)), rx: 1.5 }, svg);
        rect.addEventListener("pointerenter", function () {
          tip.show((x0 + x1) / 2 / w * host.clientWidth, y(Math.log10(c)) / h * host.clientHeight,
            "ρ ∈ [" + (i / nb).toFixed(2) + ", " + ((i + 1) / nb).toFixed(2) + ") · <b>" + R.comma(c) + "</b> experts");
        });
        rect.addEventListener("pointerleave", tip.hide);
        return rect;
      });
      /* uniform k/E */
      var ux = x(D.fig2a.uniform);
      R.svg("line", { x1: ux, x2: ux, y1: m.t, y2: h - m.b, stroke: INK, "stroke-dasharray": "3 3", "stroke-width": 1.2 }, svg);
      R.text(svg, x(1 / nb) + 6, y(Math.log10(2200)), "← uniform k/E", { "font-size": 11, "font-weight": 600, fill: INK });
      /* threshold (fixed at the paper's tau = 0.8) */
      var g = R.svg("g", { "pointer-events": "none" }, svg);
      tline = R.svg("line", { x1: 0, x2: 0, y1: m.t - 8, y2: h - m.b, stroke: RED, "stroke-width": 2, "stroke-dasharray": "5 3" }, g);
      R.svg("circle", { cx: 0, cy: m.t - 8, r: 5, fill: RED }, g);
      tlabel = R.text(g, 0, m.t - 14, "", { "text-anchor": "end", "font-size": 11.5, "font-weight": 700, fill: RED });
      update();
    }
    function update() {
      var n = 0;
      bars.forEach(function (b, i) {
        var on = i / nb >= tau - 1e-9;
        if (on) n += counts[i];
        b.setAttribute("fill", on ? RED : (i === 0 ? "#6c6c73" : "#a3a3aa"));
      });
      var gx = x(tau), g = tline.parentNode;
      g.setAttribute("transform", "translate(" + gx + ",0)");
      tlabel.textContent = "τ = " + tau.toFixed(1);
      tlabel.setAttribute("text-anchor", "end");
      tlabel.setAttribute("x", -8);
      R.$("#tauCount").textContent = R.comma(n);
      R.$("#tauPct").textContent = (n / total * 100).toFixed(2) + "%";
    }
    render(); R.onResize(render);
  }

  /* ------------------------------------------------------------ haystack */
  function haystack() {
    var cv = R.$("#hayCanvas"), tabs = R.$("#hayTabs"); if (!cv) return;
    var ctx = cv.getContext("2d"), cur = 0, anim = null;
    function draw(mi, animate) {
      var md = D.models[mi], cols = md.grid[0], rows = md.grid[1];
      var wrap = cv.parentNode, cw = wrap.clientWidth - 20, dpr = Math.min(window.devicePixelRatio || 1, 2);
      var cell = cw / cols, ch = Math.round(cell * rows);
      cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr);
      cv.style.height = ch + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var gap = cell > 5 ? 1 : cell > 2.6 ? 0.6 : 0.35;
      ctx.fillStyle = "#1b1b20";
      for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) ctx.fillRect(c * cell, r * cell, cell - gap, cell - gap);
      /* red cells at seeded positions */
      var rnd = R.rng(R.hash(md.id)), picked = {}, list = [];
      while (list.length < md.pinned) { var k = (rnd() * md.experts) | 0; if (!picked[k]) { picked[k] = 1; list.push(k); } }
      var rs = Math.max(cell - gap, 2.2);
      function red(n) {
        ctx.fillStyle = "#ff3b3b";
        for (var i = 0; i < n; i++) {
          var id = list[i], cx = (id % cols) * cell, cy = ((id / cols) | 0) * cell;
          ctx.fillRect(cx + (cell - gap - rs) / 2, cy + (cell - gap - rs) / 2, rs, rs);
        }
      }
      cancelAnimationFrame(anim);
      if (!animate || R.reduced) { red(list.length); return; }
      var t0 = performance.now(), done = 0;
      (function stepA(now) {
        var t = R.clamp((now - t0) / 900, 0, 1), n = Math.round(list.length * R.easeOut(t));
        if (n > done) { red(n); done = n; }
        if (t < 1) anim = requestAnimationFrame(stepA);
      })(t0);
    }
    R.tabs(tabs, D.models.map(function (m, i) { return { key: i, label: m.short }; }), function (k) {
      cur = k; var md = D.models[k];
      R.$("#hayTotal").textContent = R.comma(md.experts);
      R.$("#hayP").textContent = (md.pinnedApprox ? "≈" : "") + R.comma(md.pinned);
      R.$("#hayPct").textContent = md.pinnedPct.toFixed(2) + "%";
      draw(k, true);
    });
    R.onResize(function () { draw(cur, false); });
  }

  /* ------------------------------------------------------------ Fig 5a */
  function lineChart() {
    var host = R.$("#lineChart"); if (!host || !window.RTAQ_FIG5A) return;
    var F = window.RTAQ_FIG5A;
    function render() {
      var w = Math.max(300, host.clientWidth), h = Math.round(Math.min(330, Math.max(240, w * 0.48)));
      var m = { l: 42, r: 14, t: 34, b: 40 };
      var svg = R.newSvg(host, w, h), tip = R.tip(host);
      var x = R.scale(-50, 5, m.l, w - m.r), y = R.scale(0, 100, h - m.b, m.t);
      var ax = R.svg("g", { "class": "ax" }, svg);
      [0, 20, 40, 60, 80, 100].forEach(function (v) {
        R.svg("line", { x1: m.l, x2: w - m.r, y1: y(v), y2: y(v), "class": "grid-l" }, ax);
        R.text(ax, m.l - 8, y(v) + 4, v + "%", { "text-anchor": "end" });
      });
      [-50, -40, -30, -20, -10, 0].forEach(function (v) { R.text(ax, x(v), h - m.b + 17, v === 0 ? "0" : "−" + Math.abs(v), { "text-anchor": "middle" }); });
      R.text(ax, (m.l + w - m.r) / 2, h - 6, "relative position to the closing token  (t − c)", { "text-anchor": "middle", "class": "ax-label" });
      R.svg("line", { x1: x(0), x2: x(0), y1: m.t - 6, y2: h - m.b, stroke: INK, "stroke-dasharray": "4 3" }, svg);
      R.text(svg, x(0) - 6, m.t - 12, "closing position", { "text-anchor": "end", "font-size": 11, "font-weight": 700, fill: INK });

      function band(b, col) {
        var d = "M" + b.map(function (p) { return x(p[0]) + "," + y(p[2]); }).join("L") +
          "L" + b.slice().reverse().map(function (p) { return x(p[0]) + "," + y(p[1]); }).join("L") + "Z";
        R.svg("path", { d: d, fill: col, opacity: 0.16 }, svg);
      }
      function line(pts, col, wdt) {
        var path = R.svg("path", { d: "M" + pts.map(function (p) { return x(p[0]) + "," + y(p[1]); }).join("L"), fill: "none", stroke: col, "stroke-width": wdt, "stroke-linejoin": "round" }, svg);
        if (!R.reduced) {
          var len = path.getTotalLength ? path.getTotalLength() : 1000;
          path.style.strokeDasharray = len; path.style.strokeDashoffset = len;
          R.once(host, function () { path.style.transition = "stroke-dashoffset 1.6s cubic-bezier(.2,.7,.1,1)"; path.style.strokeDashoffset = 0; }, 0.3);
        }
        return path;
      }
      band(F.newlineBand, GREY); band(F.closeBand, RED);
      line(F.newline, "#77777e", 1.8); line(F.close, RED, 2.4);
      /* legend */
      var lg = R.svg("g", { transform: "translate(" + (m.l + 12) + "," + (m.t + 6) + ")" }, svg);
      R.svg("line", { x1: 0, x2: 18, y1: 0, y2: 0, stroke: RED, "stroke-width": 2.4 }, lg);
      R.text(lg, 24, 4, "Closing position", { "font-size": 11.5, fill: INK });
      R.svg("line", { x1: 0, x2: 18, y1: 17, y2: 17, stroke: "#77777e", "stroke-width": 1.8 }, lg);
      R.text(lg, 24, 21, "Other \\n (same input token)", { "font-size": 11.5, fill: INK });
      /* hover */
      var cross = R.svg("line", { y1: m.t, y2: h - m.b, stroke: INK, "stroke-width": 1, opacity: 0 }, svg);
      var d1 = R.svg("circle", { r: 4.5, fill: RED, stroke: "#fff", "stroke-width": 2, opacity: 0 }, svg);
      var d2 = R.svg("circle", { r: 4, fill: "#77777e", stroke: "#fff", "stroke-width": 2, opacity: 0 }, svg);
      var hit = R.svg("rect", { x: m.l, y: m.t, width: w - m.l - m.r, height: h - m.t - m.b, fill: "transparent" }, svg);
      hit.addEventListener("pointermove", function (e) {
        var p = R.local(e, svg), px = p.x / p.w * w, t = Math.round(R.clamp(x.inv(px), -50, 5));
        var a = F.close.filter(function (q) { return q[0] === t; })[0], b = F.newline.filter(function (q) { return q[0] === t; })[0];
        if (!a || !b) return;
        cross.setAttribute("x1", x(t)); cross.setAttribute("x2", x(t)); cross.setAttribute("opacity", 0.25);
        d1.setAttribute("cx", x(t)); d1.setAttribute("cy", y(a[1])); d1.setAttribute("opacity", 1);
        d2.setAttribute("cx", x(t)); d2.setAttribute("cy", y(b[1])); d2.setAttribute("opacity", 1);
        tip.show(x(t) / w * p.w, y(Math.max(a[1], b[1])) / h * p.h,
          "t − c = <b>" + (t > 0 ? "+" : "") + t + "</b><br><span style='color:#ff8a8a'>closing</span> <b>" + a[1].toFixed(1) + "%</b> · other \\n <b>" + b[1].toFixed(1) + "%</b>");
      });
      hit.addEventListener("pointerleave", function () { tip.hide(); cross.setAttribute("opacity", 0); d1.setAttribute("opacity", 0); d2.setAttribute("opacity", 0); });
    }
    render(); R.onResize(render);
  }

  /* ------------------------------------------------------------ Fig 5b */
  function stripChart() {
    var host = R.$("#stripChart"); if (!host || !window.RTAQ_FIG5B) return;
    var F = window.RTAQ_FIG5B;
    var rows = [
      { k: "Ours", name: "Ours (routing)", ours: true },
      { k: "NLL", name: "NLL (first-order)" },
      { k: "Output", name: "Output error" },
      { k: "Hessian", name: "Hessian trace (HAWQ-V2)" },
      { k: "Fisher", name: "Fisher" }
    ];
    var slider = R.$("#topSlider"), outEl = R.$("#topOut"), out2 = R.$("#topOut2"), barsHost = R.$("#protectBars");
    var dots = [], shade, shadeLbl, x, w, h, m;
    function q(arr, p) { var s = arr.slice().sort(function (a, b) { return a - b; }); var i = (s.length - 1) * p, lo = Math.floor(i); return s[lo] + (s[Math.ceil(i)] - s[lo]) * (i - lo); }

    /* protect bars */
    barsHost.innerHTML = "";
    var pbs = rows.map(function (r) {
      var d = document.createElement("div"); d.className = "pb" + (r.ours ? " ours" : "");
      d.innerHTML = '<span class="pb-name">' + r.name.replace(" (", "<br><small>(").replace(")", ")</small>") + '</span><span class="pb-track"><span class="pb-fill"></span></span><span class="pb-val">0%</span>';
      barsHost.appendChild(d); return d;
    });

    function render() {
      w = Math.max(300, host.clientWidth);
      var rowH = w < 520 ? 46 : 54;
      m = { l: w < 520 ? 92 : 150, r: 14, t: 14, b: 40 };
      h = m.t + m.b + rowH * rows.length;
      var svg = R.newSvg(host, w, h);
      x = R.scale(0, 100, m.l, w - m.r);
      shade = R.svg("rect", { y: m.t - 4, height: rowH * rows.length + 4, fill: RED, opacity: 0.07 }, svg);
      shadeLbl = R.text(svg, 0, h - m.b + 32, "", { "font-size": 11, "font-weight": 700, fill: RED, "text-anchor": "middle" });
      var ax = R.svg("g", { "class": "ax" }, svg);
      [0, 20, 40, 60, 80, 100].forEach(function (v) {
        R.svg("line", { x1: x(v), x2: x(v), y1: m.t - 4, y2: h - m.b, "class": "grid-l" }, ax);
        R.text(ax, x(v), h - m.b + 16, v, { "text-anchor": "middle" });
      });
      R.svg("line", { x1: x(50), x2: x(50), y1: m.t - 4, y2: h - m.b, stroke: INK, "stroke-dasharray": "4 3", opacity: 0.5 }, svg);
      dots = [];
      rows.forEach(function (r, i) {
        var cy = m.t + rowH * i + rowH / 2, vals = F[r.k];
        var q1 = q(vals, 0.25), q2 = q(vals, 0.5), q3 = q(vals, 0.75);
        var lbl = R.text(svg, m.l - 12, cy + 4, w < 520 ? r.name.split(" (")[0] : r.name, { "text-anchor": "end", "font-size": 12, "font-weight": r.ours ? 800 : 600, fill: r.ours ? RED : INK });
        R.svg("rect", { x: x(q1), y: cy - 11, width: Math.max(2, x(q3) - x(q1)), height: 22, rx: 4, fill: "#eeeeea", stroke: "#b5b5b0" }, svg);
        R.svg("line", { x1: x(q2), x2: x(q2), y1: cy - 11, y2: cy + 11, stroke: INK, "stroke-width": 2 }, svg);
        var jr = R.rng(31 + i);
        vals.forEach(function (v) {
          var c = R.svg("circle", { cx: x(v), cy: cy + (jr() - 0.5) * (rowH - 18), r: w < 520 ? 1.7 : 2.1, fill: RED }, svg);
          dots.push({ el: c, v: v });
        });
        if (q2 > 88) R.text(svg, x(q1) - 8, cy + 4, "median " + q2.toFixed(0), { "text-anchor": "end", "font-size": 10, fill: "#55555c", "font-family": "JetBrains Mono, monospace" });
        else R.text(svg, x(q2), cy - 15, "median " + q2.toFixed(0), { "text-anchor": "middle", "font-size": 10, fill: "#55555c", "font-family": "JetBrains Mono, monospace" });
      });
      R.text(ax, (m.l + w - m.r) / 2, h - m.b + 32, "", {});
      update();
    }
    function update() {
      var top = parseInt(slider.value, 10), cut = 100 - top;
      outEl.textContent = top + "%"; out2.textContent = top;
      shade.setAttribute("x", x(cut)); shade.setAttribute("width", x(100) - x(cut));
      /* centred on the shaded band; right-anchored at the axis end only if it would run past the chart */
      var mid = (x(cut) + x(100)) / 2, fits = mid + 58 <= w;
      shadeLbl.setAttribute("x", fits ? mid : x(100)); shadeLbl.setAttribute("text-anchor", fits ? "middle" : "end");
      shadeLbl.textContent = "protected: top " + top + "%";
      dots.forEach(function (d) { d.el.setAttribute("opacity", d.v >= cut ? 0.85 : 0.22); });
      rows.forEach(function (r, i) {
        var vals = F[r.k], n = vals.filter(function (v) { return v >= cut; }).length, p = n / vals.length * 100;
        pbs[i].querySelector(".pb-fill").style.width = p + "%";
        pbs[i].querySelector(".pb-val").textContent = Math.round(p) + "%";
      });
    }
    slider.addEventListener("input", update);
    R.fillRange(slider);
    render(); R.onResize(render);
  }

  document.addEventListener("DOMContentLoaded", function () {
    histogram(); haystack(); lineChart(); stripChart();
  });
})();
