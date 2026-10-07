// Small progressive enhancements. The page works fully without this file.
(function () {
  var root = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Theme toggle
  var toggle = document.querySelector("[data-theme-toggle]");
  if (toggle) {
    var sync = function () {
      var light = root.getAttribute("data-theme") === "light";
      toggle.setAttribute("aria-pressed", String(light));
      toggle.setAttribute("aria-label", light ? "Switch to dark theme" : "Switch to light theme");
    };
    sync();
    toggle.addEventListener("click", function () {
      var light = root.getAttribute("data-theme") !== "light";
      if (light) root.setAttribute("data-theme", "light");
      else root.removeAttribute("data-theme");
      try { localStorage.setItem("theme", light ? "light" : "dark"); } catch (e) {}
      sync();
    });
  }

  // Nav border once the page scrolls
  var nav = document.querySelector(".nav");
  if (nav) {
    var onScroll = function () { nav.classList.toggle("is-stuck", window.scrollY > 8); };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  // Tenure, e.g. "1 yr 2 mos", counted inclusively like LinkedIn
  document.querySelectorAll("[data-start]").forEach(function (el) {
    var s = el.getAttribute("data-start").split("-");
    var e = el.getAttribute("data-end");
    var end = e ? e.split("-") : [new Date().getFullYear(), new Date().getMonth() + 1];
    var m = (end[0] - s[0]) * 12 + (end[1] - s[1]) + 1;
    var y = Math.floor(m / 12), r = m % 12, out = [];
    if (y) out.push(y + (y === 1 ? " yr" : " yrs"));
    if (r) out.push(r + (r === 1 ? " mo" : " mos"));
    el.textContent = out.join(" ");
  });

  // Copy email
  document.querySelectorAll("[data-copy]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var text = btn.getAttribute("data-copy");
      var label = btn.querySelector(".lbl");
      if (!navigator.clipboard) { window.location.href = "mailto:" + text; return; }
      navigator.clipboard.writeText(text).then(function () {
        if (!label) return;
        var prev = label.textContent;
        label.textContent = "Copied";
        setTimeout(function () { label.textContent = prev; }, 1600);
      });
    });
  });

  if (!("IntersectionObserver" in window)) {
    document.querySelectorAll(".reveal").forEach(function (el) { el.classList.add("in"); });
    return;
  }

  // Reveal sections once
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      en.target.classList.add("in");
      io.unobserve(en.target);
    });
  }, { rootMargin: "0px 0px -8% 0px" });
  document.querySelectorAll(".reveal").forEach(function (el) { io.observe(el); });

  // Count up the impact numbers once
  var counted = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      counted.unobserve(en.target);
      var el = en.target, to = parseFloat(el.getAttribute("data-count"));
      var fmt = function (n) { return el.getAttribute("data-prefix") + Math.round(n).toLocaleString("en-US") + el.getAttribute("data-suffix"); };
      if (reduce) { el.textContent = fmt(to); return; }
      var t0 = performance.now(), dur = 900;
      var step = function (t) {
        var p = Math.min(1, (t - t0) / dur);
        el.textContent = fmt(to * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }, { threshold: 0.6 });
  document.querySelectorAll("[data-count]").forEach(function (el) { counted.observe(el); });

  // Highlight the nav link for the section in view
  var links = document.querySelectorAll(".nav__links a[href^='#']");
  if (links.length) {
    var map = {};
    links.forEach(function (a) { map[a.getAttribute("href").slice(1)] = a; });
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var a = map[en.target.id];
        if (!a || !en.isIntersecting) return;
        links.forEach(function (l) { l.removeAttribute("aria-current"); });
        a.setAttribute("aria-current", "true");
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    Object.keys(map).forEach(function (id) { var s = document.getElementById(id); if (s) spy.observe(s); });
  }
})();
