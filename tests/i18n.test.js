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

  it("returns ko for Korean navigator.language when no saved preference", async () => {
    vi.stubGlobal("navigator", { language: "ko-KR" });
    localStorage.removeItem("gpu-ref-lang");
    const mod = await import("../src/scripts/i18n.js");
    expect(mod.detectLanguage()).toBe("ko");
  });

  it("returns saved ko language from localStorage", async () => {
    localStorage.setItem("gpu-ref-lang", "ko");
    const { detectLanguage } = await import("../src/scripts/i18n.js");
    expect(detectLanguage()).toBe("ko");
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

  it("setLang saves ko to localStorage", async () => {
    const { setLang } = await import("../src/scripts/i18n.js");
    setLang("ko");
    expect(localStorage.getItem("gpu-ref-lang")).toBe("ko");
  });
});

describe("pricingAsOf substitution", () => {
  it("replaces %PRICING_AS_OF% in translated strings", async () => {
    const { t, setLang } = await import("../src/scripts/i18n.js");
    const { PRICING_META } = await import("../src/scripts/gpu-data.js");
    const { formatMonth } = await import("../src/scripts/format.js");
    ["ja", "en", "ko"].forEach((lang) => {
      setLang(lang);
      const note = t("notes.priceNote");
      expect(note, `${lang}: placeholder left unsubstituted`).not.toContain("%PRICING_AS_OF%");
      // ISO ではなく言語ごとの月表記で入る
      expect(note, `${lang}: pricingAsOf missing`).toContain(formatMonth(PRICING_META.pricingAsOf, lang));
      expect(note, `${lang}: raw ISO month leaked`).not.toContain(PRICING_META.pricingAsOf);
    });
  });

  it("leaves strings without the placeholder alone", async () => {
    const { t, setLang } = await import("../src/scripts/i18n.js");
    setLang("en");
    expect(t("notes.efaNote")).not.toContain("%");
  });

  it("returns the key unchanged for a missing key", async () => {
    const { t } = await import("../src/scripts/i18n.js");
    expect(t("nope.not.a.key")).toBe("nope.not.a.key");
  });
});
