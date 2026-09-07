// 世代ボタンとファミリのチェックボックス。Compare タブと Regions タブが
// 同じ状態 (state.generations / state.families) を共有し、それぞれ自前のバーに
// 同じ UI を出すので、組み立て・同期・クリック処理をここにまとめている。
//
// 状態そのものは持たない。呼び出し側の state オブジェクトを直接書き換え、
// 変更を onChange で知らせるだけ。

// データに出てくる順で重複を除く。フィルタの並びをデータ順に合わせるため。
export function uniqueInOrder(rows, key) {
  const seen = new Set();
  const out = [];
  for (const row of rows) {
    if (seen.has(row[key])) continue;
    seen.add(row[key]);
    out.push(row[key]);
  }
  return out;
}

export function toggleInArray(list, value) {
  const index = list.indexOf(value);
  if (index === -1) list.push(value);
  else list.splice(index, 1);
}

function setPressed(btn, on) {
  btn.classList.toggle("on", on);
  btn.setAttribute("aria-pressed", String(on));
}

export function buildGenerationButtons(box, rows, state, t) {
  if (!box) return;
  const fragment = document.createDocumentFragment();
  for (const gen of uniqueInOrder(rows, "gen")) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "ctl";
    btn.dataset.gen = gen;
    btn.textContent = t(`generations.${gen}`);
    setPressed(btn, state.generations.includes(gen));
    fragment.appendChild(btn);
  }
  box.replaceChildren(fragment);
}

export function buildFamilyCheckboxes(box, rows, state) {
  if (!box) return;
  const fragment = document.createDocumentFragment();
  for (const family of uniqueInOrder(rows, "ec2")) {
    const label = document.createElement("label");
    label.className = "menu-item";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.dataset.family = family;
    input.checked = state.families.includes(family);
    label.appendChild(input);
    label.appendChild(document.createTextNode(family));
    fragment.appendChild(label);
  }
  box.replaceChildren(fragment);
}

// もう一方のタブが状態を変えたときに、作り直さずに見た目だけ合わせる。
export function syncGenerationButtons(box, state) {
  if (!box) return;
  for (const btn of box.querySelectorAll("[data-gen]")) {
    setPressed(btn, state.generations.includes(btn.dataset.gen));
  }
}

export function syncFamilyCheckboxes(box, state) {
  if (!box) return;
  for (const input of box.querySelectorAll("[data-family]")) {
    input.checked = state.families.includes(input.dataset.family);
  }
}

export function bindGenerationToggle(box, state, onChange) {
  if (!box) return;
  box.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-gen]");
    if (!btn) return;
    toggleInArray(state.generations, btn.dataset.gen);
    setPressed(btn, state.generations.includes(btn.dataset.gen));
    onChange();
  });
}

export function bindFamilyToggle(box, state, onChange) {
  if (!box) return;
  box.addEventListener("change", (event) => {
    const input = event.target.closest("[data-family]");
    if (!input) return;
    toggleInArray(state.families, input.dataset.family);
    onChange();
  });
}
