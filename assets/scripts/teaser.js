/* ===================================================================
   Animated teaser: Fig. 1 of the paper, rebuilt as SVG.

   Four stages, walking through what the method does:

     1  frozen        the backbone and its vocabulary, nothing trained
     2  expand        two rows appended to the embedding matrix
     3  train         both prompts scored, the loss, gradient into two rows
     4  infer         one score, whatever the backbone can read

   The drawing follows the figure it replaces: same palette, same shapes,
   same wording.  Everything is one <svg> with a viewBox, so it scales with
   the hero column and sets its text in the page's own typefaces rather than
   baking them into pixels.

   Explanation lives outside the drawing on purpose: the sentence under the
   figure has room to be read, so nothing has to be squeezed into a callout.
   The two grey boxes are kept only for stage 3, where the loss and the
   parameter count are part of the diagram rather than commentary on it.

   Mounted progressively: index.html ships the static panels, and this script
   swaps them out only once it has successfully built the SVG.
   =================================================================== */
(function () {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";
  var W = 480, H = 386;

  var C = {
    ink:      "#20303f",
    ink2:     "#5f666c",
    ink3:     "#98a0a6",
    mllm:     "#BEDFF8",
    mllmEdge: "#9ecbee",
    bar:      "#E8F3FC",
    barEdge:  "#96a3ad",
    cell:     "#BFDCF2",
    real:     "#67BB6A",
    realFill: "#A6D9A3",
    ai:       "#E8503A",
    aiFill:   "#F0A093",
    callout:  "#EDEEEF",
    dash:     "#C9CDD1",
    navy:     "#1C365F"
  };

  /* geometry -------------------------------------------------------- */
  var MX = 196, MW = 122, MY = 66, MH = 92;        /* backbone box */
  var GAP = 6;                                     /* arrow-to-box clearance */
  var MCX = MX + MW / 2, MCY = MY + MH / 2;
  var BX = 20, BY = 236, BW = 440, BH = 36;        /* embedding matrix */
  var RX = BX + 130, AX = BX + 240, SW = 24;       /* the two trained rows */
  var LBL = BY + 54;                               /* row labels */
  var GY = 326;                                    /* grey callout row */

  var STAGES = [
    { key: "frozen", chip: "Frozen",
      note: "We start with a multimodal LLM and keep it frozen. Nothing inside it is trained, " +
            "including the embedding matrix it reads every token from." },
    { key: "expand", chip: "Two new tokens",
      note: "We add two new words to its vocabulary, <REAL> and <AIGEN>, and give each one a row " +
            "in that matrix. These two rows are the only things we train." },
    { key: "train", chip: "Training",
      note: "Every input is scored twice, once with each word. The loss compares the two scores, " +
            "and it updates those two rows and nothing else." },
    { key: "infer", chip: "Any modality",
      note: "Because every encoder writes into the same space, the gap between the two rows works " +
            "as one detector. The same pair reads text, images, audio and video." }
  ];

  function el(name, attrs, parent) {
    var n = document.createElementNS(NS, name);
    for (var k in attrs) {
      if (Object.prototype.hasOwnProperty.call(attrs, k)) n.setAttribute(k, String(attrs[k]));
    }
    if (parent) parent.appendChild(n);
    return n;
  }

  function text(str, x, y, o, parent) {
    o = o || {};
    var t = el("text", {
      x: x, y: y,
      "text-anchor": o.anchor || "middle",
      "font-size": o.size || 12,
      "font-weight": o.weight || 400,
      "font-style": o.italic ? "italic" : "normal",
      fill: o.fill || C.ink,
      "font-family": o.mono ? "var(--mono)" : "var(--sans)"
    }, parent);
    t.textContent = str;
    return t;
  }

  function layer(parent, name) {
    return el("g", { "class": "tz-layer tz-" + name, opacity: 0 }, parent);
  }

  /* ---- pictograms, so the last stage shows the media rather than
          naming it ------------------------------------------------- */
  function drawText(g, x, y) {
    [26, 20, 24, 14].forEach(function (w, i) {
      el("rect", { x: x, y: y + i * 5.5, width: w, height: 2.6, rx: 1.3, fill: C.ink3 }, g);
    });
  }
  function drawImage(g, x, y) {
    el("rect", { x: x, y: y, width: 28, height: 21, rx: 2.5,
                 fill: "#DDEBF7", stroke: C.barEdge, "stroke-width": 1 }, g);
    el("circle", { cx: x + 8, cy: y + 6.5, r: 3, fill: "#F5CE7A" }, g);
    el("path", { d: "M " + x + " " + (y + 21) + " L " + (x + 10) + " " + (y + 9) +
                    " L " + (x + 18) + " " + (y + 21) + " Z", fill: "#9CC3A0" }, g);
    el("path", { d: "M " + (x + 12) + " " + (y + 21) + " L " + (x + 21) + " " + (y + 12) +
                    " L " + (x + 28) + " " + (y + 21) + " Z", fill: "#7FAE86" }, g);
  }
  function drawAudio(g, x, y) {
    [6, 13, 20, 9, 17, 11, 5].forEach(function (h, i) {
      el("rect", { x: x + i * 4.2, y: y + 11 - h / 2, width: 2.4, height: h, rx: 1.2,
                   fill: C.ink3 }, g);
    });
  }
  function drawVideo(g, x, y) {
    el("rect", { x: x, y: y, width: 28, height: 21, rx: 2.5,
                 fill: "#E4E7EA", stroke: C.barEdge, "stroke-width": 1 }, g);
    [0, 1, 2, 3].forEach(function (i) {
      el("rect", { x: x + 2.5 + i * 6.4, y: y + 2, width: 2, height: 2, rx: .6, fill: "#fff" }, g);
      el("rect", { x: x + 2.5 + i * 6.4, y: y + 17, width: 2, height: 2, rx: .6, fill: "#fff" }, g);
    });
    el("path", { d: "M " + (x + 11) + " " + (y + 7) + " L " + (x + 19) + " " + (y + 10.5) +
                    " L " + (x + 11) + " " + (y + 14) + " Z", fill: C.ink2 }, g);
  }
  var PICTO = [
    { draw: drawText,  label: "Text"  },
    { draw: drawImage, label: "Image" },
    { draw: drawAudio, label: "Audio" },
    { draw: drawVideo, label: "Video" }
  ];

  function build(mount) {
    var wrap = document.createElement("div");
    wrap.className = "tz";

    var chips = document.createElement("div");
    chips.className = "tz-chips";
    chips.setAttribute("role", "tablist");
    chips.setAttribute("aria-label", "Walk through the method");

    var svg = el("svg", {
      viewBox: "0 0 " + W + " " + H, width: "100%", role: "img",
      "aria-label": "A frozen multimodal LLM, two tokens added to its vocabulary, " +
                    "trained by scoring each input under both, then used as one " +
                    "detector across text, image, audio and video."
    });
    svg.setAttribute("class", "tz-svg");

    var defs = el("defs", {}, svg);
    [["tzArrow", C.ink], ["tzArrowGrad", "#BFC6CB"]].forEach(function (a) {
      var m = el("marker", { id: a[0], viewBox: "0 0 10 10", refX: 8, refY: 5,
                             markerWidth: 5.5, markerHeight: 5.5,
                             orient: "auto-start-reverse" }, defs);
      el("path", { d: "M 0 0 L 10 5 L 0 10 z", fill: a[1] }, m);
    });

    /* ---- backbone ---------------------------------------------------- */
    var core = el("g", {}, svg);
    el("rect", { x: MX, y: MY, width: MW, height: MH, rx: 15,
                 fill: C.mllm, stroke: C.mllmEdge, "stroke-width": 1 }, core);
    text("MLLM θ", MCX, MCY - 2, { size: 21, weight: 700 }, core);
    text("(frozen)", MCX, MCY + 17, { size: 12.5, fill: C.ink2 }, core);

    /* ---- embedding matrix -------------------------------------------- */
    var dict = el("g", {}, svg);
    el("rect", { x: BX, y: BY, width: BW, height: BH, rx: 3,
                 fill: C.bar, stroke: C.barEdge, "stroke-width": 1.2 }, dict);
    /* ordinary rows run the full width of the bar. They are drawn unbroken:
       before the two tokens exist there is nothing to step around, and once
       they do each trained row paints its own patch of bar over them. */
    for (var tx = BX + 7; tx <= BX + BW - 10; tx += 8.6) {
      el("rect", { x: tx, y: BY + 7, width: 4, height: BH - 14, rx: 1.2,
                   fill: C.cell, opacity: .75 }, dict);
    }
    /* sits under the far right of the bar: above it the two skirt curves are
       coming in, and to the left are the row labels */
    var dLabel = el("text", { x: BX + BW, y: LBL, "text-anchor": "end",
                              "font-size": 12.5, fill: C.ink3,
                              "font-family": "var(--sans)" }, dict);

    var slots = el("g", {}, svg);
    function slot(x, fill, stroke, label, cls) {
      var g = el("g", { "class": "tz-slot " + cls, opacity: 0 }, slots);
      /* clears the ordinary rows underneath so the token sits in its own slot */
      el("rect", { x: x - 3, y: BY + 2, width: SW + 6, height: BH - 4, fill: C.bar }, g);
      el("rect", { x: x, y: BY + 5, width: SW, height: BH - 10, rx: 3,
                   fill: fill, stroke: stroke, "stroke-width": 1.8 }, g);
      text(label, x + SW / 2, LBL, { size: 12.5, weight: 700, fill: stroke, mono: true }, g);
      return g;
    }
    var slotReal = slot(RX, C.realFill, C.real, "<REAL>", "tz-slot-real");
    var slotAi   = slot(AX, C.aiFill,  C.ai,   "<AIGEN>", "tz-slot-ai");

    /* the backbone reads the whole matrix, so the two curves fan from its
       lower corners out to the corners of the bar -- as in the figure, and
       present at every stage rather than only while training */
    var ties = el("g", {}, svg);
    [[MX + 16, BX + 5], [MX + MW - 16, BX + BW - 5]].forEach(function (pr) {
      el("path", { d: "M " + pr[0] + " " + (MY + MH) + " C " + pr[0] + " " + (BY - 26) +
                      ", " + pr[1] + " " + (BY - 30) + ", " + pr[1] + " " + (BY - 2),
                   fill: "none", stroke: C.barEdge, "stroke-width": 1.3,
                   "stroke-dasharray": "2 3.5", opacity: .8 }, ties);
    });

    /* ---- stage 3: training ------------------------------------------- */
    var train = layer(svg, "train");
    var IN_A = MCY - 28, IN_R = MCY + 28;

    function prompt(cy, tone, token) {
      var g = el("g", {}, train);
      el("rect", { x: 10, y: cy - 18, width: 162, height: 36, rx: 9, fill: "#fff",
                   stroke: tone, "stroke-width": 1.8, "stroke-dasharray": "7 5" }, g);
      var t = el("text", { x: 19, y: cy + 5, "font-size": 10.5,
                           "font-family": "var(--mono)", fill: C.ink }, g);
      t.textContent = "[Image] This is a ";
      el("tspan", { fill: tone, "font-weight": 700 }, t).textContent = token;
    }
    prompt(IN_A, C.ai, "<AIGEN>");
    prompt(IN_R, C.real, "<REAL>");

    [IN_A, IN_R].forEach(function (y) {
      el("path", { d: "M " + (172 + GAP) + " " + y + " L " + (MX - GAP) + " " + y,
                   stroke: C.ink, "stroke-width": 2, fill: "none",
                   "marker-end": "url(#tzArrow)" }, train);
      el("path", { d: "M " + (MX + MW + GAP) + " " + y + " L " + (MX + MW + GAP + 16) + " " + y,
                   stroke: C.ink, "stroke-width": 2, fill: "none",
                   "marker-end": "url(#tzArrow)" }, train);
    });
    [[IN_A, C.ai, "<AIGEN>"], [IN_R, C.real, "<REAL>"]].forEach(function (r) {
      var t = el("text", { x: MX + MW + GAP + 22, y: r[0] + 4, "font-size": 11,
                           "font-family": "var(--sans)", fill: C.ink }, train);
      t.textContent = "log p(w | x, ";
      el("tspan", { fill: r[1], "font-weight": 700, "font-family": "var(--mono)",
                    "font-size": 10 }, t).textContent = r[2];
      el("tspan", { fill: C.ink }, t).textContent = ")";
    });

    var loss = el("g", { "class": "tz-loss" }, train);
    [RX + SW / 2, AX + SW / 2].forEach(function (cx) {
      el("path", { d: "M " + cx + " " + (GY - 2) + " L " + cx + " " + (LBL + 10),
                   stroke: "#BFC6CB", "stroke-width": 2, fill: "none",
                   "marker-end": "url(#tzArrowGrad)" }, loss);
    });
    el("rect", { x: 20, y: GY, width: 266, height: 46, rx: 8, fill: C.callout }, loss);
    var lt = el("text", { x: 153, y: GY + 28, "text-anchor": "middle", "font-size": 13,
                          "font-family": "var(--sans)", fill: C.ink }, loss);
    el("tspan", { "font-style": "italic" }, lt).textContent = "L";
    el("tspan", {}, lt).textContent = " = CE(softmax[·,·], y) → ";
    el("tspan", { "font-style": "italic", "font-weight": 700 }, lt).textContent = "∂L / ∂E";

    el("rect", { x: 298, y: GY, width: 162, height: 46, rx: 8, fill: C.callout }, loss);
    text("Trainable params:", 379, GY + 20, { size: 12 }, loss);
    var tp = el("text", { x: 379, y: GY + 36, "text-anchor": "middle", "font-size": 12,
                          "font-family": "var(--sans)", fill: C.ink }, loss);
    el("tspan", { "font-style": "italic" }, tp).textContent = "2d";
    el("tspan", {}, tp).textContent = " (< 0.001% of θ)";

    /* ---- stage 4: inference ------------------------------------------ */
    var infer = layer(svg, "infer");
    var TH = 34, TG = 6, modGroups = [];
    var T0 = MCY - (4 * TH + 3 * TG) / 2;            /* stack centred on the box */
    PICTO.forEach(function (m, k) {
      var y = T0 + k * (TH + TG);
      var g = el("g", { "class": "tz-mod" }, infer);
      el("rect", { x: 14, y: y, width: 106, height: TH, rx: 9, fill: "#fff",
                   stroke: C.dash, "stroke-width": 1.8 }, g);
      m.draw(el("g", { "class": "tz-art" }, g), 25, y + 7);
      text(m.label, 102, y + 21.5, { size: 12, anchor: "end", fill: C.ink2 }, g);
      modGroups.push(g);
    });
    var firstC = T0 + TH / 2, lastC = T0 + 3 * (TH + TG) + TH / 2;
    var dotsY = Math.min(lastC + 26, BY - 26);   /* never runs into the matrix */
    var stubs = "M 132 " + firstC + " L 132 " + dotsY;
    for (var k = 0; k < 4; k++) {
      var cy = T0 + k * (TH + TG) + TH / 2;
      stubs += " M 120 " + cy + " L 132 " + cy;
    }
    stubs += " M 120 " + dotsY + " L 132 " + dotsY;
    el("path", { d: stubs, stroke: C.ink, "stroke-width": 2, fill: "none" }, infer);
    [-7, 0, 7].forEach(function (d) {
      el("circle", { cx: 67, cy: dotsY + d, r: 1.9, fill: C.dash }, infer);
    });
    el("path", { d: "M " + (132 + GAP) + " " + MCY + " L " + (MX - GAP) + " " + MCY, stroke: C.ink,
                 "stroke-width": 2, fill: "none", "marker-end": "url(#tzArrow)" }, infer);
    el("path", { d: "M " + (MX + MW + GAP) + " " + MCY + " L " + (MX + MW + GAP + 16) + " " + MCY,
                 stroke: C.ink, "stroke-width": 2, fill: "none",
                 "marker-end": "url(#tzArrow)" }, infer);

    var sx = MX + MW + GAP + 22;
    var sf = el("text", { x: sx, y: MCY - 15, "font-size": 13.5,
                          "font-family": "var(--sans)", fill: C.ink }, infer);
    el("tspan", { "font-style": "italic" }, sf).textContent = "s";
    el("tspan", { "font-style": "italic", "font-size": 10, dy: 2.5 }, sf).textContent = "m";
    el("tspan", { dy: -2.5 }, sf).textContent = "(";
    el("tspan", { "font-style": "italic", "font-weight": 700 }, sf).textContent = "x";
    el("tspan", {}, sf).textContent = ") =";
    var s2 = el("text", { x: sx, y: MCY + 3, "font-size": 11.5,
                          "font-family": "var(--sans)", fill: C.ink }, infer);
    s2.textContent = "log p(w | ";
    el("tspan", { fill: C.ai, "font-weight": 700, "font-family": "var(--mono)",
                  "font-size": 10.5 }, s2).textContent = "<AIGEN>";
    el("tspan", {}, s2).textContent = ")";
    var s3 = el("text", { x: sx, y: MCY + 20, "font-size": 11.5,
                          "font-family": "var(--sans)", fill: C.ink }, infer);
    s3.textContent = "− log p(w | ";
    el("tspan", { fill: C.real, "font-weight": 700, "font-family": "var(--mono)",
                  "font-size": 10.5 }, s3).textContent = "<REAL>";
    el("tspan", {}, s3).textContent = ")";
    text("AI-generated if > 0", sx, MCY + 43,
         { size: 12, weight: 700, anchor: "start", fill: C.navy }, infer);

    /* ---- chips + caption --------------------------------------------- */
    var note = document.createElement("p");
    note.className = "tz-note";

    /* The caption is one sentence per stage and they are not the same length,
       so the card would grow and shrink as it advanced. Measure every stage
       once at the current width and hold the tallest, which keeps the height
       static without guessing a value that breaks when the column narrows. */
    function noteHTML(i) {
      return STAGES[i].note
        .replace("<REAL>", '<code class="tz-t tz-r">&lt;REAL&gt;</code>')
        .replace("<AIGEN>", '<code class="tz-t tz-a">&lt;AIGEN&gt;</code>');
    }
    function reserveNoteHeight() {
      var probe = document.createElement("p");
      probe.className = "tz-note";
      probe.style.cssText = "position:absolute;left:0;right:0;visibility:hidden;" +
                            "pointer-events:none;height:auto;min-height:0";
      note.style.height = "auto";
      wrap.appendChild(probe);
      var tallest = 0;
      for (var i = 0; i < STAGES.length; i++) {
        probe.innerHTML = noteHTML(i);
        tallest = Math.max(tallest, probe.offsetHeight);
      }
      wrap.removeChild(probe);
      note.style.height = tallest + "px";
    }

    STAGES.forEach(function (st, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "tz-chip";
      b.setAttribute("role", "tab");
      b.setAttribute("aria-selected", i === 0 ? "true" : "false");
      b.innerHTML = '<span class="tz-n">' + (i + 1) + "</span>" + st.chip;
      b.addEventListener("click", function () { go(i, true); });
      chips.appendChild(b);
    });

    wrap.appendChild(chips);
    wrap.appendChild(svg);
    wrap.appendChild(note);
    mount.innerHTML = "";
    mount.appendChild(wrap);

    /* ---- stage machine ----------------------------------------------- */
    var reduced = window.matchMedia &&
                  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var cur = -1, timer = null, held = false, modTimer = null, modIdx = 0;

    function go(i, byClick) {
      if (byClick) { held = true; clearTimeout(timer); }
      cur = i;
      var st = STAGES[i].key;

      Array.prototype.forEach.call(chips.children, function (c, j) {
        c.classList.toggle("on", j === i);
        c.setAttribute("aria-selected", j === i ? "true" : "false");
      });
      note.innerHTML = noteHTML(i);

      train.setAttribute("opacity", st === "train" ? 1 : 0);
      infer.setAttribute("opacity", st === "infer" ? 1 : 0);

      var vocab = st !== "frozen";
      slotReal.setAttribute("opacity", vocab ? 1 : 0);
      slotAi.setAttribute("opacity", vocab ? 1 : 0);
      slotReal.classList.toggle("tz-pop", vocab && st === "expand");
      slotAi.classList.toggle("tz-pop", vocab && st === "expand");
      dLabel.textContent = vocab ? "|E| + 2 rows" : "|E| rows";

      svg.classList.toggle("tz-anim-train", !reduced && st === "train");

      clearInterval(modTimer);
      modGroups.forEach(function (g) { g.classList.remove("on"); });
      if (st === "infer") {
        var tick = function () {
          modGroups.forEach(function (g, j) { g.classList.toggle("on", j === modIdx); });
          modIdx = (modIdx + 1) % modGroups.length;
        };
        tick();
        if (!reduced) modTimer = setInterval(tick, 1150);
      }

      if (!held && !reduced) {
        timer = setTimeout(function () { go((i + 1) % STAGES.length, false); },
                           i === 0 ? 3000 : 4600);
      }
    }

    reserveNoteHeight();
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(reserveNoteHeight);   /* metrics shift once Charter lands */
    }
    var rz;
    window.addEventListener("resize", function () {
      clearTimeout(rz);
      rz = setTimeout(reserveNoteHeight, 150);
    });

    go(0, false);
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
      if (window.console && console.warn) console.warn("teaser: " + e.message);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
