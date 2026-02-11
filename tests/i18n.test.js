import { describe, it, expect, beforeEach, vi } from "vitest";

describe("detectLanguage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("returns saved language from localStorage", async () => {
    localStorage.setItem("gpu-ref-lang", "en");
    const { detectLanguage } = await import("../src/scripts/i18n.js");
    expect(detectLanguage()).toBe("en");
  });

  it("returns ja for Japanese navigator.language when no saved preference", async () => {
    vi.stubGlobal("navigator", { language: "ja-JP" });
    const mod = await import("../src/scripts/i18n.js");
    localStorage.removeItem("gpu-ref-lang");
    expect(mod.detectLanguage()).toBe("ja");
  });

  it("returns en for non-Japanese navigator.language when no saved preference", async () => {
    vi.stubGlobal("navigator", { language: "en-US" });
    localStorage.removeItem("gpu-ref-lang");
    const mod = await import("../src/scripts/i18n.js");
    expect(mod.detectLanguage()).toBe("en");
  });
});

describe("localStorage persistence", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("setLang saves to localStorage", async () => {
    const { setLang } = await import("../src/scripts/i18n.js");
    setLang("en");
    expect(localStorage.getItem("gpu-ref-lang")).toBe("en");
    setLang("ja");
    expect(localStorage.getItem("gpu-ref-lang")).toBe("ja");
  });
});
