/* =========================================================================
   RTAQ — hero: tile logo (experts that light up, then </think> fires red)
   and the teaser terminals (non-termination vs. RTAQ).
   ========================================================================= */
(function () {
  "use strict";
  var R = window.RTAQ;

  var GLYPHS = {
    R: ["11111.", "111111", "11..11", "11..11", "111111", "11111.", "11.111", "11..11", "11..11", "......"],
    T: ["111111", "111111", "..11..", "..11..", "..11..", "..11..", "..11..", "..11..", "..11..", "......"],
    A: [".1111.", "111111", "11..11", "11..11", "111111", "111111", "11..11", "11..11", "11..11", "......"],
    Q: [".1111.", "111111", "11..11", "11..11", "11..11", "11..11", "11.111", "111111", ".1111x", "....xx"]
  };
  var INK = "#0b0b0c", RED = "#d7141c", FLICK = "#b9b9be";

  function buildLogo(host) {
    var svg = R.svg("svg", { viewBox: "-2 -2 274 104", role: "img", "aria-label": "RTAQ" });
    var cells = [], x0 = 0;
    "RTAQ".split("").forEach(function (ch) {
      GLYPHS[ch].forEach(function (row, r) {
        row.split("").forEach(function (v, c) {
          if (v === ".") return;
          var el = R.svg("rect", { x: (x0 + c) * 10, y: r * 10, width: 8.6, height: 8.6, rx: 1.3, fill: INK, "class": "lt" + (v === "x" ? " red" : "") }, svg);
          cells.push({ el: el, cx: (x0 + c) * 10 + 4.3, cy: r * 10 + 4.3, red: v === "x" });
        });
      });
      x0 += 7;
    });
    host.innerHTML = ""; host.appendChild(svg);
    return { svg: svg, cells: cells };
  }

  function initLogo() {
    var host = R.$("#heroLogo"); if (!host) return;
    var L = buildLogo(host), cells = L.cells, svg = L.svg;
    var normal = cells.filter(function (c) { return !c.red; });
    var reds = cells.filter(function (c) { return c.red; });
    var visible = true, idleT = null;

    function fire() {
      reds.forEach(function (c) { c.el.setAttribute("fill", RED); });
      host.classList.remove("fired"); void host.offsetWidth; host.classList.add("fired");
    }
    if (R.reduced) { fire(); return; }

    /* intro: experts appear in random order, flicker like routing, then the stop fires */
    cells.forEach(function (c) {
      c.el.style.opacity = "0"; c.el.style.transform = "scale(.3)";
      c.el.style.transition = "opacity .45s ease, transform .5s cubic-bezier(.2,.7,.1,1), fill .25s";
      var d = 80 + Math.random() * 820;
      setTimeout(function () { c.el.style.opacity = "1"; c.el.style.transform = "scale(1)"; }, d);
    });
    function flick(n, col, dur) {
      for (var i = 0; i < n; i++) {
        var c = normal[(Math.random() * normal.length) | 0];
        c.el.setAttribute("fill", col);
        (function (c) { setTimeout(function () { c.el.setAttribute("fill", INK); }, dur); })(c);
      }
    }
    setTimeout(function () {
      var k = 0, iv = setInterval(function () {
        flick(5, FLICK, 150);
        if (++k > 18) { clearInterval(iv); fire(); startIdle(); }
      }, 70);
    }, 1050);

    function startIdle() {
      var n = 0;
      idleT = setInterval(function () {
        if (!visible) return;
        flick(3, "#d3d3d7", 230);
        if (++n % 5 === 0) fire();
      }, 1500);
    }
    R.onVisible(host, function (v) { visible = v; }, { threshold: 0 });

    /* hover: experts near the pointer lift */
    var raf = null, pt = null;
    svg.addEventListener("pointermove", function (e) {
      var r = svg.getBoundingClientRect();
      pt = { x: (e.clientX - r.left) / r.width * 274 - 2, y: (e.clientY - r.top) / r.height * 104 - 2 };
      if (!raf) raf = requestAnimationFrame(applyHover);
    });
    svg.addEventListener("pointerleave", function () { pt = null; if (!raf) raf = requestAnimationFrame(applyHover); });
    function applyHover() {
      raf = null;
      cells.forEach(function (c) {
        var s = 1;
        if (pt) { var dx = c.cx - pt.x, dy = c.cy - pt.y; s = 1 + 0.32 * Math.exp(-(dx * dx + dy * dy) / (2 * 16 * 16)); }
        c.el.style.transform = "scale(" + s.toFixed(3) + ")";
      });
    }
  }

  /* --------------------------- teaser terminals --------------------------- */
  var COMMON = ["<think>\n", "Okay, ", "the ", "user ", "wants ", "the ", "distance ", "covered ", "in ", "one ", "hour.\n",
    "Speed ", "= ", "distance ", "/ ", "time, ", "so ", "210 ", "/ ", "3 ", "= ", "70.\n",
    "Let ", "me ", "double-check: ", "70 ", "× ", "3 ", "= ", "210. ", "Correct.\n"];
  var GOOD_END = ["Okay, ", "I'll ", "output ", "the ", "answer.\n", "</think>\n", "The ", "answer ", "is ", "70 km."];
  var LOOP = ["Wait, ", "maybe ", "I ", "should ", "verify ", "the ", "units ", "again.\n",
    "Hmm, ", "210 km ", "over ", "3 hours… ", "so ", "70 ", "per ", "hour.\n",
    "Wait, ", "let ", "me ", "double-check ", "once ", "more.\n",
    "70 ", "× ", "3 ", "= ", "210. ", "Correct.\n"];
  var BUDGET = 32768;

  function Term(root) {
    this.root = root;
    this.body = root.querySelector("[data-role=body]");
    this.count = root.querySelector("[data-role=count]");
    this.status = root.querySelector("[data-role=status]");
    this.sub = root.querySelector("[data-role=sub]");
    this.caret = document.createElement("span"); this.caret.className = "caret";
  }
  Term.prototype.reset = function () {
    this.body.innerHTML = ""; this.body.appendChild(this.caret); this.n = 0; this.after = false;
    this.count.textContent = "0 tok"; this.status.textContent = "thinking…"; this.status.className = "term-status";
    this.root.classList.remove("is-done");
  };
  /* dim the screen and show the big end-of-run message */
  Term.prototype.finish = function (status, cls, sub) {
    this.status.textContent = status; this.status.className = "term-status " + cls;
    if (this.sub) this.sub.textContent = sub;
    this.root.classList.add("is-done");
  };
  Term.prototype.push = function (tok) {
    var s = document.createElement("span");
    s.textContent = tok;
    if (tok.indexOf("<think>") === 0) s.className = "tk-think";
    else if (tok.indexOf("</think>") === 0) { s.className = "tk-close"; this.after = true; }
    else if (this.after) s.className = "tk-ans";
    else if (/^(Wait|Hmm)/.test(tok)) s.className = "tk-loop";
    this.body.insertBefore(s, this.caret);
    while (this.body.childNodes.length > 260) this.body.removeChild(this.body.firstChild);
    this.body.scrollTop = this.body.scrollHeight;
    this.n += 1; this.count.textContent = R.comma(this.n) + " tok";
  };

  function initTeaser() {
    var root = R.$("#teaser"); if (!root) return;
    var bad = new Term(R.$("#termBad")), good = new Term(R.$("#termGood"));
    var visible = false, timer = null, phase = 0, i = 0, ff = 0, hold = 0;
    var goodSeq = COMMON.concat(GOOD_END);

    function restart() { bad.reset(); good.reset(); phase = 0; i = 0; ff = 0; hold = 0; }

    function tick() {
      if (!visible) return;
      if (phase === 0) {
        if (i < goodSeq.length) good.push(goodSeq[i]);
        bad.push(i < COMMON.length ? COMMON[i] : LOOP[(i - COMMON.length) % LOOP.length]);
        i++;
        if (i === goodSeq.length) {
          good.finish("✓ </think> emitted · answer: 70 km", "ok", "answer: 70 km · " + good.n + " tokens");
          phase = 1;
        }
      } else if (phase === 1) {
        bad.push(LOOP[(i - COMMON.length) % LOOP.length]); i++;
        if (++hold > 26) { phase = 2; bad.status.textContent = "still thinking… ▸▸ fast-forward"; }
      } else if (phase === 2) {
        bad.push(LOOP[(i - COMMON.length) % LOOP.length]); i++;
        ff = Math.min(BUDGET, Math.round(bad.n * 1.22 + 40));
        bad.n = ff; bad.count.textContent = R.comma(ff) + " tok";
        if (ff >= BUDGET) {
          bad.finish("✗ budget exhausted (" + R.comma(BUDGET) + ") · never emitted </think>", "fail", R.comma(BUDGET) + " tokens · never emitted </think>");
          phase = 3; hold = 0;
        }
      } else if (phase === 3) {
        if (++hold > 56) restart();
      }
    }

    function staticFinal() {
      restart();
      goodSeq.forEach(function (t) { good.push(t); });
      COMMON.concat(LOOP, LOOP).forEach(function (t) { bad.push(t); });
      good.finish("✓ </think> emitted · answer: 70 km", "ok", "answer: 70 km · " + good.n + " tokens");
      bad.count.textContent = R.comma(BUDGET) + " tok";
      bad.finish("✗ budget exhausted (" + R.comma(BUDGET) + ") · never emitted </think>", "fail", R.comma(BUDGET) + " tokens · never emitted </think>");
    }

    if (R.reduced) { staticFinal(); return; }
    restart();
    R.onVisible(root, function (v) {
      visible = v;
      if (v && !timer) timer = setInterval(tick, 85);
      if (!v && timer) { clearInterval(timer); timer = null; }
    }, { threshold: 0.2 });
  }

  document.addEventListener("DOMContentLoaded", function () { initLogo(); initTeaser(); });
})();
