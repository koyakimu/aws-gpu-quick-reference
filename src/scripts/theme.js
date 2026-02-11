const STORAGE_KEY = "gpu-ref-theme";

export function getTheme() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function setTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(STORAGE_KEY, theme);
}

export function initTheme() {
  const theme = getTheme();
  setTheme(theme);
}

export function setupThemeToggle() {
  const btn = document.getElementById("theme-toggle");
  if (!btn) return;

  function updateIcon() {
    const current = document.documentElement.getAttribute("data-theme");
    btn.textContent = current === "dark" ? "\u2600\uFE0F" : "\uD83C\uDF19";
    btn.title = current === "dark" ? "Light mode" : "Dark mode";
  }

  btn.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    setTheme(current === "dark" ? "light" : "dark");
    updateIcon();
  });

  updateIcon();
}
