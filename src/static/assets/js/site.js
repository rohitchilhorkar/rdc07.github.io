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

  // Soft spotlight that follows the cursor across cards
  var spotSel = ".case, .repo, .stat, .xp details, .cred, .stack__row, .pouch";
  document.querySelectorAll(spotSel).forEach(function (el) { el.classList.add("spot"); });
  document.addEventListener("pointermove", function (e) {
    var t = e.target.closest && e.target.closest(".spot");
    if (!t) return;
    var r = t.getBoundingClientRect();
    t.style.setProperty("--mx", (e.clientX - r.left) + "px");
    t.style.setProperty("--my", (e.clientY - r.top) + "px");
  }, { passive: true });

  // Hero name: split into letters so they can ripple on hover
  document.querySelectorAll(".hero h1").forEach(function (h) {
    var text = h.textContent.trim(), i = 0;
    h.setAttribute("aria-label", text);
    h.innerHTML = text.split(" ").map(function (word) {
      return '<span class="word" aria-hidden="true">' + word.split("").map(function (ch) {
        return '<span class="ch" style="--i:' + (i++) + '">' + ch + "</span>";
      }).join("") + "</span>";
    }).join(" ");
  });

  // Hero photo: 3D tilt toward the cursor with a moving shine
  if (!reduce) {
    document.querySelectorAll(".hero__photo").forEach(function (ph) {
      ph.addEventListener("pointermove", function (e) {
        var r = ph.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        ph.style.setProperty("--rx", ((0.5 - y) * 16).toFixed(2) + "deg");
        ph.style.setProperty("--ry", ((x - 0.5) * 16).toFixed(2) + "deg");
        ph.style.setProperty("--px", (x * 100).toFixed(1) + "%");
        ph.style.setProperty("--py", (y * 100).toFixed(1) + "%");
      });
      ph.addEventListener("pointerleave", function () {
        ph.style.setProperty("--rx", "0deg");
        ph.style.setProperty("--ry", "0deg");
      });
    });
  }

  // Headings decode from random glyphs when their section scrolls in
  var GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&*<>/";
  var scramble = function (el) {
    if (reduce || el.getAttribute("data-done")) return;
    el.setAttribute("data-done", "1");
    var final = el.textContent, len = final.length, t0 = performance.now(), dur = 650;
    el.setAttribute("aria-label", final);
    var finished = false;
    // If animation frames are paused (background tab), still land on the real text
    setTimeout(function () { finished = true; el.textContent = final; }, dur + 80);
    var tick = function (now) {
      if (finished) return;
      var p = Math.min(1, (now - t0) / dur), shown = Math.floor(p * len), out = "";
      for (var i = 0; i < len; i++) {
        var ch = final.charAt(i);
        out += i < shown || ch === " " ? ch : GLYPHS.charAt((Math.random() * GLYPHS.length) | 0);
      }
      el.textContent = p < 1 ? out : final;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  // Command menu: Ctrl+K / Cmd+K
  var dlg = document.querySelector("[data-cmdk-dialog]");
  if (dlg && dlg.showModal) {
    var input = dlg.querySelector(".cmdk__input"), list = dlg.querySelector(".cmdk__list");
    var sel = 0, shown = [];
    var isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
    document.querySelectorAll("[data-mod]").forEach(function (k) { k.textContent = isMac ? "⌘" : "Ctrl"; });
    var smooth = reduce ? "auto" : "smooth";
    var go = function (hash) {
      return function () {
        var el = document.querySelector(hash);
        if (el) el.scrollIntoView({ behavior: smooth });
        else location.href = "/" + hash;
      };
    };
    var openUrl = function (u) { return function () { window.open(u, "_blank", "noopener"); }; };
    var click = function (s) { return function () { var b = document.querySelector(s); if (b) b.click(); }; };
    var cmds = [
      { t: "Go to Experience", k: "jobs missions career", run: go("#experience") },
      { t: "Go to Work", k: "case studies projects case files", run: go("#work") },
      { t: "Go to Builds", k: "github repos cave", run: go("#builds") },
      { t: "Go to Stack", k: "skills tools utility belt", run: go("#stack") },
      { t: "Contact", k: "email hire signal reach", run: go("#contact") },
      { t: "Download resume (PDF)", k: "cv resume pdf", run: function () {
        var a = document.createElement("a");
        a.href = "/Rohit_Chilhorkar_Resume.pdf"; a.download = "";
        document.body.appendChild(a); a.click(); a.remove();
      } },
      { t: "Copy email address", k: "mail copy contact", run: function () { if (navigator.clipboard) navigator.clipboard.writeText("rdchilhorkar@gmail.com"); } },
      { t: "Open GitHub", k: "code repos source", run: openUrl("https://github.com/rohitchilhorkar") },
      { t: "Open LinkedIn", k: "profile network", run: openUrl("https://www.linkedin.com/in/rohitchilhorkar") },
      { t: "Simulate a traffic spike", k: "demo sim gpu karpenter scale", run: function () {
        var b = document.querySelector("[data-sim-spike]");
        if (!b) { location.href = "/#sim"; return; }
        b.scrollIntoView({ behavior: smooth, block: "center" });
        setTimeout(function () { b.click(); }, reduce ? 0 : 450);
      } },
      { t: "Switch theme: warm / Night Shift", k: "batman knight skin dark theme", run: click("[data-skin-toggle]") },
      { t: "Toggle light / dark", k: "light dark mode theme", when: function () { return !isKnight(); }, run: click("[data-theme-toggle]") },
      { t: "Release the bats", k: "bats batman", when: isKnight, run: bats }
    ];
    var render = function () {
      var words = input.value.toLowerCase().split(/\s+/).filter(Boolean);
      shown = cmds.filter(function (c) {
        if (c.when && !c.when()) return false;
        var hay = (c.t + " " + c.k).toLowerCase();
        return words.every(function (w) { return hay.indexOf(w) !== -1; });
      });
      sel = Math.min(sel, Math.max(0, shown.length - 1));
      list.innerHTML = "";
      if (!shown.length) { list.innerHTML = '<li class="cmdk__empty">No matching command</li>'; return; }
      shown.forEach(function (c, i) {
        var li = document.createElement("li");
        li.setAttribute("role", "option");
        li.setAttribute("aria-selected", String(i === sel));
        li.textContent = c.t;
        li.addEventListener("mousemove", function () { if (sel !== i) { sel = i; render(); } });
        li.addEventListener("click", function () { runCmd(i); });
        list.appendChild(li);
      });
    };
    var runCmd = function (i) { var c = shown[i]; if (!c) return; dlg.close(); c.run(); };
    var openMenu = function () { input.value = ""; sel = 0; render(); dlg.showModal(); input.focus(); };
    input.addEventListener("input", function () { sel = 0; render(); });
    input.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown") { e.preventDefault(); sel = (sel + 1) % Math.max(1, shown.length); render(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); sel = (sel - 1 + shown.length) % Math.max(1, shown.length); render(); }
      else if (e.key === "Enter") { e.preventDefault(); runCmd(sel); }
    });
    dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
    document.querySelectorAll("[data-cmdk]").forEach(function (b) { b.addEventListener("click", openMenu); });
    document.addEventListener("keydown", function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (dlg.open) dlg.close(); else openMenu();
      }
    });
  }

  if (!("IntersectionObserver" in window)) {
    document.querySelectorAll(".reveal").forEach(function (el) { el.classList.add("in"); });
    return;
  }

  // Reveal sections once
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      en.target.classList.add("in");
      en.target.querySelectorAll("[data-scramble]").forEach(scramble);
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
