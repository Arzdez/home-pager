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

async function openAppearance() {
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
    function renderGroups() {
      groupRows.replaceChildren();
      function rows(list, depth = 0) {
        list.forEach((group, index) => {
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
              report(() => {
                [list[index], list[index + delta]] = [
                  list[index + delta],
                  list[index],
                ];
                const layout = appearanceLayout(
                    settings,
                    group.path.slice(0, -1),
                    true,
                  ),
                  entries = [];
                for (const sibling of list) {
                  let value = mapValue(layout, sibling.name);
                  if (!value) {
                    appearanceSet(layout, sibling.name, {});
                    value = mapValue(layout, sibling.name);
                  }
                  const i = layout.Content.findIndex(
                    (n, j) => j % 2 === 0 && n.Value === sibling.name,
                  );
                  entries.push(layout.Content[i], value);
                }
                for (let i = 0; i < layout.Content.length; i += 2)
                  if (!list.some((g) => g.name === layout.Content[i].Value))
                    entries.push(layout.Content[i], layout.Content[i + 1]);
                layout.Content = entries;
                renderGroups();
                draw();
              });
            });
            move.disabled = index + delta < 0 || index + delta >= list.length;
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
            appearanceRead(layout, "initiallyCollapsed", "false") === "true";
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
      const tabs = [
        ...new Set(
          groups
            .map((g) =>
              appearanceRead(appearanceLayout(settings, g.path), "tab", ""),
            )
            .filter(Boolean),
        ),
      ];
      if (tabs.length)
        canvas.append(make("div", "preview-tabs", tabs.join("  ·  ")));
      function drawGroups(list, parent) {
        const grid = make("div", "preview-groups");
        grid.style.gridTemplateColumns = `repeat(${appearanceBound(groupColumns.value, 1, 8, 4)},minmax(0,1fr))`;
        parent.append(grid);
        for (const group of list) {
          const layout = appearanceLayout(settings, group.path),
            row = appearanceRead(layout, "style", "column") === "row";
          const box = make("section", "preview-group");
          box.dataset.name = group.name;
          box.style.gridColumn = row ? "1 / -1" : "auto";
          if (appearanceRead(layout, "header", "true") !== "false")
            box.append(make("h4", "", group.name));
          const cards = make("div", "preview-cards");
          cards.style.gridTemplateColumns = `repeat(${row ? appearanceBound(appearanceRead(layout, "columns", "3"), 1, 8, 3) : 1},minmax(0,1fr))`;
          box.append(cards);
          grid.append(box);
          if (
            appearanceRead(layout, "initiallyCollapsed", "false") === "true"
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
          if (group.children.length) drawGroups(group.children, box);
        }
      }
      drawGroups(groups, canvas);
      if (!groups.length)
        canvas.append(
          make("p", "preview-empty", t("Здесь появятся ваши группы и сервисы")),
        );
    }
    renderGroups();
    draw();
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
          const cssRaw = appearanceCSS(css.raw, style, customEnabled);
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
