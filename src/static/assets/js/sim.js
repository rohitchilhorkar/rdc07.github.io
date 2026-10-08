// Control-plane simulation: an illustration of the platform, drawn on a canvas.
// Alerts flow from trade feeds through ActiveMQ and 9+ services on EKS to the
// AI services. A traffic spike makes Karpenter add GPU nodes, which scale back
// to zero once the backlog drains. Not live data.
(function () {
  var panel = document.querySelector("[data-sim]");
  if (!panel) return;
  var canvas = panel.querySelector("canvas");
  var ctx = canvas.getContext("2d");
  var logEl = panel.querySelector("[data-sim-log]");
  var countEl = panel.querySelector("[data-sim-count]");
  var spikeBtn = panel.querySelector("[data-sim-spike]");
  var root = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var W = 0, H = 0, dpr = 1, S = 1;
  var C = {};
  var nodes = {}, pods = [], cpus = [], gpus = [], sources = [], particles = [];
  var running = false, visible = false, last = 0, spawnAcc = 0;
  var spikeUntil = 0, spikeCount = 0, autoSpiked = false, timers = [];
  var queueLoad = 0;
  var MAX_GPU = 4;

  // ---------- colours follow the active skin ----------
  function readColors() {
    var cs = getComputedStyle(root);
    var v = function (n, f) { return (cs.getPropertyValue(n) || "").trim() || f; };
    C = {
      accent: v("--accent", "#e3916a"),
      text: v("--text", "#edebe6"),
      muted: v("--muted", "#aaa69d"),
      border: v("--border", "#3d3c37"),
      surface: v("--surface", "#2f2e2a"),
      ok: v("--ok", "#6fcf97"),
      mono: v("--font-mono", "monospace")
    };
  }

  // ---------- layout ----------
  function layout() {
    var r = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(280, r.width); H = Math.max(200, r.height);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    S = Math.min(1, W / 900);
    var cx = (W < 560 ? [0.07, 0.25, 0.48, 0.75, 0.95] : [0.07, 0.24, 0.47, 0.72, 0.93]).map(function (f) { return f * W; });
    var mid = H * 0.5;

    sources = [0.28, 0.5, 0.72].map(function (f) { return node(cx[0], H * f); });
    nodes.queue = node(cx[1], mid);
    pods = [];
    var gap = 26 * S + 6;
    for (var r2 = -1; r2 <= 1; r2++) for (var c = -1; c <= 1; c++) pods.push(node(cx[2] + c * gap, mid + r2 * gap));
    nodes.eks = { x: cx[2] - gap * 1.9, y: mid - gap * 1.9, w: gap * 3.8, h: gap * 3.8 };

    var poolW = W < 560 ? W * 0.25 : Math.max(96, 150 * S), poolH = 52 * S + 16;
    nodes.cpuBox = { x: cx[3] - poolW / 2, y: H * 0.26 - poolH / 2, w: poolW, h: poolH };
    cpus = [-1, 0, 1].map(function (i) { return node(cx[3] + i * poolW * 0.27, H * 0.26 + 4); });
    nodes.gpuBox = { x: cx[3] - poolW / 2, y: H * 0.72 - poolH / 2, w: poolW, h: poolH };
    var keep = gpus;
    gpus = [];
    for (var g = 0; g < MAX_GPU; g++) {
      var old = keep[g] || { state: "off", t: 0, heat: 0 };
      gpus.push({ x: cx[3] + (g - 1.5) * poolW * 0.22, y: H * 0.72 + 4, state: old.state, t: old.t, heat: 0 });
    }
    nodes.sink = node(cx[4], mid);
    particles.length = 0;
  }
  function node(x, y) { return { x: x, y: y, heat: 0 }; }

  // ---------- particles ----------
  function readyGpus() { return gpus.filter(function (g) { return g.state === "ready"; }); }
  function spawn() {
    var src = sources[(Math.random() * sources.length) | 0];
    var pod = pods[(Math.random() * pods.length) | 0];
    var route = [src, nodes.queue, pod];
    if (Math.random() < 0.55) {
      var ready = readyGpus();
      var cpu = cpus[(Math.random() * cpus.length) | 0];
      route.push(cpu);
      if (ready.length && Math.random() < 0.8) route.push(ready[(Math.random() * ready.length) | 0]);
    }
    route.push(nodes.sink);
    var spiking = performance.now() < spikeUntil;
    particles.push({ route: route, seg: 0, t: 0, speed: (0.55 + Math.random() * 0.35) * (spiking ? 1.25 : 1), wait: 0 });
  }

  function step(dt, now) {
    var spiking = now < spikeUntil;
    var rate = spiking ? 38 : 7;
    spawnAcc += dt * rate;
    while (spawnAcc > 1) { spawn(); spawnAcc--; }

    var capacity = 8 + readyGpus().length * 9;
    var inQueue = 0;
    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      if (p.seg === 1 && p.t === 0) inQueue++;
    }
    queueLoad += ((spiking ? 1 : 0) - queueLoad) * Math.min(1, dt * 1.5);

    for (var j = particles.length - 1; j >= 0; j--) {
      var q = particles[j];
      if (q.seg === 1 && q.t === 0) {
        // waiting in the queue: released at the rate the consumers can take
        q.wait += dt;
        if (q.wait < (inQueue / capacity) * 0.9) continue;
      }
      var a = q.route[q.seg], b = q.route[q.seg + 1];
      var len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      q.t += (dt * q.speed * 260 * (0.6 + S * 0.4)) / len;
      if (q.t >= 1) {
        b.heat = 1;
        q.seg++; q.t = 0; q.wait = 0;
        if (q.seg >= q.route.length - 1) particles.splice(j, 1);
      }
    }
    var decay = Math.min(1, dt * 3);
    [nodes.queue, nodes.sink].concat(sources, pods, cpus, gpus).forEach(function (n) { n.heat -= n.heat * decay; });
    gpus.forEach(function (g) { g.t += dt; });
  }

  // ---------- drawing ----------
  function alpha(hex, a) {
    if (hex.charAt(0) !== "#") return hex;
    var h = hex.length === 4 ? hex.replace(/#(.)(.)(.)/, "#$1$1$2$2$3$3") : hex;
    var n = parseInt(h.slice(1), 16);
    return "rgba(" + (n >> 16 & 255) + "," + (n >> 8 & 255) + "," + (n & 255) + "," + a + ")";
  }
  function rrect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function label(txt, x, y, align, color, size) {
    ctx.font = (size || Math.round(10 + S * 2)) + "px " + C.mono;
    ctx.fillStyle = color || C.muted;
    ctx.textAlign = align || "center";
    ctx.fillText(txt, x, y);
  }
  function line(a, b) { ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); }
  function dot(n, r) {
    ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
    ctx.fillStyle = C.surface; ctx.fill();
    ctx.lineWidth = 1.4; ctx.strokeStyle = alpha(C.muted, 0.7); ctx.stroke();
    if (n.heat > 0.02) { ctx.fillStyle = alpha(C.accent, Math.min(1, n.heat) * 0.9); ctx.fill(); }
  }

  function draw(now) {
    ctx.clearRect(0, 0, W, H);
    var small = W < 560;

    // edges
    ctx.beginPath(); ctx.lineWidth = 1; ctx.strokeStyle = alpha(C.border, 0.9);
    sources.forEach(function (s) { line(s, nodes.queue); });
    pods.forEach(function (p) { line(nodes.queue, p); line(p, nodes.sink); });
    pods.forEach(function (p, i) { if (i % 3 === 2) line(p, cpus[1]); });
    ctx.stroke();

    // group boxes
    ctx.lineWidth = 1;
    [["eks", small ? "EKS · 9+ svc" : "EKS · 9+ services"], ["cpuBox", "AI services"], ["gpuBox", small ? "GPU pool" : "GPU pool · 0 → N"]].forEach(function (b) {
      var o = nodes[b[0]];
      rrect(o.x, o.y, o.w, o.h, 10);
      ctx.setLineDash(b[0] === "gpuBox" ? [4, 4] : []);
      ctx.strokeStyle = alpha(C.muted, 0.45); ctx.stroke(); ctx.setLineDash([]);
      label(b[1], o.x + o.w / 2, o.y - 7);
    });

    // queue with backlog bar
    var qn = nodes.queue, bw = 10, bh = 54 * S + 18;
    rrect(qn.x - bw / 2, qn.y - bh / 2, bw, bh, 4);
    ctx.fillStyle = C.surface; ctx.fill(); ctx.strokeStyle = alpha(C.muted, 0.7); ctx.stroke();
    var fill = Math.max(0.08, Math.min(1, queueLoad));
    rrect(qn.x - bw / 2 + 2, qn.y + bh / 2 - 2 - (bh - 4) * fill, bw - 4, (bh - 4) * fill, 3);
    ctx.fillStyle = alpha(C.accent, 0.35 + 0.5 * queueLoad); ctx.fill();
    label("ActiveMQ", qn.x, qn.y + bh / 2 + 16);

    sources.forEach(function (s) { dot(s, 5); });
    label(small ? "feeds" : "trade feeds", sources[0].x, sources[2].y + 22);
    pods.forEach(function (p) { dot(p, 4.5); });
    cpus.forEach(function (c) { dot(c, 5); });
    dot(nodes.sink, 7);
    if (small) label("analysts", W - 4, nodes.sink.y - 14, "right");
    else label("analysts", nodes.sink.x, nodes.sink.y + 26);

    // GPU nodes
    var gs = 16 * S + 8;
    gpus.forEach(function (g) {
      rrect(g.x - gs / 2, g.y - gs / 2, gs, gs, 4);
      if (g.state === "off") {
        ctx.setLineDash([2, 3]); ctx.strokeStyle = alpha(C.muted, 0.25); ctx.stroke(); ctx.setLineDash([]);
      } else if (g.state === "boot") {
        var pulse = 0.35 + 0.35 * Math.sin(g.t * 9);
        ctx.setLineDash([3, 3]); ctx.strokeStyle = alpha(C.accent, 0.5 + pulse); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = alpha(C.accent, pulse * 0.25); ctx.fill();
      } else {
        var fade = g.state === "drain" ? Math.max(0, 1 - g.t / 0.8) : Math.min(1, g.t / 0.3);
        ctx.fillStyle = alpha(C.accent, (0.22 + g.heat * 0.6) * fade); ctx.fill();
        ctx.strokeStyle = alpha(C.accent, 0.9 * fade); ctx.lineWidth = 1.4; ctx.stroke(); ctx.lineWidth = 1;
      }
    });

    // particles
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i], a = p.route[p.seg], b = p.route[p.seg + 1];
      var x, y;
      if (p.seg === 1 && p.t === 0) {
        // stacked in the queue
        x = a.x + (Math.random() - 0.5) * 6; y = a.y + (Math.random() - 0.5) * bh * 0.7;
        ctx.fillStyle = alpha(C.accent, 0.35);
        ctx.fillRect(x - 1, y - 1, 2, 2);
        continue;
      }
      x = a.x + (b.x - a.x) * p.t; y = a.y + (b.y - a.y) * p.t;
      var tx = a.x + (b.x - a.x) * Math.max(0, p.t - 0.12), ty = a.y + (b.y - a.y) * Math.max(0, p.t - 0.12);
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(x, y);
      ctx.strokeStyle = alpha(C.accent, 0.35); ctx.lineWidth = 2; ctx.stroke(); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(x, y, 2.6, 0, Math.PI * 2); ctx.fillStyle = C.accent; ctx.fill();
    }
  }

  // ---------- the spike story ----------
  function stamp() {
    var d = new Date();
    return [d.getHours(), d.getMinutes(), d.getSeconds()].map(function (n) { return (n < 10 ? "0" : "") + n; }).join(":");
  }
  function log(msg) {
    if (!logEl) return;
    var li = document.createElement("li");
    li.innerHTML = '<span class="t">' + stamp() + "</span> " + msg;
    logEl.prepend(li);
    while (logEl.children.length > 4) logEl.lastChild.remove();
  }
  function later(ms, fn) { timers.push(setTimeout(fn, reduce ? Math.min(ms, 400) : ms)); }
  function setGpu(i, state) { gpus[i].state = state; gpus[i].t = 0; if (reduce) draw(); }

  function spike() {
    var now = performance.now();
    if (now < spikeUntil + 6000 && spikeCount) return; // one story at a time
    timers.forEach(clearTimeout); timers = [];
    spikeCount++;
    spikeUntil = now + 7000;
    if (spikeBtn) { spikeBtn.disabled = true; }
    log("traffic spike: alert volume <b>x5</b>");
    later(600, function () { log("activemq: backlog growing"); });
    var n = MAX_GPU - 1;
    for (var i = 0; i < n; i++) (function (i) {
      later(1100 + i * 900, function () { setGpu(i, "boot"); log("karpenter: GPU node " + (i + 1) + " provisioning"); });
      later(1900 + i * 900, function () { setGpu(i, "ready"); log("GPU node " + (i + 1) + " ready · hpa: inference x" + (i + 2)); });
    })(i);
    later(7600, function () { log("backlog drained"); });
    for (var k = n - 1; k >= 0; k--) (function (k, d) {
      later(9800 + d * 700, function () { setGpu(k, "drain"); });
      later(10600 + d * 700, function () { setGpu(k, "off"); });
    })(k, n - 1 - k);
    later(10600 + (n - 1) * 700 + 200, function () {
      log("karpenter: idle GPU nodes removed · <b>GPU pool at 0</b>");
      if (spikeBtn) spikeBtn.disabled = false;
    });
  }

  // ---------- loop and lifecycle ----------
  function frame(now) {
    if (!running) return;
    var dt = Math.min(0.05, (now - last) / 1000 || 0);
    last = now;
    step(dt, now);
    draw(now);
    requestAnimationFrame(frame);
  }
  function start() {
    if (running || reduce || !visible || document.hidden) return;
    running = true; last = performance.now();
    requestAnimationFrame(frame);
  }
  function stop() { running = false; }

  // honest counter: 1M+ alerts a day is about 11.6 a second
  var opened = Date.now();
  function count() {
    if (!countEl) return;
    var n = Math.floor(((Date.now() - opened) / 1000) * (1000000 / 86400));
    countEl.textContent = n.toLocaleString("en-US");
  }
  count();
  setInterval(count, 250);

  readColors();
  layout();
  draw(0);
  log("platform steady · <b>GPU pool at 0</b>");

  if (spikeBtn) spikeBtn.addEventListener("click", spike);

  new IntersectionObserver(function (entries) {
    visible = entries[0].isIntersecting;
    if (visible) {
      start();
      if (!autoSpiked) { autoSpiked = true; setTimeout(function () { if (!spikeCount) spike(); }, reduce ? 800 : 3500); }
    } else stop();
  }, { threshold: 0.25 }).observe(canvas);
  document.addEventListener("visibilitychange", function () { if (document.hidden) stop(); else start(); });

  var resizeTimer;
  new ResizeObserver(function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { layout(); draw(0); }, 60);
  }).observe(canvas);
  new MutationObserver(function () { readColors(); draw(0); }).observe(root, { attributes: true, attributeFilter: ["data-skin", "data-theme"] });
})();
