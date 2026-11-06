"use strict";

const panelPreferencesKey = "home-pager.panel-preferences.v1";
const panelDefaults = {
  language: "ru",
  theme: "system",
  density: "comfortable",
  services: "collapsed",
  bookmarks: "collapsed",
  showHints: true,
  showCounts: false,
  showTechnicalNames: false,
  showRoles: false,
  expandSearch: false,
  rememberSection: false,
};
function normalizePanelPreferences(input) {
  const settings = { ...panelDefaults };
  if (!input || typeof input !== "object") return settings;
  for (const key of Object.keys(settings)) {
    if (typeof settings[key] === "boolean") {
      if (typeof input[key] === "boolean") settings[key] = input[key];
    } else {
      const allowed =
        key === "language"
          ? ["ru", "en"]
          : key === "theme"
            ? ["system", "light", "dark"]
            : key === "density"
              ? ["comfortable", "compact"]
              : ["collapsed", "groups", "all"];
      if (allowed.includes(input[key])) settings[key] = input[key];
    }
  }
  return settings;
}
function readPanelPreferences() {
  try {
    return normalizePanelPreferences(
      JSON.parse(localStorage.getItem(panelPreferencesKey)),
    );
  } catch {
    return { ...panelDefaults };
  }
}
let panelPreferences = readPanelPreferences();
const panelThemeMedia =
  typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-color-scheme: dark)")
    : null;
function applyPanelPreferences(settings = panelPreferences) {
  const root = document.documentElement;
  const theme =
    settings.theme === "system"
      ? panelThemeMedia?.matches
        ? "dark"
        : "light"
      : settings.theme;
  root.dataset.panelTheme = theme;
  root.style.colorScheme = theme;
  root.dataset.panelDensity = settings.density;
  for (const key of [
    "showHints",
    "showCounts",
    "showTechnicalNames",
    "showRoles",
  ])
    root.dataset["panel" + key[0].toUpperCase() + key.slice(1)] = String(
      settings[key],
    );
  const scheme = document.querySelector('meta[name="color-scheme"]');
  if (scheme) scheme.content = theme;
}
applyPanelPreferences();
panelThemeMedia?.addEventListener?.("change", () => {
  if (panelPreferences.theme === "system") applyPanelPreferences();
});
window.addEventListener("storage", (event) => {
  if (event.key === panelPreferencesKey) {
    panelPreferences = readPanelPreferences();
    applyPanelPreferences();
  }
});
function panelDefaultOpen(file, depth) {
  const setting =
    file === "services.yaml"
      ? panelPreferences.services
      : file === "bookmarks.yaml"
        ? panelPreferences.bookmarks
        : null;
  return setting === "collapsed"
    ? false
    : setting === "groups"
      ? depth === 0
      : setting === "all"
        ? true
        : depth < 2;
}
function rememberPanelSection(name) {
  if (panelPreferences.rememberSection) {
    try {
      localStorage.setItem("home-pager.last-section", name);
    } catch {}
  }
}
function preferredPanelSection(names) {
  if (panelPreferences.rememberSection) {
    try {
      const name = localStorage.getItem("home-pager.last-section");
      if (names.includes(name)) return name;
    } catch {}
  }
  return "settings.yaml";
}

function openPanelSettings() {
  if (busy) return;
  const draft = { ...panelPreferences };
  let committed = false;
  openDialog(
    t("Настройки панели"),
    t(
      "Тема и отображение Home Pager. Настройки сохраняются в этом браузере; конфигурация и оформление самого Homepage не меняются.",
    ),
  );
  const body = $("dialog-body");
  body.append(
    button(
      t("Конфигурация сервера: пути, подключение и пароль →"),
      "secondary",
      () => {
        $("dialog").close();
        openServerSettings();
      },
    ),
  );
  const add = (title, input, help) => field(title, input, help);
  function choice(key, title, options, help) {
    const input = add(title, select(options), help);
    input.id = "panel-preference-" + key;
    input.value = draft[key];
    input.addEventListener("change", () => {
      draft[key] = input.value;
      applyPanelPreferences(draft);
    });
    return input;
  }
  choice(
    "language",
    t("Язык панели"),
    [
      ["ru", "Русский"],
      ["en", "English"],
    ],
    t("Язык изменится после сохранения настроек и перезагрузки страницы."),
  );
  choice("theme", t("Тема панели"), [
    ["system", t("Как в системе")],
    ["light", t("Светлая")],
    ["dark", t("Тёмная")],
  ]);
  choice("density", t("Плотность интерфейса"), [
    ["comfortable", t("Обычная")],
    ["compact", t("Компактная")],
  ]);
  const expansion = [
    ["collapsed", t("Только названия — всё свёрнуто")],
    ["groups", t("Открыть группы, карточки оставить свёрнутыми")],
    ["all", t("Раскрывать все уровни")],
  ];
  choice("services", t("При открытии сервисов"), expansion);
  choice("bookmarks", t("При открытии закладок"), expansion);
  for (const [key, title] of [
    ["showHints", t("Подсказки под названиями полей")],
    ["showCounts", t("Количество полей и элементов в заголовках")],
    ["showTechnicalNames", t("Технические имена параметров в заголовках")],
    ["showRoles", t("Подписи «Группа», «Сервис», «Виджет»")],
    ["expandSearch", t("Автоматически раскрывать результаты поиска")],
    ["rememberSection", t("При запуске открывать последний раздел")],
  ]) {
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = draft[key];
    input.id = "panel-preference-" + key;
    input.className = "panel-preference-switch";
    add(title, input);
    input.addEventListener("change", () => {
      draft[key] = input.checked;
      applyPanelPreferences(draft);
    });
  }
  body.append(
    make(
      "p",
      "hint",
      t(
        "Ручное раскрытие сохраняется во время редактирования. После перехода в раздел или перезагрузки используется выбранное начальное состояние.",
      ),
    ),
  );
  $("dialog").addEventListener(
    "close",
    () => {
      if (!committed) applyPanelPreferences();
    },
    { once: true },
  );
  $("dialog-actions").append(
    button(t("По умолчанию"), "secondary", () => {
      Object.assign(draft, panelDefaults);
      for (const [key, value] of Object.entries(draft)) {
        const input = $("panel-preference-" + key);
        if (input.type === "checkbox") input.checked = value;
        else input.value = value;
      }
      applyPanelPreferences(draft);
    }),
    button(t("Отмена"), "secondary", () => $("dialog").close()),
    button(t("Сохранить настройки"), "primary", () => {
      const languageChanged = draft.language !== panelLanguage;
      if (languageChanged && dirty) {
        let message = document.getElementById("panel-language-error");
        if (!message) {
          message = make(
            "p",
            "error",
            t(
              "Сначала сохраните или отмените изменения Homepage, затем смените язык панели.",
            ),
          );
          message.id = "panel-language-error";
          message.setAttribute("role", "alert");
          body.append(message);
        }
        return;
      }
      try {
        localStorage.setItem(panelPreferencesKey, JSON.stringify(draft));
      } catch {
        const message = make(
          "p",
          "error",
          t(
            "Браузер не разрешает сохранить настройки. Разрешите локальное хранилище и повторите.",
          ),
        );
        message.setAttribute("role", "alert");
        body.append(message);
        return;
      }
      const resetExpansion =
        current?.name === "services.yaml"
          ? draft.services !== panelPreferences.services
          : current?.name === "bookmarks.yaml"
            ? draft.bookmarks !== panelPreferences.bookmarks
            : false;
      panelPreferences = normalizePanelPreferences(draft);
      committed = true;
      applyPanelPreferences();
      if (current) {
        rememberPanelSection(current.name);
        if (mode === "visual" && resetExpansion) {
          blockOpenStates = new WeakMap();
          renderTree(true);
        }
      }
      $("dialog").close();
      if (languageChanged) {
        reloadPanelLanguage();
        return;
      }
      toast(t("Настройки панели сохранены."));
    }),
  );
}
function bindPanelSettings() {
  document
    .getElementById("panel-settings-open")
    ?.addEventListener("click", openPanelSettings);
}
if (document.readyState === "loading")
  document.addEventListener("DOMContentLoaded", bindPanelSettings, {
    once: true,
  });
else bindPanelSettings();
