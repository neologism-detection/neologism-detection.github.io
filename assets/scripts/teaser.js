/* ===================================================================
   Animated teaser: Fig. 1 of the paper, rebuilt as SVG.

   Replaces the static export in the hero with a four-stage sequence that
   walks through what the method actually does:

     1  frozen        the backbone and its vocabulary, nothing trained
     2  expand        two rows appended to the embedding matrix
     3  train         both prompts scored, the loss, gradient into two rows
     4  infer         one score, any modality the backbone accepts

   The drawing follows the figure it replaces: same palette, same shapes,
   same wording.  Everything is one <svg> with a viewBox, so it scales with
   the hero column and sets its text in the page's own typefaces rather than
   baking them into pixels.

   Mounted progressively: index.html ships the static PNG, and this script
   swaps it out only once it has successfully built the SVG.
   =================================================================== */
(function () {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";
  var W = 480, H = 438;

  var C = {
    ink:      "#20303f",
    ink2:     "#5f666c",
    ink3:     "#98a0a6",
    mllm:     "#BEDFF8",
    mllmEdge: "#9ecbee",
    bar:      "#E8F3FC",
    barEdge:  "#96a3ad",
    cell:     "#CFE4F5",
    real:     "#67BB6A",
    realFill: "#A6D9A3",
    ai:       "#E8503A",
    aiFill:   "#F0A093",
    callout:  "#EDEEEF",
    dash:     "#C9CDD1",
    flow:     "#8fb4d0"
  };

  var STAGES = [
    { key: "frozen", n: "1", chip: "Frozen",
      note: "A multimodal LLM, entirely frozen — and the embedding matrix it reads every token from." },
    { key: "expand", n: "2", chip: "Two new tokens",
      note: "Two tokens are appended to the vocabulary and given a row each: <REAL> and <AIGEN>." },
    { key: "train",  n: "3", chip: "Training",
      note: "Each input is scored under both tokens. The loss on that pair updates the two rows and nothing else." },
    { key: "infer",  n: "4", chip: "Any modality",
      note: "The gap between the two rows is the detector, and it applies to whatever the backbone can encode." }
  ];

  var MODALITIES = ["[Text]", "[Image]", "[Audio]", "[Video]"];

  function el(name, attrs, parent) {
    var n = document.createElementNS(NS, name);
    for (var k in attrs) {
      if (Object.prototype.hasOwnProperty.call(attrs, k)) {
        n.setAttribute(k, String(attrs[k]));
      }
    }
    if (parent) parent.appendChild(n);
    return n;
  }

  function text(str, x, y, opts, parent) {
    opts = opts || {};
    var t = el("text", {
      x: x, y: y,
      "text-anchor": opts.anchor || "middle",
      "font-size": opts.size || 11,
      "font-weight": opts.weight || 400,
      "font-style": opts.italic ? "italic" : "normal",
      fill: opts.fill || C.ink,
      "font-family": opts.mono ? "var(--mono)" : "var(--sans)",
      "letter-spacing": opts.tracking || 0
    }, parent);
    t.textContent = str;
    return t;
  }

  /* group that can be faded in and out by stage */
  function layer(parent, name) {
    return el("g", { "class": "tz-layer tz-" + name, opacity: 0 }, parent);
  }

  function build(mount) {
    var wrap = document.createElement("div");
    wrap.className = "tz";

    /* ---- stage chips ------------------------------------------------ */
    var chips = document.createElement("div");
    chips.className = "tz-chips";
    chips.setAttribute("role", "tablist");
    chips.setAttribute("aria-label", "Walk through the method");

    var svg = el("svg", {
      viewBox: "0 0 " + W + " " + H,
      width: "100%",
      role: "img",
      "aria-label": "How the method works: a frozen multimodal LLM, two tokens " +
                    "added to its vocabulary, trained by scoring each input under " +
                    "both, then used as one detector across modalities."
    });
    svg.setAttribute("class", "tz-svg");

    var defs = el("defs", {}, svg);
    var mk = el("marker", { id: "tzArrow", viewBox: "0 0 10 10", refX: 8, refY: 5,
                            markerWidth: 5.5, markerHeight: 5.5, orient: "auto-start-reverse" }, defs);
    el("path", { d: "M 0 0 L 10 5 L 0 10 z", fill: C.ink }, mk);
    var mkG = el("marker", { id: "tzArrowGrad", viewBox: "0 0 10 10", refX: 8, refY: 5,
                             markerWidth: 5.5, markerHeight: 5.5, orient: "auto-start-reverse" }, defs);
    el("path", { d: "M 0 0 L 10 5 L 0 10 z", fill: "#BFC6CB" }, mkG);

    /* ================= persistent: the backbone ====================== */
    var MY = 108, MH = 74, MCY = MY + MH / 2;          /* backbone box */
    var core = el("g", { "class": "tz-core" }, svg);
    el("rect", { x: 168, y: MY, width: 144, height: MH, rx: 15,
                 fill: C.mllm, stroke: C.mllmEdge, "stroke-width": 1 }, core);
    text("MLLM θ", 240, MCY - 3, { size: 18, weight: 700 }, core);
    text("(frozen)", 240, MCY + 15, { size: 10.5, fill: C.ink2 }, core);

    /* ================= persistent: the dictionary ==================== */
    var dict = el("g", { "class": "tz-dict" }, svg);
    var BX = 26, BY = 246, BW = 428, BH = 34;
    el("rect", { x: BX, y: BY, width: BW, height: BH, rx: 3,
                 fill: C.bar, stroke: C.barEdge, "stroke-width": 1.2 }, dict);

    /* ordinary vocabulary rows, drawn as faint ticks */
    for (var i = 0; i < 46; i++) {
      var cx = BX + 9 + i * ((BW - 74) / 46);
      el("rect", { x: cx, y: BY + 8, width: 4.5, height: BH - 16, rx: 1,
                   fill: C.cell, opacity: 0.9 }, dict);
    }
    /* the matrix is labelled above the bar so the two row labels below it
       have the full width to themselves */
    var dLabel = el("text", { x: 454, y: BY - 9, "text-anchor": "end", "font-size": 10.5,
                              fill: C.ink3, "font-family": "var(--sans)" }, dict);
    dLabel.textContent = "";

    /* the two trained rows: hidden until stage 2 */
    var slots = el("g", { "class": "tz-slots" }, svg);
    var RX = BX + 120, AX = BX + 200;
    function slot(x, fill, stroke, label, cls) {
      var g = el("g", { "class": "tz-slot " + cls, opacity: 0 }, slots);
      el("rect", { x: x, y: BY + 5, width: 22, height: BH - 10, rx: 2.5,
                   fill: fill, stroke: stroke, "stroke-width": 1.6 }, g);
      text(label, x + 11, BY + 50, { size: 9.5, weight: 700, fill: stroke, mono: true }, g);
      return g;
    }
    var slotReal = slot(RX, C.realFill, C.real, "<REAL>", "tz-slot-real");
    var slotAi   = slot(AX, C.aiFill, C.ai, "<AIGEN>", "tz-slot-ai");

    /* dotted tie-lines from the backbone down to the two rows */
    var ties = el("g", { "class": "tz-ties", opacity: 0 }, svg);
    el("path", { d: "M 206 " + (MY + MH) + " C 196 " + (BY - 30) + ", " + (RX + 11) +
                    " " + (BY - 34) + ", " + (RX + 11) + " " + (BY - 3),
                 fill: "none", stroke: C.barEdge, "stroke-width": 1.2,
                 "stroke-dasharray": "2 3", opacity: 0.85 }, ties);
    el("path", { d: "M 274 " + (MY + MH) + " C 284 " + (BY - 30) + ", " + (AX + 11) +
                    " " + (BY - 34) + ", " + (AX + 11) + " " + (BY - 3),
                 fill: "none", stroke: C.barEdge, "stroke-width": 1.2,
                 "stroke-dasharray": "2 3", opacity: 0.85 }, ties);

    /* ================= stage 3: training ============================= */
    var train = layer(svg, "train");

    function prompt(y, tone, toneFill, tokenLabel) {
      var g = el("g", {}, train);
      el("rect", { x: 14, y: y, width: 136, height: 34, rx: 9,
                   fill: "#fff", stroke: tone, "stroke-width": 1.8,
                   "stroke-dasharray": "7 5" }, g);
      var t = el("text", { x: 23, y: y + 21, "font-size": 8, "font-family": "var(--mono)",
                           fill: C.ink }, g);
      t.textContent = "[Image] This is a ";
      var ts = el("tspan", { fill: tone, "font-weight": 700 }, t);
      ts.textContent = tokenLabel;
      return g;
    }
    /* the two prompts straddle the backbone's centre line, so the arrows
       into it are level with the two coming out */
    var IN_A = MCY - 27, IN_R = MCY + 27;      /* arrow heights, in and out */
    prompt(IN_A - 17, C.ai, C.aiFill, "<AIGEN>");
    prompt(IN_R - 17, C.real, C.realFill, "<REAL>");

    /* prompt -> backbone */
    el("path", { d: "M 150 " + IN_A + " L 167 " + IN_A, stroke: C.ink, "stroke-width": 2,
                 "marker-end": "url(#tzArrow)", fill: "none" }, train);
    el("path", { d: "M 150 " + IN_R + " L 167 " + IN_R, stroke: C.ink, "stroke-width": 2,
                 "marker-end": "url(#tzArrow)", fill: "none" }, train);

    /* backbone -> two log-probabilities */
    el("path", { d: "M 313 " + IN_A + " L 331 " + IN_A, stroke: C.ink, "stroke-width": 2,
                 "marker-end": "url(#tzArrow)", fill: "none" }, train);
    el("path", { d: "M 313 " + IN_R + " L 331 " + IN_R, stroke: C.ink, "stroke-width": 2,
                 "marker-end": "url(#tzArrow)", fill: "none" }, train);
    var lp1 = el("text", { x: 337, y: IN_A + 3, "font-size": 9, "font-family": "var(--sans)", fill: C.ink }, train);
    lp1.textContent = "log p(w | x, ";
    el("tspan", { fill: C.ai, "font-weight": 700, "font-family": "var(--mono)", "font-size": 8 }, lp1).textContent = "<AIGEN>";
    el("tspan", { fill: C.ink }, lp1).textContent = ")";
    var lp2 = el("text", { x: 337, y: IN_R + 3, "font-size": 9, "font-family": "var(--sans)", fill: C.ink }, train);
    lp2.textContent = "log p(w | x, ";
    el("tspan", { fill: C.real, "font-weight": 700, "font-family": "var(--mono)", "font-size": 8 }, lp2).textContent = "<REAL>";
    el("tspan", { fill: C.ink }, lp2).textContent = ")";

    /* loss + gradient arrows back into the two rows */
    var loss = el("g", { "class": "tz-loss" }, train);
    var LY = 352;                                   /* top of the loss row */
    [RX, AX].forEach(function (cx) {
      el("path", { d: "M " + (cx + 11) + " " + (LY - 1) + " L " + (cx + 11) +
                      " " + (BY + BH + 26),
                   stroke: "#BFC6CB", "stroke-width": 2, fill: "none",
                   "marker-end": "url(#tzArrowGrad)" }, loss);
    });
    el("rect", { x: 26, y: LY, width: 250, height: 40, rx: 7, fill: C.callout }, loss);
    var lt = el("text", { x: 151, y: LY + 25, "text-anchor": "middle", "font-size": 11.5,
                          "font-family": "var(--sans)", fill: C.ink }, loss);
    el("tspan", { "font-style": "italic" }, lt).textContent = "L";
    el("tspan", {}, lt).textContent = " = CE(softmax[·,·], y) → ";
    el("tspan", { "font-style": "italic", "font-weight": 700 }, lt).textContent = "∂L / ∂E";

    el("rect", { x: 292, y: LY, width: 162, height: 40, rx: 7, fill: C.callout }, loss);
    text("Trainable params:", 373, LY + 16, { size: 10.5 }, loss);
    var tp = el("text", { x: 373, y: LY + 31, "text-anchor": "middle", "font-size": 10.5,
                          "font-family": "var(--sans)", fill: C.ink }, loss);
    el("tspan", { "font-style": "italic" }, tp).textContent = "2d";
    el("tspan", {}, tp).textContent = " (< 0.001% of θ)";

    /* ================= stage 4: inference ============================ */
    var infer = layer(svg, "infer");
    var modGroups = [];
    MODALITIES.forEach(function (m, k) {
      var y = 56 + k * 40;
      var g = el("g", { "class": "tz-mod", "data-k": k }, infer);
      el("rect", { x: 20, y: y, width: 92, height: 30, rx: 9, fill: "#fff",
                   stroke: C.dash, "stroke-width": 1.8, "stroke-dasharray": "7 5" }, g);
      text(m, 66, y + 20, { size: 10, mono: true, fill: C.ink }, g);
      modGroups.push(g);
    });
    /* the bracket that gathers every modality into one input */
    /* the bracket gathers every modality -- and the ellipsis standing for the
       ones the backbone could take next -- into one input */
    var stubs = "M 132 71 L 132 220";
    [71, 111, 151, 191, 220].forEach(function (y) {
      stubs += " M 112 " + y + " L 132 " + y;
    });
    el("path", { d: stubs, stroke: C.ink, "stroke-width": 2, fill: "none" }, infer);
    el("path", { d: "M 133 " + MCY + " L 167 " + MCY, stroke: C.ink, "stroke-width": 2,
                 fill: "none", "marker-end": "url(#tzArrow)" }, infer);
    [212, 220, 228].forEach(function (cy) {
      el("circle", { cx: 66, cy: cy, r: 1.8, fill: C.dash }, infer);
    });

    el("path", { d: "M 314 " + MCY + " L 330 " + MCY, stroke: C.ink, "stroke-width": 2,
                 "marker-end": "url(#tzArrow)", fill: "none" }, infer);
    var sf = el("text", { x: 336, y: MCY - 9, "font-size": 9.5, "font-family": "var(--sans)", fill: C.ink }, infer);
    el("tspan", { "font-style": "italic" }, sf).textContent = "s";
    el("tspan", { "font-style": "italic", "font-size": 7, dy: 2 }, sf).textContent = "m";
    el("tspan", { dy: -2 }, sf).textContent = "(";
    el("tspan", { "font-style": "italic", "font-weight": 700 }, sf).textContent = "x";
    el("tspan", {}, sf).textContent = ") =";
    var sf2 = el("text", { x: 336, y: MCY + 5, "font-size": 8.4, "font-family": "var(--sans)", fill: C.ink }, infer);
    sf2.textContent = "log p(w | ";
    el("tspan", { fill: C.ai, "font-weight": 700, "font-family": "var(--mono)", "font-size": 7.6 }, sf2).textContent = "<AIGEN>";
    el("tspan", {}, sf2).textContent = ")";
    var sf3 = el("text", { x: 336, y: MCY + 18, "font-size": 8.4, "font-family": "var(--sans)", fill: C.ink }, infer);
    sf3.textContent = "− log p(w | ";
    el("tspan", { fill: C.real, "font-weight": 700, "font-family": "var(--mono)", "font-size": 7.6 }, sf3).textContent = "<REAL>";
    el("tspan", {}, sf3).textContent = ")";

    el("rect", { x: 26, y: 352, width: 428, height: 40, rx: 7, fill: C.callout }, infer);
    var vt = el("text", { x: 240, y: 369, "text-anchor": "middle", "font-size": 11.5,
                          "font-family": "var(--sans)", fill: C.ink }, infer);
    vt.textContent = "Predict AI-generated if ";
    el("tspan", { "font-style": "italic" }, vt).textContent = "s";
    el("tspan", { "font-style": "italic", "font-size": 8, dy: 2 }, vt).textContent = "m";
    el("tspan", { dy: -2 }, vt).textContent = "(";
    el("tspan", { "font-style": "italic", "font-weight": 700 }, vt).textContent = "x";
    el("tspan", {}, vt).textContent = ") > 0";
    text("Any modality with an encoder to the shared token space",
         240, 385, { size: 10, fill: C.ink2 }, infer);

    /* stages 1-2 fill the same band, so the figure never changes height */
    var setup = layer(svg, "setup");
    el("rect", { x: 26, y: 352, width: 428, height: 40, rx: 7, fill: C.callout }, setup);
    var su1 = text("", 240, 369, { size: 11.5 }, setup);
    var su2 = text("", 240, 385, { size: 10, fill: C.ink2 }, setup);

    /* a dot that travels the input path, so the flow is legible at a glance */
    var pulse = el("circle", { cx: 0, cy: 0, r: 3.4, fill: C.flow, opacity: 0,
                               "class": "tz-pulse" }, svg);

    /* ---- caption ---------------------------------------------------- */
    var note = document.createElement("p");
    note.className = "tz-note";

    STAGES.forEach(function (s, k) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "tz-chip";
      b.innerHTML = '<span class="tz-n">' + s.n + '</span>' + s.chip;
      b.setAttribute("role", "tab");
      b.setAttribute("aria-selected", k === 0 ? "true" : "false");
      b.addEventListener("click", function () { go(k, true); });
      chips.appendChild(b);
    });

    wrap.appendChild(chips);
    wrap.appendChild(svg);
    wrap.appendChild(note);
    mount.innerHTML = "";
    mount.appendChild(wrap);

    /* ---- stage machine ---------------------------------------------- */
    var reduced = window.matchMedia &&
                  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var cur = -1, timer = null, held = false, modTimer = null, modIdx = 0;

    function show(node, on) { node.setAttribute("opacity", on ? 1 : 0); }

    function go(k, fromClick) {
      if (fromClick) { held = true; clearTimeout(timer); }
      cur = k;
      var st = STAGES[k].key;

      Array.prototype.forEach.call(chips.children, function (c, i) {
        c.classList.toggle("on", i === k);
        c.setAttribute("aria-selected", i === k ? "true" : "false");
      });
      note.innerHTML = STAGES[k].note
        .replace("<REAL>", '<code class="tz-t tz-r">&lt;REAL&gt;</code>')
        .replace("<AIGEN>", '<code class="tz-t tz-a">&lt;AIGEN&gt;</code>');

      show(train, st === "train");
      show(infer, st === "infer");
      show(setup, st === "frozen" || st === "expand");
      if (st === "frozen") {
        su1.textContent = "Every parameter stays fixed";
        su2.textContent = "the backbone is used exactly as it was pretrained";
      } else if (st === "expand") {
        su1.textContent = "Two rows, 2d parameters";
        su2.textContent = "fewer than 0.001% of the backbone, and the only thing that will move";
      }
      show(ties, st === "train" || st === "infer");
      var vocab = st !== "frozen";
      slotReal.setAttribute("opacity", vocab ? 1 : 0);
      slotAi.setAttribute("opacity", vocab ? 1 : 0);
      slotReal.classList.toggle("tz-pop", vocab && st === "expand");
      slotAi.classList.toggle("tz-pop", vocab && st === "expand");
      dLabel.textContent = vocab ? "|E| + 2 rows" : "|E| rows";

      svg.classList.toggle("tz-anim-train", !reduced && st === "train");
      svg.classList.toggle("tz-anim-infer", !reduced && st === "infer");

      clearInterval(modTimer);
      modGroups.forEach(function (g) { g.classList.remove("on"); });
      if (st === "infer") {
        var tick = function () {
          modGroups.forEach(function (g, i) { g.classList.toggle("on", i === modIdx); });
          modIdx = (modIdx + 1) % modGroups.length;
        };
        tick();
        if (!reduced) modTimer = setInterval(tick, 1150);
      }

      pulse.setAttribute("opacity", 0);
      if (!held && !reduced) {
        timer = setTimeout(function () { go((k + 1) % STAGES.length, false); },
                           k === 0 ? 2600 : 4200);
      }
    }

    go(0, false);

    /* pause the loop while the pointer is on the figure, resume on leave */
    wrap.addEventListener("mouseenter", function () { clearTimeout(timer); });
    wrap.addEventListener("mouseleave", function () {
      if (!held && !reduced) {
        timer = setTimeout(function () { go((cur + 1) % STAGES.length, false); }, 1200);
      }
    });

    return true;
  }

  function init() {
    var mount = document.getElementById("teaser");
    if (!mount) return;
    try {
      build(mount);
      mount.classList.add("tz-ready");
    } catch (e) {
      /* leave the static figure in place if anything above fails */
      if (window.console && console.warn) console.warn("teaser: " + e.message);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
