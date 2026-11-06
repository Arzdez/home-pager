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
) {
  const dom = new JSDOM(readFileSync("web/index.html", "utf8"), {
    url: base,
    runScripts: "outside-only",
    pretendToBeVisual: true,
  });
  const w = dom.window;
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
  new Script(readFileSync("web/panel-settings.js", "utf8")).runInContext(
    dom.getInternalVMContext(),
  );
  new Script(readFileSync("web/app.js", "utf8")).runInContext(
    dom.getInternalVMContext(),
  );
  new Script(readFileSync("web/appearance.js", "utf8")).runInContext(
    dom.getInternalVMContext(),
  );
  await until(
    () => w.document.getElementById("file-status").textContent !== "Загрузка…",
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
    const provider = block(w, "provider").querySelector("input");
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
    d.querySelector('[aria-label="Группа Infra: выше"]').click();
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
    assert.equal(d.documentElement.dataset.panelTheme, "dark");
    [...d.querySelectorAll("#dialog-actions button")]
      .find((b) => b.textContent === "Отмена")
      .click();
    assert.equal(d.documentElement.dataset.panelTheme, "light");
    assert.equal(
      w.localStorage.getItem("home-pager.panel-preferences.v1"),
      null,
    );
    click(w, "#panel-settings-open");
    change(d.getElementById("panel-preference-theme"), "dark");
    change(d.getElementById("panel-preference-density"), "compact");
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
      { theme: "system", density: "invalid", services: "invalid" },
      true,
    ),
    w = dom.window,
    d = w.document;
  try {
    assert.equal(d.documentElement.dataset.panelTheme, "dark");
    assert.equal(d.documentElement.dataset.panelDensity, "comfortable");
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
