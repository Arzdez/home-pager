// DOM integration tests. These test the real embedded frontend and Go HTTP API,
// without launching or controlling a browser.
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { JSDOM } = require("jsdom");
const { readFileSync, writeFileSync, mkdtempSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const { spawn } = require("node:child_process");
const { Script } = require("node:vm");
const base = "http://127.0.0.1:18091";
let processHandle, dir;
async function until(fn, message = "condition") {
  for (let i = 0; i < 150; i++) {
    if (await fn()) return;
    await new Promise((r) => setTimeout(r, 20));
  }
  throw Error("Timed out: " + message);
}
before(async () => {
  dir = mkdtempSync(join(tmpdir(), "home-pager-test-"));
  const conf = join(dir, "panel.yaml");
  writeFileSync(
    conf,
    JSON.stringify({
      listen: "127.0.0.1:18091",
      config_dir: dir,
      password: "",
    }),
  );
  processHandle = spawn(
    process.platform === "win32" ? ".\\home-pager.exe" : "./home-pager",
    ["-conf", conf],
    { env: { ...process.env, HOMEPAGER_PASSWORD: "" }, stdio: "pipe" },
  );
  await until(async () => {
    try {
      return (await fetch(base + "/api/files")).ok;
    } catch {
      return false;
    }
  }, "Go server");
});
after(async () => {
  if (processHandle) {
    await new Promise((resolve) => {
      processHandle.once("exit", resolve);
      processHandle.kill();
    });
  }
  rmSync(dir, { recursive: true, force: true });
});
async function setup(
  preferences = null,
  systemDark = false,
  lastSection = null,
  storage = null,
  session = null,
) {
  const dom = new JSDOM(readFileSync("web/index.html", "utf8"), {
    url: base,
    runScripts: "outside-only",
    pretendToBeVisual: true,
  });
  const w = dom.window;
  for (const [key,value] of Object.entries(session || {})) w.sessionStorage.setItem(key,value);
  for (const [key,value] of Object.entries(storage || {})) w.localStorage.setItem(key,value);
  w.fetch = (path, opts) => fetch(new URL(path, base), opts);
  w.structuredClone = structuredClone;
  w.confirm = () => true;
  w.__panelMedia = {
    matches: systemDark,
    addEventListener(type, callback) {
      this.listener = callback;
    },
  };
  w.matchMedia = () => w.__panelMedia;
  if (lastSection)
    w.localStorage.setItem("home-pager.last-section", lastSection);
  if (preferences)
    w.localStorage.setItem(
      "home-pager.panel-preferences.v1",
      JSON.stringify(preferences),
    );
  w.HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  w.HTMLDialogElement.prototype.close = function () {
    this.open = false;
    this.dispatchEvent(new w.Event("close"));
  };
  for (const script of ["translations.en.js", "i18n.js"]) {
    new Script(readFileSync("web/" + script, "utf8")).runInContext(
      dom.getInternalVMContext(),
    );
  }
  new Script(readFileSync("web/panel-settings.js", "utf8")).runInContext(
    dom.getInternalVMContext(),
  );
  new Script(readFileSync("web/app.js", "utf8")).runInContext(
    dom.getInternalVMContext(),
  );
  new Script(readFileSync("web/editor-expansion.js", "utf8")).runInContext(dom.getInternalVMContext());
  new Script(readFileSync("web/info-fields.js", "utf8")).runInContext(dom.getInternalVMContext());
  new Script(readFileSync("web/homepage-extras.js", "utf8")).runInContext(dom.getInternalVMContext());
  new Script(readFileSync("web/unifi-ports.js", "utf8")).runInContext(dom.getInternalVMContext());
  new Script(readFileSync("web/appearance.js", "utf8")).runInContext(
    dom.getInternalVMContext(),
  );
  new Script(readFileSync("web/bookmark-appearance.js", "utf8")).runInContext(dom.getInternalVMContext());
  new Script(readFileSync("web/bookmark-settings.js", "utf8")).runInContext(dom.getInternalVMContext());
  new Script(readFileSync("web/server-settings.js", "utf8")).runInContext(
    dom.getInternalVMContext(),
  );
  await until(
    () =>
      !["Загрузка…", "Loading…"].includes(
        w.document.getElementById("file-status").textContent,
      ),
    "initial document",
  );
  return dom;
}
function click(w, selector) {
  const el = w.document.querySelector(selector);
  assert.ok(el, "Missing " + selector);
  el.click();
  return el;
}
function type(w, el, text) {
  el.value = text;
  el.dispatchEvent(new w.Event("input", { bubbles: true }));
}
const idle = (w) =>
  until(
    () => !w.document.querySelector("main").classList.contains("busy"),
    "idle UI",
  );

function block(w, name) {
  const element = [...w.document.querySelectorAll("[data-movable]")].find(
    (el) => el.dataset.blockName === name,
  );
  assert.ok(element, "Missing block " + name);
  return element;
}
function moveButton(element, direction) {
  return (
    element.querySelector(
      ":scope > summary .block-move-button[aria-label$='" + direction + "']",
    ) ||
    element.querySelector(
      ":scope > .field-actions .block-move-button[aria-label$='" +
        direction +
        "']",
    )
  );
}
function openWidgetCatalog(w, serviceName) {
  const service = block(w, serviceName),
    container =
      service.querySelector('[data-block-name="widgets"]') ||
      service.querySelector('[data-block-name="widget"]') ||
      service;
  container.querySelector(":scope > summary .context-add").click();
  const choice = w.document.querySelector(
    '#dialog-body [data-action="widget"]',
  );
  if (choice) choice.click();
}
function openParameters(w, element) {
  element.querySelector(":scope > summary .context-add").click();
  const choice = w.document.querySelector(
    '#dialog-body [data-action="parameter"]',
  );
  if (choice) choice.click();
}
function drag(w, source, target, after = false) {
  const transfer = { effectAllowed: "", dropEffect: "", setData() {} };
  function event(type, y = 0) {
    const e = new w.Event(type, { bubbles: true, cancelable: true });
    Object.defineProperties(e, {
      dataTransfer: { value: transfer },
      clientY: { value: y },
    });
    return e;
  }
  const handle =
    source.querySelector(":scope > summary > .block-drag-handle") ||
    source.querySelector(":scope > .field-label > .block-drag-handle");
  assert.ok(handle);
  handle.dispatchEvent(event("dragstart"));
  const header =
    target.querySelector(":scope > summary") ||
    target.querySelector(":scope > .field-label");
  const over = event("dragover", after ? 1 : -1);
  header.dispatchEvent(over);
  const drop = event("drop", after ? 1 : -1);
  header.dispatchEvent(drop);
  handle.dispatchEvent(event("dragend"));
  return drop.defaultPrevented;
}

test("empty config → template → visual edit → save → YAML → repair", async () => {
  const dom = await setup(),
    w = dom.window,
    d = w.document;
  try {
    assert.match(d.querySelector(".empty").textContent, /Начните/);
    click(w, ".empty .primary");
    click(w, ".template-card");
    assert.equal(d.getElementById("save").disabled, false);
    const input = d.querySelector("label[for] strong");
    assert.ok(input);
    const title = d.querySelector("#" + input.parentElement.htmlFor);
    type(w, title, "Тестовый дом");
    click(w, "#save");
    await idle(w);
    assert.match(
      readFileSync(join(dir, "settings.yaml"), "utf8"),
      /Тестовый дом/,
    );
    assert.equal(d.getElementById("save").disabled, true);
    click(w, "#raw-tab");
    await idle(w);
    assert.match(d.getElementById("raw").value, /Тестовый дом/);
    type(w, d.getElementById("raw"), "title: [broken");
    click(w, "#visual-tab");
    await idle(w);
    assert.equal(
      d.getElementById("visual-tab").getAttribute("aria-selected"),
      "false",
    );
    assert.equal(d.getElementById("error").classList.contains("hidden"), false);
    type(
      w,
      d.getElementById("raw"),
      "# preserved\ntitle: Исправлено\nunknownFutureOption: true\n",
    );
    click(w, "#save");
    await idle(w);
    assert.match(
      readFileSync(join(dir, "settings.yaml"), "utf8"),
      /# preserved/,
    );
    click(w, "#visual-tab");
    await idle(w);
    assert.match(d.getElementById("editor").textContent, /unknownFutureOption/);
    click(w, "#history");
    await idle(w);
    assert.match(d.getElementById("dialog-body").textContent, /байт/);
    click(w, "#dialog-close");
  } finally {
    dom.window.close();
  }
});
test("external conflict does not overwrite disk; history restores through review and save", async () => {
  const dom = await setup(),
    w = dom.window,
    d = w.document;
  try {
    click(w, "#raw-tab");
    await idle(w);
    type(w, d.getElementById("raw"), "title: Local draft\n");
    writeFileSync(join(dir, "settings.yaml"), "title: External change\n");
    click(w, "#save");
    await idle(w);
    assert.match(d.getElementById("error").textContent, /изменён/);
    assert.match(
      readFileSync(join(dir, "settings.yaml"), "utf8"),
      /External change/,
    );
    assert.equal(d.getElementById("save").disabled, false);
    click(w, "#reload");
    await idle(w);
    click(w, "#history");
    await idle(w);
    click(w, ".history-row button");
    await idle(w);
    assert.equal(d.getElementById("save").disabled, false);
    assert.match(
      readFileSync(join(dir, "settings.yaml"), "utf8"),
      /External change/,
    );
    click(w, "#review");
    await idle(w);
    assert.match(d.querySelector(".diff").textContent, /External change/);
    click(w, "#dialog-actions .primary");
    await idle(w);
    assert.doesNotMatch(
      readFileSync(join(dir, "settings.yaml"), "utf8"),
      /External change/,
    );
  } finally {
    dom.window.close();
  }
});
test("offline widget catalog adds service with all official template fields", async () => {
  const dom = await setup(),
    w = dom.window,
    d = w.document;
  try {
    const services = [...d.querySelectorAll("nav button")].find((b) =>
      b.textContent.includes("Сервисы"),
    );
    services.click();
    await idle(w);
    click(w, "#library");
    const search = d.querySelector("#dialog-body input[type=search]");
    type(w, search, "jellyfin");
    const cards = [...d.querySelectorAll(".library-entry")].filter(
      (e) => !e.classList.contains("hidden"),
    );
    assert.equal(cards.length, 1);
    cards[0].querySelector("button").click();
    assert.ok(
      block(w, "enableNowPlaying").querySelector('input[type="checkbox"]'),
    );
    click(w, "#save");
    await idle(w);
    const raw = readFileSync(join(dir, "services.yaml"), "utf8");
    assert.match(raw, /type: jellyfin/);
    assert.match(raw, /enableMediaControl/);
    click(w, "#review"); // Disabled after successful save.
    assert.equal(d.getElementById("dialog").open, false);
  } finally {
    dom.window.close();
  }
});
test("custom CSS stays in code mode; extra YAML opens and can be saved", async () => {
  const dom = await setup(),
    w = dom.window,
    d = w.document;
  try {
    [...d.querySelectorAll("nav button")]
      .find((b) => b.textContent.includes("Стили CSS"))
      .click();
    await idle(w);
    assert.equal(d.getElementById("visual-tab").disabled, true);
    type(w, d.getElementById("raw"), "body { color: red; }");
    click(w, "#save");
    await idle(w);
    assert.equal(
      readFileSync(join(dir, "custom.css"), "utf8"),
      "body { color: red; }",
    );
    click(w, "#new-file");
    type(w, d.querySelector("#dialog-body input"), "additional.yaml");
    click(w, "#dialog-actions .primary");
    await idle(w);
    assert.equal(d.getElementById("filename").textContent, "additional.yaml");
    click(w, "#raw-tab");
    await idle(w);
    type(w, d.getElementById("raw"), "nested:\n  list: [one, two]\n");
    click(w, "#save");
    await idle(w);
    assert.match(
      readFileSync(join(dir, "additional.yaml"), "utf8"),
      /list: \[one, two\]/,
    );
  } finally {
    dom.window.close();
  }
});

test("background URL conversion previews result, preserves filters and saves only on explicit save", async () => {
  writeFileSync(join(dir, "settings.yaml"), "title: Before import\n");
  const dom = await setup(),
    w = dom.window,
    d = w.document;
  const originalFetch = w.fetch;
  const path = "/images/background-0123456789abcdef0123456789abcdef.webp";
  let attempts = 0;
  w.fetch = async (url, options) => {
    if (url === "/api/images/import") {
      const request = JSON.parse(options.body);
      assert.equal(request.url, "https://example.com/wallpaper.png");
      assert.equal(request.format, "webp");
      assert.equal(request.maxWidth, 2560);
      attempts++;
      if (attempts === 1)
        return new Response(
          JSON.stringify({ error: "Не удалось загрузить изображение" }),
          { status: 422, headers: { "Content-Type": "application/json" } },
        );
      return new Response(
        JSON.stringify({
          path,
          preview:
            "/api/images/background-0123456789abcdef0123456789abcdef.webp",
          width: 1920,
          height: 1080,
          size: 1024,
          format: "webp",
        }),
        { headers: { "Content-Type": "application/json" } },
      );
    }
    return originalFetch(url, options);
  };
  try {
    click(w, "#raw-tab");
    await idle(w);
    type(
      w,
      d.getElementById("raw"),
      "# keep import comment\ntitle: Unsaved title\nbackground:\n  image: /old.png\n  blur: sm\n  brightness: 60\nfutureOption: yes\n",
    );
    click(w, "#background-import");
    await idle(w);
    type(
      w,
      d.getElementById("background-url"),
      "https://example.com/wallpaper.png",
    );
    click(w, "#dialog-actions button.primary:not(.hidden)");
    await until(
      () =>
        !d.querySelector("#dialog-body .error").classList.contains("hidden"),
      "download error",
    );
    assert.match(
      d.querySelector("#dialog-body .error").textContent,
      /Не удалось/,
    );
    click(w, "#dialog-actions button.primary:not(.hidden)");
    await until(
      () => !d.querySelector(".background-result").classList.contains("hidden"),
      "image result",
    );
    assert.ok(d.querySelector(".background-preview").src.endsWith(".webp"));
    assert.match(
      d.querySelector(".background-result").textContent,
      /1920 × 1080/,
    );
    const apply = [...d.querySelectorAll("#dialog-actions button")].find(
      (b) => b.textContent === "Применить фон",
    );
    apply.click();
    assert.equal(
      readFileSync(join(dir, "settings.yaml"), "utf8"),
      "title: Before import\n",
    );
    assert.equal(
      d.getElementById("visual-tab").getAttribute("aria-selected"),
      "true",
    );
    click(w, "#save");
    await idle(w);
    const raw = readFileSync(join(dir, "settings.yaml"), "utf8");
    assert.match(raw, /# keep import comment/);
    assert.match(raw, /Unsaved title/);
    assert.match(raw, /brightness: 60/);
    assert.match(raw, /blur: sm/);
    assert.match(raw, /futureOption: yes/);
    assert.ok(raw.includes(path));
  } finally {
    dom.window.close();
  }
});

test("visual block movement reorders groups and transfers services without losing fields", async () => {
  writeFileSync(
    join(dir, "services.yaml"),
    "# groups comment\n- Infra:\n    # Alpha comment\n    - Alpha:\n        href: https://alpha.example.com\n        future: preserved\n    - Beta:\n        href: https://beta.example.com\n- Media:\n    - Gamma:\n        href: https://gamma.example.com\n",
  );
  const dom = await setup(),
    w = dom.window,
    d = w.document;
  try {
    [...d.querySelectorAll("nav button")]
      .find((b) => b.textContent.includes("Сервисы"))
      .click();
    await idle(w);
    block(w, "Infra").open = false;
    moveButton(block(w, "Media"), "выше").click();
    assert.equal(
      block(w, "Infra").open,
      false,
      "Collapsed state lost during reorder",
    );
    block(w, "Infra").open = true;
    moveButton(block(w, "Alpha"), "ниже").click();
    const alpha = block(w, "Alpha");
    assert.equal(moveButton(alpha, "ниже").disabled, true);
    alpha.querySelector(":scope > summary .block-transfer-button").click();
    assert.match(d.getElementById("dialog-body").textContent, /Media/);
    click(w, "#dialog-actions .primary");
    assert.equal(d.getElementById("save").disabled, false);
    assert.ok(drag(w, block(w, "Beta"), block(w, "Gamma")));
    assert.equal(
      drag(w, block(w, "Media"), block(w, "Gamma")),
      false,
      "Nested group moved into itself",
    );
    assert.match(
      readFileSync(join(dir, "services.yaml"), "utf8"),
      /- Infra:/,
      "Movement wrote to disk before save",
    );
    click(w, "#save");
    await idle(w);
    const raw = readFileSync(join(dir, "services.yaml"), "utf8");
    assert.ok(raw.indexOf("- Media:") < raw.indexOf("- Infra:"));
    assert.ok(raw.indexOf("- Beta:") < raw.indexOf("- Gamma:"));
    assert.ok(raw.indexOf("- Gamma:") < raw.indexOf("- Alpha:"));
    assert.match(raw, /# Alpha comment/);
    assert.match(raw, /future: preserved/);
    assert.match(raw, /https:\/\/alpha.example.com/);
    click(w, "#reload");
    await idle(w);
    assert.equal(
      [...d.querySelectorAll("#editor > details")][0].dataset.blockName,
      "Media",
    );
  } finally {
    dom.window.close();
  }
});

test("visual movement preserves YAML mapping key-value pairs and scalar fields", async () => {
  writeFileSync(
    join(dir, "settings.yaml"),
    "title: Home # title comment\nlayout:\n  Infra:\n    columns: 3\nproviders:\n  example: api-key-placeholder\nlanguage: ru\n",
  );
  const dom = await setup(),
    w = dom.window,
    d = w.document;
  try {
    assert.equal(moveButton(block(w, "title"), "выше").disabled, true);
    moveButton(block(w, "layout"), "ниже").click();
    moveButton(block(w, "language"), "выше").click();
    assert.equal(moveButton(block(w, "layout"), "ниже").disabled, true);
    assert.ok(drag(w, block(w, "providers"), block(w, "title")));
    click(w, "#save");
    await idle(w);
    const raw = readFileSync(join(dir, "settings.yaml"), "utf8");
    assert.ok(raw.indexOf("providers:") < raw.indexOf("title:"));
    assert.ok(raw.indexOf("title:") < raw.indexOf("language:"));
    assert.ok(raw.indexOf("language:") < raw.indexOf("layout:"));
    assert.match(raw, /title: Home # title comment/);
    assert.match(raw, /example: api-key-placeholder/);
    assert.match(raw, /columns: 3/);
  } finally {
    dom.window.close();
  }
});

test("icon URL import adds icon to selected service without changing its widget or another service", async () => {
  writeFileSync(
    join(dir, "services.yaml"),
    "- Infra:\n    - Alpha:\n        href: https://alpha.example.com\n        widget:\n          type: customapi\n          key: preserved-key\n    - Beta:\n        href: https://beta.example.com\n        icon: old-beta.png\n",
  );
  const dom = await setup(),
    w = dom.window,
    d = w.document;
  const originalFetch = w.fetch,
    path = "/icons/icon-0123456789abcdef0123456789abcdef.png";
  w.fetch = async (url, options) => {
    if (url === "/api/images/import") {
      const params = JSON.parse(options.body);
      assert.equal(params.purpose, "icon");
      assert.equal(params.format, "png");
      assert.equal(params.maxWidth, 256);
      assert.equal(params.maxHeight, 256);
      return new Response(
        JSON.stringify({
          path,
          preview: "/api/icons/icon-0123456789abcdef0123456789abcdef.png",
          width: 128,
          height: 64,
          size: 512,
          format: "png",
        }),
        { headers: { "Content-Type": "application/json" } },
      );
    }
    return originalFetch(url, options);
  };
  try {
    [...d.querySelectorAll("nav button")]
      .find((b) => b.textContent.includes("Сервисы"))
      .click();
    await idle(w);
    click(w, "#icon-import");
    await idle(w);
    assert.equal(d.getElementById("icon-destination").options.length, 2);
    assert.match(
      d.getElementById("icon-destination").options[0].textContent,
      /Alpha/,
    );
    const source = d.getElementById("icon-source");
    assert.equal(source.value, "gallery");
    assert.ok(![...source.options].some((o) => o.value === "catalog"));
    source.value = "url";
    source.dispatchEvent(new w.Event("change"));
    type(w, d.getElementById("icon-url"), "https://example.com/icon.png");
    click(w, "#dialog-actions button.primary:not(.hidden)");
    await until(
      () => !d.querySelector(".background-result").classList.contains("hidden"),
      "icon preview",
    );
    assert.ok(d.querySelector(".icon-preview"));
    [...d.querySelectorAll("#dialog-actions button")]
      .find((b) => b.textContent === "Применить иконку")
      .click();
    assert.ok(!readFileSync(join(dir, "services.yaml"), "utf8").includes(path));
    click(w, "#save");
    await idle(w);
    const raw = readFileSync(join(dir, "services.yaml"), "utf8");
    assert.ok(raw.includes(path));
    assert.match(raw, /key: preserved-key/);
    assert.match(raw, /icon: old-beta.png/);
    assert.equal(d.querySelectorAll(".icon-upload-button").length, 2);
  } finally {
    dom.window.close();
  }
});

test("icon file upload replaces a bookmark icon and preserves comments", async () => {
  writeFileSync(
    join(dir, "bookmarks.yaml"),
    "- Links:\n    - Docs:\n        - href: https://docs.example.com\n          abbr: DOC\n          icon: old.png # icon comment\n",
  );
  const dom = await setup(),
    w = dom.window,
    d = w.document;
  const originalFetch = w.fetch,
    path = "/icons/icon-fedcba9876543210fedcba9876543210.webp";
  w.fetch = async (url, options) => {
    if (url === "/api/images/upload") {
      assert.equal(
        options.headers["Content-Type"],
        undefined,
        "Multipart boundary must be assigned by the browser",
      );
      assert.equal(JSON.parse(options.body.get("options")).purpose, "icon");
      assert.equal(options.body.get("file").name, "local.png");
      return new Response(
        JSON.stringify({
          path,
          preview: "/api/icons/icon-fedcba9876543210fedcba9876543210.webp",
          width: 64,
          height: 64,
          size: 256,
          format: "webp",
        }),
        { headers: { "Content-Type": "application/json" } },
      );
    }
    return originalFetch(url, options);
  };
  try {
    [...d.querySelectorAll("nav button")]
      .find((b) => b.textContent.includes("Закладки"))
      .click();
    await idle(w);
    click(w, ".icon-upload-button");
    await idle(w);
    const source = d.getElementById("icon-source");
    source.value = "file";
    source.dispatchEvent(new w.Event("change"));
    assert.ok(
      d.getElementById("icon-url").parentElement.classList.contains("hidden"),
    );
    Object.defineProperty(d.getElementById("icon-file"), "files", {
      value: [new w.File(["test image"], "local.png", { type: "image/png" })],
    });
    click(w, "#dialog-actions button.primary:not(.hidden)");
    await until(
      () => !d.querySelector(".background-result").classList.contains("hidden"),
      "uploaded icon",
    );
    [...d.querySelectorAll("#dialog-actions button")]
      .find((b) => b.textContent === "Применить иконку")
      .click();
    click(w, "#save");
    await idle(w);
    const raw = readFileSync(join(dir, "bookmarks.yaml"), "utf8");
    assert.ok(raw.includes(path));
    assert.match(raw, /# icon comment/);
    assert.match(raw, /abbr: DOC/);
    assert.ok(!raw.includes("old.png"));
  } finally {
    dom.window.close();
  }
});

test("visual fields use friendly choices, switches and numbers without a YAML type menu", async () => {
  writeFileSync(
    join(dir, "settings.yaml"),
    'theme: dark\nfullWidth: TRUE\nmaxGroupColumns: 3\ncustomValue: "00123"\noptional: null\nlanguage: custom-locale\n',
  );
  const dom = await setup(),
    w = dom.window,
    d = w.document;
  try {
    assert.equal(d.querySelectorAll(".type-select").length, 0);
    const theme = block(w, "theme").querySelector("select");
    assert.ok(theme);
    assert.equal(theme.options[0].textContent, "Тёмная");
    type(w, theme, "light");
    const toggle = block(w, "fullWidth").querySelector('input[role="switch"]');
    assert.equal(toggle.checked, true);
    toggle.checked = false;
    toggle.dispatchEvent(new w.Event("input"));
    assert.match(block(w, "fullWidth").textContent, /Выключено/);
    const number = block(w, "maxGroupColumns").querySelector(
      'input[type="number"]',
    );
    assert.ok(number);
    type(w, number, "5");
    const custom = block(w, "customValue").querySelector("input");
    assert.equal(custom.type, "text");
    type(w, custom, "00042");
    assert.equal(
      block(w, "optional").querySelector("input").placeholder,
      "По умолчанию",
    );
    assert.equal(
      block(w, "language").querySelector("select").value,
      "custom-locale",
    );
    click(w, "#save");
    await idle(w);
    const raw = readFileSync(join(dir, "settings.yaml"), "utf8");
    assert.match(raw, /theme: light/);
    assert.match(raw, /fullWidth: false/);
    assert.match(raw, /maxGroupColumns: 5/);
    assert.match(raw, /customValue: ["']00042["']/);
    assert.match(raw, /optional: null/);
    assert.match(raw, /language: custom-locale/);
    block(w, "customValue").querySelector(".field-more").click();
    assert.match(
      d.getElementById("dialog-title").textContent,
      /Дополнительные/,
    );
    assert.ok(!d.getElementById("dialog-body").textContent.includes("null"));
    click(w, "#dialog-close");
    const invalid = block(w, "maxGroupColumns").querySelector(
      'input[type="number"]',
    );
    type(w, invalid, "");
    click(w, "#save");
    await idle(w);
    assert.match(d.getElementById("error").textContent, /Максимум колонок/);
    assert.match(
      readFileSync(join(dir, "settings.yaml"), "utf8"),
      /maxGroupColumns: 5/,
    );
  } finally {
    dom.window.close();
  }
});

test("named widgets render as one card while keeping valid YAML, comments and list movement", async () => {
  writeFileSync(
    join(dir, "widgets.yaml"),
    "# widget comment\n- search:\n    provider: duckduckgo\n    target: _blank\n- datetime:\n    text_size: xl\n",
  );
  const dom = await setup(),
    w = dom.window,
    d = w.document;
  try {
    [...d.querySelectorAll("nav button")]
      .find((b) => b.textContent.includes("Инфовиджеты"))
      .click();
    await idle(w);
    assert.equal(
      d.querySelectorAll('[data-block-name="search"]').length,
      1,
      "Search rendered as two nested cards",
    );
    const search = block(w, "search");
    assert.equal(search.querySelectorAll("details.tree-group").length, 0);
    assert.equal(search.querySelectorAll(".field-row").length, 2);
    const provider = block(w, "provider").querySelector("select");
    type(w, provider, "google");
    moveButton(search, "ниже").click();
    click(w, "#save");
    await idle(w);
    const raw = readFileSync(join(dir, "widgets.yaml"), "utf8");
    assert.match(raw, /# widget comment/);
    assert.match(raw, /provider: google/);
    assert.match(raw, /target: _blank/);
    assert.ok(raw.indexOf("- datetime:") < raw.indexOf("- search:"));
    assert.equal(d.querySelectorAll('[data-block-name="search"]').length, 1);
  } finally {
    dom.window.close();
  }
});

test("service card attaches a widget template, adds typed modifiers and preserves existing service", async () => {
  writeFileSync(
    join(dir, "services.yaml"),
    "- Pve:\n    - pve1:\n        href: https://pve.example.com:8006\n        icon: proxmox.png\n        description: Keep service description\n",
  );
  const dom = await setup(),
    w = dom.window,
    d = w.document;
  async function chooseWidget(query) {
    const search = d.querySelector('#dialog-body input[type="search"]');
    type(w, search, query);
    const card = [...d.querySelectorAll(".library-entry")].find(
      (c) =>
        !c.classList.contains("hidden") &&
        c.dataset.search.endsWith(" " + query),
    );
    assert.ok(card);
    card.querySelector("button").click();
  }
  try {
    [...d.querySelectorAll("nav button")]
      .find((b) => b.textContent.includes("Сервисы"))
      .click();
    await idle(w);
    openWidgetCatalog(w, "pve1");
    await chooseWidget("proxmox");
    assert.ok(block(w, "widget"));
    openParameters(w, block(w, "widget"));
    click(w, '#dialog-body [data-parameter="fields"]');
    assert.ok(block(w, "fields").querySelector(".group-content"));
    assert.equal(
      d.querySelectorAll("#editor > .tree-group").length,
      1,
      "Template created a new group instead of attaching a widget",
    );
    openParameters(w, block(w, "pve1"));
    click(w, '#dialog-body [data-parameter="showStats"]');
    assert.equal(block(w, "showStats").querySelector("input").type, "checkbox");
    openParameters(w, block(w, "pve1"));
    click(w, '#dialog-body [data-parameter="siteMonitor"]');
    assert.equal(
      block(w, "siteMonitor").querySelector("input").value,
      "https://pve.example.com:8006",
    );
    // Adding another integration preserves the first widget, including its credentials.
    const typeField = block(w, "type").querySelector("input");
    assert.equal(typeField.value, "proxmox");
    openWidgetCatalog(w, "pve1");
    assert.equal(d.getElementById("widget-attach-mode").value, "append");
    await chooseWidget("jellyfin");
    assert.ok(block(w, "widgets"));
    const optional = block(w, "enableBlocks");
    optional.querySelector(".delete-button").click();
    const jellyType = [
      ...d.querySelectorAll('.field-row[data-block-name="type"] input'),
    ].find((i) => i.value === "jellyfin");
    const jellyCard = jellyType.closest(".tree-group");
    openParameters(w, jellyCard);
    click(w, '#dialog-body [data-parameter="enableBlocks"]');
    assert.equal(
      block(w, "enableBlocks").querySelector("input").type,
      "checkbox",
    );
    click(w, "#save");
    await idle(w);
    const raw = readFileSync(join(dir, "services.yaml"), "utf8");
    assert.match(raw, /widgets:/);
    assert.match(raw, /type: proxmox/);
    assert.match(raw, /resources.cpu/);
    assert.match(raw, /type: jellyfin/);
    assert.match(raw, /showStats: true/);
    assert.match(raw, /enableBlocks: true/);
    assert.match(raw, /Keep service description/);
    assert.match(raw, /icon: proxmox.png/);
    assert.match(raw, /siteMonitor: https:\/\/pve.example.com:8006/);
  } finally {
    dom.window.close();
  }
});

test("group and service creation uses named templates instead of generic YAML fields", async () => {
  writeFileSync(join(dir, "services.yaml"), "[]\n");
  const dom = await setup(),
    w = dom.window,
    d = w.document;
  try {
    [...d.querySelectorAll("nav button")]
      .find((b) => b.textContent.includes("Сервисы"))
      .click();
    await idle(w);
    click(w, "#add-root");
    type(w, d.querySelector("#dialog-body input"), "My group");
    click(w, "#dialog-actions .primary");
    block(w, "My group").querySelector(":scope > summary .context-add").click();
    click(w, '#dialog-body [data-action="service-template"]');
    assert.equal(
      d.querySelectorAll("#dialog-body .dialog-field input:not([type=search])")
        .length,
      1,
      "Fixed group should not ask for another group",
    );
    type(w, d.querySelector('#dialog-body input[type="search"]'), "proxmox");
    [...d.querySelectorAll(".library-entry")]
      .find(
        (c) =>
          !c.classList.contains("hidden") &&
          c.dataset.search.endsWith(" proxmox"),
      )
      .querySelector("button")
      .click();
    click(w, "#save");
    await idle(w);
    const raw = readFileSync(join(dir, "services.yaml"), "utf8");
    assert.match(raw, /My group:/);
    assert.match(raw, /type: proxmox/);
    const saved = await (
      await fetch(base + "/api/file?name=services.yaml")
    ).json();
    assert.equal(saved.tree.Content[0].Content.length, 1);
    assert.equal(saved.tree.Content[0].Content[0].Content[0].Value, "My group");
  } finally {
    dom.window.close();
  }
});

test("appearance controls configure real groups and save native layout with managed CSS", async () => {
  const initial =
    "# keep settings\ntitle: My dashboard\nfutureOption: keep\nbackground: /images/my-background.jpg\nlayout:\n  Media:\n    style: row\n    columns: 2\n    icon: mdi-play\n";
  const personalCSS = "/* my styles */\nbody { letter-spacing: .1px; }\n";
  writeFileSync(join(dir, "settings.yaml"), initial);
  writeFileSync(join(dir, "custom.css"), personalCSS);
  writeFileSync(join(dir, "bookmarks.yaml"), "[]\n");
  writeFileSync(
    join(dir, "services.yaml"),
    "- Media:\n    - My player:\n        href: https://player.example.com\n        widget:\n          type: jellyfin\n          key: do-not-show-this-secret\n    - My library:\n        href: https://library.example.com\n- Infra:\n    - My server:\n        href: https://server.example.com\n",
  );
  const dom = await setup(),
    w = dom.window,
    d = w.document;
  const change = (el, value) => {
    if (el.type === "checkbox") el.checked = value;
    else el.value = value;
    el.dispatchEvent(new w.Event("change", { bubbles: true }));
  };
  try {
    click(w, "#appearance-open");
    await idle(w);
    assert.ok(
      d.getElementById("dialog").classList.contains("appearance-dialog"),
    );
    assert.match(
      d.getElementById("appearance-preview").textContent,
      /My player/,
    );
    assert.ok(
      !d
        .getElementById("appearance-preview")
        .textContent.includes("do-not-show-this-secret"),
    );
    assert.ok(
      !d.getElementById("dialog-body").textContent.includes("Plex"),
      "No reference-specific preset should be injected",
    );
    change(d.getElementById("appearance-theme"), "dark");
    const infraStretch = d.querySelector('[data-group-path="Infra"] .appearance-group-stretch');
    assert.equal(infraStretch.checked, true);
    assert.equal(infraStretch.disabled, false);
    change(infraStretch, false);
    assert.equal(d.querySelector('.preview-group[data-name="Infra"]').style.flexGrow, "0");
    const media = d.querySelector('[data-group-path="Media"]');
    change(media.querySelector(".appearance-group-columns"), "3");
    change(media.querySelector(".appearance-group-header"), false);
    assert.equal(
      d.querySelector('.preview-group[data-name="Media"] > h4'),
      null,
    );
    assert.match(
      d.querySelector('.preview-group[data-name="Media"] > .preview-cards')
        .style.gridTemplateColumns,
      /repeat\(3/,
    );
    change(d.getElementById("appearance-custom-cards"), true);
    type(w, d.getElementById("appearance-card-opacity"), "35");
    assert.equal(
      d
        .getElementById("appearance-preview")
        .style.getPropertyValue("--preview-card-opacity"),
      "0.35",
    );
    const previewOrder = () => [...d.querySelectorAll("#appearance-preview .preview-group")].map(el => el.dataset.name);
    const source = d.querySelector('.preview-group[data-name="Infra"] .preview-service');
    const target = d.querySelector('.preview-group[data-name="Media"]');
    const groupGrid = target.parentElement;
    const previewStyles = d.createElement("style");
    previewStyles.textContent = await (await fetch(base + "/style.css")).text();
    d.head.append(previewStyles);
    assert.equal(w.getComputedStyle(groupGrid).display, "flex");
    assert.equal(w.getComputedStyle(groupGrid).flexWrap, "wrap");
    assert.equal(w.getComputedStyle(target).flexBasis, "100%");
    assert.equal(w.getComputedStyle(d.querySelector('.preview-group[data-name="Infra"]')).flexGrow, "0");
    const transfer = { setData() {}, effectAllowed: "", dropEffect: "" };
    for (const [element, name] of [[source, "dragstart"], [target, "dragover"], [target, "drop"]]) {
      const event = new w.Event(name, { bubbles: true, cancelable: true });
      Object.defineProperties(event, { dataTransfer: {value: transfer}, clientX: {value: -1}, clientY: {value: -1} });
      element.dispatchEvent(event);
    }
    assert.deepEqual(previewOrder(), ["Infra", "Media"]);
    assert.equal(readFileSync(join(dir, "settings.yaml"), "utf8"), initial);
    d.querySelector('.preview-group[data-name="Infra"] .preview-drag-handle').dispatchEvent(new w.KeyboardEvent("keydown", {key: "ArrowRight", bubbles: true}));
    assert.deepEqual(previewOrder(), ["Media", "Infra"]);
    d.querySelector('.preview-group[data-name="Infra"] .preview-drag-handle').dispatchEvent(new w.KeyboardEvent("keydown", {key: "ArrowLeft", bubbles: true}));
    assert.deepEqual(previewOrder(), ["Infra", "Media"]);
    click(w, "#dialog-actions .primary");
    assert.equal(
      readFileSync(join(dir, "settings.yaml"), "utf8"),
      initial,
      "Apply should only change draft",
    );
    assert.equal(readFileSync(join(dir, "custom.css"), "utf8"), personalCSS);
    assert.match(d.querySelector(".savebar strong").textContent, /custom.css/);
    click(w, "#review");
    await idle(w);
    assert.match(d.getElementById("dialog-body").textContent, /custom.css/);
    click(w, "#dialog-close");
    click(w, "#save");
    await idle(w);
    const settings = readFileSync(join(dir, "settings.yaml"), "utf8"),
      css = readFileSync(join(dir, "custom.css"), "utf8");
    assert.match(settings, /# keep settings/);
    assert.match(settings, /futureOption: keep/);
    assert.match(settings, /columns: 3/);
    assert.match(settings, /header: false/);
    assert.match(settings, /icon: mdi-play/);
    assert.ok(settings.indexOf("Infra:") < settings.indexOf("Media:"));
    assert.ok(css.startsWith(personalCSS));
    assert.match(css, /HOME-PAGER APPEARANCE START/);
    assert.match(css, /HOME-PAGER GROUP WIDTH START/);
    assert.match(css, /flex-grow: 0 !important/);
    assert.ok(!settings.includes("stretch"), "Panel option must not leak into Homepage YAML");
    assert.match(css, /rgba\(20,32,48,0.35\)/);
    assert.equal((css.match(/HOME-PAGER APPEARANCE START/g) || []).length, 1);
    assert.match(
      readFileSync(join(dir, "services.yaml"), "utf8"),
      /do-not-show-this-secret/,
    );
    // CSS conflicts are checked before settings are changed, too.
    click(w, "#appearance-open");
    await idle(w);
    assert.equal(d.getElementById("appearance-card-opacity").value, "35");
    assert.equal(d.querySelector('[data-group-path="Infra"] .appearance-group-stretch').checked, false);
    change(d.querySelector('[data-group-path="Infra"] .appearance-group-stretch'), true);
    assert.equal(d.querySelector('.preview-group[data-name="Infra"]').style.flexGrow, "");
    change(d.getElementById("appearance-theme"), "light");
    type(w, d.getElementById("appearance-card-opacity"), "55");
    click(w, "#dialog-actions .primary");
    writeFileSync(join(dir, "custom.css"), css + "\n/* external */\n");
    click(w, "#save");
    await idle(w);
    assert.match(d.getElementById("error").textContent, /custom.css/);
    assert.equal(readFileSync(join(dir, "settings.yaml"), "utf8"), settings);
    click(w, "#reload");
    await idle(w);
    // Cancel never mutates the original tree or writes CSS.
    click(w, "#appearance-open");
    await idle(w);
    change(d.getElementById("appearance-theme"), "light");
    click(w, "#dialog-actions .secondary");
    assert.equal(d.getElementById("save").disabled, true);
  } finally {
    dom.window.close();
  }
});

test("preview tabs filter groups and reorder visible siblings without losing other tabs or nested layout", async () => {
  const initial = `# preserve layout
groupsInitiallyCollapsed: true
layout:
  A: {style: row, tab: Main, initiallyCollapsed: false, icon: mdi-server}
  X: {style: row, tab: Unifi, columns: 2}
  B:
    style: row
    tab: Main
    initiallyCollapsed: false
    Child1: {style: column, initiallyCollapsed: false}
    Child2: {style: column, initiallyCollapsed: false}
  Y: {style: row, tab: Unifi, initiallyCollapsed: false}
  Shared: {style: column, initiallyCollapsed: false}
  Orphan: {tab: Unifi, header: false}
`;
  const services = `- A:
    - Alpha: {href: https://a.example}
- X:
    - Xray: {href: https://x.example}
- B:
    - Child1:
        - One: {href: https://one.example}
    - Child2:
        - Two: {href: https://two.example}
- Y:
    - Yankee: {href: https://y.example}
- Shared:
    - Common: {href: https://common.example}
`;
  writeFileSync(join(dir, "settings.yaml"), initial);
  writeFileSync(join(dir, "services.yaml"), services);
  writeFileSync(join(dir, "bookmarks.yaml"), "[]\n");
  writeFileSync(join(dir, "custom.css"), "");
  const dom = await setup(), w = dom.window, d = w.document;
  const group = name => d.querySelector(`.preview-group[data-name="${name}"]`);
  const roots = () => [...d.querySelectorAll("#appearance-preview > .preview-canvas > .preview-groups > .preview-group")].map(el => el.dataset.name);
  const order = () => [...d.querySelectorAll("#appearance-preview .preview-group")].filter(el => !el.parentElement.classList.contains("preview-subgroups")).map(el => el.dataset.name);
  const drag = (source, target) => {
    const transfer = {setData() {}};
    for (const [el, name] of [[source, "dragstart"], [target, "dragover"], [target, "drop"]]) {
      const event = new w.Event(name, {bubbles: true, cancelable: true});
      Object.defineProperties(event, {dataTransfer: {value: transfer}, clientX: {value: -1}, clientY: {value: -1}});
      el.dispatchEvent(event);
    }
  };
  try {
    click(w, "#appearance-open"); await idle(w);
    assert.deepEqual(order(), ["A", "B", "Shared"]);
    assert.equal(d.querySelector('.preview-tab[aria-selected="true"]').textContent, "Main");
    assert.equal(group("X"), null);
    assert.equal(d.querySelector('[data-group-path="X"]'), null);
    assert.equal(group("A").querySelector(".preview-drag-handle").draggable, true);
    group("A").querySelector('[data-move="after"]').click();
    assert.deepEqual(order(), ["B", "A", "Shared"]);
    // Child drops must not swallow a root drag; it bubbles to its parent group.
    drag(group("A").querySelector(".preview-drag-handle"), group("Child1"));
    assert.deepEqual(order(), ["A", "B", "Shared"]);
    group("A").querySelector('[data-move="after"]').click();
    group("Child2").querySelector('[data-move="before"]').click();
    assert.deepEqual([...group("B").querySelectorAll(".preview-subgroups > .preview-group")].map(el => el.dataset.name), ["Child2", "Child1"]);
    click(w, '[data-preview-tab="Unifi"]');
    assert.deepEqual(order(), ["X", "Y", "Shared"]);
    assert.equal(group("X").querySelector(".preview-service"), null, "Global initial collapse applies without a group override");
    assert.ok(group("Y").querySelector(".preview-service"), "Local false overrides the global collapse");
    drag(group("Y"), group("X"));
    assert.deepEqual(order(), ["Y", "X", "Shared"]);
    click(w, '[data-preview-tab="Main"]');
    assert.deepEqual(order(), ["B", "A", "Shared"]);
    assert.equal(readFileSync(join(dir, "settings.yaml"), "utf8"), initial);
    click(w, "#dialog-actions .primary");
    click(w, "#save"); await idle(w);
    const saved = readFileSync(join(dir, "settings.yaml"), "utf8");
    const topKeys = [...saved.matchAll(/^  ([\w]+):/gm)].map(match => match[1]);
    assert.deepEqual(topKeys, ["B", "Y", "A", "X", "Shared", "Orphan"]);
    assert.ok(saved.indexOf("Child2:") < saved.indexOf("Child1:"));
    assert.match(saved, /# preserve layout/);
    assert.match(saved, /icon: mdi-server/);
    assert.match(saved, /columns: 2/);
    assert.match(saved, /Orphan:[\s\S]*header: false/);
    assert.equal(readFileSync(join(dir, "services.yaml"), "utf8"), services);
    click(w, "#appearance-open"); await idle(w);
    assert.deepEqual(order(), ["B", "A", "Shared"]);
    click(w, '[data-preview-tab="Unifi"]');
    assert.deepEqual(order(), ["Y", "X", "Shared"]);
    group("Y").querySelector('[data-move="after"]').click();
    click(w, "#dialog-actions .secondary");
    assert.equal(readFileSync(join(dir, "settings.yaml"), "utf8"), saved);
  } finally { dom.window.close(); }
});

test("preview tabs can be reordered by arrows and dragging and persist through native layout order", async () => {
  const initial = `layout:
  UniFi: {tab: Unifi, columns: 2, style: row}
  Shared: {header: false}
  Server: {tab: Main, icon: mdi-server}
  Switch: {tab: Unifi, initiallyCollapsed: false}
  Orphan: {tab: Other, header: false} # keep orphan
  Media: {tab: Main, columns: 3}
`;
  writeFileSync(join(dir, "settings.yaml"), initial);
  writeFileSync(join(dir, "services.yaml"), "- UniFi:\n    - Controller: {href: https://unifi.example}\n- Shared:\n    - Common: {href: https://shared.example}\n- Server:\n    - Host: {href: https://server.example}\n- Switch:\n    - Ports: {href: https://switch.example}\n- Media:\n    - Player: {href: https://media.example}\n");
  writeFileSync(join(dir, "bookmarks.yaml"), "[]\n");
  writeFileSync(join(dir, "custom.css"), "");
  const dom = await setup(), w = dom.window, d = w.document;
  const tabs = () => [...d.querySelectorAll(".preview-tab")].map(el => el.dataset.previewTab);
  const tab = name => d.querySelector(`[data-preview-tab="${name}"]`);
  const groups = () => [...d.querySelectorAll("#appearance-preview .preview-group")].map(el => el.dataset.name);
  try {
    click(w, "#appearance-open"); await idle(w);
    assert.deepEqual(tabs(), ["Unifi", "Main", "Other"]);
    assert.equal(tab("Unifi").draggable, true);
    tab("Main").parentElement.querySelector('[data-move="before"]').click();
    assert.deepEqual(tabs(), ["Main", "Unifi", "Other"]);
    assert.equal(tab("Unifi").getAttribute("aria-selected"), "true", "Reordering keeps the active tab");
    assert.deepEqual(groups(), ["Shared", "UniFi", "Switch"]);
    tab("Main").click();
    assert.deepEqual(groups(), ["Server", "Shared", "Media"]);
    assert.equal(readFileSync(join(dir, "settings.yaml"), "utf8"), initial);
    click(w, "#dialog-actions .secondary");
    click(w, "#appearance-open"); await idle(w);
    assert.deepEqual(tabs(), ["Unifi", "Main", "Other"], "Cancel discards tab changes");
    const transfer = {setData() {}};
    for (const [el, name] of [[tab("Other"), "dragstart"], [tab("Unifi"), "dragover"], [tab("Unifi"), "drop"]]) {
      const event = new w.Event(name, {bubbles: true, cancelable: true});
      Object.defineProperties(event, {dataTransfer: {value: transfer}, clientX: {value: -1}});
      el.dispatchEvent(event);
    }
    assert.deepEqual(tabs(), ["Other", "Unifi", "Main"]);
    tab("Main").parentElement.querySelector('[data-move="before"]').click();
    assert.deepEqual(tabs(), ["Other", "Main", "Unifi"]);
    click(w, "#dialog-actions .primary");
    click(w, "#save"); await idle(w);
    const saved = readFileSync(join(dir, "settings.yaml"), "utf8");
    assert.deepEqual([...saved.matchAll(/^  ([\w]+):/gm)].map(match => match[1]), ["Orphan", "Shared", "Server", "Media", "UniFi", "Switch"]);
    assert.match(saved, /# keep orphan/);
    assert.match(saved, /icon: mdi-server/);
    assert.match(saved, /initiallyCollapsed: false/);
    click(w, "#appearance-open"); await idle(w);
    assert.deepEqual(tabs(), ["Other", "Main", "Unifi"]);
    tab("Main").click();
    assert.deepEqual(groups(), ["Shared", "Server", "Media"]);
    tab("Unifi").click();
    assert.deepEqual(groups(), ["Shared", "UniFi", "Switch"]);
  } finally { dom.window.close(); }
});

test("add actions stay on the matching block and are not duplicated in widget properties", async () => {
  writeFileSync(
    join(dir, "services.yaml"),
    "- Monitoring:\n    - Prometheus:\n        href: https://prom.example.com\n        widgets:\n          - type: prometheus\n            url: https://prom.example.com\n            headers:\n              X-Token: keep\n            fields: [up]\n          - type: proxmox\n            url: https://pve.example.com\n",
  );
  const dom = await setup(),
    w = dom.window,
    d = w.document;
  try {
    [...d.querySelectorAll("nav button")]
      .find((b) => b.textContent.includes("Сервисы"))
      .click();
    await idle(w);
    assert.equal(
      d.querySelectorAll(
        ".service-widget-template,.service-parameter-template,.group-service-template",
      ).length,
      0,
    );
    const group = block(w, "Monitoring"),
      service = block(w, "Prometheus"),
      widgets = block(w, "widgets");
    assert.equal(
      service.querySelectorAll(":scope > .group-content > .add-inline").length,
      0,
    );
    assert.equal(
      group.querySelectorAll(":scope > .group-content > .add-inline").length,
      0,
    );
    assert.equal(
      block(w, "headers").querySelectorAll(".context-add").length,
      0,
    );
    assert.equal(block(w, "fields").querySelectorAll(".context-add").length, 0);
    group.querySelector(":scope > summary .context-add").click();
    assert.deepEqual(
      [...d.querySelectorAll("#dialog-body [data-action]")].map(
        (b) => b.dataset.action,
      ),
      ["service", "service-template"],
    );
    click(w, "#dialog-close");
    service.querySelector(":scope > summary .context-add").click();
    assert.match(
      d.getElementById("dialog-title").textContent,
      /Добавить параметр/,
    );
    assert.equal(d.querySelector('#dialog-body [data-action="widget"]'), null);
    click(w, "#dialog-close");
    widgets.querySelector(":scope > summary .context-add").click();
    assert.match(d.getElementById("dialog-title").textContent, /Каталог/);
    click(w, "#dialog-close");
    const item = [
      ...widgets.querySelectorAll(":scope > .group-content > .tree-group"),
    ][0];
    item.querySelector(":scope > summary .context-add").click();
    assert.match(
      d.getElementById("dialog-title").textContent,
      /Добавить параметр/,
    );
    assert.equal(d.querySelector('#dialog-body [data-action="widget"]'), null);
    assert.equal(
      d.getElementById("save").disabled,
      true,
      "Opening actions should not change configuration",
    );
  } finally {
    dom.window.close();
  }
});

test("Grafana fields explain Basic authentication, select built-in alerts and reject a URL without protocol", async () => {
  const initial =
    "- Monitoring:\n    - Grafana:\n        href: http://192.168.2.2:3000\n        widget:\n          type: grafana\n          version: 2\n          alerts: alertmanager\n          url: 192.168.2.2:3000\n          username: placeholder-user\n          password: placeholder-password\n";
  writeFileSync(join(dir, "services.yaml"), initial);
  const dom = await setup(),
    w = dom.window,
    d = w.document;
  try {
    [...d.querySelectorAll("nav button")]
      .find((b) => b.textContent.includes("Сервисы"))
      .click();
    await idle(w);
    assert.match(
      block(w, "username").textContent,
      /Это не имя service account/,
    );
    assert.match(
      block(w, "password").textContent,
      /токен service account не поддерживается/,
    );
    assert.equal(block(w, "version").querySelector("select").value, "2");
    const alerts = block(w, "alerts").querySelector("select");
    assert.equal(alerts.value, "alertmanager");
    type(w, alerts, "grafana");
    click(w, "#save");
    await idle(w);
    assert.match(d.getElementById("error").textContent, /полный URL/);
    assert.equal(readFileSync(join(dir, "services.yaml"), "utf8"), initial);
    const url = block(w, "url").querySelector("input");
    assert.equal(url.type, "url");
    type(w, url, "http://192.168.2.2:3000");
    click(w, "#save");
    await idle(w);
    const raw = readFileSync(join(dir, "services.yaml"), "utf8");
    assert.match(raw, /alerts: grafana/);
    assert.match(raw, /version: 2/);
    assert.match(raw, /url: http:\/\/192.168.2.2:3000/);
    assert.match(raw, /password: placeholder-password/);
  } finally {
    dom.window.close();
  }
});

test("page reload restores the current section independently of the remember-between-visits preference", async () => {
  let dom = await setup({rememberSection:false}), w = dom.window;
  let session;
  try {
    for (const [title,name] of [["Закладки","bookmarks.yaml"],["Инфовиджеты","widgets.yaml"],["Стили CSS","custom.css"],["Скрипты JS","custom.js"],["Сервисы","services.yaml"]]) {
      [...w.document.querySelectorAll("#navigation button")].find(b=>b.textContent.includes(title)).click();
      await idle(w);
      assert.equal(w.document.getElementById("filename").textContent,name);
      session=Object.fromEntries(Array.from({length:w.sessionStorage.length},(_,i)=>{const key=w.sessionStorage.key(i);return [key,w.sessionStorage.getItem(key)]}));
      dom.window.close();
      dom=await setup({rememberSection:false},false,"settings.yaml",null,session); w=dom.window;
      assert.equal(w.document.getElementById("filename").textContent,name);
      assert.ok(w.document.querySelector("#navigation button.active").textContent.includes(title));
    }
    // A different browser tab does not inherit this tab's session selection.
    const fresh=await setup({rememberSection:false},false,"bookmarks.yaml");
    try { assert.equal(fresh.window.document.getElementById("filename").textContent,"settings.yaml"); }
    finally { fresh.window.close(); }
    const sessionKey=Object.keys(session).find(k=>k.startsWith("home-pager.current-section:"));
    const invalid=await setup({rememberSection:false},false,null,null,{[sessionKey]:"missing.yaml"});
    try { assert.equal(invalid.window.document.getElementById("filename").textContent,"settings.yaml"); }
    finally { invalid.window.close(); }
  } finally { dom.window.close(); }
});

test("panel preferences collapse groups by default, preview themes and persist display choices without changing files", async () => {
  const services =
    "- Infra:\n    - Server:\n        href: https://server.example.com\n- Media:\n    - Player:\n        href: https://player.example.com\n";
  const bookmarks =
    "- Links:\n    - Docs:\n        - href: https://docs.example.com\n          abbr: DOC\n";
  writeFileSync(join(dir, "services.yaml"), services);
  writeFileSync(join(dir, "bookmarks.yaml"), bookmarks);
  const dom = await setup(),
    w = dom.window,
    d = w.document;
  const change = (el, value) => {
    if (el.type === "checkbox") el.checked = value;
    else el.value = value;
    el.dispatchEvent(new w.Event("change", { bubbles: true }));
  };
  let persisted;
  try {
    [...d.querySelectorAll("nav button")]
      .find((b) => b.textContent.includes("Сервисы"))
      .click();
    await idle(w);
    assert.ok(
      [...d.querySelectorAll("#editor .tree-group")].every((e) => !e.open),
    );
    type(w, d.getElementById("search"), "Server");
    assert.equal(
      block(w, "Infra").open,
      false,
      "Search must not auto-open groups by default",
    );
    type(w, d.getElementById("search"), "");
    click(w, "#panel-settings-open");
    change(d.getElementById("panel-preference-theme"), "dark");
    change(d.getElementById("panel-preference-scale"), "75");
    assert.equal(d.documentElement.style.getPropertyValue("--panel-scale"), "0.75");
    assert.equal(d.documentElement.dataset.panelTheme, "dark");
    [...d.querySelectorAll("#dialog-actions button")]
      .find((b) => b.textContent === "Отмена")
      .click();
    assert.equal(d.documentElement.dataset.panelTheme, "light");
    assert.equal(d.documentElement.style.getPropertyValue("--panel-scale"), "1");
    assert.equal(
      w.localStorage.getItem("home-pager.panel-preferences.v1"),
      null,
    );
    click(w, "#panel-settings-open");
    change(d.getElementById("panel-preference-theme"), "dark");
    change(d.getElementById("panel-preference-density"), "compact");
    change(d.getElementById("panel-preference-scale"), "125");
    change(d.getElementById("panel-preference-services"), "groups");
    change(d.getElementById("panel-preference-bookmarks"), "all");
    change(d.getElementById("panel-preference-showHints"), false);
    change(d.getElementById("panel-preference-rememberSection"), true);
    click(w, "#dialog-actions .primary");
    persisted = JSON.parse(
      w.localStorage.getItem("home-pager.panel-preferences.v1"),
    );
    assert.equal(persisted.theme, "dark");
    assert.equal(persisted.density, "compact");
    assert.equal(persisted.scale, 125);
    assert.equal(d.documentElement.dataset.panelShowHints, "false");
    assert.equal(block(w, "Infra").open, true);
    assert.equal(block(w, "Server").open, false);
    block(w, "Server").open = true;
    click(w, "#panel-settings-open");
    change(d.getElementById("panel-preference-showCounts"), true);
    click(w, "#dialog-actions .primary");
    assert.equal(
      block(w, "Server").open,
      true,
      "Display preferences must preserve manually expanded cards",
    );
    persisted = JSON.parse(
      w.localStorage.getItem("home-pager.panel-preferences.v1"),
    );
    assert.equal(
      d.getElementById("save").disabled,
      true,
      "Panel preferences must not dirty Homepage config",
    );
    assert.equal(readFileSync(join(dir, "services.yaml"), "utf8"), services);
    assert.equal(readFileSync(join(dir, "bookmarks.yaml"), "utf8"), bookmarks);
    [...d.querySelectorAll("nav button")]
      .find((b) => b.textContent.includes("Закладки"))
      .click();
    await idle(w);
    assert.ok(
      [...d.querySelectorAll("#editor .tree-group")].every((e) => e.open),
    );
    assert.equal(
      w.localStorage.getItem("home-pager.last-section"),
      "bookmarks.yaml",
    );
  } finally {
    dom.window.close();
  }
  const reloaded = await setup(persisted, false, "bookmarks.yaml");
  try {
    assert.equal(reloaded.window.document.documentElement.style.getPropertyValue("--panel-scale"), "1.25");
    assert.equal(
      reloaded.window.document.documentElement.dataset.panelTheme,
      "dark",
    );
    assert.equal(
      reloaded.window.document.getElementById("filename").textContent,
      "bookmarks.yaml",
    );
    assert.ok(
      [
        ...reloaded.window.document.querySelectorAll("#editor .tree-group"),
      ].every((e) => e.open),
    );
  } finally {
    reloaded.window.close();
  }
});

test("system theme follows device appearance and invalid stored options fall back safely", async () => {
  const dom = await setup(
      { theme: "system", density: "invalid", services: "invalid", scale: 999 },
      true,
    ),
    w = dom.window,
    d = w.document;
  try {
    assert.equal(d.documentElement.dataset.panelTheme, "dark");
    assert.equal(d.documentElement.dataset.panelDensity, "comfortable");
    assert.equal(d.documentElement.style.getPropertyValue("--panel-scale"), "1");
    w.__panelMedia.matches = false;
    w.__panelMedia.listener();
    assert.equal(d.documentElement.dataset.panelTheme, "light");
    click(w, "#panel-settings-open");
    assert.equal(
      d.getElementById("panel-preference-services").value,
      "collapsed",
    );
    d.getElementById("panel-preference-theme").value = "dark";
    d.getElementById("panel-preference-theme").dispatchEvent(
      new w.Event("change"),
    );
    [...d.querySelectorAll("#dialog-actions button")]
      .find((b) => b.textContent === "По умолчанию")
      .click();
    assert.equal(d.getElementById("panel-preference-theme").value, "system");
    assert.equal(d.documentElement.dataset.panelTheme, "light");
    click(w, "#dialog-actions .primary");
    assert.equal(d.getElementById("save").disabled, true);
  } finally {
    dom.window.close();
  }
});

test("icon gallery searches paginates previews and downloads a chosen icon; service catalog has thumbnails", async () => {
  writeFileSync(
    join(dir, "services.yaml"),
    "- Apps:\n    - Demo:\n        icon: old.png\n        href: https://example.com\n",
  );
  const dom = await setup(),
    w = dom.window,
    d = w.document;
  const originalFetch = w.fetch;
  let importedURL;
  w.fetch = async (url, options) => {
    if (url === "/api/images/import") {
      importedURL = JSON.parse(options.body).url;
      return new Response(
        JSON.stringify({
          path: "/icons/icon-0123456789abcdef0123456789abcdef.png",
          preview: "/api/icons/icon-0123456789abcdef0123456789abcdef.png",
          width: 256,
          height: 256,
          size: 512,
          format: "png",
        }),
        { headers: { "Content-Type": "application/json" } },
      );
    }
    return originalFetch(url, options);
  };
  try {
    [...d.querySelectorAll("nav button")]
      .find((b) => b.textContent.includes("Сервисы"))
      .click();
    await idle(w);
    click(w, "#icon-import");
    await idle(w);
    const source = d.getElementById("icon-source");
    source.value = "gallery";
    source.dispatchEvent(new w.Event("change"));
    await until(
      () => d.querySelectorAll(".logo-card").length > 0,
      "gallery index",
    );
    assert.equal(d.querySelectorAll(".logo-card").length, 60);
    assert.equal(d.querySelectorAll(".logo-card img[loading=lazy]").length, 60);
    [...d.querySelectorAll("#logo-gallery button")]
      .find((b) => b.textContent === "Показать ещё")
      .click();
    assert.equal(d.querySelectorAll(".logo-card").length, 120);
    type(w, d.getElementById("gallery-search"), "grafana");
    assert.ok(d.querySelectorAll(".logo-card").length > 0);
    assert.ok(
      [...d.querySelectorAll(".logo-card")].every((b) =>
        b.textContent.includes("grafana"),
      ),
    );
    const card = [...d.querySelectorAll(".logo-card")].find(
      (b) => b.textContent === "GRgrafana" || b.textContent.endsWith("grafana"),
    );
    assert.ok(card);
    const expected = card.querySelector("img").src;
    card.click();
    await until(
      () => !d.querySelector(".background-result").classList.contains("hidden"),
      "downloaded gallery icon",
    );
    assert.equal(importedURL, expected);
    assert.equal(source.value, "url");
    [...d.querySelectorAll("#dialog-actions button")]
      .find((b) => b.textContent === "Применить иконку")
      .click();
    click(w, "#save");
    await idle(w);
    assert.match(
      readFileSync(join(dir, "services.yaml"), "utf8"),
      /icon-0123456789abcdef0123456789abcdef.png/,
    );
    // Open the normal integration catalog, where every service has a preview.
    new Script("library()").runInContext(dom.getInternalVMContext());
    assert.ok(
      d.querySelectorAll(".library-entry .logo-thumbnail img").length > 100,
    );
    const image = d.querySelector(".library-entry .logo-thumbnail img");
    const parent = image.parentElement;
    image.dispatchEvent(new w.Event("error"));
    assert.equal(parent.querySelector("img"), null);
    assert.ok(
      !parent.querySelector(".logo-fallback").classList.contains("hidden"),
    );
  } finally {
    dom.window.close();
  }
});

test("bulk logo import matches wildcards, includes unshown results and continues after failures", async () => {
  writeFileSync(
    join(dir, "services.yaml"),
    "- Apps:\n    - Demo:\n        href: https://example.com\n",
  );
  const dom = await setup(),
    w = dom.window,
    d = w.document;
  const originalFetch = w.fetch;
  const names = Array.from({ length: 62 }, (_, i) => "grafana-" + i).concat(
    "other",
  );
  const requests = [];
  w.fetch = async (url, options) => {
    if (url === "/icon-index.json")
      return new Response(
        JSON.stringify({
          sources: [
            { name: "Test", template: "https://example.com/{name}.png", names },
          ],
        }),
        { headers: { "Content-Type": "application/json" } },
      );
    if (url === "/api/images/import") {
      const p = JSON.parse(options.body);
      requests.push(p);
      if (p.url.endsWith("grafana-1.png"))
        return new Response(JSON.stringify({ error: "upstream failed" }), {
          status: 502,
          headers: { "Content-Type": "application/json" },
        });
      return new Response(JSON.stringify({ path: "/icons/test.png" }), {
        headers: { "Content-Type": "application/json" },
      });
    }
    return originalFetch(url, options);
  };
  try {
    [...d.querySelectorAll("nav button")]
      .find((b) => b.textContent.includes("Сервисы"))
      .click();
    await idle(w);
    click(w, "#icon-import");
    await idle(w);
    const source = d.getElementById("icon-source");
    source.value = "gallery";
    source.dispatchEvent(new w.Event("change"));
    await until(() => d.querySelectorAll(".logo-card").length > 0);
    const query = d.getElementById("gallery-search");
    type(w, query, "grafana-?");
    assert.equal(d.querySelectorAll(".logo-card").length, 10);
    type(w, query, "no-match*");
    assert.ok(d.getElementById("logo-batch-download").disabled);
    type(w, query, "*grafana*");
    assert.equal(d.querySelectorAll(".logo-card").length, 60);
    assert.match(d.getElementById("logo-batch-download").textContent, /62/);
    click(w, "#logo-batch-download");
    await until(() =>
      d
        .getElementById("logo-batch-status")
        .textContent.includes("Загрузка завершена"),
    );
    assert.equal(requests.length, 62);
    assert.ok(
      requests.every(
        (p) => p.purpose === "icon" && p.format === "png" && p.maxWidth === 256,
      ),
    );
    assert.match(
      d.getElementById("logo-batch-status").textContent,
      /Сохранено: 61; ошибок: 1/,
    );
    assert.ok(
      !readFileSync(join(dir, "services.yaml"), "utf8").includes("/icons/test"),
    );
    w.fetch = async (url, options) => {
      if (url === "/api/images/import")
        return new Promise((resolve, reject) =>
          options.signal.addEventListener(
            "abort",
            () => reject(Error("aborted")),
            { once: true },
          ),
        );
      return originalFetch(url, options);
    };
    click(w, "#logo-batch-download");
    assert.ok(query.disabled);
    click(w, "#logo-batch-stop");
    await until(() =>
      d.getElementById("logo-batch-status").textContent.includes("остановлена"),
    );
    assert.ok(!query.disabled);
  } finally {
    dom.window.close();
  }
});

test("built-in SVG galleries preview and apply URLs without raster import or custom-source controls", async () => {
  writeFileSync(
    join(dir, "services.yaml"),
    "- Apps:\n    - Demo:\n        href: https://example.com\n",
  );
  const dom = await setup(),
    w = dom.window,
    d = w.document;
  const originalFetch = w.fetch;
  let imports = 0;
  w.fetch = async (url, options) => {
    if (url === "/api/images/import") imports++;
    return originalFetch(url, options);
  };
  try {
    [...d.querySelectorAll("nav button")]
      .find((b) => b.textContent.includes("Сервисы"))
      .click();
    await idle(w);
    click(w, "#icon-import");
    await idle(w);
    assert.equal(d.getElementById("icon-source").value, "gallery");
    assert.equal(d.getElementById("logo-source-template"), null);
    await until(() => d.getElementById("gallery-source").options.length >= 12);
    const source = d.getElementById("gallery-source");
    for (const label of [
      "Simple Icons",
      "Material Design",
      "Lucide",
      "Tabler",
      "Bootstrap",
      "Heroicons",
      "Font Awesome",
    ])
      assert.ok(
        [...source.options].some((o) => o.textContent.includes(label)),
        label,
      );
    source.value = [...source.options].find((o) =>
      o.textContent.includes("Lucide"),
    ).value;
    source.dispatchEvent(new w.Event("change"));
    type(w, d.getElementById("gallery-search"), "server");
    assert.ok(
      d.getElementById("logo-batch-download").classList.contains("hidden"),
    );
    const expected = d.querySelector(".logo-card img").src;
    click(w, ".logo-card");
    const preview = d.querySelector(".background-result img");
    preview.dispatchEvent(new w.Event("load"));
    const apply = [...d.querySelectorAll("#dialog-actions button")].find(
      (b) => b.textContent === "Применить иконку",
    );
    assert.ok(!apply.classList.contains("hidden"));
    apply.click();
    click(w, "#save");
    await idle(w);
    assert.equal(imports, 0);
    assert.ok(
      readFileSync(join(dir, "services.yaml"), "utf8").includes(expected),
    );
  } finally {
    dom.window.close();
  }
});

test("stored icons can be searched and applied without importing again", async () => {
  writeFileSync(
    join(dir, "services.yaml"),
    "- Apps:\n    - Demo:\n        href: https://example.com\n        icon: old.png # keep\n",
  );
  const dom = await setup(),
    w = dom.window,
    d = w.document,
    original = w.fetch;
  let imports = 0;
  w.fetch = async (url, options) => {
    if (url === "/api/images/import") imports++;
    if (url === "/api/icons/library")
      return new Response(
        JSON.stringify([
          {
            name: "grafana.png",
            path: "/icons/grafana.png",
            preview: "/api/icons/grafana.png",
            size: 100,
          },
          {
            name: "proxmox.png",
            path: "/icons/proxmox.png",
            preview: "/api/icons/proxmox.png",
            size: 200,
          },
        ]),
        { headers: { "Content-Type": "application/json" } },
      );
    return original(url, options);
  };
  try {
    [...d.querySelectorAll("nav button")]
      .find((b) => b.textContent.includes("Сервисы"))
      .click();
    await idle(w);
    click(w, "#icon-import");
    await idle(w);
    const source = d.getElementById("icon-source");
    source.value = "stored";
    source.dispatchEvent(new w.Event("change"));
    await until(
      () => d.querySelectorAll("#stored-icon-grid button").length === 2,
    );
    assert.ok(
      d
        .getElementById("icon-format")
        .parentElement.classList.contains("hidden"),
    );
    type(w, d.getElementById("stored-icon-search"), "grafana");
    assert.equal(d.querySelectorAll("#stored-icon-grid button").length, 1);
    click(w, "#stored-icon-grid button");
    assert.equal(
      d.querySelector("#stored-icon-grid button").getAttribute("aria-pressed"),
      "true",
    );
    [...d.querySelectorAll("#dialog-actions button")]
      .find((b) => b.textContent === "Применить иконку")
      .click();
    assert.ok(
      !readFileSync(join(dir, "services.yaml"), "utf8").includes(
        "/icons/grafana",
      ),
    );
    click(w, "#save");
    await idle(w);
    assert.match(
      readFileSync(join(dir, "services.yaml"), "utf8"),
      /icon: \/icons\/grafana.png # keep/,
    );
    assert.equal(imports, 0);
  } finally {
    dom.window.close();
  }
});

test("duplicate groups services and widgets creates independent drafts with unique names and anchors", async () => {
  const original =
    "- Apps:\n    - Demo:\n        href: https://example.com\n        widget:\n          type: customapi\n          headers: &headers\n            X-Test: original # retained\n          extra: *headers\n";
  writeFileSync(join(dir, "services.yaml"), original);
  const dom = await setup(),
    w = dom.window,
    d = w.document;
  const run = (code) =>
    new Script(code).runInContext(dom.getInternalVMContext());
  try {
    [...d.querySelectorAll("nav button")]
      .find((b) => b.textContent.includes("Сервисы"))
      .click();
    await idle(w);
    click(w, ".duplicate-block");
    assert.equal(run("root().Content.length"), 2);
    assert.equal(run("root().Content[1].Content[0].Value"), "Apps (копия)");
    assert.equal(readFileSync(join(dir, "services.yaml"), "utf8"), original);
    run(`{
      const group = root().Content[0].Content[1];
      duplicateBlock(group, 0, 'Demo', group.Content[0].Content[1]);
      const service = group.Content[1].Content[1];
      mapValue(service, 'href').Value = 'https://copy.example.com';
      duplicateBlock(service, service.Content.findIndex(n => n.Value === 'widget'), 'widget', mapValue(service, 'widget'));
    }`);
    assert.equal(
      run(
        "mapValue(root().Content[0].Content[1].Content[0].Content[1], 'href').Value",
      ),
      "https://example.com",
    );
    assert.equal(
      run(
        "mapValue(root().Content[0].Content[1].Content[1].Content[1], 'widgets').Content.length",
      ),
      2,
    );
    run(`{
      const widgets = mapValue(root().Content[0].Content[1].Content[1].Content[1], 'widgets');
      duplicateBlock(widgets, 0, 'customapi', widgets.Content[0]);
    }`);
    assert.equal(
      run(
        "mapValue(root().Content[0].Content[1].Content[1].Content[1], 'widgets').Content.length",
      ),
      3,
    );
    click(w, "#save");
    await idle(w);
    const saved = readFileSync(join(dir, "services.yaml"), "utf8");
    assert.match(saved, /Apps \(копия\)/);
    assert.match(saved, /Demo \(копия\)/);
    assert.match(saved, /# retained/);
    const anchors = [...saved.matchAll(/&([\w]+)/g)].map((m) => m[1]);
    assert.ok(anchors.length >= 4);
    assert.equal(new Set(anchors).size, anchors.length);
    assert.ok(!d.getElementById("file-status").textContent.includes("Ошибка"));
  } finally {
    dom.window.close();
  }
});

test("server config GUI saves paths and password separately from Homepage and requires restart", async () => {
  const metadata = await (await fetch(base + "/api/server-config")).json();
  const beforeConfig = readFileSync(metadata.path, "utf8");
  const dom = await setup(),
    w = dom.window,
    d = w.document;
  try {
    click(w, "#panel-settings-open");
    [...d.querySelectorAll("#dialog-body button")]
      .find((b) => b.textContent.includes("Конфигурация сервера"))
      .click();
    await until(
      () => d.getElementById("server-config-icons_dir"),
      "server configuration form",
    );
    const old = (await (await fetch(base + "/api/server-config")).json()).active
      .icons_dir;
    type(w, d.getElementById("server-config-icons_dir"), "./new-icons");
    const pm = d.getElementById("server-config-password-mode");
    pm.value = "change";
    pm.dispatchEvent(new w.Event("change"));
    type(w, d.getElementById("server-config-password"), "private-new-password");
    click(w, "#dialog-actions button.primary");
    await until(() =>
      d
        .getElementById("server-config-status")
        .textContent.includes("Конфиг сохранён"),
    );
    const response = await (await fetch(base + "/api/server-config")).text();
    const after = JSON.parse(response);
    assert.equal(after.settings.icons_dir, "./new-icons");
    assert.equal(after.active.icons_dir, old);
    assert.equal(after.hasPassword, true);
    assert.ok(!response.includes("private-new-password"));
    assert.match(
      d.getElementById("server-config-status").textContent,
      /перезапустите Home Pager/,
    );
    assert.equal(d.getElementById("server-config-password").value, "");
  } finally {
    writeFileSync(metadata.path, beforeConfig);
    dom.window.close();
  }
});

test("panel language defaults to Russian, persists English, and protects unsaved drafts", async () => {
  writeFileSync(join(dir, "settings.yaml"), "title: Моя страница\n");
  const dom = await setup({ language: "invalid" }),
    w = dom.window,
    d = w.document;
  let reloads = 0,
    persisted;
  w.reloadPanelLanguage = () => {
    reloads++;
  };
  const chooseEnglish = () => {
    const input = d.getElementById("panel-preference-language");
    input.value = "en";
    input.dispatchEvent(new w.Event("change"));
  };
  try {
    assert.equal(d.documentElement.lang, "ru");
    click(w, "#panel-settings-open");
    assert.equal(d.getElementById("panel-preference-language").value, "ru");
    chooseEnglish();
    [...d.querySelectorAll("#dialog-actions button")]
      .find((b) => b.textContent === "Отмена")
      .click();
    assert.equal(reloads, 0);
    click(w, "#raw-tab");
    await idle(w);
    type(w, d.getElementById("raw"), "title: Несохранённая страница\n");
    click(w, "#panel-settings-open");
    chooseEnglish();
    click(w, "#dialog-actions .primary");
    assert.equal(reloads, 0);
    assert.ok(d.getElementById("panel-language-error"));
    assert.equal(
      d.getElementById("raw").value,
      "title: Несохранённая страница\n",
    );
    assert.equal(
      JSON.parse(w.localStorage.getItem("home-pager.panel-preferences.v1"))
        .language,
      "invalid",
    );
    d.getElementById("dialog").close();
    click(w, "#reload");
    await idle(w);
    click(w, "#panel-settings-open");
    chooseEnglish();
    click(w, "#dialog-actions .primary");
    assert.equal(reloads, 1);
    persisted = JSON.parse(
      w.localStorage.getItem("home-pager.panel-preferences.v1"),
    );
    assert.equal(persisted.language, "en");
    assert.equal(
      readFileSync(join(dir, "settings.yaml"), "utf8"),
      "title: Моя страница\n",
    );
  } finally {
    w.close();
  }
  const english = await setup(persisted),
    ew = english.window,
    ed = ew.document;
  try {
    assert.equal(ed.documentElement.lang, "en");
    assert.equal(ed.title, "Home Pager · Homepage management");
    assert.equal(ed.getElementById("title").textContent, "Settings");
    assert.equal(ed.getElementById("search").placeholder, "Find parameter…");
    assert.equal(
      ed.getElementById("dirty-label").textContent,
      "No unsaved changes",
    );
    click(ew, "#panel-settings-open");
    assert.equal(ed.getElementById("panel-preference-language").value, "en");
    assert.ok(
      ed.getElementById("dialog-body").textContent.includes("Panel language"),
    );
    let resetReloads = 0;
    ew.reloadPanelLanguage = () => {
      resetReloads++;
    };
    [...ed.querySelectorAll("#dialog-actions button")]
      .find((b) => b.textContent === "Default")
      .click();
    assert.equal(ed.getElementById("panel-preference-language").value, "ru");
    click(ew, "#dialog-actions .primary");
    assert.equal(resetReloads, 1);
    assert.equal(
      JSON.parse(ew.localStorage.getItem("home-pager.panel-preferences.v1"))
        .language,
      "ru",
    );
  } finally {
    ew.close();
  }
});

test("English editor translates controls without translating user data or YAML keys", async () => {
  const services =
    "- Настройки:\n    - Сервисы:\n        description: Нет несохранённых изменений\n        href: https://example.com\n        widget:\n          type: grafana\n          url: https://example.com\n";
  writeFileSync(join(dir, "services.yaml"), services);
  const dom = await setup({ language: "en" }),
    w = dom.window,
    d = w.document;
  try {
    [...d.querySelectorAll("nav button")]
      .find((b) => b.textContent.includes("Services"))
      .click();
    await idle(w);
    assert.ok(block(w, "Настройки"));
    assert.ok(block(w, "Сервисы"));
    const input = block(w, "description").querySelector("input");
    assert.equal(input.value, "Нет несохранённых изменений");
    assert.ok(block(w, "description").textContent.includes("Description"));
    block(w, "widget").querySelector(":scope > summary .context-add").click();
    assert.ok(
      d.getElementById("dialog-body").textContent.includes("Widget parameter"),
    );
    d.getElementById("dialog").close();
    type(w, input, "Моё описание");
    click(w, "#save");
    await idle(w);
    const saved = readFileSync(join(dir, "services.yaml"), "utf8");
    assert.match(saved, /Настройки:/);
    assert.match(saved, /Сервисы:/);
    assert.match(saved, /description: Моё описание/);
    assert.match(saved, /type: grafana/);
    assert.equal(
      d.getElementById("dirty-label").textContent,
      "No unsaved changes",
    );
    assert.equal(
      w.translateApiError(
        "Не удалось загрузить изображение: connection refused",
      ),
      "Could not download image: connection refused",
    );
    assert.equal(
      w.translateApiError("Неизвестная ошибка upstream"),
      "Неизвестная ошибка upstream",
    );
  } finally {
    w.close();
  }
});

test("settings catalog groups variants and applies the selected example", async () => {
  writeFileSync(join(dir, "settings.yaml"), "title: Test\n");
  const dom = await setup(),
    w = dom.window,
    d = w.document;
  try {
    new Script("library()").runInContext(dom.getInternalVMContext());
    const cards = [...d.querySelectorAll(".library-entry")];
    assert.equal(
      new Set(cards.map((card) => card.dataset.catalogKey)).size,
      cards.length,
    );
    const card = d.querySelector('[data-catalog-key="background"]');
    const titleCard = d.querySelector('[data-catalog-key="title"]');
    assert.equal(titleCard.querySelector("button").disabled, true);
    assert.equal(
      titleCard.querySelector(".catalog-added").textContent,
      "Уже добавлено",
    );
    assert.equal(
      titleCard.querySelector(".catalog-added").classList.contains("hidden"),
      false,
    );
    assert.equal(card.querySelector("button").disabled, false);
    assert.equal(card.querySelectorAll("select option").length, 3);
    assert.ok(card.textContent.includes("Фон страницы"));
    const choice = card.querySelector("select");
    choice.value = "2";
    choice.dispatchEvent(new w.Event("change"));
    assert.ok(card.querySelector("pre").textContent.includes("opacity: 50"));
    card.querySelector("button").click();
    new Script("library()").runInContext(dom.getInternalVMContext());
    const existing = d.querySelector('[data-catalog-key="background"]');
    assert.equal(existing.querySelector("button").disabled, true);
    const existingChoice = existing.querySelector("select");
    existingChoice.value = "1";
    existingChoice.dispatchEvent(new w.Event("change"));
    assert.equal(existing.querySelector("button").disabled, true);
    assert.ok(existing.querySelector(".library-doc").href);
    d.getElementById("dialog").close();
    click(w, "#save");
    await idle(w);
    assert.match(
      readFileSync(join(dir, "settings.yaml"), "utf8"),
      /opacity: 50/,
    );
    assert.equal(
      d.getElementById("appearance-open").textContent.trim(),
      "◫ Превью",
    );
  } finally {
    w.close();
  }
});

test("layout groups have enum controls and typed templates including nested and ordered groups", async () => {
  writeFileSync(
    join(dir, "settings.yaml"),
    "layout:\n  Home:\n    style: grid # keep comment\n    columns: 4\n    Nested:\n      style: column\n",
  );
  const dom = await setup(),
    w = dom.window,
    d = w.document;
  try {
    const group = block(w, "Home");
    const style = group.querySelector('[data-block-name="style"] select');
    assert.deepEqual(
      [...style.options].map((o) => o.value),
      ["row", "column", "grid"],
    );
    assert.equal(style.value, "grid");
    assert.ok(
      style.selectedOptions[0].textContent.includes("Неподдерживаемое"),
    );
    type(w, style, "row");
    const columns = group.querySelector('[data-block-name="columns"] select');
    assert.equal(columns.options.length, 8);
    type(w, columns, "6");
    const nested = block(w, "Nested");
    assert.equal(
      nested.querySelector('[data-block-name="style"] select').value,
      "column",
    );
    const templateButton = [...nested.querySelectorAll(".add-inline")].find(
      (b) => b.textContent.includes("Параметр из шаблона"),
    );
    assert.ok(templateButton);
    templateButton.click();
    for (const key of [
      "style",
      "columns",
      "header",
      "icon",
      "initiallyCollapsed",
      "tab",
      "useEqualHeights",
      "iconsOnly",
    ])
      assert.ok(d.querySelector(`[data-parameter="${key}"]`), key);
    assert.equal(d.querySelector('[data-parameter="style"]').disabled, true);
    d.querySelector('[data-parameter="header"]').click();
    assert.equal(
      block(w, "Nested").querySelector('[data-block-name="header"] input').type,
      "checkbox",
    );
    click(w, "#save");
    await idle(w);
    const saved = readFileSync(join(dir, "settings.yaml"), "utf8");
    assert.match(saved, /style: row # keep comment/);
    assert.match(saved, /columns: 6/);
    assert.match(saved, /header: true/);
    click(w, "#raw-tab");
    await idle(w);
    type(
      w,
      d.getElementById("raw"),
      "layout:\n  - Ordered:\n      style: row\n      columns: 3\n",
    );
    click(w, "#visual-tab");
    await idle(w);
    assert.equal(
      block(w, "Ordered").querySelector('[data-block-name="columns"] select')
        .value,
      "3",
    );
  } finally {
    w.close();
  }
});

test("bookmarks create named groups and links with typed parameter templates", async () => {
  writeFileSync(join(dir, "bookmarks.yaml"), "- Existing: []\n");
  const dom = await setup(),
    w = dom.window,
    d = w.document;
  try {
    [...d.querySelectorAll("nav button")]
      .find((b) => b.textContent.includes("Закладки"))
      .click();
    await idle(w);
    click(w, "#add-root");
    type(w, d.querySelector("#dialog-body input"), "Links");
    click(w, "#dialog-actions .primary");
    block(w, "Links").querySelector(".add-inline").click();
    const inputs = d.querySelectorAll("#dialog-body input");
    type(w, inputs[0], "Example");
    type(w, inputs[1], "https://example.com");
    click(w, "#dialog-actions .primary");
    const bookmark = block(w, "Example");
    assert.equal(bookmark.querySelectorAll("details").length, 0);
    bookmark.querySelector(".add-inline").click();
    for (const key of ["href", "abbr", "icon", "description", "target", "id"])
      assert.ok(d.querySelector(`[data-parameter="${key}"]`));
    assert.equal(d.querySelector('[data-parameter="href"]').disabled, true);
    d.querySelector('[data-parameter="target"]').click();
    const target = block(w, "target").querySelector("select");
    type(w, target, "_self");
    click(w, "#save");
    await idle(w);
    const saved = readFileSync(join(dir, "bookmarks.yaml"), "utf8");
    assert.match(saved, /- Links:/);
    assert.match(saved, /- Example:/);
    assert.match(saved, /- href: https:\/\/example.com/);
    assert.match(saved, /target: _self/);
  } finally {
    w.close();
  }
});

test("bookmark appearance settings preserve other layouts, unsaved links and conflicts", async () => {
  const initial = "# personal settings\ntitle: Keep title\nfutureOption: keep\nlayout:\n  Servers: {style: row, columns: 4, tab: Main}\n  Links:\n    icon: mdi-star\n    futureField: keep\n";
  const bookmarks = "- Links:\n    - Example:\n        - href: https://example.com\n          abbr: EX\n";
  writeFileSync(join(dir,"settings.yaml"), initial);
  writeFileSync(join(dir,"bookmarks.yaml"), bookmarks);
  const dom = await setup(), w = dom.window, d = w.document;
  const change = (el,value) => { el.value = value; el.dispatchEvent(new w.Event(el.tagName === "SELECT" ? "change" : "input",{bubbles:true})); };
  const field = (key,group) => d.querySelector((group ? `[data-bookmark-group="${group}"] ` : "#dialog-body > label ")+`[data-bookmark-setting="${key}"]`);
  try {
    assert.ok(d.getElementById("bookmark-settings-open").classList.contains("hidden"));
    [...d.querySelectorAll("nav button")].find(b => b.textContent.includes("Закладки")).click(); await idle(w);
    const href = block(w,"href").querySelector("input");
    type(w,href,"https://draft.example.com");
    click(w,"#bookmark-settings-open"); await idle(w);
    assert.equal(field("bookmarksStyle").value, "");
    assert.equal(field("columns","Links").disabled,true);
    change(field("style","Links"),"row");
    assert.equal(field("columns","Links").disabled,false);
    change(field("columns","Links"),"3");
    change(field("iconsOnly","Links"),"true");
    assert.equal(field("columns","Links").disabled,true);
    change(field("maxBookmarkGroupColumns"),"8");
    change(field("header","Links"),"false");
    change(field("tab","Links"),"Bookmarks");
    assert.equal(readFileSync(join(dir,"settings.yaml"),"utf8"),initial);
    click(w,"#dialog-actions .secondary");
    assert.equal(readFileSync(join(dir,"settings.yaml"),"utf8"),initial);
    click(w,"#bookmark-settings-open"); await idle(w);
    assert.equal(field("style","Links").value, "");
    change(field("style","Links"),"row");
    change(field("columns","Links"),"3");
    change(field("bookmarksStyle"),"icons");
    change(field("maxBookmarkGroupColumns"),"8");
    change(field("tab","Links"),"Bookmarks");
    click(w,"#dialog-actions .primary"); await idle(w);
    const saved=readFileSync(join(dir,"settings.yaml"),"utf8");
    assert.match(saved, /bookmarksStyle: icons/);
    assert.match(saved, /maxBookmarkGroupColumns: 8/);
    assert.match(saved, /columns: 3/);
    assert.match(saved, /tab: Bookmarks/);
    assert.match(saved, /futureField: keep/);
    assert.match(saved, /title: Keep title/);
    assert.match(saved, /# personal settings/);
    assert.match(saved, /columns: 4/);
    assert.equal(readFileSync(join(dir,"bookmarks.yaml"),"utf8"),bookmarks);
    assert.equal(block(w,"href").querySelector("input").value,"https://draft.example.com");
    assert.equal(d.getElementById("save").disabled,false);
    click(w,"#bookmark-settings-open"); await idle(w);
    change(field("bookmarksStyle"),"default");
    writeFileSync(join(dir,"settings.yaml"),saved+"\n# changed externally\n");
    click(w,"#dialog-actions .primary"); await idle(w);
    assert.ok(d.getElementById("dialog").open);
    assert.ok(!d.querySelector("#dialog-body .error").classList.contains("hidden"));
    assert.equal(readFileSync(join(dir,"settings.yaml"),"utf8"),saved+"\n# changed externally\n");
  } finally { w.close(); }
});

test("bookmark icon appearance saves scoped CSS, previews sizes, validates and preserves atomic conflicts", async () => {
  const initial="title: Personal\nlayout:\n  Links: {iconsOnly: true}\n  More: {style: column}\n  Servers: {style: row, columns: 3}\n";
  const personal="/* personal stylesheet */\nbody { color: inherit; }\n/* HOME-PAGER APPEARANCE START */\n.bookmark > a {border-radius: 5px !important;}\n/* HOME-PAGER APPEARANCE END */\n";
  writeFileSync(join(dir,"settings.yaml"),initial);
  writeFileSync(join(dir,"custom.css"),personal);
  const bookmarks="- Links:\n    - Docs:\n        - href: https://docs.example.com\n          abbr: DC\n- More:\n    - Other:\n        - href: https://other.example.com\n          abbr: OT\n";
  writeFileSync(join(dir,"bookmarks.yaml"),bookmarks);
  const dom=await setup(),w=dom.window,d=w.document;
  const control=(key,group="Links")=>d.querySelector(`[data-bookmark-group="${group}"] [data-bookmark-appearance="${key}"]`);
  const change=(input,value)=>{if(input.type==="checkbox")input.checked=value;else input.value=value;input.dispatchEvent(new w.Event(input.tagName==="SELECT"||input.type==="checkbox"?"change":"input",{bubbles:true}));};
  const open=async()=>{click(w,"#bookmark-settings-open");await idle(w);};
  try {
    [...d.querySelectorAll("#navigation button")].find(b=>b.textContent.includes("Закладки")).click();await idle(w);
    await open();
    assert.equal(control("enabled").checked,false);
    change(control("enabled"),true);
    assert.equal(control("iconSize").value,"48");
    assert.equal(control("tileSize").value,"80");
    change(control("iconSize"),"64");change(control("tileSize"),"96");change(control("gap"),"16");change(control("radius"),"20");
    change(control("background"),"custom");change(control("backgroundColor"),"#112233");
    change(control("border"),"solid");change(control("borderColor"),"#abcdef");change(control("borderWidth"),"2");
    const tile=d.querySelector('[data-bookmark-group="Links"] .bookmark-appearance-tile');
    assert.equal(tile.style.width,"96px");assert.equal(tile.firstChild.style.width,"64px");assert.equal(tile.style.borderRadius,"20px");
    assert.equal(tile.style.background,"rgb(17, 34, 51)");
    click(w,"#dialog-actions .secondary");
    assert.equal(readFileSync(join(dir,"custom.css"),"utf8"),personal);
    await open();assert.equal(control("enabled").checked,false);change(control("enabled"),true);
    change(control("iconSize"),"100");
    click(w,"#dialog-actions .primary");await idle(w);
    assert.match(d.querySelector("#dialog-body .error").textContent,/8 px/);
    assert.equal(readFileSync(join(dir,"settings.yaml"),"utf8"),initial);
    assert.equal(readFileSync(join(dir,"custom.css"),"utf8"),personal);
    change(control("iconSize"),"48");change(control("gap"),"16");change(control("background"),"transparent");change(control("border"),"none");
    change(control("enabled","More"),true);
    click(w,"#dialog-actions .primary");await idle(w);
    const css=readFileSync(join(dir,"custom.css"),"utf8");
    assert.ok(css.startsWith(personal));
    assert.match(css,/HOME-PAGER BOOKMARK STYLE START/);
    assert.match(css,/\.bookmark-group\[data-home-pager-bookmark-group=/);
    assert.match(css,/width: 80px !important; height: 80px/);
    assert.match(css,/width: 48px !important; height: 48px/);
    assert.match(css,/gap: 16px/);
    assert.match(css,/background: transparent/);
    assert.match(css,/border: none/);
    assert.ok(!css.includes(".service-card"));
    assert.equal(readFileSync(join(dir,"bookmarks.yaml"),"utf8"),bookmarks);
    assert.ok(!readFileSync(join(dir,"settings.yaml"),"utf8").includes("iconSize"));
    await open();assert.equal(control("enabled").checked,true);assert.equal(control("gap").value,"16");
    change(control("enabled"),false);
    click(w,"#dialog-actions .primary");await idle(w);
    const afterReset=readFileSync(join(dir,"custom.css"),"utf8");
    const metadata=JSON.parse(afterReset.match(/\/\* controls: (.+?) \*\//)[1]);
    assert.equal(Object.hasOwn(metadata,"Links"),false);assert.ok(Object.hasOwn(metadata,"More"));
    assert.ok(afterReset.startsWith(personal));
    await open();change(control("enabled"),true);
    const savedSettings=readFileSync(join(dir,"settings.yaml"),"utf8");
    change(d.querySelector('[data-bookmark-group="Links"] [data-bookmark-setting="tab"]'),"Bookmarks");
    writeFileSync(join(dir,"custom.css"),afterReset+"\n/* external change */\n");
    click(w,"#dialog-actions .primary");await idle(w);
    assert.ok(d.getElementById("dialog").open);
    assert.match(d.querySelector("#dialog-body .error").textContent,/custom.css/);
    assert.equal(readFileSync(join(dir,"settings.yaml"),"utf8"),savedSettings);
    assert.equal(readFileSync(join(dir,"custom.css"),"utf8"),afterReset+"\n/* external change */\n");
  } finally { w.close(); }
});

test("bookmark appearance survives added, duplicate, removed and renamed groups and deletion of the original anchor", async () => {
  const original="- Links:\n    - First:\n        - href: https://first.example\n    - Remaining:\n        - href: https://remaining.example\n";
  writeFileSync(join(dir,"bookmarks.yaml"),original);
  writeFileSync(join(dir,"settings.yaml"),"layout:\n  Links: {iconsOnly: true}\n");
  const legacy={Links:{iconSize:84,tileSize:123,gap:16,radius:20,anchor:{name:"First",href:"https://first.example"}}};
  writeFileSync(join(dir,"custom.css"),'/* personal */\n/* HOME-PAGER BOOKMARK STYLE START */\n/* controls: '+JSON.stringify(legacy)+' */\n.bookmark-group:has(.bookmark[data-name="First"]) {}\n/* HOME-PAGER BOOKMARK STYLE END */\n');
  writeFileSync(join(dir,"custom.js"),"// keep my clocks and scripts\n");
  const dom=await setup(),w=dom.window,d=w.document;
  const css=()=>readFileSync(join(dir,"custom.css"),"utf8");
  const rules=()=>JSON.parse(css().match(/\/\* controls: (.+?) \*\//)[1]);
  const edit=async raw=>{click(w,"#raw-tab");await idle(w);type(w,d.getElementById("raw"),raw);click(w,"#save");await idle(w);click(w,"#visual-tab");await idle(w);};
  try {
    [...d.querySelectorAll("#navigation button")].find(b=>b.textContent.includes("Закладки")).click();await idle(w);
    click(w,"#add-root");type(w,d.querySelector("#dialog-body input"),"Temporary");click(w,"#dialog-actions .primary");
    click(w,"#save");await idle(w);
    assert.equal(rules().Links.iconSize,84);assert.equal(rules().Links.tileSize,123);
    assert.match(css(),/data-home-pager-bookmark-group="Links"/);
    assert.ok(readFileSync(join(dir,"custom.js"),"utf8").startsWith("// keep my clocks and scripts\n"));
    const duplicate=original+original.replace("- Links:","- Copy:");
    await edit(duplicate);
    click(w,"#bookmark-settings-open");await idle(w);
    const enabled=d.querySelector('[data-bookmark-group="Links"] [data-bookmark-appearance="enabled"]');
    assert.equal(enabled.checked,true);assert.equal(enabled.disabled,false);
    assert.equal(d.querySelector('[data-bookmark-group="Links"] [data-bookmark-appearance="iconSize"]').value,"84");
    click(w,"#dialog-actions .primary");await idle(w);
    assert.equal(rules().Links.iconSize,84,"Opening settings with duplicate links must not erase styles");
    const remaining="- Links:\n    - Remaining:\n        - href: https://remaining.example\n";
    await edit(remaining);
    assert.equal(rules().Links.iconSize,84);assert.equal(rules().Links.anchor.name,"Remaining");
    await edit(remaining.replace("- Links:","- Renamed:"));
    assert.equal(rules().Renamed.iconSize,84);assert.equal(Object.hasOwn(rules(),"Links"),false);
    await edit("- Renamed: []\n- Added: []\n");
    assert.equal(rules().Renamed.iconSize,84,"Empty groups must retain appearance settings");
    click(w,"#bookmark-settings-open");await idle(w);
    assert.equal(d.querySelector('[data-bookmark-group="Renamed"] [data-bookmark-appearance="enabled"]').checked,true);
    click(w,"#dialog-actions .primary");await idle(w);
    assert.equal(rules().Renamed.iconSize,84);
    assert.equal((readFileSync(join(dir,"custom.js"),"utf8").match(/BOOKMARK STYLE SCRIPT START/g)||[]).length,1);
  } finally {w.close();}
});

test("Homepage bookmark group tags remain stable across DOM insertion, identical links and hidden-header tabs", async () => {
  const dom=new JSDOM('<html><body><script id="__NEXT_DATA__" type="application/json"></script><main></main></body></html>',{url:"https://home.example/#main",runScripts:"outside-only"}),w=dom.window,d=w.document;
  new Script(readFileSync("web/bookmark-appearance.js","utf8")).runInContext(dom.getInternalVMContext());
  const cards='<ul><li class="bookmark" data-name="Same"><a href="https://same.example">Same</a></li></ul>';
  const group=(name,header=true)=>{const el=d.createElement("section");el.className="bookmark-group";el.innerHTML=(header?'<h2 class="bookmark-group-name">'+name+'</h2>':'')+cards;return el;};
  const props={initialSettings:{layout:{HiddenMain:{tab:"Main",header:false},HiddenOther:{tab:"Other",header:false}}},fallback:{"/api/bookmarks":[{name:"HiddenMain",bookmarks:[{name:"Same",href:"https://same.example"}]},{name:"HiddenOther",bookmarks:[{name:"Same",href:"https://same.example"}]}]}};
  d.getElementById("__NEXT_DATA__").textContent=JSON.stringify({props:{pageProps:props}});
  const main=d.querySelector("main"),a=group("Styled"),b=group("Copy"),hidden=group("",false);main.append(a,b,hidden);
  try {
    w.homepageBookmarkAppearanceRuntime();
    assert.equal(a.dataset.homePagerBookmarkGroup,"Styled");assert.equal(b.dataset.homePagerBookmarkGroup,"Copy");assert.equal(hidden.dataset.homePagerBookmarkGroup,"HiddenMain");
    const inserted=group("Added");main.prepend(inserted);a.querySelector(".bookmark").remove();b.remove();
    await new Promise(r=>setTimeout(r,0));
    assert.equal(a.dataset.homePagerBookmarkGroup,"Styled");assert.equal(inserted.dataset.homePagerBookmarkGroup,"Added");
    w.location.hash="#other";w.dispatchEvent(new w.Event("hashchange"));await new Promise(r=>setTimeout(r,0));
    assert.equal(hidden.dataset.homePagerBookmarkGroup,"HiddenOther");
    w.__homePagerBookmarkAppearanceCleanup();assert.equal(a.hasAttribute("data-home-pager-bookmark-group"),false);
  } finally {w.close();}
});

test("group settings buttons open isolated overrides and reset cleanly to global bookmark appearance", async () => {
  const settings="title: Keep\nbookmarksStyle: icons\nlayout:\n  Links: {style: row, columns: 2}\n  Other: {style: column}\n";
  const bookmarks="- Links:\n    - Docs:\n        - href: https://docs.example\n- Other:\n    - More:\n        - href: https://more.example\n";
  writeFileSync(join(dir,"settings.yaml"),settings);writeFileSync(join(dir,"bookmarks.yaml"),bookmarks);
  writeFileSync(join(dir,"custom.css"),"/* personal */\n");writeFileSync(join(dir,"custom.js"),"// personal\n");
  const dom=await setup(),w=dom.window,d=w.document;
  const globalControl=key=>d.querySelector(`[data-bookmark-defaults] [data-bookmark-appearance="${key}"]`);
  const localControl=key=>d.querySelector(`[data-bookmark-group="Links"] [data-bookmark-appearance="${key}"]`);
  const change=(input,value)=>{if(input.type==='checkbox')input.checked=value;else input.value=value;input.dispatchEvent(new w.Event(input.type==='checkbox'||input.tagName==='SELECT'?'change':'input',{bubbles:true}));};
  const save=async()=>{click(w,"#dialog-actions .primary");await idle(w);};
  const openGroup=async()=>{block(w,"Links").querySelector('.bookmark-group-settings').click();await idle(w);};
  try {
    [...d.querySelectorAll('#navigation button')].find(b=>b.textContent.includes('Закладки')).click();await idle(w);
    assert.equal(d.querySelectorAll('.bookmark-group-settings').length,2);
    click(w,'#bookmark-settings-open');await idle(w);
    change(globalControl('enabled'),true);change(globalControl('iconSize'),'56');change(globalControl('tileSize'),'88');change(globalControl('background'),'custom');change(globalControl('backgroundColor'),'#123456');await save();
    await openGroup();
    assert.equal(d.querySelectorAll('[data-bookmark-group]').length,1);
    assert.equal(d.querySelector('[data-bookmark-group="Other"]'),null);
    assert.equal(d.querySelector('[data-bookmark-defaults]'),null);
    assert.match(d.getElementById('dialog-title').textContent,/Links/);
    assert.equal(localControl('enabled').checked,false);
    assert.equal(localControl('iconSize').value,'56');
    change(localControl('enabled'),true);change(localControl('iconSize'),'72');change(localControl('tileSize'),'104');
    change(d.querySelector('[data-bookmark-group="Links"] [data-bookmark-setting="iconsOnly"]'),'false');
    assert.equal(d.querySelector('[data-bookmark-group="Links"] [data-bookmark-setting="columns"]').disabled,false);
    await save();
    let css=readFileSync(join(dir,'custom.css'),'utf8');
    assert.equal(JSON.parse(css.match(/\/\* controls: (.+?) \*\//)[1]).Links.iconSize,72);
    assert.equal(JSON.parse(css.match(/\/\* defaults: (.+?) \*\//)[1]).iconSize,56);
    assert.match(readFileSync(join(dir,'settings.yaml'),'utf8'),/bookmarksStyle: icons/);
    assert.match(readFileSync(join(dir,'settings.yaml'),'utf8'),/iconsOnly: false/);
    assert.match(css,/BOOKMARK MODES START/);
    click(w,'#bookmark-settings-open');await idle(w);
    change(globalControl('iconSize'),'40');change(globalControl('tileSize'),'72');await save();
    await openGroup();assert.equal(localControl('iconSize').value,'72');
    change(localControl('enabled'),false);await save();
    await openGroup();assert.equal(localControl('enabled').checked,false);assert.equal(localControl('iconSize').value,'40');
    change(d.querySelector('[data-bookmark-setting="iconsOnly"]'),'');await save();
    const saved=readFileSync(join(dir,'settings.yaml'),'utf8');
    assert.ok(!saved.includes('iconsOnly:'));assert.match(saved,/title: Keep/);assert.match(saved,/Other:/);
    assert.equal(readFileSync(join(dir,'bookmarks.yaml'),'utf8'),bookmarks);
    css=readFileSync(join(dir,'custom.css'),'utf8');assert.ok(css.startsWith('/* personal */'));
    assert.equal(JSON.parse(css.match(/\/\* defaults: (.+?) \*\//)[1]).iconSize,40);
    assert.ok(!css.includes('BOOKMARK STYLE START'));
  } finally {w.close();}
});

test("Homepage group card view overrides global icons and individual sizes override global CSS", async () => {
  const dom=new JSDOM('<html><head></head><body><script id="__NEXT_DATA__" type="application/json"></script><main></main></body></html>',{url:'https://home.example/',runScripts:'outside-only'}),w=dom.window,d=w.document;
  new Script(readFileSync('web/bookmark-appearance.js','utf8')).runInContext(dom.getInternalVMContext());
  const props={initialSettings:{bookmarksStyle:'icons',layout:{Cards:{iconsOnly:false,style:'row',columns:2}}},fallback:{'/api/bookmarks':[{name:'Cards',bookmarks:[{name:'Docs',href:'https://docs.example',description:'Documentation'}]},{name:'Icons',bookmarks:[{name:'Site',href:'https://site.example'}]}]}};
  d.getElementById('__NEXT_DATA__').textContent=JSON.stringify({props:{pageProps:props}});
  const makeGroup=(name,title,href)=>{const group=d.createElement('section');group.className='bookmark-group';group.innerHTML=`<h2 class="bookmark-group-name">${name}</h2><ul><li class="bookmark grid" data-name="${title}"><a href="${href}"><div class="bookmark-icon"><div><img src="https://icons.example/icon.png"></div></div></a></li></ul>`;d.querySelector('main').append(group);return group;};
  const a=makeGroup('Cards','Docs','https://docs.example'),b=makeGroup('Icons','Site','https://site.example');const originalIcon=a.querySelector('img');
  try {
    const style=d.createElement('style');style.textContent=w.buildBookmarkAppearanceCSS('',{Cards:{iconSize:72,tileSize:104}}, {iconSize:56,tileSize:88});d.head.append(style);
    w.homepageBookmarkAppearanceRuntime(['Cards']);
    await new Promise(r=>setTimeout(r,0));
    assert.equal(a.getAttribute('data-home-pager-bookmark-cards'),'row');assert.equal(b.hasAttribute('data-home-pager-bookmark-cards'),false);
    assert.equal(a.querySelectorAll('[data-home-pager-bookmark-label]').length,1);
    assert.match(a.querySelector('[data-home-pager-bookmark-label]').textContent,/DocsDocumentation/);
    assert.equal(a.querySelector('img'),originalIcon);
    assert.equal(w.getComputedStyle(a.querySelector('a')).width,'100%');
    assert.equal(w.getComputedStyle(a.querySelector('img')).width,'72px');
    assert.equal(w.getComputedStyle(b.querySelector('img')).width,'56px');
    assert.equal(w.getComputedStyle(b.querySelector('a')).width,'88px');
    assert.match(a.style.getPropertyValue('--home-pager-bookmark-columns'),/repeat\(2/);
    props.initialSettings.layout.Cards.iconsOnly=undefined;d.getElementById('__NEXT_DATA__').textContent=JSON.stringify({props:{pageProps:props}});
    await new Promise(r=>setTimeout(r,0));
    assert.equal(a.querySelector('[data-home-pager-bookmark-label]'),null);assert.equal(a.hasAttribute('data-home-pager-bookmark-cards'),false);
    w.__homePagerBookmarkAppearanceCleanup();assert.equal(a.querySelector('img'),originalIcon);
  } finally {w.close();}
});

test("English dictionary covers explicit UI copy and preserves placeholders", () => {
  const { createContext } = require("node:vm");
  const context = createContext({});
  new Script(
    readFileSync("web/translations.en.js", "utf8") +
      ";this.dictionary = englishStrings;",
  ).runInContext(context);
  const dictionary = context.dictionary;
  const babel = require("prettier/plugins/babel");
  for (const file of [
    "app.js",
    "appearance.js",
    "bookmark-settings.js",
    "bookmark-appearance.js",
    "panel-settings.js",
    "server-settings.js",
  ]) {
    const ast = babel.parsers.babel.parse(readFileSync("web/" + file, "utf8"));
    function visit(node) {
      if (!node || typeof node !== "object") return;
      if (
        node.type === "CallExpression" &&
        node.callee?.name === "t" &&
        node.arguments[0]?.type === "StringLiteral"
      ) {
        const key = node.arguments[0].value;
        assert.ok(
          Object.hasOwn(dictionary, key),
          "Missing translation: " + key,
        );
        assert.deepEqual(
          (key.match(/\{\d+\}/g) || []).sort(),
          (dictionary[key].match(/\{\d+\}/g) || []).sort(),
        );
      }
      for (const [key, value] of Object.entries(node))
        if (!["loc", "tokens", "comments", "extra"].includes(key)) {
          if (Array.isArray(value)) value.forEach(visit);
          else visit(value);
        }
    }
    visit(ast);
  }
  const dom = new JSDOM(readFileSync("web/index.html", "utf8"));
  try {
    for (const el of dom.window.document.querySelectorAll("*"))
      for (const attr of el.attributes) {
        if (attr.name.startsWith("data-i18n"))
          assert.ok(
            Object.hasOwn(dictionary, attr.value),
            "Missing static translation: " + attr.value,
          );
      }
  } finally {
    dom.window.close();
  }
});
test("optional Homepage scripts preserve user code and save only on request", async () => {
  const custom = "// personal script\n";
  writeFileSync(join(dir, "custom.js"), custom);
  const dom = await setup(), w = dom.window, d = w.document;
  try {
    [...d.querySelectorAll("nav button")].find(b => b.textContent.includes("JS")).click();
    await idle(w);
    for (const key of ["clock", "copyAddress"]) {
      const input = d.querySelector('[data-extra="' + key + '"]');
      assert.ok(input && !input.checked);
      input.checked = true; input.dispatchEvent(new w.Event("change"));
    }
    click(w, "#add-homepage-clock");
    const clockRows = d.querySelectorAll("[data-clock-index]");
    assert.equal(clockRows.length, 2);
    const zonePicker = clockRows[0].querySelector('[data-clock-field="timeZone"]');
    assert.equal(zonePicker.tagName, "INPUT");
    zonePicker.focus();
    assert.equal(zonePicker.getAttribute("aria-expanded"), "true");
    const zoneList = d.getElementById(zonePicker.getAttribute("aria-controls"));
    assert.ok(zoneList.querySelector('[data-zone="Asia/Tokyo"]'));
    type(w, zonePicker, "Tokyo");
    assert.equal(zoneList.querySelectorAll('[role="option"]').length, 1);
    zoneList.querySelector('[data-zone="Asia/Tokyo"]').click();
    assert.equal(zonePicker.value, "Asia/Tokyo");
    assert.equal(zonePicker.getAttribute("aria-expanded"), "false");
    zonePicker.click();
    assert.ok(zoneList.querySelectorAll('[role="option"]').length > 100);
    zonePicker.dispatchEvent(new w.KeyboardEvent("keydown", {key:"Escape"}));
    assert.equal(clockRows[0].querySelector('[data-clock-field="zoneSearch"]'), null);
    for (const [index, zone] of ["UTC", "Asia/Tokyo"].entries()) {
      const zoneInput = clockRows[index].querySelector('[data-clock-field="timeZone"]');
      zoneInput.value = zone;
      zoneInput.dispatchEvent(new w.Event("change"));
      const name = clockRows[index].querySelector('[data-clock-field="label"]');
      type(w, name, zone);
      const seconds = clockRows[index].querySelector('[data-clock-field="seconds"]');
      seconds.checked = false;
      seconds.dispatchEvent(new w.Event("change"));
    }
    assert.equal(readFileSync(join(dir, "custom.js"), "utf8"), custom);
    click(w, "#save"); await idle(w);
    const saved = readFileSync(join(dir, "custom.js"), "utf8");
    assert.ok(saved.startsWith(custom));
    assert.match(saved, /"clock":true,"copyAddress":true/);
    const host = d.createElement("div"); host.id = "widgets-wrap"; d.body.append(host);
    const card = d.createElement("div"); card.className = "service-card";
    card.innerHTML = '<div class="service-title"><a href="https://example.com/">Test</a></div>'; d.body.append(card);
    w.eval(saved); w.eval(saved);
    assert.equal(d.querySelectorAll("[data-home-pager-clock]").length, 2);
    for (const clock of d.querySelectorAll("[data-home-pager-clock]")) {
      const expected = new w.Date().toLocaleTimeString(undefined, {hour:"2-digit",minute:"2-digit",timeZone:clock.title});
      assert.equal(clock.textContent, clock.title + " · " + expected);
    }
    assert.equal(d.querySelectorAll("[data-home-pager-copy]").length, 1);
    const copyIcon = d.querySelector("[data-home-pager-copy]");
    const lateWidget = d.createElement("div"); lateWidget.className = "service-container"; card.append(lateWidget);
    assert.equal(copyIcon.style.position, "absolute", "Async widgets must not be displaced by the copy button");
    assert.equal(copyIcon.style.bottom, "3px");
    w.__homePagerExtrasCleanup();
    w.homepageExtrasRuntime({clock:true, clocks:[{timeZone:"Europe/Moscow",seconds:false,utcOffset:true,zoneAbbreviation:true}]});
    assert.match(d.querySelector("[data-home-pager-clock]").textContent, /^MSK · .+ · UTC\+3$/);
    w.__homePagerExtrasCleanup();
    const heading = d.createElement("button");
    heading.innerHTML = '<h2 class="service-group-name">Group</h2>';
    heading.setAttribute("aria-expanded","true");
    heading.onclick = () => heading.setAttribute("aria-expanded", String(heading.getAttribute("aria-expanded") !== "true"));
    d.body.append(heading);
    w.homepageExtrasRuntime({collapseGroups:true});
    d.querySelector('[data-group-action="collapse"]').click();
    assert.equal(heading.getAttribute("aria-expanded"),"false");
    d.querySelector('[data-group-action="expand"]').click();
    assert.equal(heading.getAttribute("aria-expanded"),"true");
    w.__homePagerExtrasCleanup();
    for (const input of d.querySelectorAll("[data-extra]")) { input.checked=false; input.dispatchEvent(new w.Event("change")); }
    click(w, "#save"); await idle(w);
    assert.ok(!readFileSync(join(dir,"custom.js"),"utf8").includes("HOME-PAGER EXTRAS START"));
  } finally { w.close(); }
});
test("information widgets use finite choices and typed parameter templates without changing custom values", async () => {
  writeFileSync(join(dir,"widgets.yaml"), `- search:
    provider: duckduckgo
    target: _parent
    focus: false
- datetime:
    text_size: custom-size
    format:
      timeStyle: short
      hourCycle: h23
      fractionalSecondDigits: 3
      hour12: false
- greeting:
    text_size: xl
    text: Hello
- resources:
    units: metric
    diskUnits: bytes
- glances:
    version: 4
    unit: imperial
- openmeteo:
    units: metric
    format:
      notation: compact
- openweathermap:
    provider: openweathermap
    units: imperial
- stocks:
    provider: finnhub
    color: true
- kubernetes:
    nodes:
      show: false
- longhorn:
    total: true
- customapi:
    method: POST
    mappings:
      - field: test
        format: percent
- logo:
    icon: homepage.png
- unifi_console:
    url: https://unifi
`);
  const dom=await setup(),w=dom.window,d=w.document;
  try {
    [...d.querySelectorAll("nav button")].find(b=>b.textContent.includes("Инфовиджеты")).click(); await idle(w);
    const selectFor=(widget,field)=>block(w,widget).querySelector('[data-block-name="'+field+'"] select');
    for(const [widget,field] of [["search","provider"],["search","target"],["datetime","text_size"],["datetime","timeStyle"],["datetime","hourCycle"],["datetime","fractionalSecondDigits"],["greeting","text_size"],["resources","units"],["resources","diskUnits"],["glances","version"],["glances","unit"],["openmeteo","notation"],["openweathermap","provider"],["stocks","provider"],["customapi","method"],["customapi","format"]]) assert.ok(selectFor(widget,field),widget+"."+field);
    assert.equal(selectFor("datetime","text_size").value,"custom-size");
    type(w,selectFor("search","provider"),"custom");
    const customURL = block(w,"search").querySelector('[data-block-name="url"] input');
    assert.ok(customURL);
    type(w,customURL,"https://search.example.com/?q=");
    type(w,selectFor("search","provider"),"brave");
    type(w,selectFor("search","provider"),"custom");
    assert.equal(block(w,"search").querySelector('[data-block-name="url"] input').value,"https://search.example.com/?q=");
    assert.equal(block(w,"search").querySelectorAll('[data-block-name="url"]').length,1);
    type(w,selectFor("search","provider"),"brave");
    type(w,selectFor("glances","version"),"3");
    const add=[...block(w,"resources").querySelectorAll(".add-inline")].find(b=>b.textContent.includes("шаблона"));
    assert.ok(add); add.click();
    assert.ok(d.querySelector('[data-parameter="expanded"]'));
    d.querySelector('[data-parameter="expanded"]').click();
    assert.ok(block(w,"resources").querySelector('[data-block-name="expanded"] input[role="switch"]'));
    click(w,"#save"); await idle(w);
    const raw=readFileSync(join(dir,"widgets.yaml"),"utf8");
    assert.match(raw,/provider: brave/);assert.match(raw,/version: 3/);assert.match(raw,/text_size: custom-size/);assert.match(raw,/hour12: false/);
  } finally {w.close();}
});
test("UniFi Custom API catalog groups system and traffic variants with four mappings", async () => {
  writeFileSync(join(dir,"services.yaml"),"- Monitoring: []\n");
  const dom=await setup(),w=dom.window,d=w.document;
  try {
    [...d.querySelectorAll("nav button")].find(b=>b.textContent.includes("Сервисы")).click();await idle(w);
    click(w,"#library");
    for (const [slug, variants] of [["unifi-wan-health",1],["unifi-uplink-errors",1],["unifi-device-customapi",3],["unifi-wifi-customapi",2],["unifi-ports-customapi",1]]) {
      const card=d.querySelector('[data-catalog-key="'+slug+'"]');
      assert.ok(card,slug);
      assert.equal(card.querySelector("select")?.options.length || 1,variants);
      assert.ok(card.querySelector("img")?.src.includes("unifi.png"));
    }
    type(w,d.querySelector('#dialog-body input[type="search"]'),"unifi-customapi");
    const entry=d.querySelector('[data-catalog-key="unifi-customapi"]');
    assert.ok(entry);const variant=entry.querySelector("select");assert.equal(variant.options.length,2);
    variant.value="1";variant.dispatchEvent(new w.Event("change"));entry.querySelector("button").click();
    click(w,"#save");await idle(w);
    const raw=readFileSync(join(dir,"services.yaml"),"utf8");
    assert.match(raw,/type: customapi/);assert.match(raw,/HOMEPAGE_VAR_UNIFI_API_KEY/);
    assert.match(raw,/icon: unifi.png/);assert.match(raw,/stat\/device\/aa:bb:cc:dd:ee:ff/);
    assert.equal((raw.match(/field: /g)||[]).length,4);
    assert.match(raw,/uplink.rx_bytes-r/);assert.match(raw,/uplink.tx_bytes-r/);
    assert.ok(!raw.includes("password:"));
    assert.equal((await fetch(base+"/unifi-customapi.html")).status,200);
  } finally {w.close();}
});
test("editor expansion buttons persist per file across reloads and group moves without modifying configuration", async () => {
  const settings = 'title: Expansion test\nbackground:\n  image: /images/test.jpg\nlayout:\n  Alpha:\n    style: column\n';
  const services = '- Alpha:\n    - Server:\n        href: https://example.com\n        widget:\n          type: proxmox\n- Beta: []\n';
  writeFileSync(join(dir,'settings.yaml'),settings);
  writeFileSync(join(dir,'services.yaml'),services);
  const dom=await setup(),w=dom.window,d=w.document;let reloaded;
  const navigate=async(window,label)=>{[...window.document.querySelectorAll('nav button')].find(b=>b.textContent.includes(label)).click();await idle(window)};
  try {
    click(w,'#editor-collapse-all');
    assert.ok([...d.querySelectorAll('#editor details.tree-group')].every(el=>!el.open));
    block(w,'layout').querySelector(':scope > summary .tree-toggle-button').click();
    assert.equal(block(w,'layout').open,true);
    await navigate(w,'Сервисы');
    click(w,'#editor-expand-all');
    assert.ok([...d.querySelectorAll('#editor details.tree-group')].every(el=>el.open));
    block(w,'Server').querySelector(':scope > summary .tree-toggle-button').click();
    moveButton(block(w,'Alpha'),'ниже').click();
    assert.equal(block(w,'Alpha').open,true);
    assert.equal(block(w,'Server').open,false);
    assert.equal(w.document.getElementById('save').disabled,false,'Moving a group should still mark its actual config change');
    click(w,'#reload');await idle(w);
    assert.equal(block(w,'Alpha').open,true);
    assert.equal(block(w,'Server').open,false);
    assert.equal(d.getElementById('save').disabled,true,'Expansion alone must not mark a configuration change');
    await navigate(w,'Настройки');
    assert.equal(block(w,'background').open,false);
    assert.equal(block(w,'layout').open,true);
    const storage=Object.fromEntries(Array.from({length:w.localStorage.length},(_,i)=>{const key=w.localStorage.key(i);return [key,w.localStorage.getItem(key)]}));
    assert.ok(Object.keys(storage).some(k=>k.startsWith('home-pager.editor-expansion.v1:')));
    reloaded=await setup(null,false,null,storage);
    assert.equal(block(reloaded.window,'background').open,false);
    assert.equal(block(reloaded.window,'layout').open,true);
    await navigate(reloaded.window,'Сервисы');
    assert.equal(block(reloaded.window,'Alpha').open,true);
    assert.equal(block(reloaded.window,'Server').open,false);
    assert.equal(readFileSync(join(dir,'settings.yaml'),'utf8'),settings);
    assert.equal(readFileSync(join(dir,'services.yaml'),'utf8'),services);
  } finally {dom.window.close();reloaded?.window.close();}
});
test("UniFi port maps render gateway and switch topology through the Homepage proxy without moving fallback content", async () => {
  const dom=await setup(),w=dom.window,d=w.document;
  const fallback=[];
  function card(service) {
    const group=d.createElement('div');group.className='services-group';
    const heading=d.createElement('h2');heading.className='service-group-name';heading.textContent='Ports';group.append(heading);
    const item=d.createElement('li');item.className='service';item.dataset.name=service;
    item.innerHTML='<div class="service-card"><div class="service-title">Device</div><div class="service-container">Fallback</div></div>';
    group.append(item);d.body.append(group);fallback.push(item.querySelector('.service-container'));
  }
  card('Gateway');card('Switch');
  const makePorts=n=>Array.from({length:n},(_,i)=>({port_idx:i+1,name:'Port '+(i+1),media:i>=24?'SFP':'GE',enable:true,up:i===0||i===9||i===11,speed:1000,rx_errors:0,tx_errors:0,rx_dropped:i,tx_dropped:0}));
  const switchPorts=makePorts(26);switchPorts[9].op_mode='aggregate';switchPorts[9].name='<img src=x onerror=alert(1)>';
  switchPorts[11].aggregated_by=10;switchPorts[11].lag_member=true;
  const gatewayPorts=makePorts(5);gatewayPorts[1].up=false;gatewayPorts[1].speed=10;gatewayPorts[1].enable=false;
  const requests=[];
  w.fetch=async(url,options)=>{requests.push({url:String(url),method:options?.method});const isSwitch=new URL(url,base).searchParams.get('service')==='Switch';return {ok:true,json:async()=>({data:[isSwitch?{port_table:switchPorts,uplink:{uplink_device_name:'Con',uplink_remote_port:3,port_idx:1}}:{port_table:gatewayPorts,uplink:{up:true,speed:1000},wan1:{port_idx:5}}]})}};
  const bindings=[{group:'Ports',service:'Gateway',kind:'gateway'},{group:'Ports',service:'Switch',kind:'switch'}];
  try {
    w.homepageUniFiPortsRuntime(bindings);
    await until(()=>d.querySelectorAll('[data-home-pager-ports] [data-port-number]').length===31);
    const panels=d.querySelectorAll('[data-home-pager-ports]');
    assert.equal(panels[0].querySelectorAll('[data-port-number]').length,5);
    assert.equal(panels[1].querySelectorAll('[aria-label="SFP"] [data-port-number]').length,2);
    assert.equal(panels[1].querySelectorAll('[aria-label="RJ45"] [data-port-number]').length,24);
    assert.equal(panels[0].querySelector('.hp-port-grid').style.gridTemplateRows,'repeat(1,26px)');
    assert.match(panels[1].textContent,/Подключён к Con · порт 3/);
    assert.ok(panels[0].querySelector('[data-port-number="2"]').classList.contains('hp-port-disabled'));
    panels[1].querySelector('[data-port-number="10"]').click();
    assert.match(panels[1].querySelector('.hp-port-detail').textContent,/Агрегация/);
    assert.equal(panels[1].querySelector('.hp-port-detail img'),null,'Device-supplied names must be rendered as text');
    panels[1].querySelector('[data-port-number="12"]').click();
    assert.match(panels[1].querySelector('.hp-port-detail').textContent,/С портом 10/);
    assert.ok(fallback.every(node=>node.style.display==='none'));
    assert.equal(requests.length,2);
    assert.ok(requests.every(request=>request.url.startsWith('/api/services/proxy?')&&!request.method));
    w.homepageUniFiPortsRuntime(bindings.map(binding=>({...binding,language:'en'})));
    await until(()=>d.querySelectorAll('[data-home-pager-ports] [data-port-number]').length===31);
    assert.equal(d.querySelectorAll('[data-home-pager-ports-style]').length,1);
    assert.match(d.querySelectorAll('[data-home-pager-ports]')[1].textContent,/Connected to Con/);
    w.__homePagerPortsCleanup();
    assert.equal(d.querySelectorAll('[data-home-pager-ports]').length,0);
    assert.ok(fallback.every(node=>node.style.display===''));
  } finally {w.__homePagerPortsCleanup?.();w.close();}
});
