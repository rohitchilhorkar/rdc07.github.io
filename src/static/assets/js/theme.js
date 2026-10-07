// Runs in <head> before paint so the saved skin and theme never flash.
// Skin: "warm" (default) or "knight". ?theme=knight in the URL picks one and remembers it.
(function () {
  var d = document.documentElement;
  d.classList.remove("no-js");
  try {
    var q = new URLSearchParams(location.search).get("theme");
    if (q === "knight" || q === "warm") localStorage.setItem("skin", q);
    if (localStorage.getItem("skin") === "knight") d.setAttribute("data-skin", "knight");
    if (localStorage.getItem("theme") === "light") d.setAttribute("data-theme", "light");
  } catch (e) {}
})();
