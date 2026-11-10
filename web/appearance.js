"use strict";

const appearanceStart = "/* HOME-PAGER APPEARANCE START */";
const appearanceEnd = "/* HOME-PAGER APPEARANCE END */";
const appearancePattern =
  /\/\* HOME-PAGER APPEARANCE START \*\/[\s\S]*?\/\* HOME-PAGER APPEARANCE END \*\//g;

function appearanceSet(map, key, value) {
  map.Content ||= [];
  const index = map.Content.findIndex((n, i) => i % 2 === 0 && n.Value === key);
  const next = node(value);
  if (index < 0) map.Content.push(scalar(key), next);
  else Object.assign(map.Content[index + 1], next, { Style: 0, Alias: null });
}
function appearanceRemove(map, key) {
  if (!map?.Content) return;
  const index = map.Content.findIndex((n, i) => i % 2 === 0 && n.Value === key);
  if (index >= 0) map.Content.splice(index, 2);
}
function appearanceRead(map, key, fallback) {
  const n = mapValue(map, key);
  return n?.Kind === 8 ? n.Value : fallback;
}
function appearanceNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}
function appearanceBound(value, min, max, fallback) {
  return Math.min(max, Math.max(min, appearanceNumber(value, fallback)));
}

function appearanceGroups(tree, bookmarks = false) {
  function listGroups(list, path = []) {
    const groups = [];
    for (const entry of list?.Content || []) {
      if (entry.Kind !== 4) continue;
      for (let i = 0; i < (entry.Content?.length || 0); i += 2) {
        const name = entry.Content[i].Value,
          contents = entry.Content[i + 1];
        if (contents?.Kind !== 2) continue;
        const group = {
          name,
          path: [...path, name],
          cards: [],
          children: [],
          bookmarks,
        };
        for (const item of contents.Content || []) {
          if (item.Kind !== 4) continue;
          for (let j = 0; j < (item.Content?.length || 0); j += 2) {
            const title = item.Content[j].Value,
              config = item.Content[j + 1];
            if (bookmarks && config?.Kind === 2) {
              for (const settings of config.Content || [])
                if (settings.Kind === 4)
                  group.cards.push({ name: title, config: settings });
            } else if (config?.Kind === 4)
              group.cards.push({ name: title, config });
          }
        }
        if (!bookmarks) group.children = listGroups(contents, group.path);
        groups.push(group);
      }
    }
    return groups;
  }
  return listGroups(tree?.Content?.[0]);
}

function appearanceLayout(settings, path, create = false) {
  let layout = mapValue(settings, "layout");
  if (!layout && create) {
    appearanceSet(settings, "layout", {});
    layout = mapValue(settings, "layout");
  }
  if (!layout) return null;
  if (layout.Kind !== 4) {
    if (create)
      throw Error(
        t(
          "Раскладка использует YAML-ссылку или другой тип. Сначала задайте layout как раздел настроек.",
        ),
      );
    return null;
  }
  for (const name of path) {
    let next = mapValue(layout, name);
    if (!next && create) {
      appearanceSet(layout, name, {});
      next = mapValue(layout, name);
    }
    if (!next) return null;
    if (next.Kind !== 4) {
      if (create)
        throw Error(
          t("Параметры группы «") +
            name +
            t("» должны быть разделом настроек."),
        );
      return null;
    }
    layout = next;
  }
  return layout;
}

function appearanceCSS(raw, style, enabled) {
  const existing = raw.match(appearancePattern);
  const block = enabled
    ? `${appearanceStart}
/* controls: ${JSON.stringify(style)} */
.service-card, .bookmark > a {
  background-color: rgba(255,255,255,${style.opacity / 100}) !important;
  border-radius: ${style.radius}px !important;
}
.dark .service-card, .dark .bookmark > a {
  background-color: rgba(20,32,48,${style.opacity / 100}) !important;
}
.service-card { padding: ${style.padding}px !important; margin-bottom: ${style.gap}px !important; }
.bookmark > a { margin-bottom: ${style.gap}px !important; }
.services-list { column-gap: ${style.gap}px !important; }
${appearanceEnd}`
    : "";
  if (existing?.length) return raw.replace(appearancePattern, () => block);
  return enabled
    ? raw + (raw.endsWith("\n") || !raw ? "" : "\n") + block + "\n"
    : raw;
}

const groupStretchPattern = /\/\* HOME-PAGER GROUP WIDTH START \*\/[\s\S]*?\/\* HOME-PAGER GROUP WIDTH END \*\//g;
function groupStretchCSS(raw, rules) {
  const entries = Object.entries(rules);
  const block = entries.length ? "/* HOME-PAGER GROUP WIDTH START */\n/* rules: " + JSON.stringify(rules).replace(/\*/g, "\\u002a") + " */\n" + entries.map(([, name]) => {
    const escaped = Array.from(name, char => "\\" + char.codePointAt(0).toString(16) + " ").join("");
    const card = '.service[data-name="' + escaped + '"]';
    return '.services-group:has(.services-list > ' + card + '):not(:has(.services-group ' + card + ')) { flex-grow: 0 !important; }';
  }).join("\n") + "\n/* HOME-PAGER GROUP WIDTH END */" : "";
  if (groupStretchPattern.test(raw)) { groupStretchPattern.lastIndex = 0; return raw.replace(groupStretchPattern, () => block); }
  groupStretchPattern.lastIndex = 0;
  return raw + (block ? "\n" + block + "\n" : "");
}

let inlineStretchFiles = null;
async function renderInlineGroupStretch(parent, container) {
  const row = make("div", "field-row");
  container.append(row);
  const file = current;
  try {
    inlineStretchFiles ||= Promise.all([api("/api/file?name=custom.css"), api("/api/file?name=services.yaml")]);
    const [savedCSS, services] = await inlineStretchFiles;
    if (current !== file || !row.isConnected) return;
    const groups = appearanceGroups(services.tree);
    const group = groups.find(g => appearanceLayout(root(), g.path) === parent);
    const flatten = list => list.flatMap(g => [g, ...flatten(g.children)]);
    const all = flatten(groups);
    const anchor = group?.cards.find(card => all.filter(g => g.cards.some(c => c.name === card.name)).length === 1)?.name;
    if (!anchor) { row.remove(); return; }
    const key = JSON.stringify(group.path);
    const readRules = raw => {
      try { return JSON.parse(raw.match(groupStretchPattern)?.[0]?.match(/\/\* rules: (.+?) \*\//)?.[1] || "{}"); }
      catch { return {}; }
    };
    const input = make("input");
    input.type = "checkbox";
    input.setAttribute("role", "switch");
    input.className = "inline-group-stretch";
    input.checked = !Object.hasOwn(readRules((pendingAppearanceCSS || savedCSS).raw), key);
    input.disabled = appearanceRead(parent, "style", "column") === "row";
    const label = make("label", "field-label");
    label.append(make("strong", "", t("Растягивать группу")), make("small", "", t("Выключено — группа сохраняет ширину колонки. Включено — занимает свободное место в строке. Если включено у нескольких групп, они делят свободное место между собой. Если только у одной — весь остаток получает она.")));
    input.id = "group-stretch-" + encodeURIComponent(key);
    label.htmlFor = input.id;
    input.setAttribute("aria-checked", String(input.checked));
    const control = make("div", "field-input");
    const state = make("span", "switch-state", input.checked ? t("Включено") : t("Выключено"));
    control.append(input, state);
    row.append(label, control);
    input.addEventListener("change", () => {
      input.setAttribute("aria-checked", String(input.checked));
      state.textContent = input.checked ? t("Включено") : t("Выключено");
      const css = pendingAppearanceCSS || savedCSS;
      const rules = readRules(css.raw);
      if (input.checked) delete rules[key]; else rules[key] = anchor;
      pendingAppearanceCSS = { raw: groupStretchCSS(css.raw, rules), revision: css.revision, original: css.original ?? css.raw };
      mark();
    });
  } catch (error) {
    inlineStretchFiles = null;
    row.textContent = error.message;
  }
}

async function openAppearance(focusGroup = null) {
  if (busy || current?.name !== "settings.yaml") return;
  await run(async () => {
    validateVisualFields();
    const working =
      mode === "raw"
        ? (
            await api("/api/convert", {
              method: "POST",
              body: JSON.stringify({
                name: "settings.yaml",
                raw: $("raw").value,
              }),
            })
          ).tree
        : structuredClone(current.tree);
    const settings = working.Content[0];
    const [services, bookmarks, widgets, css, images] = await Promise.all([
      api("/api/file?name=services.yaml"),
      api("/api/file?name=bookmarks.yaml"),
      api("/api/file?name=widgets.yaml"),
      pendingAppearanceCSS
        ? Promise.resolve({
            raw: pendingAppearanceCSS.raw,
            revision: pendingAppearanceCSS.revision,
            original: pendingAppearanceCSS.original,
          })
        : api("/api/file?name=custom.css"),
      api("/api/images"),
    ]);
    let groups = [
      ...appearanceGroups(services.tree),
      ...appearanceGroups(bookmarks.tree, true),
    ];
    function sorted(list, parentPath = []) {
      const layout = appearanceLayout(settings, parentPath),
        order = (layout?.Content || [])
          .filter((_, i) => i % 2 === 0)
          .map((n) => n.Value);
      list.sort(
        (a, b) =>
          (order.includes(a.name) ? order.indexOf(a.name) : 1e6) -
          (order.includes(b.name) ? order.indexOf(b.name) : 1e6),
      );
      for (const g of list) sorted(g.children, g.path);
    }
    sorted(groups);
    let activePreviewTab = Array.isArray(focusGroup)
      ? appearanceRead(appearanceLayout(settings, focusGroup), "tab", "") : "";
    function previewTabs() {
      const layout = mapValue(settings, "layout");
      return [...new Set((layout?.Content || []).filter((_, i) => i % 2 !== 0)
        .map(value => appearanceRead(value, "tab", "")).filter(Boolean))];
    }
    function visibleGroups(list) {
      if (list !== groups) return list;
      const tabs = previewTabs();
      if (!tabs.includes(activePreviewTab)) activePreviewTab = tabs[0] || "";
      return tabs.length ? list.filter(group => {
        const tab = appearanceRead(appearanceLayout(settings, group.path), "tab", "");
        return !tab || tab === activePreviewTab;
      }) : list;
    }
    let noStretch = {};
    try {
      const saved = css.raw.match(groupStretchPattern)?.[0]?.match(/\/\* rules: (.+?) \*\//)?.[1];
      if (saved) noStretch = JSON.parse(saved);
    } catch { /* Ignore invalid control metadata. */ }
    const allGroups = [];
    const collectGroups = list => list.forEach(g => { allGroups.push(g); collectGroups(g.children); });
    collectGroups(groups);
    const stretchKey = group => JSON.stringify(group.path);
    const stretchAnchor = group => !group.bookmarks && group.path.length === 1 && group.cards.find(card =>
      allGroups.filter(g => !g.bookmarks && g.cards.some(c => c.name === card.name)).length === 1
    )?.name;
    noStretch = Object.fromEntries(allGroups.filter(g => Object.hasOwn(noStretch, stretchKey(g)) && stretchAnchor(g)).map(g => [stretchKey(g), stretchAnchor(g)]));
    let style = { opacity: 20, radius: 6, padding: 4, gap: 8 };
    const oldBlock = css.raw.match(appearancePattern)?.[0];
    let customEnabled = Boolean(oldBlock);
    const controls = oldBlock?.match(/\/\* controls: (.+?) \*\//)?.[1];
    if (controls) {
      try {
        const parsed = JSON.parse(controls);
        style = {
          opacity: appearanceBound(parsed.opacity, 0, 100, 20),
          radius: appearanceBound(parsed.radius, 0, 40, 6),
          padding: appearanceBound(parsed.padding, 0, 24, 4),
          gap: appearanceBound(parsed.gap, 0, 32, 8),
        };
      } catch {
        /* Keep existing CSS until explicitly applied. */
      }
    }
    openDialog(
      t("Превью"),
      t(
        "Настройте свою страницу. Предпросмотр показывает компоновку без запросов к API сервисов. Применение изменит черновик; запись произойдёт после сохранения.",
      ),
    );
    $("dialog").classList.add("appearance-dialog");
    $("dialog").addEventListener(
      "close",
      () => $("dialog").classList.remove("appearance-dialog"),
      { once: true },
    );
    const shell = make("div", "appearance-shell"),
      panel = make("div", "appearance-controls"),
      stage = make("div", "appearance-stage"),
      preview = make("div", "appearance-preview");
    preview.id = "appearance-preview";
    const background = make("img", "appearance-background"),
      canvas = make("div", "appearance-canvas");
    background.alt = "";
    preview.append(background, canvas);
    stage.append(
      make(
        "p",
        "hint",
        t("Схема страницы · масштаб и данные виджетов приблизительные"),
      ),
      preview,
    );
    shell.append(panel, stage);
    $("dialog-body").append(shell);
    const error = make("p", "error hidden");
    error.setAttribute("role", "alert");
    $("dialog-body").append(error);
    const report = (fn) => {
      try {
        fn();
        error.classList.add("hidden");
      } catch (e) {
        error.textContent = e.message;
        error.classList.remove("hidden");
      }
    };
    function section(title) {
      const section = make("section", "appearance-section");
      section.append(make("h3", "", title));
      panel.append(section);
      return section;
    }
    function control(parent, title, input, id, help = "") {
      const label = make("label", "dialog-field");
      if (id) input.id = id;
      label.append(make("span", "", title), input);
      if (help) label.append(make("small", "", help));
      parent.append(label);
      return input;
    }
    function choices(current, values) {
      const input = select(values);
      if (!values.some(([v]) => v === current)) {
        const extra = make("option", "", t("Текущее: ") + current);
        extra.value = current;
        input.append(extra);
      }
      input.value = current;
      return input;
    }
    function nativeChoice(parent, key, title, values, fallback) {
      const input = control(
        parent,
        title,
        choices(appearanceRead(settings, key, fallback), values),
        "appearance-" + key,
      );
      input.addEventListener("change", () => {
        if (input.value === "__default") appearanceRemove(settings, key);
        else appearanceSet(settings, key, input.value);
        draw();
      });
      return input;
    }
    function nativeSwitch(parent, key, title, fallback) {
      const input = make("input");
      input.type = "checkbox";
      input.checked =
        appearanceRead(settings, key, String(fallback)).toLowerCase() ===
        "true";
      control(parent, title, input, "appearance-" + key);
      input.addEventListener("change", () => {
        appearanceSet(settings, key, input.checked);
        draw();
      });
      return input;
    }
    const general = section(t("Страница"));
    nativeChoice(
      general,
      "theme",
      t("Тема"),
      [
        ["__default", t("Системная")],
        ["dark", t("Тёмная")],
        ["light", t("Светлая")],
      ],
      "__default",
    );
    nativeChoice(
      general,
      "color",
      t("Палитра"),
      fieldChoices("color", root()),
      "slate",
    );
    nativeChoice(
      general,
      "headerStyle",
      t("Стиль заголовка"),
      fieldChoices("headerStyle", root()),
      "underlined",
    );
    nativeChoice(
      general,
      "font",
      t("Шрифт"),
      [
        ["__default", t("Manrope — стандартный")],
        ["plex", t("Моноширинный")],
        ["plexData", t("Моноширинные показатели")],
      ],
      "__default",
    );
    nativeSwitch(general, "fullWidth", t("Страница на всю ширину"), false);
    nativeSwitch(
      general,
      "useEqualHeights",
      t("Одинаковая высота карточек"),
      false,
    );
    nativeSwitch(general, "hideVersion", t("Скрыть версию Homepage"), false);
    const groupColumns = control(
      general,
      t("Вертикальных групп в строке"),
      make("input"),
      "appearance-group-columns",
      t("Для групп со способом расположения «Вертикальный столбец»."),
    );
    groupColumns.type = "number";
    groupColumns.min = "1";
    groupColumns.max = "8";
    groupColumns.step = "1";
    groupColumns.value = appearanceRead(settings, "maxGroupColumns", "4");
    groupColumns.addEventListener("change", () => {
      if (groupColumns.checkValidity() && groupColumns.value) {
        appearanceSet(settings, "maxGroupColumns", Number(groupColumns.value));
        draw();
      }
    });
    const bgSection = section(t("Фон и эффекты"));
    let bg = mapValue(settings, "background");
    const bgURL = control(
      bgSection,
      t("Фоновое изображение"),
      make("input"),
      "appearance-background-url",
      t(
        "URL или путь из Homepage. Загрузить и конвертировать изображение можно кнопкой «Загрузить фон» в Настройках.",
      ),
    );
    bgURL.value = bg?.Kind === 8 ? bg.Value : appearanceRead(bg, "image", "");
    function backgroundMap() {
      let value = mapValue(settings, "background");
      if (!value) {
        appearanceSet(settings, "background", { image: "" });
        value = mapValue(settings, "background");
      } else if (value.Kind === 8) {
        const original = value.Value;
        Object.assign(value, node({ image: original }), { Style: 0 });
      }
      if (value.Kind !== 4)
        throw Error(
          t(
            "Фон использует YAML-ссылку. Сначала задайте изображение в обычном редакторе.",
          ),
        );
      return value;
    }
    bgURL.addEventListener("input", () =>
      report(() => {
        appearanceSet(backgroundMap(), "image", bgURL.value);
        draw();
      }),
    );
    const loadRemote = make("input");
    loadRemote.type = "checkbox";
    control(
      bgSection,
      t("Показать удалённое изображение в предпросмотре"),
      loadRemote,
      "appearance-load-background",
      t(
        "Загружается только фон, указанный вами. Иконки внешних сервисов не запрашиваются.",
      ),
    );
    loadRemote.addEventListener("change", draw);
    const effect = control(
      bgSection,
      t("Где применять эффект"),
      choices(mapValue(settings, "cardBlur") ? "cards" : "background", [
        ["background", t("Фильтры фонового изображения")],
        ["cards", t("Размытие под карточками")],
      ]),
      "appearance-effect",
      t(
        "Homepage не совмещает фильтры фона с размытием карточек. При применении останется выбранный режим.",
      ),
    );
    const blurValues = [
      ["__default", t("Без размытия")],
      ["xs", t("Очень слабое")],
      ["sm", t("Слабое")],
      ["", t("Стандартное")],
      ["md", t("Среднее")],
      ["lg", t("Сильное")],
      ["xl", t("Очень сильное")],
      ["2xl", t("Максимальное")],
    ];
    const bgBlur = control(
      bgSection,
      t("Размытие фона"),
      choices(appearanceRead(bg, "blur", "__default"), blurValues),
      "appearance-background-blur",
    );
    const cardBlur = control(
      bgSection,
      t("Размытие карточек"),
      choices(appearanceRead(settings, "cardBlur", "__default"), blurValues),
      "appearance-card-blur",
    );
    const brightness = control(
      bgSection,
      t("Яркость фона"),
      choices(
        appearanceRead(bg, "brightness", "100"),
        [0, 50, 75, 90, 95, 100, 105, 110, 125, 150, 200].map((n) => [
          String(n),
          n + " %",
        ]),
      ),
      "appearance-brightness",
    );
    const saturation = control(
      bgSection,
      t("Насыщенность фона"),
      choices(
        appearanceRead(bg, "saturate", "100"),
        [0, 50, 100, 150, 200].map((n) => [String(n), n + " %"]),
      ),
      "appearance-saturation",
    );
    const opacity = control(
      bgSection,
      t("Непрозрачность фона, %"),
      make("input"),
      "appearance-background-opacity",
    );
    opacity.type = "range";
    opacity.min = "0";
    opacity.max = "100";
    opacity.value = appearanceRead(bg, "opacity", "100");
    const bgOpacityOutput = make(
      "output",
      "appearance-range-value",
      opacity.value + " %",
    );
    opacity.parentElement.append(bgOpacityOutput);
    bgBlur.addEventListener("change", () =>
      report(() => {
        if (bgBlur.value === "__default")
          appearanceRemove(backgroundMap(), "blur");
        else appearanceSet(backgroundMap(), "blur", bgBlur.value);
        draw();
      }),
    );
    cardBlur.addEventListener("change", () => {
      if (cardBlur.value === "__default")
        appearanceRemove(settings, "cardBlur");
      else appearanceSet(settings, "cardBlur", cardBlur.value);
      draw();
    });
    for (const [input, key] of [
      [brightness, "brightness"],
      [saturation, "saturate"],
      [opacity, "opacity"],
    ])
      input.addEventListener("input", () =>
        report(() => {
          appearanceSet(backgroundMap(), key, Number(input.value));
          draw();
        }),
      );
    effect.addEventListener("change", draw);
    const cards = section(t("Карточки"));
    nativeChoice(
      cards,
      "cardStyle",
      t("Обводка"),
      [
        ["__default", t("Тень — стандартная")],
        ["hairline", t("Тонкая рамка")],
      ],
      "__default",
    );
    nativeChoice(
      cards,
      "blockStyle",
      t("Показатели виджетов"),
      [
        ["__default", t("Стандартные")],
        ["refined", t("Выразительные числа")],
      ],
      "__default",
    );
    nativeChoice(
      cards,
      "statusStyle",
      t("Статус сервиса"),
      fieldChoices("statusStyle", root()),
      "dot",
    );
    const custom = make("input");
    custom.type = "checkbox";
    custom.checked = customEnabled;
    control(
      cards,
      t("Своя прозрачность и размеры карточек"),
      custom,
      "appearance-custom-cards",
      t(
        "Эти параметры сохраняются в отдельный блок custom.css. Остальные стили сохраняются.",
      ),
    );
    const styleControls = [];
    for (const [key, title, min, max] of [
      ["opacity", t("Непрозрачность карточек, %"), 0, 100],
      ["radius", t("Скругление, px"), 0, 40],
      ["padding", t("Внутренние отступы, px"), 0, 24],
      ["gap", t("Расстояние между карточками, px"), 0, 32],
    ]) {
      const input = control(
        cards,
        title,
        make("input"),
        "appearance-card-" + key,
      );
      input.type = "range";
      input.min = String(min);
      input.max = String(max);
      input.value = String(style[key]);
      const output = make("output", "appearance-range-value", input.value);
      input.parentElement.append(output);
      styleControls.push(input);
      input.addEventListener("input", () => {
        style[key] = Number(input.value);
        output.value = input.value;
        output.textContent = input.value;
        draw();
      });
    }
    custom.addEventListener("change", () => {
      customEnabled = custom.checked;
      draw();
    });
    const groupSection = section(t("Группы и порядок"));
    groupSection.append(
      make(
        "p",
        "hint",
        t(
          "Порядок хранится в layout. Широкая группа занимает строку целиком; внутри неё можно выбрать 1–8 колонок карточек. Вложенные группы настраиваются отдельно.",
        ),
      ),
    );
    const groupRows = make("div");
    groupSection.append(groupRows);
    function saveGroupOrder(list, group) {
      const layout = appearanceLayout(settings, group.path.slice(0, -1), true);
      const names = new Set(), entries = [];
      for (const sibling of list) {
        if (names.has(sibling.name)) throw Error(t("Группы сервисов и закладок должны иметь разные названия"));
        names.add(sibling.name);
        let value = mapValue(layout, sibling.name);
        if (!value) {
          appearanceSet(layout, sibling.name, {});
          value = mapValue(layout, sibling.name);
        }
        const index = layout.Content.findIndex((key, i) => i % 2 === 0 && key.Value === sibling.name);
        entries.push(layout.Content[index], value);
      }
      for (let i = 0; i < layout.Content.length; i += 2)
        if (!names.has(layout.Content[i].Value)) entries.push(layout.Content[i], layout.Content[i + 1]);
      layout.Content = entries;
    }
    function movePreviewGroup(list, group, target, after) {
      const visible = visibleGroups(list);
      if (group === target || !visible.includes(group) || !visible.includes(target)) return;
      report(() => {
        const moved = visible.filter(item => item !== group);
        moved.splice(moved.indexOf(target) + (after ? 1 : 0), 0, group);
        const visibleSet = new Set(visible);
        let index = 0;
        const reordered = list.map(item => visibleSet.has(item) ? moved[index++] : item);
        saveGroupOrder(reordered, group);
        list.splice(0, list.length, ...reordered);
        renderGroups();
        draw();
      });
    }
    function movePreviewTab(tab, target, after) {
      const tabs = previewTabs();
      if (tab === target || !tabs.includes(tab) || !tabs.includes(target)) return;
      report(() => {
        const order = tabs.filter(value => value !== tab);
        order.splice(order.indexOf(target) + (after ? 1 : 0), 0, tab);
        const layout = mapValue(settings, "layout"), entries = [];
        for (let i = 0; i < layout.Content.length; i += 2)
          entries.push([layout.Content[i], layout.Content[i + 1]]);
        const tagged = entries.filter(([, value]) => appearanceRead(value, "tab", ""));
        tagged.sort((a, b) => order.indexOf(appearanceRead(a[1], "tab", "")) - order.indexOf(appearanceRead(b[1], "tab", "")));
        let index = 0;
        layout.Content = entries.flatMap(entry => appearanceRead(entry[1], "tab", "") ? tagged[index++] : entry);
        sorted(groups);
        renderGroups();
        draw();
      });
    }
    let previewTabDrag = null;
    let previewDrag = null;
    function renderGroups() {
      groupRows.replaceChildren();
      function rows(list, depth = 0) {
        const visible = visibleGroups(list);
        visible.forEach((group, index) => {
          const box = make("details", "appearance-group-control");
          box.open = depth === 0;
          box.dataset.groupPath = group.path.join(" / ");
          const heading = make("summary", "", group.path.join(" / "));
          const actions = make("span", "group-actions");
          for (const [title, delta] of [
            ["↑", -1],
            ["↓", 1],
          ]) {
            const move = button(title, "", (ev) => {
              ev.preventDefault();
              ev.stopPropagation();
              movePreviewGroup(list, group, visible[index + delta], delta > 0);
            });
            move.disabled = index + delta < 0 || index + delta >= visible.length;
            move.setAttribute(
              "aria-label",
              t("Группа ") +
                group.name +
                ": " +
                (delta < 0 ? t("выше") : t("ниже")),
            );
            actions.append(move);
          }
          heading.append(actions);
          box.append(heading);
          const body = make("div", "appearance-group-fields");
          box.append(body);
          groupRows.append(box);
          const layout = appearanceLayout(settings, group.path);
          const location = control(
            body,
            t("Расположение"),
            choices(appearanceRead(layout, "style", "column"), [
              ["row", t("На всю ширину строки")],
              ["column", t("Вертикальный столбец")],
            ]),
            null,
          );
          location.className = "appearance-group-style";
          const columns = control(
            body,
            t("Колонок карточек"),
            choices(
              appearanceRead(layout, "columns", "3"),
              Array.from({ length: 8 }, (_, i) => [
                String(i + 1),
                String(i + 1),
              ]),
            ),
            null,
          );
          const stretch = make("input");
          stretch.type = "checkbox";
          stretch.className = "appearance-group-stretch";
          stretch.checked = !Object.hasOwn(noStretch, stretchKey(group));
          stretch.disabled = !stretchAnchor(group) || location.value === "row";
          control(body, t("Растягивать группу"), stretch, null,
            t("Выключено — группа сохраняет ширину колонки. Включено — занимает свободное место в строке. Если включено у нескольких групп, они делят свободное место между собой. Если только у одной — весь остаток получает она."));
          stretch.title = t("Для вертикальной группы сервисов с уникальным именем карточки. Применяется через custom.css.");
          stretch.addEventListener("change", () => {
            if (stretch.checked) delete noStretch[stretchKey(group)];
            else noStretch[stretchKey(group)] = stretchAnchor(group);
            draw();
          });
          columns.className = "appearance-group-columns";
          columns.disabled = location.value !== "row";
          const header = make("input");
          header.type = "checkbox";
          header.checked = appearanceRead(layout, "header", "true") !== "false";
          header.className = "appearance-group-header";
          control(body, t("Показывать название группы"), header, null);
          const collapsed = make("input");
          collapsed.type = "checkbox";
          collapsed.checked =
            appearanceRead(layout, "initiallyCollapsed", appearanceRead(settings, "groupsInitiallyCollapsed", "false")) === "true";
          control(body, t("Свернуть при открытии страницы"), collapsed, null);
          collapsed.disabled = !header.checked;
          const tab = control(
            body,
            t("Вкладка (необязательно)"),
            make("input"),
            null,
          );
          tab.value = appearanceRead(layout, "tab", "");
          const change = (key, value) =>
            report(() => {
              appearanceSet(
                appearanceLayout(settings, group.path, true),
                key,
                value,
              );
              draw();
            });
          location.addEventListener("change", () => {
            columns.disabled = location.value !== "row";
            stretch.disabled = !stretchAnchor(group) || location.value === "row";
            change("style", location.value);
            if (location.value === "row")
              change("columns", Number(columns.value));
          });
          columns.addEventListener("change", () =>
            change("columns", Number(columns.value)),
          );
          header.addEventListener("change", () => {
            change("header", header.checked);
            collapsed.disabled = !header.checked;
            if (!header.checked) {
              collapsed.checked = false;
              change("initiallyCollapsed", false);
            }
          });
          collapsed.addEventListener("change", () =>
            change("initiallyCollapsed", collapsed.checked),
          );
          tab.addEventListener("input", () =>
            report(() => {
              const target = appearanceLayout(settings, group.path, true);
              if (tab.value.trim())
                appearanceSet(target, "tab", tab.value.trim());
              else appearanceRemove(target, "tab");
              draw();
            }),
          );
          tab.addEventListener("change", () => { renderGroups(); draw(); });
          rows(group.children, depth + 1);
        });
      }
      rows(groups);
      if (!groups.length)
        groupRows.append(
          make(
            "p",
            "hint",
            t("Сначала добавьте группы в разделах «Сервисы» или «Закладки»."),
          ),
        );
    }
    function draw() {
      const dark = appearanceRead(settings, "theme", "dark") !== "light";
      preview.classList.toggle("preview-light", !dark);
      preview.classList.toggle(
        "preview-mono",
        appearanceRead(settings, "font", "") === "plex",
      );
      preview.classList.toggle(
        "preview-equal",
        appearanceRead(settings, "useEqualHeights", "false") === "true",
      );
      preview.classList.toggle(
        "preview-hairline",
        appearanceRead(settings, "cardStyle", "") === "hairline",
      );
      preview.classList.toggle(
        "preview-refined",
        appearanceRead(settings, "blockStyle", "") === "refined",
      );
      const accents = {
        slate: "#a8bdcf",
        gray: "#b2b9c5",
        zinc: "#b6b6c0",
        neutral: "#bbbbbb",
        stone: "#bfb6ae",
        red: "#f87171",
        orange: "#fb923c",
        amber: "#fbbf24",
        yellow: "#facc15",
        lime: "#a3e635",
        green: "#4ade80",
        emerald: "#34d399",
        teal: "#2dd4bf",
        cyan: "#22d3ee",
        sky: "#38bdf8",
        blue: "#60a5fa",
        indigo: "#818cf8",
        violet: "#a78bfa",
        purple: "#c084fc",
        fuchsia: "#e879f9",
        pink: "#f472b6",
        rose: "#fb7185",
      };
      preview.style.setProperty(
        "--preview-accent",
        accents[appearanceRead(settings, "color", "slate")] || accents.slate,
      );
      bgOpacityOutput.value = opacity.value + " %";
      bgOpacityOutput.textContent = opacity.value + " %";
      preview.style.setProperty(
        "--preview-card-opacity",
        String(customEnabled ? style.opacity / 100 : dark ? 0.12 : 0.65),
      );
      preview.style.setProperty(
        "--preview-radius",
        (customEnabled ? style.radius : 6) + "px",
      );
      preview.style.setProperty(
        "--preview-padding",
        (customEnabled ? style.padding + 7 : 11) + "px",
      );
      preview.style.setProperty(
        "--preview-gap",
        (customEnabled ? style.gap : 8) + "px",
      );
      preview.style.setProperty(
        "--preview-card-blur",
        effect.value === "cards"
          ? ({ xs: 2, sm: 4, "": 8, md: 12, lg: 16, xl: 24, "2xl": 40 }[
              cardBlur.value
            ] || 0) + "px"
          : "0px",
      );
      styleControls.forEach((input) => (input.disabled = !customEnabled));
      bgBlur.disabled =
        brightness.disabled =
        saturation.disabled =
          effect.value !== "background";
      cardBlur.disabled = effect.value !== "cards";
      let src = "";
      const localName = bgURL.value.startsWith(images.urlPrefix + "/")
        ? bgURL.value.slice(images.urlPrefix.length + 1)
        : "";
      if (/^background-[a-f0-9]{32}\.(jpg|png|webp)$/.test(localName))
        src = "/api/images/" + localName;
      else if (loadRemote.checked && /^https?:\/\//i.test(bgURL.value))
        src = bgURL.value;
      if (src) {
        background.src = src;
        background.hidden = false;
      } else {
        background.removeAttribute("src");
        background.hidden = true;
      }
      background.style.opacity = String(
        appearanceBound(opacity.value, 0, 100, 100) / 100,
      );
      background.style.filter =
        effect.value === "background"
          ? `brightness(${appearanceNumber(brightness.value, 100)}%) saturate(${appearanceNumber(saturation.value, 100)}%) blur(${{ xs: 2, sm: 4, "": 8, md: 12, lg: 16, xl: 24, "2xl": 40 }[bgBlur.value] || 0}px)`
          : "none";
      canvas.replaceChildren();
      canvas.classList.toggle(
        "preview-full",
        appearanceRead(settings, "fullWidth", "false") === "true",
      );
      const title = make(
        "div",
        "preview-page-title",
        appearanceRead(settings, "title", "Homepage"),
      );
      canvas.append(title);
      const info = make("div", "preview-info-row");
      for (const item of widgets.tree?.Content?.[0]?.Content || []) {
        if (item.Kind === 4 && item.Content?.[0])
          info.append(make("span", "", item.Content[0].Value));
      }
      if (info.children.length) canvas.append(info);
      const shown = visibleGroups(groups);
      const tabs = previewTabs();
      if (tabs.length) {
        const navigation = make("div", "preview-tabs");
        navigation.setAttribute("role", "tablist");
        navigation.setAttribute("aria-label", t("Вкладки Homepage"));
        for (const tab of tabs) {
          const tabControl = make("span", "preview-tab-control");
          const item = button(tab, "preview-tab", () => {
            activePreviewTab = tab;
            renderGroups();
            draw();
          });
          item.dataset.previewTab = tab;
          item.setAttribute("role", "tab");
          item.setAttribute("aria-selected", String(tab === activePreviewTab));
          item.draggable = true;
          item.title = t("Перетащите вкладку или используйте стрелки для изменения порядка");
          item.addEventListener("dragstart", event => {
            previewTabDrag = tab;
            if (event.dataTransfer) {
              event.dataTransfer.effectAllowed = "move";
              event.dataTransfer.setData("text/plain", tab);
            }
          });
          item.addEventListener("dragend", () => {
            previewTabDrag = null;
            navigation.querySelectorAll(".preview-tab-drop").forEach(el => el.classList.remove("preview-tab-drop"));
          });
          tabControl.addEventListener("dragover", event => {
            if (!previewTabDrag || previewTabDrag === tab) return;
            event.preventDefault();
            if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
            navigation.querySelectorAll(".preview-tab-drop").forEach(el => el.classList.remove("preview-tab-drop"));
            tabControl.classList.add("preview-tab-drop");
          });
          tabControl.addEventListener("dragleave", event => {
            if (!tabControl.contains(event.relatedTarget)) tabControl.classList.remove("preview-tab-drop");
          });
          tabControl.addEventListener("drop", event => {
            if (!previewTabDrag) return;
            event.preventDefault();
            const rect = tabControl.getBoundingClientRect();
            movePreviewTab(previewTabDrag, tab, event.clientX > rect.left + rect.width / 2);
            previewTabDrag = null;
          });
          tabControl.append(item);
          for (const [label, delta] of [["←", -1], ["→", 1]]) {
            const target = tabs[tabs.indexOf(tab) + delta];
            const move = button(label, "preview-tab-move", () => movePreviewTab(tab, target, delta > 0));
            move.disabled = !target;
            move.dataset.move = delta < 0 ? "before" : "after";
            move.title = t("Переместить вкладку") + ": " + tab + " " + label;
            move.setAttribute("aria-label", move.title);
            tabControl.append(move);
          }
          navigation.append(tabControl);
        }
        canvas.append(navigation);
      }
      function drawGroups(list, parent, parentLayout = null) {
        const grid = make("div", "preview-groups");
        const columns = appearanceBound(groupColumns.value, 1, 8, 4);
        grid.style.setProperty("--preview-group-columns", columns);
        if (parentLayout) {
          grid.classList.add("preview-subgroups");
          grid.style.gridTemplateColumns = `repeat(${appearanceRead(parentLayout, "style", "column") === "row" ? appearanceBound(appearanceRead(parentLayout, "columns", "3"), 1, 8, 3) : 1},minmax(0,1fr))`;
        }
        parent.append(grid);
        for (const group of visibleGroups(list)) {
          const layout = appearanceLayout(settings, group.path),
            row = appearanceRead(layout, "style", "column") === "row";
          const box = make("section", "preview-group");
          box.dataset.name = group.name;
          box.dataset.groupPath = JSON.stringify(group.path);
          const toolbar = make("div", "preview-group-toolbar");
          const handle = button("⠿ " + group.name, "preview-drag-handle", () => {});
          box.draggable = true;
          handle.draggable = true;
          handle.title = t("Перетащите группу; стрелки ← → меняют порядок");
          handle.setAttribute("aria-label", handle.title + ": " + group.name);
          box.addEventListener("dragstart", (event) => {
            event.stopPropagation();
            previewDrag = { group, list };
            if (event.dataTransfer) {
              event.dataTransfer.effectAllowed = "move";
              event.dataTransfer.setData("text/plain", JSON.stringify(group.path));
            }
            box.classList.add("preview-dragging");
          });
          box.addEventListener("dragend", () => {
            previewDrag = null;
            preview.querySelectorAll(".preview-drop-before, .preview-drop-after, .preview-dragging").forEach(el => el.classList.remove("preview-drop-before", "preview-drop-after", "preview-dragging"));
          });
          handle.addEventListener("keydown", event => {
            if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
            event.preventDefault();
            const delta = ["ArrowLeft", "ArrowUp"].includes(event.key) ? -1 : 1;
            const visible = visibleGroups(list);
            const target = visible[visible.indexOf(group) + delta];
            if (!target) return;
            movePreviewGroup(list, group, target, delta > 0);
            [...preview.querySelectorAll(".preview-group")].find(el => el.dataset.groupPath === JSON.stringify(group.path))?.querySelector(".preview-drag-handle").focus();
          });
          const dropAfter = event => {
            const rect = box.getBoundingClientRect();
            const source = [...preview.querySelectorAll(".preview-group")].find(item => item.dataset.groupPath === JSON.stringify(previewDrag?.group.path));
            const from = source?.getBoundingClientRect();
            const differentRow = from && Math.abs(from.top - rect.top) > Math.min(from.height, rect.height) / 2;
            return row || differentRow ? event.clientY > rect.top + rect.height / 2 : event.clientX > rect.left + rect.width / 2;
          };
          box.addEventListener("dragover", event => {
            if (!previewDrag || previewDrag.list !== list || previewDrag.group === group) return;
            event.stopPropagation();
            event.preventDefault();
            if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
            preview.querySelectorAll(".preview-drop-before, .preview-drop-after").forEach(item => item.classList.remove("preview-drop-before", "preview-drop-after"));
            const after = dropAfter(event);
            box.classList.toggle("preview-drop-before", !after);
            box.classList.toggle("preview-drop-after", after);
          });
          box.addEventListener("dragleave", event => {
            if (!box.contains(event.relatedTarget)) box.classList.remove("preview-drop-before", "preview-drop-after");
          });
          box.addEventListener("drop", event => {
            if (!previewDrag || previewDrag.list !== list) return;
            event.stopPropagation();
            event.preventDefault();
            movePreviewGroup(list, previewDrag.group, group, dropAfter(event));
            previewDrag = null;
          });
          toolbar.append(handle);
          for (const [title, delta] of [["↑", -1], ["↓", 1]]) {
            const visible = visibleGroups(list);
            const target = visible[visible.indexOf(group) + delta];
            const move = button(title, "preview-group-move", event => {
              event.preventDefault(); event.stopPropagation();
              movePreviewGroup(list, group, target, delta > 0);
            });
            move.disabled = !target;
            move.dataset.move = delta < 0 ? "before" : "after";
            move.title = t("Группа ") + group.name + ": " + (delta < 0 ? t("выше") : t("ниже"));
            move.setAttribute("aria-label", move.title);
            toolbar.append(move);
          }
          box.append(toolbar);
          box.classList.toggle("preview-group-wide", row);
          if (!row && Object.hasOwn(noStretch, stretchKey(group))) box.style.flexGrow = "0";
          box.style.gridColumn = row ? "1 / -1" : "auto";
          if (appearanceRead(layout, "header", "true") !== "false")
            box.append(make("h4", "", group.name));
          const cards = make("div", "preview-cards");
          cards.style.gridTemplateColumns = `repeat(${row ? appearanceBound(appearanceRead(layout, "columns", "3"), 1, 8, 3) : 1},minmax(0,1fr))`;
          box.append(cards);
          grid.append(box);
          if (
            appearanceRead(layout, "initiallyCollapsed", appearanceRead(settings, "groupsInitiallyCollapsed", "false")) === "true"
          ) {
            box.append(make("p", "preview-empty", t("Группа свёрнута")));
            continue;
          }
          for (const service of group.cards) {
            const card = make("article", "preview-service");
            const name = make("div", "preview-service-heading");
            name.append(
              make(
                "span",
                "preview-icon",
                service.name.slice(0, 2).toUpperCase(),
              ),
              make("strong", "", service.name),
            );
            card.append(name);
            const description = appearanceRead(
              service.config,
              "description",
              "",
            );
            if (description) card.append(make("p", "", description));
            const widget = mapValue(service.config, "widget"),
              multiple = mapValue(service.config, "widgets");
            for (const item of widget ? [widget] : multiple?.Content || []) {
              const type = appearanceRead(item, "type", "");
              card.append(
                make("div", "preview-widget", t("Интеграция: ") + type),
              );
            }
            if (
              mapValue(service.config, "siteMonitor") ||
              mapValue(service.config, "ping") ||
              mapValue(service.config, "container")
            )
              card.append(
                make("small", "preview-status", t("Мониторинг подключён")),
              );
            cards.append(card);
          }
          if (!group.cards.length && !group.children.length)
            cards.append(make("p", "preview-empty", t("Пустая группа")));
          if (group.children.length) drawGroups(group.children, box, layout || node({}));
        }
      }
      drawGroups(groups, canvas);
      if (!shown.length)
        canvas.append(
          make("p", "preview-empty", t("Здесь появятся ваши группы и сервисы")),
        );
    }
    renderGroups();
    draw();
    if (Array.isArray(focusGroup)) {
      const target = [...groupRows.querySelectorAll(".appearance-group-control")]
        .find(el => el.dataset.groupPath === focusGroup.join(" / "));
      if (target) {
        target.open = true;
        target.scrollIntoView?.({ block: "center" });
        const toggle = target.querySelector(".appearance-group-stretch");
        if (toggle?.disabled) {
          error.textContent = toggle.title;
          error.classList.remove("hidden");
        } else toggle?.focus({ preventScroll: true });
      }
    }
    $("dialog-actions").append(
      button(t("Отмена"), "secondary", () => $("dialog").close()),
      button(t("Применить к черновику"), "primary", () =>
        report(() => {
          if (!groupColumns.checkValidity() || !groupColumns.value)
            throw Error(t("Число вертикальных групп должно быть от 1 до 8."));
          if (effect.value === "cards") {
            const background = mapValue(settings, "background");
            for (const key of ["blur", "brightness", "saturate"])
              appearanceRemove(background, key);
          } else appearanceRemove(settings, "cardBlur");
          const cssRaw = groupStretchCSS(appearanceCSS(css.raw, style, customEnabled), noStretch);
          if (cssRaw !== css.raw || pendingAppearanceCSS)
            pendingAppearanceCSS = {
              raw: cssRaw,
              revision: css.revision,
              original: css.original ?? css.raw,
            };
          current.tree = working;
          current.error = "";
          mode = "visual";
          mark();
          renderMode();
          $("dialog").close();
          toast(
            t(
              "Оформление добавлено в черновик. Нажмите «Сохранить изменения».",
            ),
          );
        }),
      ),
    );
  });
}

$("appearance-open").addEventListener("click", openAppearance);
