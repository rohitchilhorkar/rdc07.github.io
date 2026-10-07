// Runs in <head> before paint so the saved theme never flashes.
(function () {
  var d = document.documentElement;
  d.classList.remove("no-js");
  try {
    if (localStorage.getItem("theme") === "light") d.setAttribute("data-theme", "light");
  } catch (e) {}
})();
