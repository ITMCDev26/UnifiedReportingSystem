/* theme.js — dark/light mode, persisted in localStorage */
(function () {
  const KEY = "ubcc_theme";
  function apply(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    const btn = document.getElementById("themeToggle");
    if (btn) btn.textContent = theme === "light" ? "🌙" : "☀️";
  }
  function init() {
    const saved = localStorage.getItem(KEY) ||
      (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
    apply(saved);
    const btn = document.getElementById("themeToggle");
    if (btn) {
      btn.addEventListener("click", () => {
        const cur = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
        localStorage.setItem(KEY, cur);
        apply(cur);
      });
    }
  }
  document.addEventListener("DOMContentLoaded", init);
})();
