"use strict";
const editorExpansionPrefix = "home-pager.editor-expansion.v1:";
let editorExpansionPaths = new WeakMap();
let editorExpansionContext = null;
const editorExpansionRecords = new WeakMap();
function prepareEditorExpansion(reset = false) {
  const key = editorExpansionPrefix + JSON.stringify([$("directory").title, current.name]);
  let saved = {};
  try {
    if (reset) localStorage.removeItem(key);
    else saved = JSON.parse(localStorage.getItem(key) || "{}");
  } catch {}
  const blocks = {};
  if (saved?.blocks && typeof saved.blocks === "object")
    for (const [path, open] of Object.entries(saved.blocks))
      if (typeof open === "boolean") blocks[path] = open;
  const context = {key, blocks, defaultOpen: typeof saved?.defaultOpen === "boolean" ? saved.defaultOpen : undefined};
  editorExpansionContext = context;
  editorExpansionPaths = new WeakMap();
  const paths = new Set();
  function visit(n, path) {
    if (!n || ![2,4].includes(n.Kind)) return;
    const id = JSON.stringify(path);
    editorExpansionPaths.set(n, id); paths.add(id);
    if (n.Kind === 4) {
      for (let i=0; i<(n.Content?.length || 0); i+=2) visit(n.Content[i+1], [...path,"key",n.Content[i].Value]);
    } else {
      const seen = new Map();
      for (const [index, child] of (n.Content || []).entries()) {
        const name = child.Kind === 4 && child.Content?.length === 2 ? child.Content[0].Value : mapValue(child,"type")?.Value || String(index);
        const occurrence = seen.get(name) || 0; seen.set(name,occurrence+1);
        visit(child,[...path,"item",name,occurrence]);
      }
    }
  }
  visit(root(),[]);
  for (const path of Object.keys(blocks)) if (!paths.has(path)) delete blocks[path];
}
function persistEditorExpansion(context) {
  try { localStorage.setItem(context.key, JSON.stringify({defaultOpen:context.defaultOpen,blocks:context.blocks})); } catch {}
}
function savedEditorExpansion(value) {
  const path = editorExpansionPaths.get(value);
  return editorExpansionContext?.blocks[path] ?? editorExpansionContext?.defaultOpen;
}
function attachEditorExpansion(details, value, actions) {
  const context = editorExpansionContext;
  const path = editorExpansionPaths.get(value);
  const toggle = button("", "tree-toggle-button", event => {
    event.preventDefault(); event.stopPropagation();
    remember(!details.open);
  });
  function updateLabel() {
    toggle.textContent = details.open ? t("Свернуть") : t("Развернуть");
    toggle.title = toggle.textContent;
    toggle.setAttribute("aria-expanded",String(details.open));
  }
  function remember(open, persist = true) {
    details.open = open;
    blockOpenStates.set(value,open);
    context.blocks[path] = open;
    updateLabel();
    if (persist) persistEditorExpansion(context);
  }
  details.addEventListener("toggle", () => {
    updateLabel();
    if (details.isConnected && !$("search").value && context.blocks[path] !== details.open) remember(details.open);
  });
  editorExpansionRecords.set(details,{context,remember});
  updateLabel(); actions.append(toggle);
}
function setAllEditorExpansion(open) {
  const contexts = new Set();
  for (const details of $("editor").querySelectorAll("details.tree-group")) {
    const record = editorExpansionRecords.get(details);
    if (!record) continue;
    record.remember(open,false); record.context.defaultOpen = open; contexts.add(record.context);
  }
  for (const context of contexts) persistEditorExpansion(context);
}
$("editor-collapse-all").addEventListener("click", () => setAllEditorExpansion(false));
$("editor-expand-all").addEventListener("click", () => setAllEditorExpansion(true));
