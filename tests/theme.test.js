import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getTheme, setTheme, initTheme, setupThemeToggle } from "../src/scripts/theme.js";

const STORAGE_KEY = "gpu-ref-theme";

/**
 * jsdom は window.matchMedia を実装していない（実行して確認済み）。
 * getTheme() の prefers-color-scheme フォールバックに入るケースでは必須。
 */
function stubMatchMedia(matches) {
  const impl = vi.fn((query) => ({
    matches,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  vi.stubGlobal("matchMedia", impl);
  window.matchMedia = impl;
  return impl;
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  document.body.innerHTML = "";
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete window.matchMedia;
});

describe("getTheme", () => {
  it("returns the saved theme from localStorage", () => {
    localStorage.setItem(STORAGE_KEY, "light");
    expect(getTheme()).toBe("light");

    localStorage.setItem(STORAGE_KEY, "dark");
    expect(getTheme()).toBe("dark");
  });

  it("does not consult matchMedia when a valid theme is saved", () => {
    const mm = stubMatchMedia(true);
    localStorage.setItem(STORAGE_KEY, "dark");
    expect(getTheme()).toBe("dark");
    expect(mm).not.toHaveBeenCalled();
  });

  it("ignores a stored value that is not light or dark", () => {
    stubMatchMedia(false);
    localStorage.setItem(STORAGE_KEY, "sepia");
    expect(getTheme()).toBe("dark");
  });

  it("falls back to dark when nothing is saved", () => {
    stubMatchMedia(false);
    expect(getTheme()).toBe("dark");
  });
});

describe("setTheme", () => {
  it("sets the data-theme attribute on the root element", () => {
    setTheme("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");

    setTheme("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("persists the theme to localStorage", () => {
    setTheme("light");
    expect(localStorage.getItem(STORAGE_KEY)).toBe("light");

    setTheme("dark");
    expect(localStorage.getItem(STORAGE_KEY)).toBe("dark");
  });
});

describe("initTheme", () => {
  it("applies the saved theme to the document", () => {
    localStorage.setItem(STORAGE_KEY, "light");
    initTheme();
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });
});

describe("setupThemeToggle", () => {
  function mountButton() {
    document.body.innerHTML = '<button id="theme-toggle"></button>';
    return document.getElementById("theme-toggle");
  }

  it("does nothing when the button is absent", () => {
    expect(() => setupThemeToggle()).not.toThrow();
  });

  it("labels the button for the current theme on setup", () => {
    setTheme("dark");
    const btn = mountButton();
    setupThemeToggle();
    expect(btn.textContent).toBe("☀️");
    expect(btn.title).toBe("Light mode");
  });

  it("flips dark to light on click and persists it", () => {
    setTheme("dark");
    const btn = mountButton();
    setupThemeToggle();

    btn.dispatchEvent(new Event("click"));

    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(localStorage.getItem(STORAGE_KEY)).toBe("light");
    expect(btn.textContent).toBe("🌙");
    expect(btn.title).toBe("Dark mode");
  });

  it("flips light back to dark on a second click", () => {
    setTheme("light");
    const btn = mountButton();
    setupThemeToggle();

    btn.dispatchEvent(new Event("click"));
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");

    btn.dispatchEvent(new Event("click"));
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(localStorage.getItem(STORAGE_KEY)).toBe("light");
  });
});
