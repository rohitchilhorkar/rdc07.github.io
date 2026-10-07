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
      syncSkin();
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

  // Bats: the nav button, the signal, or the B key send a flock across the screen
  var BAT = '<svg viewBox="0 0 64 30" fill="currentColor"><path d="M32 9c-1.6-3-3-4.5-4.4-4.8.6 1.6.4 3-.6 3.9C24.6 4.4 19.4 1.6 12 1c3 2.4 4.2 5 3.6 7.6C11.6 6.6 6 6.4 0 8.6c5.2 1.6 8.6 4.6 9.6 8.8 3.4-1.6 7-1.4 10.4.6.6-2.8 2.6-4.2 5.6-4.2C28 15.6 30 20 32 29c2-9 4-13.4 6.4-15.2 3 0 5 1.4 5.6 4.2 3.4-2 7-2.2 10.4-.6 1-4.2 4.4-7.2 9.6-8.8-6-2.2-11.6-2-15.6 0C47.8 6 49 3.4 52 1c-7.4.6-12.6 3.4-15 7.1-1-.9-1.2-2.3-.6-3.9C35 4.5 33.6 6 32 9z"/></svg>';
  var flying = false;
  var bats = function () {
    if (reduce || flying) return;
    flying = true;
    var w = window.innerWidth, h = window.innerHeight;
    for (var i = 0; i < 16; i++) {
      var b = document.createElement("span");
      var left = Math.random() < 0.5;
      b.className = "bat";
      b.innerHTML = BAT;
      b.style.left = (left ? -40 : w + 40) + "px";
      b.style.top = (h * 0.35 + Math.random() * h * 0.6) + "px";
      b.style.setProperty("--x", (left ? 1 : -1) * (w + 120) + "px");
      b.style.setProperty("--y", -(h * 0.4 + Math.random() * h * 0.6) + "px");
      b.style.setProperty("--s", (0.6 + Math.random() * 0.9).toFixed(2));
      b.style.setProperty("--d", (2.2 + Math.random() * 1.8).toFixed(2) + "s");
      b.style.animationDelay = (Math.random() * 0.6).toFixed(2) + "s";
      document.body.appendChild(b);
      b.addEventListener("animationend", function (e) { if (e.target.classList.contains("bat")) e.target.remove(); });
    }
    setTimeout(function () { flying = false; }, 4200);
  };
  var isKnight = function () { return root.getAttribute("data-skin") === "knight"; };
  document.querySelectorAll("[data-bats]").forEach(function (el) { el.addEventListener("click", bats); });
  document.addEventListener("keydown", function (e) {
    var t = e.target.tagName;
    if (isKnight() && (e.key === "b" || e.key === "B") && !e.ctrlKey && !e.metaKey && !e.altKey && t !== "INPUT" && t !== "TEXTAREA") bats();
  });

  // Skin switch: warm <-> Night Shift, remembered, with a crossfade where supported
  var skinBtn = document.querySelector("[data-skin-toggle]");
  var themeColor = document.querySelector('meta[name="theme-color"]');
  var syncSkin = function () {
    var k = isKnight();
    if (skinBtn) {
      skinBtn.setAttribute("aria-pressed", String(k));
      skinBtn.setAttribute("aria-label", k ? "Switch to the warm theme" : "Switch to Night Shift theme");
      skinBtn.title = k ? "Switch to warm" : "Switch to Night Shift";
    }
    if (themeColor) themeColor.setAttribute("content", k ? "#07090c" : (root.getAttribute("data-theme") === "light" ? "#faf8f4" : "#262522"));
  };
  syncSkin();
  if (skinBtn) {
    skinBtn.addEventListener("click", function () {
      var to = isKnight() ? "warm" : "knight";
      var apply = function () {
        root.setAttribute("data-skin", to);
        try { localStorage.setItem("skin", to); } catch (e) {}
        syncSkin();
      };
      if (document.startViewTransition && !reduce && !document.hidden) {
        // The browser aborts the crossfade if the tab is hidden mid-way; the switch still applies
        var vt = document.startViewTransition(apply);
        vt.ready.catch(function () {});
        vt.finished.catch(function () {});
      } else apply();
      if (to === "knight") setTimeout(bats, 450);
    });
  }

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
