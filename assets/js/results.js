/* =========================================================================
   RTAQ — Experiments (Table 1, Fig. 3, Fig. 4) and the speed-up race.
   ========================================================================= */
(function () {
  "use strict";
  var R = window.RTAQ, D = window.RTAQ_DATA;
  var RED = "#d7141c", INK = "#0b0b0c";
  var MCOL = { "BF16": INK, "GPTQ": "#8c96a6", "MC-MoE": "#b9a37b", "GSQ": "#93ad8c", "TileQ": "#a68fb5", "RTAQ": RED };
  var QUANT = ["GPTQ", "MC-MoE", "GSQ", "TileQ", "RTAQ"];

  function val(model, method, bi) { var r = model.rows[method]; return bi < 0 ? r.avg : r.acc[bi]; }
  /* Fig. 3 average: five benchmarks with GPQA strict-match */
  function acc5(model, method) { var a = model.rows[method].acc; return (a[0] + a[1] + a[2] + a[3] + a[5]) / 5; }

  /* ------------------------------------------------------------ bars */
  function bars() {
    var host = R.$("#resBars"); if (!host) return;
    var side = R.$("#resSide"), mi = 0, bi = -1, rows = {}, rowH = 46;
    host.innerHTML = '<div class="hbars"><div class="hb-ref"><span>BF16</span></div></div>';
    var wrap = host.firstChild, ref = wrap.firstChild;
    D.methods.forEach(function (mt) {
      var r = document.createElement("div");
      r.className = "hb-row" + (mt === "RTAQ" ? " ours" : "") + (mt === "BF16" ? " base" : "");
      r.innerHTML = '<div class="hb-name"><b>' + mt + '</b><small></small></div><div class="hb-track"><div class="hb-fill" style="background:' + MCOL[mt] + '"></div><span class="hb-val"></span></div>';
      wrap.appendChild(r); rows[mt] = r;
    });
    wrap.style.height = (D.methods.length * rowH) + "px";
    var started = false;

    function update() {
      var md = D.models[mi];
      var order = ["BF16"].concat(QUANT.slice().sort(function (a, b) { return val(md, b, bi) - val(md, a, bi); }));
      order.forEach(function (mt, i) {
        var r = rows[mt], v = val(md, mt, bi);
        r.style.transform = "translateY(" + (i * rowH) + "px)";
        r.querySelector("small").textContent = mt === "BF16" ? "16 bits" : md.rows[mt].bits.toFixed(3) + " bits";
        var f = (started ? v : 0) / 100;
        r.querySelector(".hb-fill").style.width = "calc((100% - var(--lab)) * " + f + ")";
        r.querySelector(".hb-val").textContent = v.toFixed(bi < 0 ? 2 : 1);
        r.querySelector(".hb-val").style.left = "calc((100% - var(--lab)) * " + f + " + 8px)";
        r.title = mt + " (" + D.methodCite[mt] + ") · " + v.toFixed(2);
      });
      var bf = val(md, "BF16", bi);
      ref.style.left = "calc(var(--name-w) + (100% - var(--name-w) - var(--lab)) * " + (bf / 100) + ")";
      /* side */
      var rt = val(md, "RTAQ", bi), best = null;
      QUANT.forEach(function (mt) { if (mt !== "RTAQ" && (!best || val(md, mt, bi) > val(md, best, bi))) best = mt; });
      var d = rt - val(md, best, bi);
      side.innerHTML =
        '<div class="callout red"><b>' + rt.toFixed(bi < 0 ? 2 : 1) + '</b><span>RTAQ ' + (bi < 0 ? "average" : D.benchShort[bi]) + ' at ' + md.rows.RTAQ.bits.toFixed(3) + ' bits</span></div>' +
        '<div class="callout"><b>' + (d >= 0 ? "+" : "−") + Math.abs(d).toFixed(2) + '</b><span>points vs. best baseline (' + best + ', ' + md.rows[best].bits.toFixed(3) + ' bits)</span></div>' +
        '<div class="callout soft"><b style="color:var(--ink)">' + (rt / bf * 100).toFixed(1) + '%</b><span>of the BF16 model (' + bf.toFixed(bi < 0 ? 2 : 1) + ')</span></div>';
    }
    R.tabs(R.$("#resModelTabs"), D.models.map(function (m, i) { return { key: i, label: m.short }; }), function (k) { mi = k; update(); });
    R.tabs(R.$("#resBenchChips"), [{ key: -1, label: "Average" }].concat(D.benchShort.map(function (b, i) { return { key: i, label: b }; })), function (k) { bi = k; update(); });
    R.once(host, function () { started = true; update(); }, 0.3);
  }

  /* ------------------------------------------------------------ table */
  function table() {
    var t = R.$("#resTable"); if (!t) return;
    var h = '<thead><tr><th rowspan="2">Method</th><th rowspan="2">Bits</th><th rowspan="2">GSM8K</th><th rowspan="2">AIME25</th><th rowspan="2">AIME26</th><th colspan="2" style="text-align:center">GPQA-Diamond</th><th rowspan="2">LCB</th><th rowspan="2">Average</th></tr><tr><th>Strict</th><th>Flex</th></tr></thead><tbody>';
    D.models.forEach(function (md) {
      h += '<tr class="model-row"><td colspan="9">' + md.name + "</td></tr>";
      var best = [], bestAvg = -1;
      for (var i = 0; i < 6; i++) best[i] = Math.max.apply(null, QUANT.map(function (q) { return md.rows[q].acc[i]; }));
      bestAvg = Math.max.apply(null, QUANT.map(function (q) { return md.rows[q].avg; }));
      D.methods.forEach(function (mt) {
        var r = md.rows[mt], q = mt !== "BF16";
        h += '<tr class="' + (mt === "RTAQ" ? "ours" : mt === "BF16" ? "base" : "") + '"><td>' + (mt === "BF16" ? "Baseline (BF16)" : mt) + (mt !== "RTAQ" && mt !== "BF16" ? '<span class="cite">' + D.methodCite[mt] + "</span>" : mt === "RTAQ" ? '<span class="cite">ours</span>' : "") + "</td>";
        h += "<td>" + (q ? r.bits.toFixed(3) : "16") + "</td>";
        r.acc.forEach(function (v, i) { h += '<td class="' + (q && v === best[i] ? "best" : "") + '">' + v.toFixed(1) + "</td>"; });
        h += '<td class="avg' + (q && r.avg === bestAvg ? " best" : "") + '">' + r.avg.toFixed(2) + "</td></tr>";
      });
    });
    t.innerHTML = h + "</tbody>";
  }

  /* ------------------------------------------------------------ scatter */
  function marker(g, mt, x, y, s) {
    var c = MCOL[mt], el;
    if (mt === "BF16") {
      var pts = []; for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? s * 0.45 : s * 1.1; pts.push((x + r * Math.cos(a)) + "," + (y + r * Math.sin(a))); }
      el = R.svg("polygon", { points: pts.join(" "), fill: c }, g);
    } else if (mt === "GPTQ") el = R.svg("polygon", { points: [x - s, y - s * 0.7, x + s, y - s * 0.7, x, y + s].join(","), fill: c, stroke: "#fff", "stroke-width": 1 }, g);
    else if (mt === "GSQ") el = R.svg("polygon", { points: [x - s, y + s * 0.7, x + s, y + s * 0.7, x, y - s].join(","), fill: c, stroke: "#fff", "stroke-width": 1 }, g);
    else if (mt === "MC-MoE") el = R.svg("rect", { x: x - s * 0.8, y: y - s * 0.8, width: s * 1.6, height: s * 1.6, fill: c, stroke: "#fff", "stroke-width": 1 }, g);
    else if (mt === "TileQ") {
      var hp = []; for (var k = 0; k < 6; k++) { var b = Math.PI / 6 + k * Math.PI / 3; hp.push((x + s * 0.95 * Math.cos(b)) + "," + (y + s * 0.95 * Math.sin(b))); }
      el = R.svg("polygon", { points: hp.join(" "), fill: c, stroke: "#fff", "stroke-width": 1 }, g);
    } else el = R.svg("circle", { cx: x, cy: y, r: s * 1.05, fill: c, stroke: "#fff", "stroke-width": 2 }, g);
    return el;
  }
  function scatter() {
    var grid = R.$("#scatterGrid"); if (!grid) return;
    var lg = R.$("#scatterLegend");
    lg.innerHTML = D.methods.map(function (mt) {
      var svg = '<svg width="16" height="16" viewBox="0 0 16 16">' + (function () { var g = document.createElementNS("http://www.w3.org/2000/svg", "g"); marker(g, mt, 8, 8, 5.5); return g.innerHTML; })() + "</svg>";
      return "<span>" + svg + (mt === "BF16" ? "Original (BF16)" : mt) + "</span>";
    }).join("");
    function render() {
      grid.innerHTML = "";
      D.models.forEach(function (md) {
        var cell = document.createElement("div");
        cell.innerHTML = '<div class="sc-title">' + md.name + '</div><div class="chart"></div>';
        grid.appendChild(cell);
        var host = cell.querySelector(".chart");
        var w = Math.max(260, host.clientWidth), h = Math.round(Math.min(280, w * 0.82));
        var m = { l: 40, r: 12, t: 12, b: 38 };
        var svg = R.newSvg(host, w, h), tip = R.tip(host);
        var xs = D.methods.map(function (mt) { return md.genLen[mt]; }), ys = D.methods.map(function (mt) { return acc5(md, mt); });
        var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs), y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
        var px = (x1 - x0) * 0.12, py = (y1 - y0) * 0.14;
        var x = R.scale(x0 - px, x1 + px, m.l, w - m.r), y = R.scale(Math.floor(y0 - py), Math.ceil(y1 + py), h - m.b, m.t);
        var ax = R.svg("g", { "class": "ax" }, svg);
        var yt = Math.ceil(y0 - py), ystep = (y1 - y0) > 9 ? 4 : 2;
        for (var v = Math.ceil(yt / ystep) * ystep; v <= y1 + py; v += ystep) {
          R.svg("line", { x1: m.l, x2: w - m.r, y1: y(v), y2: y(v), "class": "grid-l" }, ax);
          R.text(ax, m.l - 6, y(v) + 4, v, { "text-anchor": "end" });
        }
        var xstep = (x1 - x0) > 6 ? 2.5 : (x1 - x0) > 3 ? 1 : 0.5;
        for (var u = Math.ceil((x0 - px) / xstep) * xstep; u <= x1 + px; u += xstep) {
          R.svg("line", { x1: x(u), x2: x(u), y1: m.t, y2: h - m.b, "class": "grid-l" }, ax);
          R.text(ax, x(u), h - m.b + 15, u.toFixed(xstep < 1 ? 1 : xstep % 1 ? 1 : 0) + "k", { "text-anchor": "middle" });
        }
        R.text(ax, (m.l + w - m.r) / 2, h - 4, "avg. generation length (tokens)", { "text-anchor": "middle", "class": "ax-label" });
        R.text(ax, w - m.r - 2, m.t + 10, "better ↖", { "font-size": 10.5, "font-weight": 700, fill: "#9d9da4", "text-anchor": "end" });
        /* link BF16 -> RTAQ */
        R.svg("line", { x1: x(md.genLen.BF16), y1: y(acc5(md, "BF16")), x2: x(md.genLen.RTAQ), y2: y(acc5(md, "RTAQ")), stroke: RED, "stroke-width": 1.2, "stroke-dasharray": "3 3", opacity: 0.6 }, svg);
        D.methods.forEach(function (mt) {
          var cx = x(md.genLen[mt]), cy = y(acc5(md, mt));
          var g = R.svg("g", { style: "cursor:pointer" }, svg);
          R.svg("circle", { cx: cx, cy: cy, r: 13, fill: "transparent" }, g);
          marker(g, mt, cx, cy, mt === "RTAQ" ? 7 : 6.2);
          if (mt === "RTAQ" || mt === "BF16") R.text(svg, cx + 10, cy - 8, mt, { "font-size": 11, "font-weight": 800, fill: MCOL[mt] });
          g.addEventListener("pointerenter", function () {
            tip.show(cx / w * host.clientWidth, cy / h * host.clientHeight,
              "<b>" + mt + "</b>" + (mt !== "BF16" ? " · " + md.rows[mt].bits.toFixed(3) + " bits" : "") + "<br>acc " + acc5(md, mt).toFixed(2) + "% · " + md.genLen[mt].toFixed(1) + "k tokens");
          });
          g.addEventListener("pointerleave", tip.hide);
        });
      });
    }
    render(); R.onResize(render);
  }

  /* ------------------------------------------------------------ worst drop */
  function drops() {
    var host = R.$("#dropChart"); if (!host) return;
    var res = QUANT.map(function (mt) {
      var worst = { d: -1 };
      D.models.forEach(function (md) {
        md.rows.BF16.acc.forEach(function (b, i) {
          var d = b - md.rows[mt].acc[i];
          if (d > worst.d) worst = { d: d, model: md.short, bench: D.benchShort[i], from: b, to: md.rows[mt].acc[i] };
        });
      });
      worst.mt = mt; return worst;
    }).sort(function (a, b) { return a.d - b.d; });
    var max = 40;
    host.innerHTML = '<div class="drops">' + res.map(function (r) {
      return '<div class="dr' + (r.mt === "RTAQ" ? " ours" : "") + '"><span class="dr-name">' + r.mt + '</span><span class="dr-track"><span class="dr-fill" data-w="' + (r.d / max * 100) + '" style="background:' + MCOL[r.mt] + '"></span></span><span class="dr-val">−' + r.d.toFixed(1) + '</span><span class="dr-where">' + r.model + " · " + r.bench + ": " + r.from.toFixed(1) + " → " + r.to.toFixed(1) + "</span></div>";
    }).join("") + '<div class="dr-axis"><span></span><span>0</span><span>10</span><span>20</span><span>30</span><span>40</span></div></div>';
    R.once(host, function () { R.$$(".dr-fill", host).forEach(function (f) { f.style.width = f.dataset.w + "%"; }); }, 0.3);
    var ours = res.filter(function (r) { return r.mt === "RTAQ"; })[0];
    var others = res.filter(function (r) { return r.mt !== "RTAQ"; }).map(function (r) { return r.d; });
    var oEl = R.$("#dropOurs"), bEl = R.$("#dropBase");
    if (oEl && ours) oEl.textContent = "−" + ours.d.toFixed(1);
    if (bEl && others.length) bEl.textContent = "−" + Math.min.apply(null, others).toFixed(1) + " to −" + Math.max.apply(null, others).toFixed(1);
  }

  /* ------------------------------------------------------------ race */
  function race() {
    var root = R.$("#race"); if (!root) return;
    var lanes = R.$$(".lane", root), raf = null;
    var TOT = 7.0, SP = D.speedup.e2e;
    function run() {
      cancelAnimationFrame(raf);
      var t0 = performance.now();
      lanes.forEach(function (l) { l.querySelector(".lane-tokens").innerHTML = ""; l._n = 0; l.querySelector(".lane-fill").style.width = "0%"; l.querySelector(".lane-time").textContent = "0.0 s"; l.classList.remove("done"); });
      (function step(now) {
        var el = (now - t0) / 1000, alldone = true;
        lanes.forEach(function (l) {
          var dur = l.dataset.lane === "rtaq" ? TOT / SP : TOT, p = R.clamp(el / dur, 0, 1);
          var track = l.querySelector(".lane-track"), cap = Math.floor((track.clientWidth - 16) / 9), want = Math.round(cap * p);
          var tk = l.querySelector(".lane-tokens");
          while (l._n < want) { tk.appendChild(document.createElement("i")); l._n++; }
          l.querySelector(".lane-fill").style.width = (p * 100) + "%";
          l.querySelector(".lane-time").textContent = p < 1 ? (Math.min(el, dur)).toFixed(1) + " s" : (dur / TOT).toFixed(2) + "× time";
          if (p < 1) alldone = false;
        });
        if (!alldone) raf = requestAnimationFrame(step);
      })(t0);
    }
    R.$("#raceReplay").addEventListener("click", run);
    R.once(root, run, 0.5);
  }

  document.addEventListener("DOMContentLoaded", function () { bars(); table(); scatter(); drops(); race(); });
})();
