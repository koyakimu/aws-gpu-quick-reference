import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getStoredTheme,
  getSystemTheme,
  getTheme,
  applyTheme,
  setTheme,
  initTheme,
  setupThemeToggle,
} from "../src/scripts/theme.js";

const STORAGE_KEY = "gpu-ref-theme-pref";
// 旧キー。以前の initTheme が初回訪問で必ず書き込んでいたため、
// 既存訪問者の値は「明示的な選択」とは限らない。移行せず無視する。
const LEGACY_STORAGE_KEY = "gpu-ref-theme";

/**
 * jsdom は window.matchMedia を実装していない（実行して確認済み）。
 * prefers-color-scheme を読むケースでは必須。
 */
function stubMatchMedia(prefersLight) {
  const impl = vi.fn((query) => ({
    matches: prefersLight,
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

describe("getStoredTheme", () => {
  it("returns the explicit choice", () => {
    localStorage.setItem(STORAGE_KEY, "light");
    expect(getStoredTheme()).toBe("light");
  });

  it("returns null when nothing has been chosen", () => {
    expect(getStoredTheme()).toBeNull();
  });

  it("returns null for a value that is neither light nor dark", () => {
    localStorage.setItem(STORAGE_KEY, "sepia");
    expect(getStoredTheme()).toBeNull();
  });

  it("ignores a value left under the legacy key", () => {
    localStorage.setItem(LEGACY_STORAGE_KEY, "light");
    expect(getStoredTheme()).toBeNull();
  });
});

describe("getSystemTheme", () => {
  it("is light when the OS prefers light", () => {
    stubMatchMedia(true);
    expect(getSystemTheme()).toBe("light");
  });

  it("is dark when the OS prefers dark", () => {
    stubMatchMedia(false);
    expect(getSystemTheme()).toBe("dark");
  });

  it("is dark when matchMedia is unavailable", () => {
    expect(getSystemTheme()).toBe("dark");
  });
});

describe("getTheme", () => {
  it("prefers the stored choice over the OS setting", () => {
    stubMatchMedia(true); // OS says light
    localStorage.setItem(STORAGE_KEY, "dark");
    expect(getTheme()).toBe("dark");
  });

  it("does not consult matchMedia when a choice is stored", () => {
    const mm = stubMatchMedia(true);
    localStorage.setItem(STORAGE_KEY, "dark");
    getTheme();
    expect(mm).not.toHaveBeenCalled();
  });

  it("follows the OS setting when nothing is stored", () => {
    stubMatchMedia(true);
    expect(getTheme()).toBe("light");
    localStorage.clear();
    stubMatchMedia(false);
    expect(getTheme()).toBe("dark");
  });

  it("ignores a stored value that is neither light nor dark", () => {
    stubMatchMedia(false);
    localStorage.setItem(STORAGE_KEY, "sepia");
    expect(getTheme()).toBe("dark");
  });

  it("follows the OS setting even when the legacy key holds a value", () => {
    stubMatchMedia(true);
    localStorage.setItem(LEGACY_STORAGE_KEY, "dark");
    expect(getTheme()).toBe("light");
  });
});

describe("applyTheme", () => {
  it("sets data-theme without persisting", () => {
    applyTheme("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
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
  it("applies the stored choice", () => {
    stubMatchMedia(false);
    localStorage.setItem(STORAGE_KEY, "light");
    initTheme();
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("applies the OS setting on a first visit", () => {
    stubMatchMedia(true);
    initTheme();
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  // 仕様 6.2 の肝。初回訪問で保存してしまうと、以後 OS 設定に追従しなくなる。
  it("does not persist anything on a first visit", () => {
    stubMatchMedia(true);
    initTheme();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("keeps following the OS across reloads until the user chooses", () => {
    stubMatchMedia(true);
    initTheme();
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");

    // OS 設定が変わった状態で再訪。保存が無いので追従する。
    stubMatchMedia(false);
    initTheme();
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("stops following the OS once the user has chosen", () => {
    stubMatchMedia(true);
    setTheme("dark"); // 明示的な切替
    stubMatchMedia(true); // OS は light のまま
    initTheme();
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });
});

describe("setupThemeToggle", () => {
  function mountButton() {
    document.body.innerHTML = '<button id="theme-toggle" type="button"></button>';
    return document.getElementById("theme-toggle");
  }

  it("does nothing when the button is absent", () => {
    expect(() => setupThemeToggle()).not.toThrow();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("labels the button with the theme it will switch to", () => {
    stubMatchMedia(false);
    applyTheme("dark");
    const btn = mountButton();
    setupThemeToggle();
    expect(btn.textContent).toBe("ライト");
    expect(btn.title).toBe("ライト");
  });

  it("carries no emoji in the label", () => {
    stubMatchMedia(false);
    applyTheme("dark");
    const btn = mountButton();
    setupThemeToggle();
    expect(/\p{Extended_Pictographic}/u.test(btn.textContent)).toBe(false);
  });

  it("flips dark to light on click, persists it, and relabels", () => {
    stubMatchMedia(false);
    applyTheme("dark");
    const btn = mountButton();
    setupThemeToggle();

    btn.dispatchEvent(new Event("click"));

    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(localStorage.getItem(STORAGE_KEY)).toBe("light");
    expect(btn.textContent).toBe("ダーク");
    expect(btn.title).toBe("ダーク");
  });

  it("flips light back to dark on a second click", () => {
    stubMatchMedia(false);
    applyTheme("light");
    const btn = mountButton();
    setupThemeToggle();

    btn.dispatchEvent(new Event("click"));
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");

    btn.dispatchEvent(new Event("click"));
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(localStorage.getItem(STORAGE_KEY)).toBe("light");
  });

  it("relabels when the language changes", async () => {
    const { setLang } = await import("../src/scripts/i18n.js");
    stubMatchMedia(false);
    applyTheme("dark");
    const btn = mountButton();
    setupThemeToggle();
    expect(btn.textContent).toBe("ライト");

    setLang("en");
    expect(btn.textContent).toBe("Light");

    setLang("ja"); // 他のテストに影響しないよう戻す
  });
});
