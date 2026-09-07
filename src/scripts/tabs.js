// URL ハッシュでタブを切り替える。非表示のタブも DOM は描いたまま hidden で隠すので、
// 切り替えのたびに描き直す必要がない (仕様 5.5)。
export const TAB_IDS = ["compare", "regions", "features", "calculator"];

const DEFAULT_TAB = "compare";

export function tabFromHash(hash) {
  const id = String(hash || "").replace(/^#/, "");
  return TAB_IDS.includes(id) ? id : DEFAULT_TAB;
}

export function initTabs({ onChange } = {}) {
  const nav = document.getElementById("tabs");
  const buttons = new Map(
    [...document.querySelectorAll(".tab[data-tab]")].map((btn) => [btn.dataset.tab, btn]),
  );
  const panels = new Map(
    TAB_IDS.map((id) => [id, document.getElementById(`panel-${id}`)]).filter(([, el]) => el),
  );

  if (!nav || panels.size === 0) return { show() {} };

  let current = null;

  function paint(id) {
    for (const [tabId, panel] of panels) panel.hidden = tabId !== id;
    for (const [tabId, btn] of buttons) {
      btn.classList.toggle("on", tabId === id);
      btn.setAttribute("aria-selected", String(tabId === id));
    }
    if (current === id) return;
    current = id;
    if (typeof onChange === "function") onChange(id);
  }

  function show(id) {
    const tab = tabFromHash(id);
    // ハッシュを書くと hashchange が飛ぶが、paint は同じ id なら onChange を呼ばない。
    if (window.location.hash !== `#${tab}`) window.location.hash = `#${tab}`;
    paint(tab);
  }

  nav.addEventListener("click", (event) => {
    const btn = event.target.closest(".tab[data-tab]");
    if (!btn) return;
    show(btn.dataset.tab);
  });

  window.addEventListener("hashchange", () => paint(tabFromHash(window.location.hash)));

  paint(tabFromHash(window.location.hash));

  return { show };
}
