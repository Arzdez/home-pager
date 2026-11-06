"use strict";
const $ = (id) => document.getElementById(id);
const meta = {
  "settings.yaml": [
    "Настройки",
    "Настройте внешний вид и поведение главной страницы.",
    "⚙",
    "settings",
  ],
  "services.yaml": [
    "Сервисы",
    "Приложения, группы и виджеты ваших сервисов в одном месте.",
    "▦",
    "services",
  ],
  "bookmarks.yaml": [
    "Закладки",
    "Соберите полезные ссылки и распределите их по группам.",
    "⌑",
    "bookmarks",
  ],
  "widgets.yaml": [
    "Инфовиджеты",
    "Поиск, часы, погода и информация о вашей системе.",
    "◫",
    "info-widgets",
  ],
  "docker.yaml": [
    "Docker",
    "Подключения для обнаружения контейнеров и их статуса.",
    "◇",
    "docker",
  ],
  "kubernetes.yaml": [
    "Kubernetes",
    "Обнаружение сервисов и настройки подключения к кластеру.",
    "⎈",
    "kubernetes",
  ],
  "proxmox.yaml": [
    "Proxmox",
    "Подключения к узлам виртуализации Proxmox.",
    "▱",
    "proxmox",
  ],
  "custom.css": [
    "Стили CSS",
    "Добавьте собственные стили для вашего Homepage.",
    "{ }",
    "custom-css-js",
  ],
  "custom.js": [
    "Скрипты JS",
    "Собственный JavaScript, который выполняется в Homepage.",
    "</>",
    "custom-css-js",
  ],
};
const labels = {
  title: ["Название страницы", "Отображается во вкладке браузера"],
  description: ["Описание", "Описание вашей главной страницы"],
  theme: ["Тема оформления", "Светлый или тёмный интерфейс Homepage"],
  color: ["Цветовая палитра", "Основной цвет элементов интерфейса"],
  language: ["Язык интерфейса", "Например: ru, en, de"],
  headerStyle: ["Стиль заголовка", "Оформление заголовков групп"],
  layout: ["Расположение групп", "Столбцы, вкладки, иконки и порядок групп"],
  background: ["Фон страницы", "URL изображения или объект с фильтрами"],
  cardBlur: ["Размытие карточек", "xs, sm, md, lg, xl…"],
  cardStyle: ["Обводка карточек", "Тень или тонкая рамка"],
  blockStyle: [
    "Оформление показателей",
    "Стиль чисел и подписей внутри виджетов",
  ],
  font: ["Шрифт страницы", "Основной шрифт или моноширинное оформление"],
  header: ["Название группы", "Показывать заголовок этой группы"],
  initiallyCollapsed: [
    "Сворачивать при открытии",
    "Начальное состояние группы на странице",
  ],
  tab: ["Вкладка", "На какой вкладке показывать группу"],
  favicon: ["Иконка страницы", "URL или путь к favicon"],
  target: ["Открывать ссылки", "Где открывать страницу при нажатии на ссылку"],
  startUrl: ["Стартовый адрес", "Стартовый URL для PWA"],
  base: ["Базовый URL", "Базовый URL вашего Homepage"],
  fullWidth: ["На всю ширину", "Использовать доступную ширину страницы"],
  maxGroupColumns: ["Максимум колонок", "Число колонок для групп"],
  useEqualHeights: [
    "Одинаковая высота карточек",
    "Выравнивать высоту карточек сервисов",
  ],
  hideVersion: ["Скрыть версию", "Не показывать версию Homepage"],
  disableUpdateCheck: [
    "Отключить проверку обновлений",
    "Не проверять доступность новых версий",
  ],
  showStats: ["Статистика контейнеров", "Показывать статистику Docker"],
  statusStyle: ["Стиль статуса", "Как показывать доступность сервиса"],
  hideErrors: [
    "Скрыть ошибки виджетов",
    "Скрывать сообщения об ошибках в виджетах",
  ],
  disableIndexing: [
    "Запретить индексацию",
    "Попросить поисковые системы не индексировать страницу",
  ],
  instanceName: ["Имя экземпляра", "Различать несколько экземпляров Homepage"],
  quicklaunch: ["Быстрый поиск", "Настройки быстрого запуска"],
  providers: ["Провайдеры", "Общие ключи API для виджетов"],
  logpath: ["Каталог логов", "Путь логов в процессе Homepage"],
  href: ["Адрес ссылки", "URL приложения или закладки"],
  icon: ["Иконка", "Например: jellyfin.png или mdi-server"],
  widget: ["Виджет сервиса", "Тип, адрес, ключ API и параметры интеграции"],
  widgets: ["Виджеты сервиса", "Несколько виджетов в одной карточке"],
  server: ["Сервер", "Имя подключения из docker.yaml"],
  container: ["Контейнер", "Имя Docker-контейнера"],
  ping: ["Проверка доступности", "Адрес для проверки доступности"],
  siteMonitor: ["HTTP-мониторинг", "URL для проверки статуса"],
  type: ["Тип виджета", "Идентификатор интеграции Homepage"],
  url: ["Адрес подключения", "URL вашего сервиса"],
  key: ["Ключ API", "Поддерживаются {{HOMEPAGE_VAR_…}}"],
  username: [
    "Пользователь / ID токена",
    "Учётная запись или идентификатор API-токена сервиса",
  ],
  password: ["Пароль / секрет токена", "Секрет для подключения к сервису"],
  node: ["Узел", "Имя узла, например pve-1"],
  version: ["Версия API", "Версия API, поддерживаемая вашим сервисом"],
  enableBlocks: ["Блоки статистики", "Показывать блоки статистики виджета"],
  enableNowPlaying: [
    "Сейчас воспроизводится",
    "Показывать текущие медиасеансы",
  ],
  socket: ["Docker socket", "Путь сокета внутри контейнера Homepage"],
  fields: [
    "Показываемые показатели",
    "Список показателей виджета и порядок их отображения",
  ],
  headers: [
    "Заголовки API",
    "Дополнительные HTTP-заголовки для запросов к сервису",
  ],
  host: ["Хост", "Адрес сервера"],
  port: ["Порт", "Порт подключения"],
  mode: ["Режим подключения", "default или disabled"],
  abbr: ["Сокращение", "Короткая подпись вместо иконки"],
  style: ["Расположение", "row или column"],
  columns: ["Колонки", "Количество колонок группы"],
  image: ["Изображение", "Адрес или локальный путь к изображению"],
  blur: ["Размытие фона", "Степень размытия фонового изображения"],
  brightness: ["Яркость фона", "100 — исходная яркость; меньше — темнее"],
  saturate: ["Насыщенность фона", "100 — исходная насыщенность цветов"],
  opacity: ["Непрозрачность фона", "От 0 — прозрачный до 100 — непрозрачный"],
};
const settingDefaults = {
  title: "Мой Homepage",
  description: "Домашняя инфраструктура",
  theme: "dark",
  color: "slate",
  language: "ru",
  headerStyle: "clean",
  background: {
    image: "/images/background.jpg",
    blur: "sm",
    saturate: 100,
    brightness: 60,
    opacity: 50,
  },
  cardBlur: "sm",
  favicon: "/favicon.ico",
  target: "_blank",
  startUrl: "/",
  base: "https://homepage.example.com",
  fullWidth: true,
  maxGroupColumns: 4,
  useEqualHeights: true,
  hideVersion: false,
  disableUpdateCheck: false,
  showStats: false,
  statusStyle: "dot",
  hideErrors: false,
  disableIndexing: true,
  instanceName: "home",
  layout: { Инфраструктура: { style: "row", columns: 3 } },
  quicklaunch: {
    searchDescriptions: true,
    hideInternetSearch: false,
    showSearchSuggestions: true,
    hideVisitURL: false,
  },
  providers: { openweathermap: "{{HOMEPAGE_VAR_WEATHER_KEY}}" },
  logpath: "/app/config/logs",
};
const presets = {
  "settings.yaml": [
    [
      "Базовое оформление",
      "Тема, палитра, язык и заголовок",
      {
        title: "Мой Homepage",
        theme: "dark",
        color: "slate",
        language: "ru",
        headerStyle: "clean",
        hideVersion: false,
      },
    ],
    [
      "Макет групп",
      "Группы в три колонки",
      {
        layout: { Инфраструктура: { style: "row", columns: 3 } },
        useEqualHeights: true,
      },
    ],
  ],
  "services.yaml": [
    [
      "Группа сервисов",
      "Группа с примером приложения",
      {
        Инфраструктура: [
          {
            "Мой сервис": {
              icon: "mdi-server",
              href: "https://service.example.com",
              description: "Панель управления",
            },
          },
        ],
      },
    ],
    [
      "Jellyfin",
      "Медиасервер с виджетом",
      {
        Медиа: [
          {
            Jellyfin: {
              icon: "jellyfin.png",
              href: "http://jellyfin:8096",
              widget: {
                type: "jellyfin",
                url: "http://jellyfin:8096",
                key: "{{HOMEPAGE_VAR_JELLYFIN_KEY}}",
                enableBlocks: true,
                enableNowPlaying: true,
              },
            },
          },
        ],
      },
    ],
    [
      "Docker-сервис",
      "Карточка со статусом контейнера",
      {
        Инфраструктура: [
          {
            Portainer: {
              icon: "portainer.png",
              href: "https://portainer.example.com",
              server: "my-docker",
              container: "portainer",
            },
          },
        ],
      },
    ],
  ],
  "bookmarks.yaml": [
    [
      "Группа закладок",
      "Ссылки с иконками и сокращениями",
      {
        Полезное: [
          {
            Homepage: [
              {
                abbr: "HP",
                href: "https://gethomepage.dev",
                icon: "homepage.png",
              },
            ],
          },
        ],
      },
    ],
  ],
  "widgets.yaml": [
    [
      "Поиск",
      "Поиск через DuckDuckGo",
      { search: { provider: "duckduckgo", target: "_blank" } },
    ],
    [
      "Дата и время",
      "Часы в формате 24 часа",
      {
        datetime: {
          text_size: "xl",
          format: { dateStyle: "long", timeStyle: "short", hour12: false },
        },
      },
    ],
    [
      "Ресурсы",
      "CPU, память и диск процесса Homepage",
      { resources: { cpu: true, memory: true, disk: "/" } },
    ],
    [
      "Приветствие",
      "Текст в верхней части страницы",
      { greeting: { text_size: "xl", text: "Добро пожаловать домой" } },
    ],
    [
      "Open-Meteo",
      "Погода без ключа API",
      {
        openmeteo: {
          label: "Саратов",
          latitude: 51.5336,
          longitude: 46.0342,
          timezone: "Europe/Saratov",
          units: "metric",
          cache: 5,
        },
      },
    ],
  ],
  "docker.yaml": [
    [
      "Socket",
      "Локальный Docker socket",
      { "my-docker": { socket: "/var/run/docker.sock" } },
    ],
    [
      "Socket proxy",
      "Подключение к Docker socket proxy",
      { "my-docker": { host: "dockerproxy", port: 2375 } },
    ],
  ],
  "kubernetes.yaml": [
    [
      "Обнаружение сервисов",
      "Использовать конфигурацию кластера",
      { mode: "default" },
    ],
    ["Отключить", "Отключить интеграцию с кластером", { mode: "disabled" }],
  ],
  "proxmox.yaml": [
    [
      "Узел Proxmox",
      "URL и API-токен",
      {
        pve: {
          url: "https://proxmox.example.com:8006",
          token: "homepage@pve!homepage",
          secret: "{{HOMEPAGE_VAR_PROXMOX_SECRET}}",
        },
      },
    ],
  ],
};
let pendingAppearanceCSS = null;
let current,
  original = "",
  mode = "visual",
  dirty = false,
  busy = false,
  names = [],
  toastTimer,
  catalog = {};
const make = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};
const button = (text, cls, action) => {
  const e = make("button", cls, text);
  e.type = "button";
  e.addEventListener("click", action);
  return e;
};
const scalar = (v) => ({
  Kind: 8,
  Tag:
    v === null
      ? "!!null"
      : typeof v === "boolean"
        ? "!!bool"
        : typeof v === "number"
          ? Number.isInteger(v)
            ? "!!int"
            : "!!float"
          : "!!str",
  Value: v === null ? "null" : String(v),
  Content: [],
});
function node(v) {
  if (Array.isArray(v)) return { Kind: 2, Tag: "!!seq", Content: v.map(node) };
  if (v !== null && typeof v === "object")
    return {
      Kind: 4,
      Tag: "!!map",
      Content: Object.entries(v).flatMap(([k, v]) => [scalar(k), node(v)]),
    };
  return scalar(v);
}
const root = () => current?.tree?.Content?.[0];
const isCode = () => current && /\.(css|js)$/.test(current.name);
const info = (n) =>
  meta[n] || [n, "Дополнительный файл конфигурации Homepage.", "≡", ""];
function showError(message) {
  $("error").textContent = message || "";
  $("error").classList.toggle("hidden", !message);
}
function toast(message) {
  clearTimeout(toastTimer);
  $("toast").textContent = message;
  $("toast").classList.remove("hidden");
  toastTimer = setTimeout(() => $("toast").classList.add("hidden"), 4500);
}
async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      ...(options.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      "X-Home-Pager": "1",
      ...options.headers,
    },
  });
  const type = response.headers.get("content-type") || "";
  if (!type.includes("application/json"))
    throw Error(
      response.status === 401
        ? "Необходима авторизация. Обновите страницу."
        : "Сервер вернул неожиданный ответ (" + response.status + ")",
    );
  const data = await response.json();
  if (!response.ok) throw Error(data.error || "Ошибка запроса");
  return data;
}
async function run(fn) {
  if (busy) return;
  busy = true;
  document.querySelector("main").classList.add("busy");
  try {
    await fn();
  } catch (e) {
    showError(e.message);
    toast(e.message);
  } finally {
    busy = false;
    document.querySelector("main").classList.remove("busy");
    updateState();
  }
}
function mark() {
  dirty = true;
  showError("");
  updateState();
}
function updateState() {
  document.querySelector(".savebar strong").textContent = pendingAppearanceCSS
    ? "Будут сохранены settings.yaml и custom.css"
    : "Сохраняется только текущий файл";
  $("dirty-label").textContent = dirty
    ? "Есть несохранённые изменения"
    : "Нет несохранённых изменений";
  $("dirty-dot").style.background = dirty ? "#d7a446" : "#43ad8b";
  $("save").disabled = busy || !dirty;
  $("review").disabled = busy || !dirty;
  $("reload").disabled = busy || !current;
}
function navigation() {
  const nav = $("navigation");
  nav.replaceChildren();
  for (const name of names) {
    const m = info(name),
      b = button("", "", () => load(name));
    b.classList.toggle("active", current?.name === name);
    b.append(make("span", "nav-icon", m[2]), make("span", "", m[0]));
    if (current?.name === name) b.append(make("span", "nav-arrow", "›"));
    nav.append(b);
  }
}
async function load(name, force = false) {
  if (
    !force &&
    dirty &&
    !confirm(
      "Есть несохранённые изменения. Перейти к другому файлу и потерять их?",
    )
  )
    return;
  await run(async () => {
    const d = await api("/api/file?name=" + encodeURIComponent(name));
    install(d);
    $("sidebar").classList.remove("open");
  });
}
function install(d) {
  pendingAppearanceCSS = null;
  current = d;
  rememberPanelSection(d.name);
  original = d.raw;
  dirty = false;
  mode = d.error || isCode() ? "raw" : "visual";
  $("search").value = "";
  renderPage();
  showError(d.error);
}
function renderPage() {
  const m = info(current.name);
  $("title").textContent = m[0];
  $("crumb").textContent = m[0];
  $("description").textContent = m[1];
  $("filename").textContent = current.name;
  $("docs").href =
    "https://gethomepage.dev/configs/" + (m[3] ? m[3] + "/" : "");
  $("raw-tab").textContent = isCode() ? "</> Код" : "</> YAML";
  $("raw-label").textContent = isCode()
    ? (current.name.endsWith("css") ? "CSS" : "JavaScript") + " · UTF-8"
    : "YAML · UTF-8";
  $("file-status").textContent = current.error
    ? "Ошибка YAML"
    : current.exists
      ? "Файл подключён"
      : "Новая конфигурация";
  $("file-detail").textContent = current.error
    ? "Исправьте исходный код"
    : current.exists
      ? "Готов к редактированию"
      : "Будет создан при сохранении";
  $("visual-tab").disabled = isCode();
  $("appearance-open").classList.toggle(
    "hidden",
    current.name !== "settings.yaml",
  );
  $("add-root").textContent =
    current.name === "services.yaml"
      ? "＋ Добавить группу"
      : current.name === "widgets.yaml"
        ? "＋ Добавить виджет"
        : current.name === "settings.yaml"
          ? "＋ Добавить настройку"
          : "＋ Добавить параметр";
  $("icon-import").classList.toggle(
    "hidden",
    !["services.yaml", "bookmarks.yaml"].includes(current.name),
  );
  $("background-import").classList.toggle(
    "hidden",
    current.name !== "settings.yaml",
  );
  $("library").classList.toggle("hidden", !libraryEntries().length);
  navigation();
  renderMode();
  updateState();
}
function renderMode() {
  const visual = mode === "visual";
  $("visual-tab").classList.toggle("active", visual);
  $("visual-tab").setAttribute("aria-selected", String(visual));
  $("raw-tab").classList.toggle("active", !visual);
  $("raw-tab").setAttribute("aria-selected", String(!visual));
  $("editor").classList.toggle("hidden", !visual);
  $("raw-pane").classList.toggle("hidden", visual);
  document
    .querySelector(".editor-subbar")
    .classList.toggle(
      "hidden",
      !visual &&
        !["settings.yaml", "services.yaml", "bookmarks.yaml"].includes(
          current.name,
        ),
    );
  document.querySelector(".search-wrap").classList.toggle("hidden", !visual);
  $("add-root").classList.toggle("hidden", !visual);
  $("library").classList.toggle("hidden", !visual || !libraryEntries().length);
  if (visual) renderTree();
  else $("raw").value = current.raw;
}
async function switchMode(next) {
  if (!current || mode === next || (next === "visual" && isCode())) return;
  await run(async () => {
    validateVisualFields();
    const d = await api("/api/convert", {
      method: "POST",
      body: JSON.stringify({
        name: current.name,
        ...(mode === "visual"
          ? { tree: current.tree }
          : { raw: $("raw").value }),
      }),
    });
    current.raw = d.raw;
    current.tree = d.tree;
    current.error = "";
    showError("");
    mode = next;
    renderMode();
  });
}
let draggedBlock = null;
let movableGroups = [];
const blockRecords = new WeakMap();
let blockOpenStates = new WeakMap();

function containsNode(node, target) {
  return (
    node === target ||
    (node.Content || []).some((child) => containsNode(child, target))
  );
}
function prepareMovableGroups() {
  movableGroups = [];
  if (!["services.yaml", "bookmarks.yaml"].includes(current.name)) return;
  function groups(list, prefix = "") {
    for (const entry of list.Content || []) {
      if (entry.Kind !== 4) continue;
      const content = entry.Content || [];
      for (let i = 0; i < content.length; i += 2) {
        const value = content[i + 1];
        if (value?.Kind !== 2) continue;
        const name = prefix + content[i].Value;
        movableGroups.push({ parent: value, name });
        if (current.name === "services.yaml") groups(value, name + " / ");
      }
    }
  }
  groups(root());
}
function canMoveBlock(source, targetParent) {
  if (containsNode(source.value, targetParent)) return false;
  if (source.parent === targetParent) return true;
  return (
    source.parent.Kind === 2 &&
    targetParent.Kind === 2 &&
    movableGroups.some((g) => g.parent === source.parent) &&
    movableGroups.some((g) => g.parent === targetParent)
  );
}
function moveBlock(source, targetParent, targetIndex) {
  if (!canMoveBlock(source, targetParent)) return false;
  const size = source.parent.Kind === 4 ? 2 : 1;
  if (
    source.parent === targetParent &&
    (targetIndex === source.index || targetIndex === source.index + size)
  )
    return false;
  const chunk = source.parent.Content.splice(source.index, size);
  if (source.parent === targetParent && targetIndex > source.index)
    targetIndex -= size;
  targetParent.Content.splice(targetIndex, 0, ...chunk);
  mark();
  renderTree();
  toast("Блок перемещён. Сохраните изменения, чтобы применить порядок.");
  return true;
}
function clearBlockDrag() {
  draggedBlock = null;
  $("editor").classList.remove("is-dragging");
  document
    .querySelectorAll(".block-dragging,.drop-before,.drop-after,.drop-active")
    .forEach((el) =>
      el.classList.remove(
        "block-dragging",
        "drop-before",
        "drop-after",
        "drop-active",
      ),
    );
}
function blockMoveDialog(source) {
  openDialog(
    "Переместить блок",
    "Выберите группу для «" +
      source.name +
      "». Блок будет добавлен в конец выбранной группы.",
  );
  const groups = movableGroups.filter(
    (g) => g.parent !== source.parent && canMoveBlock(source, g.parent),
  );
  const destination = field(
    "Группа",
    select(groups.map((g, i) => [String(i), g.name])),
  );
  $("dialog-actions").append(
    button("Отмена", "secondary", () => $("dialog").close()),
    button("Переместить", "primary", () => {
      const target = groups[Number(destination.value)]?.parent;
      if (!target) return;
      $("dialog").close();
      moveBlock(source, target, target.Content.length);
    }),
  );
}
function attachBlockMovement(element, header, actions, source) {
  blockRecords.set(element, source);
  element.dataset.movable = "true";
  element.dataset.blockName = source.name;
  const handle = button("⠿", "block-drag-handle", (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
  });
  handle.draggable = true;
  handle.title = "Перетащить блок «" + source.name + "»";
  handle.setAttribute("aria-label", handle.title);
  handle.addEventListener("dragstart", (ev) => {
    if (busy) {
      ev.preventDefault();
      return;
    }
    ev.stopPropagation();
    draggedBlock = source;
    ev.dataTransfer.effectAllowed = "move";
    ev.dataTransfer.setData("text/plain", source.name);
    element.classList.add("block-dragging");
    $("editor").classList.add("is-dragging");
  });
  handle.addEventListener("dragend", clearBlockDrag);
  header.prepend(handle);
  const size = source.parent.Kind === 4 ? 2 : 1;
  for (const [label, delta, word] of [
    ["↑", -size, "выше"],
    ["↓", size, "ниже"],
  ]) {
    const b = button(label, "block-move-button", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      const target = delta < 0 ? source.index - size : source.index + 2 * size;
      const moved = moveBlock(source, source.parent, target);
      if (moved) {
        const row = [...document.querySelectorAll("[data-movable]")].find(
          (el) => blockRecords.get(el)?.value === source.value,
        );
        [...(row?.querySelectorAll(".block-move-button") || [])]
          .find(
            (b) =>
              b.getAttribute("aria-label") ===
              "Переместить «" + source.name + "» " + word,
          )
          ?.focus();
      }
    });
    b.disabled =
      delta < 0
        ? source.index === 0
        : source.index + size >= source.parent.Content.length;
    b.title = "Переместить «" + source.name + "» " + word;
    b.setAttribute("aria-label", b.title);
    actions.append(b);
  }
  if (
    movableGroups.some(
      (g) => g.parent !== source.parent && canMoveBlock(source, g.parent),
    )
  ) {
    const b = button("↗", "block-transfer-button", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      blockMoveDialog(source);
    });
    b.title = "Переместить «" + source.name + "» в другую группу";
    b.setAttribute("aria-label", b.title);
    actions.append(b);
  }
  function position(ev) {
    const bounds = header.getBoundingClientRect();
    return ev.clientY >= bounds.top + bounds.height / 2;
  }
  element.addEventListener("dragover", (ev) => {
    if (
      ev.target.closest("[data-movable]") !== element ||
      !draggedBlock ||
      !canMoveBlock(draggedBlock, source.parent)
    )
      return;
    ev.preventDefault();
    ev.stopPropagation();
    ev.dataTransfer.dropEffect = "move";
    const after = position(ev);
    element.classList.toggle("drop-before", !after);
    element.classList.toggle("drop-after", after);
  });
  element.addEventListener("dragleave", (ev) => {
    if (!element.contains(ev.relatedTarget))
      element.classList.remove("drop-before", "drop-after");
  });
  element.addEventListener("drop", (ev) => {
    if (
      ev.target.closest("[data-movable]") !== element ||
      !draggedBlock ||
      !canMoveBlock(draggedBlock, source.parent)
    )
      return;
    ev.preventDefault();
    ev.stopPropagation();
    const from = draggedBlock,
      target = source.index + (position(ev) ? size : 0);
    clearBlockDrag();
    moveBlock(from, source.parent, target);
  });
}
function appendGroupDropzone(parent, container) {
  const group = movableGroups.find((g) => g.parent === parent);
  if (!group) return;
  const zone = make(
    "div",
    "block-dropzone",
    "Перетащите блок в группу «" + group.name + "»",
  );
  zone.addEventListener("dragover", (ev) => {
    ev.stopPropagation();
    if (!draggedBlock || !canMoveBlock(draggedBlock, parent)) return;
    ev.preventDefault();
    ev.dataTransfer.dropEffect = "move";
    zone.classList.add("drop-active");
  });
  zone.addEventListener("dragleave", () =>
    zone.classList.remove("drop-active"),
  );
  zone.addEventListener("drop", (ev) => {
    ev.stopPropagation();
    if (!draggedBlock || !canMoveBlock(draggedBlock, parent)) return;
    ev.preventDefault();
    const from = draggedBlock;
    clearBlockDrag();
    moveBlock(from, parent, parent.Content.length);
  });
  container.append(zone);
}

function renderTree(resetExpansion = false) {
  const e = $("editor");
  e.dataset.file = current.name;
  for (const details of e.querySelectorAll("details[data-movable]")) {
    const record = blockRecords.get(details);
    if (record && !resetExpansion)
      blockOpenStates.set(record.value, details.open);
  }
  clearBlockDrag();
  prepareMovableGroups();
  e.replaceChildren();
  const n = root();
  if (!n) return;
  if (!n.Content?.length) {
    const wrap = make("div", "empty");
    wrap.append(
      make("div", "empty-symbol", "▦"),
      make(
        "h3",
        "",
        current.exists ? "Пока здесь пусто" : "Начните с удобного шаблона",
      ),
      make(
        "p",
        "",
        "Добавьте настройки вручную или выберите шаблон. Файл появится на диске после сохранения.",
      ),
    );
    wrap.append(
      button("Выбрать шаблон", "primary", () => templates(n)),
      button("Добавить вручную", "secondary", () => addDialog(n)),
    );
    e.append(wrap);
    return;
  }
  renderChildren(n, e, 0);
  e.append(
    make(
      "p",
      "hint",
      "Тяните блоки за ⠿ или используйте ↑ / ↓. Кнопка ↗ переносит сервис или закладку в другую группу. Порядок записывается после сохранения.",
    ),
  );
  filter();
}
function mapValue(map, name) {
  const index = (map?.Content || []).findIndex(
    (n, i) => i % 2 === 0 && n.Value === name,
  );
  return index < 0 ? null : map.Content[index + 1];
}
function serviceInfo(parent) {
  return current.name === "services.yaml"
    ? findIconTargets(current.tree).find((t) => t.target === parent)
    : null;
}
function blockContext(parent) {
  if (current.name !== "services.yaml") return null;
  if (movableGroups.some((g) => g.parent === parent))
    return { kind: "group", node: parent };
  const services = findIconTargets(current.tree);
  for (const service of services) {
    if (service.target === parent) return { kind: "service", node: parent };
    if (mapValue(service.target, "widget") === parent)
      return {
        kind: "widget",
        node: parent,
        service: service.target,
        single: true,
      };
    const widgets = mapValue(service.target, "widgets");
    if (widgets === parent)
      return { kind: "widgets", node: parent, service: service.target };
    if (widgets?.Kind === 2 && widgets.Content?.includes(parent))
      return {
        kind: "widget",
        node: parent,
        service: service.target,
        single: false,
      };
  }
  return null;
}
function openBlockAdd(context) {
  if (context.kind === "widgets") {
    library({ serviceTarget: context.service });
    return;
  }
  if (context.kind === "widget" && !context.single) {
    parameterDialog(context.node);
    return;
  }
  const actions = [];
  if (context.kind === "group") {
    actions.push(
      [
        "service",
        "Новый сервис",
        "Название и адрес приложения",
        () => addServiceDialog(context.node),
      ],
      [
        "service-template",
        "Сервис из каталога",
        "Карточка приложения с готовой интеграцией",
        () => library({ destinationGroup: context.node }),
      ],
    );
  } else {
    actions.push([
      "parameter",
      context.kind === "service" ? "Параметр сервиса" : "Параметр виджета",
      context.kind === "service"
        ? "Иконка, описание, мониторинг и другие свойства"
        : "Настройки выбранной интеграции",
      () => parameterDialog(context.node),
    ]);
    if (
      context.kind === "widget" ||
      (!mapValue(context.node, "widget") && !mapValue(context.node, "widgets"))
    ) {
      actions.push([
        "widget",
        context.kind === "widget"
          ? "Добавить ещё один виджет"
          : "Подключить виджет",
        "Выбрать интеграцию из каталога",
        () => library({ serviceTarget: context.service || context.node }),
      ]);
    }
  }
  if (actions.length === 1) {
    actions[0][3]();
    return;
  }
  openDialog(
    context.kind === "group"
      ? "Добавить в группу"
      : context.kind === "service"
        ? "Добавить в сервис"
        : "Настроить виджет",
    "Действие относится только к выбранному блоку.",
  );
  const grid = make("div", "template-grid");
  for (const [id, title, description, action] of actions) {
    const card = button("", "template-card", () => {
      $("dialog").close();
      action();
    });
    card.dataset.action = id;
    card.append(make("strong", "", title), make("small", "", description));
    grid.append(card);
  }
  $("dialog-body").append(grid);
}
function parameterTemplates(parent) {
  let examples = [];
  if (current.name === "settings.yaml" && parent === root()) {
    examples = [
      node(settingDefaults),
      ...(catalog.settings || []).map((e) => e.tree.Content[0]),
    ];
  } else if (serviceInfo(parent)) {
    examples = [
      node({
        href: "https://service.example.com",
        icon: "mdi-server",
        description: "Описание сервиса",
        siteMonitor:
          mapValue(parent, "href")?.Value || "https://service.example.com",
        ping: "service.example.com",
        server: "my-docker",
        container: "container-name",
        showStats: true,
        target: "_blank",
      }),
    ];
  } else {
    const type =
      blockContext(parent)?.kind === "widget"
        ? mapValue(parent, "type")?.Value
        : null;
    if (type) {
      const entry = (catalog.services || []).find(
        (e) =>
          mapValue(mapValue(e.tree.Content[0], "widget"), "type")?.Value ===
          type,
      );
      if (entry) {
        examples = [
          mapValue(entry.tree.Content[0], "widget"),
          node({ headers: {} }),
        ];
        if (type === "proxmox")
          examples.push(
            node({ fields: ["vms", "lxc", "resources.cpu", "resources.mem"] }),
          );
      }
    }
    if (
      current.name === "settings.yaml" &&
      mapValue(root(), "background") === parent
    )
      examples = [node(settingDefaults.background)];
  }
  const result = new Map();
  for (const example of examples)
    for (let i = 0; i < (example?.Content?.length || 0); i += 2) {
      const key = example.Content[i],
        value = example.Content[i + 1];
      if (!result.has(key.Value)) result.set(key.Value, { key, value });
    }
  return [...result.values()];
}
function parameterDialog(parent) {
  const templates = parameterTemplates(parent);
  if (!templates.length) {
    addDialog(parent);
    return;
  }
  openDialog(
    "Добавить параметр",
    "Выберите готовую настройку. Подходящее поле ввода и начальное значение добавятся автоматически.",
  );
  const search = field("Найти настройку", make("input"));
  search.type = "search";
  const grid = make("div", "template-grid");
  for (const { key, value } of templates) {
    const exists = Boolean(mapValue(parent, key.Value));
    const b = button("", "template-card", () => {
      parent.Content ||= [];
      parent.Content.push(structuredClone(key), structuredClone(value));
      mark();
      $("dialog").close();
      renderTree();
    });
    b.disabled = exists;
    b.dataset.parameter = key.Value;
    b.append(
      make("strong", "", labels[key.Value]?.[0] || key.Value),
      make(
        "small",
        "",
        exists
          ? "Уже добавлено"
          : labels[key.Value]?.[1] ||
              value.LineComment ||
              value.HeadComment ||
              (value.Kind === 4
                ? "Раздел настроек"
                : value.Kind === 2
                  ? "Список значений"
                  : value.Tag === "!!bool"
                    ? "Переключатель"
                    : ["!!int", "!!float"].includes(value.Tag)
                      ? "Числовое поле"
                      : "Текстовое поле"),
      ),
    );
    grid.append(b);
  }
  $("dialog-body").append(grid);
  search.addEventListener("input", () => {
    for (const card of grid.children)
      card.classList.toggle(
        "hidden",
        !(card.textContent + " " + card.dataset.parameter)
          .toLowerCase()
          .includes(search.value.toLowerCase()),
      );
  });
  $("dialog-actions").append(
    button("Своё поле…", "secondary", () => {
      $("dialog").close();
      addDialog(parent);
    }),
  );
}
function addServiceDialog(group = null) {
  openDialog(
    group ? "Добавить сервис" : "Добавить группу",
    group
      ? "Название и адрес приложения. Виджет и остальные настройки можно добавить в его карточке."
      : "Группа объединяет сервисы на главной странице.",
  );
  const name = field("Название", make("input"));
  const href = group ? field("Адрес приложения", make("input")) : null;
  if (href) href.placeholder = "https://service.example.com";
  $("dialog-actions").append(
    button("Добавить", "primary", () => {
      const title = name.value.trim(),
        list = group || root();
      if (!title || list.Content?.some((item) => mapValue(item, title))) {
        toast("Укажите уникальное название");
        return;
      }
      list.Content ||= [];
      list.Content.push(
        node({
          [title]: group ? { href: href.value.trim(), description: "" } : [],
        }),
      );
      mark();
      $("dialog").close();
      renderTree();
    }),
  );
  name.focus();
}
function attachServiceWidget(service, widget, replace = false) {
  service.Content ||= [];
  let single = service.Content.findIndex(
    (n, i) => i % 2 === 0 && n.Value === "widget",
  );
  let multiple = service.Content.findIndex(
    (n, i) => i % 2 === 0 && n.Value === "widgets",
  );
  if (replace) {
    for (let i = service.Content.length - 2; i >= 0; i -= 2)
      if (["widget", "widgets"].includes(service.Content[i].Value))
        service.Content.splice(i, 2);
    service.Content.push(scalar("widget"), widget);
    return true;
  }
  if (multiple >= 0) {
    if (single >= 0 || service.Content[multiple + 1].Kind !== 2) {
      toast(
        "В сервисе неоднозначные настройки виджетов. Выберите явную замену или исправьте их в YAML.",
      );
      return false;
    }
    service.Content[multiple + 1].Content ||= [];
    service.Content[multiple + 1].Content.push(widget);
  } else if (single >= 0) {
    const existing = service.Content[single + 1];
    service.Content[single].Value = "widgets";
    service.Content[single + 1] = {
      Kind: 2,
      Tag: "!!seq",
      Content: [existing, widget],
    };
  } else service.Content.push(scalar("widget"), widget);
  return true;
}

function renderChildren(parent, container, depth) {
  const content = parent.Content || [];
  if (depth > 24) {
    container.append(
      make(
        "p",
        "hint",
        "Большая глубина вложенности — используйте YAML-режим.",
      ),
    );
    return;
  }
  if (parent.Kind === 4) {
    for (let i = 0; i < content.length; i += 2) {
      const key = content[i],
        value = content[i + 1];
      if (!value) continue;
      renderEntry(parent, i, key.Value, value, container, depth, key);
    }
  } else if (parent.Kind === 2) {
    content.forEach((value, i) => {
      // Homepage represents a named block as a one-key mapping inside a list.
      // Display the name and its body together, while keeping the list as the
      // actual parent for movement/removal and the original key for renaming.
      if (
        value.Kind === 4 &&
        value.Content?.length === 2 &&
        [2, 4].includes(value.Content[1].Kind)
      ) {
        renderEntry(
          parent,
          i,
          value.Content[0].Value,
          value.Content[1],
          container,
          depth,
          value.Content[0],
        );
        return;
      }
      let title = "Элемент " + (i + 1);
      if (value.Kind === 4 && value.Content?.length)
        title = mapValue(value, "type")?.Value || value.Content[0].Value;
      renderEntry(parent, i, title, value, container, depth);
    });
  }
  if (!blockContext(parent) && depth > 0)
    container.append(
      button(
        parent.Kind === 4
          ? parameterTemplates(parent).length
            ? "＋ Параметр из шаблона"
            : "＋ Добавить своё поле"
          : "＋ Добавить элемент",
        "add-inline",
        () => (parent.Kind === 4 ? parameterDialog(parent) : addDialog(parent)),
      ),
    );
  appendGroupDropzone(parent, container);
}
function fieldChoices(name, parent) {
  if (mapValue(parent, "type")?.Value === "grafana") {
    if (name === "alerts")
      return [
        ["grafana", "Встроенный Alertmanager Grafana"],
        ["alertmanager", "Внешний источник с UID alertmanager"],
      ];
    if (name === "version")
      return [
        ["2", "Grafana новее 10.4"],
        ["1", "Grafana 10.4 и старше"],
      ];
  }
  if (name === "target")
    return [
      ["_blank", "В новой вкладке"],
      ["_self", "В текущей вкладке"],
      ["_top", "В основном окне"],
    ];
  if (current.name !== "settings.yaml") return null;
  const top = parent === root();
  if (top && name === "theme")
    return [
      ["dark", "Тёмная"],
      ["light", "Светлая"],
    ];
  if (top && name === "headerStyle")
    return [
      ["underlined", "С подчёркиванием"],
      ["boxed", "В рамке"],
      ["clean", "Минималистичный"],
      ["boxedWidgets", "Виджеты в рамке"],
    ];
  if (top && name === "statusStyle")
    return [
      ["dot", "Цветная точка"],
      ["basic", "Текстовый статус"],
    ];
  if (top && name === "language")
    return [
      ["ru", "Русский"],
      ["en", "English"],
      ["de", "Deutsch"],
      ["fr", "Français"],
      ["es", "Español"],
    ];
  if (top && name === "color")
    return [
      ["slate", "Серо-синий"],
      ["gray", "Серый"],
      ["zinc", "Цинковый"],
      ["neutral", "Нейтральный"],
      ["stone", "Каменный"],
      ["red", "Красный"],
      ["orange", "Оранжевый"],
      ["amber", "Янтарный"],
      ["yellow", "Жёлтый"],
      ["lime", "Лаймовый"],
      ["green", "Зелёный"],
      ["emerald", "Изумрудный"],
      ["teal", "Бирюзовый"],
      ["cyan", "Голубой"],
      ["sky", "Небесный"],
      ["blue", "Синий"],
      ["indigo", "Индиго"],
      ["violet", "Фиолетовый"],
      ["purple", "Пурпурный"],
      ["fuchsia", "Фуксия"],
      ["pink", "Розовый"],
      ["rose", "Розовый коралл"],
    ];
  return null;
}

function advancedFieldDialog(name, value) {
  openDialog(
    "Дополнительные настройки поля",
    (labels[name]?.[0] || name) +
      " · " +
      name +
      ". Обычно способ ввода определяется автоматически.",
  );
  const kind = field(
    "Как задавать значение",
    select([
      ["!!str", "Текст или адрес"],
      ["!!bool", "Переключатель: включено / выключено"],
      ["!!int", "Число без дробной части"],
      ["!!float", "Число с дробной частью"],
      ["!!null", "Не задавать значение (по умолчанию)"],
    ]),
  );
  kind.value = value.Tag || "!!str";
  $("dialog-actions").append(
    button("Отмена", "secondary", () => $("dialog").close()),
    button("Применить", "primary", () => {
      if (kind.value !== value.Tag) {
        const previous = value.Value;
        value.Tag = kind.value;
        value.Style = 0;
        if (kind.value === "!!bool")
          value.Value = previous === "true" ? "true" : "false";
        if (kind.value === "!!null") value.Value = "null";
        if (["!!int", "!!float"].includes(kind.value)) {
          const number = Number(previous);
          value.Value = Number.isFinite(number)
            ? String(kind.value === "!!int" ? Math.trunc(number) : number)
            : "0";
        }
        if (kind.value === "!!str" && previous === "null") value.Value = "";
        mark();
        renderTree();
      }
      $("dialog").close();
    }),
  );
}

function cloneBlockNode(value) {
  const used = new Set(),
    renamed = new Map();
  const walk = (node, fn) => {
    fn(node);
    for (const child of node.Content || []) walk(child, fn);
  };
  walk(current.tree, (n) => {
    if (n.Anchor) used.add(n.Anchor);
  });
  const copy = structuredClone(value);
  walk(copy, (n) => {
    if (!n.Anchor) return;
    const original = n.Anchor;
    let next = original + "_copy",
      i = 2;
    while (used.has(next)) next = original + "_copy" + i++;
    used.add(next);
    renamed.set(original, next);
    n.Anchor = next;
  });
  walk(copy, (n) => {
    if (n.Kind === 16 && renamed.has(n.Value)) {
      n.Value = renamed.get(n.Value);
      if (n.Alias) n.Alias.Anchor = n.Value;
    }
  });
  return copy;
}

function duplicateBlock(parent, index, name, value) {
  const finish = (copy) => {
    if (copy) blockOpenStates.set(copy, false);
    mark();
    renderTree();
    toast("Копия добавлена в черновик. Сохраните изменения.");
  };
  if (parent.Kind === 2) {
    const copy = cloneBlockNode(parent.Content[index]);
    if (
      copy.Kind === 4 &&
      copy.Content?.length === 2 &&
      [2, 4].includes(copy.Content[1].Kind)
    ) {
      const names = new Set(
        (parent.Content || []).flatMap((n) =>
          n.Kind === 4
            ? (n.Content || [])
                .filter((_, i) => i % 2 === 0)
                .map((k) => k.Value)
            : [],
        ),
      );
      let next = name + " (копия)",
        i = 2;
      while (names.has(next)) next = name + " (копия " + i++ + ")";
      copy.Content[0].Value = next;
    }
    parent.Content.splice(index + 1, 0, copy);
    finish(
      copy.Kind === 4 && copy.Content?.length === 2 ? copy.Content[1] : copy,
    );
    return;
  }
  if (name === "widget" && mapValue(parent, "widget") === value) {
    const copy = cloneBlockNode(value);
    if (attachServiceWidget(parent, copy)) finish(copy);
    return;
  }
  if (name === "widgets" && value.Kind === 2) {
    const copy = cloneBlockNode(value);
    value.Content ||= [];
    value.Content.push(...(copy.Content || []));
    finish();
    return;
  }
  openDialog(
    "Копировать блок",
    "Укажите новое имя группы или параметра. Все вложенные настройки будут скопированы.",
  );
  const title = field("Название копии", make("input"));
  let next = name + " (копия)",
    i = 2;
  while (mapValue(parent, next)) next = name + " (копия " + i++ + ")";
  title.value = next;
  $("dialog-actions").append(
    button("Создать копию", "primary", () => {
      const next = title.value.trim();
      if (!next || mapValue(parent, next)) {
        toast("Укажите уникальное название");
        return;
      }
      const copy = cloneBlockNode(value),
        key = cloneBlockNode(parent.Content[index]);
      key.Value = next;
      parent.Content.splice(index + 2, 0, key, copy);
      $("dialog").close();
      finish(copy);
    }),
  );
  title.focus();
}

function renderEntry(parent, index, name, value, container, depth, key) {
  const source = { parent, index, name, value };
  const remove = () => {
    if (!confirm("Удалить «" + name + "»?")) return;
    parent.Content.splice(index, parent.Kind === 4 ? 2 : 1);
    mark();
    renderTree();
  };
  if (value.Kind === 4 || value.Kind === 2) {
    const details = make("details", "tree-group");
    details.open =
      blockOpenStates.get(value) ?? panelDefaultOpen(current.name, depth);
    const summary = make("summary");
    summary.append(make("span", "", labels[name]?.[0] || name));
    if (labels[name]) summary.append(make("code", "group-meta", name));
    else
      summary.append(
        make(
          "span",
          "group-meta",
          (value.Content?.length / (value.Kind === 4 ? 2 : 1) || 0) +
            " " +
            (value.Kind === 4 ? "полей" : "элементов"),
        ),
      );
    const actions = make("span", "group-actions");
    attachBlockMovement(details, summary, actions, source);
    const duplicate = button("⧉", "duplicate-block", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      duplicateBlock(parent, index, name, value);
    });
    duplicate.title = "Создать копию «" + name + "»";
    duplicate.setAttribute("aria-label", duplicate.title);
    actions.append(duplicate);
    const context = blockContext(value);
    if (context) {
      const role = make(
        "span",
        "block-role",
        {
          group: "Группа",
          service: "Сервис",
          widget: "Виджет",
          widgets: "Виджеты",
        }[context.kind],
      );
      summary.insertBefore(role, summary.querySelector(".group-meta"));
      const add = button("＋", "context-add", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        openBlockAdd(context);
      });
      add.title =
        context.kind === "group"
          ? "Добавить сервис в эту группу"
          : context.kind === "widgets"
            ? "Добавить виджет в этот сервис"
            : context.kind === "widget"
              ? "Настроить этот виджет"
              : "Добавить параметры сервиса";
      add.setAttribute("aria-label", add.title);
      actions.append(add);
    }
    if (key)
      actions.append(
        button("✎", "", (ev) => {
          ev.preventDefault();
          renameDialog(key);
        }),
      );
    actions.append(
      button("×", "", (ev) => {
        ev.preventDefault();
        remove();
      }),
    );
    summary.append(actions);
    details.append(summary);
    const children = make("div", "group-content");
    renderChildren(value, children, depth + 1);
    details.append(children);
    container.append(details);
    return;
  }
  const row = make("div", "field-row");
  row.dataset.search = name;
  const grafana = mapValue(parent, "type")?.Value === "grafana";
  const caption =
    (grafana
      ? {
          username: [
            "Пользователь Grafana",
            "Логин пользователя с правами серверного администратора. Это не имя service account.",
          ],
          password: [
            "Пароль пользователя Grafana",
            "Для /api/admin/stats нужен пароль пользователя; токен service account не поддерживается.",
          ],
          alerts: [
            "Источник оповещений",
            "Обычно встроенный Grafana. Внешний источник выбирайте только если он настроен.",
          ],
          version: [
            "Совместимость виджета",
            "Версия 2 — для Grafana новее 10.4, включая 12.x.",
          ],
          url: [
            "Адрес Grafana",
            "Полный адрес с http:// или https://, например http://192.168.2.2:3000",
          ],
        }[name]
      : null) || labels[name];
  const label = make("label", "field-label"),
    id = "field-" + ++renderEntry.id;
  label.htmlFor = id;
  label.append(
    make("strong", "", caption?.[0] || name),
    make(
      "small",
      "",
      caption ? caption[1] : value.HeadComment || "Параметр конфигурации",
    ),
  );
  const control = make("div", "field-input");
  if (value.Kind === 16) {
    control.append(
      make(
        "span",
        "hint",
        "Ссылка на YAML-якорь: *" + value.Value + " · редактируется в YAML",
      ),
    );
  } else {
    const bool = value.Tag === "!!bool",
      multiline = value.Value?.includes("\n"),
      secret = /key|token|secret|password|authorization/i.test(name);
    const choices =
      (value.Tag === "!!str" ||
        (grafana && name === "version" && value.Tag === "!!int")) &&
      !multiline
        ? fieldChoices(name, parent)
        : null;
    const input = choices
      ? select(choices)
      : make(multiline ? "textarea" : "input");
    input.id = id;
    input.spellcheck = false;
    if (choices) {
      if (!choices.some(([v]) => v === value.Value)) {
        const custom = make("option", "", "Другое: " + value.Value);
        custom.value = value.Value;
        input.append(custom);
      }
      input.value = value.Value;
    } else if (bool) {
      input.type = "checkbox";
      input.checked = value.Value.toLowerCase() === "true";
      input.setAttribute("role", "switch");
      input.setAttribute("aria-checked", String(input.checked));
    } else {
      if (!multiline) input.type = secret ? "password" : "text";
      input.value = value.Tag === "!!null" ? "" : value.Value || "";
      if (
        grafana &&
        name === "url" &&
        !multiline &&
        !value.Value.includes("{{")
      ) {
        input.type = "url";
        input.required = true;
        input.placeholder = "http://grafana:3000";
      }
      if (
        !multiline &&
        !secret &&
        ["!!int", "!!float"].includes(value.Tag) &&
        /^-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(value.Value)
      ) {
        input.type = "number";
        input.step = value.Tag === "!!int" ? "1" : "any";
        input.required = true;
      }
      if (value.Tag === "!!null") {
        input.disabled = true;
        input.placeholder = "По умолчанию";
      }
    }
    input.addEventListener("input", () => {
      value.Value = bool ? String(input.checked) : input.value;
      value.Style = 0;
      if (bool) {
        input.setAttribute("aria-checked", String(input.checked));
        control.querySelector(".switch-state").textContent = input.checked
          ? "Включено"
          : "Выключено";
      }
      mark();
    });
    control.append(input);
    if (bool)
      control.append(
        make("span", "switch-state", input.checked ? "Включено" : "Выключено"),
      );
    if (value.Tag === "!!null")
      control.append(
        button("Задать", "soft-button", () => {
          const initial =
            parent === root() && Object.hasOwn(settingDefaults, name)
              ? node(structuredClone(settingDefaults[name]))
              : scalar("");
          Object.assign(value, initial, { Style: 0 });
          mark();
          renderTree();
        }),
      );
    if (secret && !multiline && !bool)
      control.append(
        button("◉", "reveal", () => {
          input.type = input.type === "password" ? "text" : "password";
        }),
      );
  }
  const rowActions = make("span", "field-actions");
  if (value.Kind !== 16) {
    const extra = button("⋯", "field-more", () =>
      advancedFieldDialog(name, value),
    );
    extra.title = "Дополнительные настройки: " + name;
    extra.setAttribute("aria-label", extra.title);
    rowActions.append(extra);
  }
  if (name === "icon" && parent.Kind === 4) {
    const upload = button("▧", "icon-upload-button", () =>
      imageImportDialog({ iconMode: true, target: parent }),
    );
    upload.title = "Выбрать иконку: ссылка, файл или сторонняя база";
    upload.setAttribute("aria-label", upload.title);
    control.append(upload);
  }
  attachBlockMovement(row, label, rowActions, source);
  rowActions.append(button("×", "delete-button", remove));
  row.append(label, control, rowActions);
  container.append(row);
}
renderEntry.id = 0;
function filter() {
  const q = $("search").value.trim().toLowerCase();
  document.querySelectorAll(".field-row").forEach((e) => {
    const input = e.querySelector("input,textarea");
    e.classList.toggle(
      "hidden",
      q &&
        !(e.textContent + " " + (input?.value || "")).toLowerCase().includes(q),
    );
  });
  if (q && panelPreferences.expandSearch)
    document.querySelectorAll(".tree-group").forEach((e) => {
      const matching = [...e.querySelectorAll(".field-row")].some(
        (row) => !row.classList.contains("hidden"),
      );
      if (matching || (e.dataset.blockName || "").toLowerCase().includes(q))
        e.open = true;
    });
}
function openDialog(title, description) {
  $("dialog-title").textContent = title;
  $("dialog-description").textContent = description || "";
  $("dialog-body").replaceChildren();
  $("dialog-actions").replaceChildren();
  $("dialog").showModal();
}
function field(title, input, help) {
  const label = make("label", "dialog-field");
  label.append(make("span", "", title), input);
  if (help) label.append(make("small", "", help));
  $("dialog-body").append(label);
  return input;
}
function select(options) {
  const el = make("select");
  for (const [value, label] of options) {
    const o = make("option", "", label);
    o.value = value;
    el.append(o);
  }
  return el;
}
function addDialog(parent) {
  openDialog(
    parent.Kind === 4 ? "Добавить параметр" : "Добавить элемент",
    "Любые поля Homepage доступны через вложенные объекты и списки.",
  );
  let name;
  if (parent.Kind === 4) {
    name = field(
      "Имя параметра",
      make("input"),
      current.name === "settings.yaml"
        ? "Выберите известный параметр или введите своё имя."
        : "Имя поля в конфигурации Homepage",
    );
    name.placeholder = "Например: title";
    if (parent === root() && current.name === "settings.yaml") {
      name.setAttribute("list", "settings-keys");
      const list = make("datalist");
      list.id = "settings-keys";
      for (const k of Object.keys(settingDefaults)) {
        const o = make("option");
        o.value = k;
        list.append(o);
      }
      $("dialog-body").append(list);
    }
  }
  const type = field(
    "Как задавать значение",
    select([
      ["auto", "Определить автоматически"],
      ["map", "Раздел с вложенными настройками"],
      ["seq", "Список элементов"],
      ["bool", "Переключатель"],
      ["int", "Целое число"],
      ["float", "Число"],
      ["null", "Не задавать значение (по умолчанию)"],
    ]),
  );
  const advanced = make("details", "advanced-options");
  advanced.append(
    make("summary", "", "Дополнительные настройки"),
    type.parentElement,
  );
  $("dialog-body").append(advanced);
  const value = field(
    "Значение",
    make("input"),
    "Для объекта и списка поля можно добавить после создания.",
  );
  value.placeholder = "Значение параметра";
  $("dialog-actions").append(
    button("Отмена", "secondary", () => $("dialog").close()),
    button("Добавить", "primary", () => {
      const k = name?.value.trim();
      if (
        parent.Kind === 4 &&
        (!k || parent.Content.some((n, i) => i % 2 === 0 && n.Value === k))
      ) {
        toast("Укажите уникальное имя параметра");
        return;
      }
      let v;
      if (type.value === "map") v = node({});
      else if (type.value === "seq") v = node([]);
      else if (type.value === "bool") v = node(false);
      else if (type.value === "null") v = node(null);
      else if (type.value === "int" || type.value === "float") {
        const n = Number(value.value);
        if (
          !Number.isFinite(n) ||
          (type.value === "int" && !Number.isInteger(n))
        ) {
          toast("Введите корректное число");
          return;
        }
        v = node(n);
      } else if (
        k &&
        parent === root() &&
        current.name === "settings.yaml" &&
        Object.hasOwn(settingDefaults, k) &&
        value.value === ""
      )
        v = node(structuredClone(settingDefaults[k]));
      else v = node(value.value);
      parent.Content ||= [];
      if (parent.Kind === 4) parent.Content.push(scalar(k), v);
      else parent.Content.push(v);
      mark();
      $("dialog").close();
      renderTree();
    }),
  );
  name?.focus();
}
function renameDialog(key) {
  openDialog("Переименовать", "Название группы или параметра в конфигурации.");
  const input = field("Название", make("input"));
  input.value = key.Value;
  $("dialog-actions").append(
    button("Применить", "primary", () => {
      if (!input.value.trim()) return;
      key.Value = input.value.trim();
      mark();
      $("dialog").close();
      renderTree();
    }),
  );
}
function templates(parent) {
  openDialog(
    "Добавить из шаблона",
    "Шаблон — отправная точка. Измените адреса и ключи перед сохранением.",
  );
  const grid = make("div", "template-grid");
  for (const [title, description, data] of presets[current.name] || []) {
    const b = button("", "template-card", () => {
      const n = node(structuredClone(data));
      parent.Content ||= [];
      if (parent.Kind === 2) parent.Content.push(n);
      else {
        const collisions = n.Content.filter((_, i) => i % 2 === 0).filter((k) =>
          parent.Content.some((x, i) => i % 2 === 0 && x.Value === k.Value),
        );
        if (collisions.length) {
          toast("Уже есть поля: " + collisions.map((k) => k.Value).join(", "));
          return;
        }
        parent.Content.push(...n.Content);
      }
      mark();
      $("dialog").close();
      renderTree();
    });
    b.append(make("strong", "", title), make("small", "", description));
    grid.append(b);
  }
  if (libraryEntries().length)
    grid.append(
      button("Весь каталог Homepage →", "template-card", () => {
        $("dialog").close();
        library();
      }),
    );
  grid.append(
    button("Пустой объект / своё поле", "template-card", () => {
      $("dialog").close();
      addDialog(parent);
    }),
  );
  $("dialog-body").append(grid);
}
function libraryEntries() {
  return (
    catalog[
      current?.name === "services.yaml"
        ? "services"
        : current?.name === "widgets.yaml"
          ? "info"
          : current?.name === "settings.yaml"
            ? "settings"
            : "none"
    ] || []
  );
}
function library({ serviceTarget = null, destinationGroup = null } = {}) {
  const entries = libraryEntries();
  openDialog(
    "Каталог Homepage",
    entries.length +
      " примеров из официальной документации · снимок " +
      catalog.snapshot +
      ". Параметры можно изменить после добавления.",
  );
  let group, service, attachMode;
  if (current.name === "services.yaml") {
    if (serviceTarget) {
      if (
        mapValue(serviceTarget, "widget") ||
        mapValue(serviceTarget, "widgets")
      ) {
        attachMode = field(
          "Что сделать",
          select([
            ["append", "Добавить ещё один виджет, сохранив текущий"],
            ["replace", "Заменить существующие виджеты"],
          ]),
        );
        attachMode.id = "widget-attach-mode";
      }
      $("dialog-description").textContent =
        "Выберите интеграцию для текущего сервиса. Её параметры появятся внутри карточки; адрес, иконка и мониторинг сохранятся.";
    } else {
      if (!destinationGroup) {
        group = field("Группа сервисов", make("input"));
        group.value = "Сервисы";
      } else
        $("dialog-description").textContent =
          "Сервис будет добавлен в выбранную группу. Укажите название и выберите интеграцию.";
      service = field(
        "Название сервиса",
        make("input"),
        "Оставьте пустым, чтобы использовать название интеграции.",
      );
      service.placeholder = "Название интеграции";
    }
  }
  const search = field("Найти интеграцию или параметр", make("input"));
  search.type = "search";
  search.placeholder = "Jellyfin, Proxmox, layout…";
  const grid = make("div", "template-grid");
  for (const entry of entries) {
    const wrap = make("div", "library-entry");
    const b = button("", "template-card", () => {
      const n = structuredClone(entry.tree.Content[0]),
        r = root();
      r.Content ||= [];
      if (current.name === "services.yaml") {
        if (serviceTarget) {
          const widget = mapValue(n, "widget");
          if (!widget) {
            toast("В этом шаблоне нет настроек виджета");
            return;
          }
          if (
            !attachServiceWidget(
              serviceTarget,
              widget,
              attachMode?.value === "replace",
            )
          )
            return;
          if (panelPreferences.services !== "collapsed")
            blockOpenStates.set(widget, true);
          mark();
          $("dialog").close();
          renderTree();
          toast(
            "Виджет добавлен в сервис. Укажите адрес и ключи, затем сохраните изменения.",
          );
          return;
        }
        const groupName = destinationGroup ? "" : group.value.trim(),
          serviceName = service.value.trim() || entry.title;
        if (!destinationGroup && !groupName) {
          toast("Укажите название группы");
          return;
        }
        let target = destinationGroup;
        if (!destinationGroup) {
          for (const item of r.Content) {
            if (
              item.Kind === 4 &&
              item.Content?.[0]?.Value === groupName &&
              item.Content[1]?.Kind === 2
            ) {
              target = item.Content[1];
              break;
            }
          }
        }
        if (
          target?.Content?.some((x) => x.Content?.[0]?.Value === serviceName)
        ) {
          toast("В этой группе уже есть сервис с таким названием");
          return;
        }
        if (!target) {
          target = node([]);
          r.Content.push({
            Kind: 4,
            Tag: "!!map",
            Content: [scalar(groupName), target],
          });
        }
        const config = node({
          icon: entry.slug + ".png",
          href: "https://service.example.com",
        });
        config.Content.push(...n.Content);
        target.Content ||= [];
        target.Content.push({
          Kind: 4,
          Tag: "!!map",
          Content: [scalar(serviceName), config],
        });
      } else if (r.Kind === 2) {
        r.Content.push(...n.Content);
      } else {
        const collision = n.Content.filter((_, i) => i % 2 === 0).find((k) =>
          r.Content.some((x, i) => i % 2 === 0 && x.Value === k.Value),
        );
        if (collision) {
          toast(
            "Поле " +
              collision.Value +
              " уже существует. Измените его в редакторе.",
          );
          return;
        }
        r.Content.push(...n.Content);
      }
      mark();
      $("dialog").close();
      renderTree();
      toast("Шаблон добавлен. Укажите адреса и ключи своего сервиса.");
    });
    if (current.name === "services.yaml") {
      const aliases = {
        proxmoxbackupserver: "proxmox",
        unifi: "unifi",
        truenas: "truenas",
      };
      b.append(
        logoThumbnail(
          entry.title,
          "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/" +
            encodeURIComponent(aliases[entry.slug] || entry.slug) +
            ".png",
        ),
      );
    }
    b.append(make("strong", "", entry.title), make("small", "", entry.slug));
    const link = make("a", "library-doc", "Документация ↗");
    link.href = entry.url;
    link.target = "_blank";
    link.rel = "noreferrer";
    wrap.append(b, link);
    wrap.dataset.search = (entry.title + " " + entry.slug).toLowerCase();
    grid.append(wrap);
  }
  search.addEventListener("input", () => {
    for (const card of grid.children)
      card.classList.toggle(
        "hidden",
        !card.dataset.search.includes(search.value.toLowerCase()),
      );
  });
  $("dialog-body").append(grid);
  search.focus();
}
function validateVisualFields() {
  if (mode !== "visual") return;
  const invalid = [
    ...$("editor").querySelectorAll('input[type="number"],input[type="url"]'),
  ].find(
    (input) =>
      !input.value.includes("{{") &&
      (!input.checkValidity() ||
        (input.type === "url" && !/^https?:\/\//i.test(input.value))),
  );
  if (invalid) {
    for (let el = invalid.parentElement; el; el = el.parentElement)
      if (el.tagName === "DETAILS") el.open = true;
    invalid.focus();
    throw Error(
      (invalid.type === "url"
        ? "Укажите полный URL с http:// или https:// в поле «"
        : "Укажите корректное число в поле «") +
        invalid.closest(".field-row").querySelector(".field-label strong")
          .textContent +
        "».",
    );
  }
}
async function serialized() {
  validateVisualFields();
  if (mode === "raw") return $("raw").value;
  const d = await api("/api/convert", {
    method: "POST",
    body: JSON.stringify({ name: current.name, tree: current.tree }),
  });
  return d.raw;
}
async function save() {
  await run(async () => {
    validateVisualFields();
    const payload = {
      name: current.name,
      revision: current.revision,
      ...(mode === "raw" ? { raw: $("raw").value } : { tree: current.tree }),
    };
    const d =
      pendingAppearanceCSS && current.name === "settings.yaml"
        ? (
            await api("/api/appearance", {
              method: "PUT",
              body: JSON.stringify({
                settings: payload,
                css: {
                  name: "custom.css",
                  raw: pendingAppearanceCSS.raw,
                  revision: pendingAppearanceCSS.revision,
                },
              }),
            })
          ).settings
        : await api("/api/file", {
            method: "PUT",
            body: JSON.stringify(payload),
          });
    const previousMode = mode;
    install(d);
    mode = previousMode;
    renderMode();
    toast("Сохранено. Обновите страницу Homepage, чтобы увидеть изменения.");
  });
}
async function review() {
  await run(async () => {
    const raw = await serialized();
    openDialog(
      "Изменения перед сохранением",
      current.name + " · данные на диске и текущая версия",
    );
    const diff = make("div", "diff");
    const oldLines = original.split("\n"),
      newLines = raw.split("\n");
    for (const [title, lines, other, cls] of [
      ["На диске", oldLines, newLines, "removed"],
      ["После сохранения", newLines, oldLines, "added"],
    ]) {
      const column = make("div");
      column.append(make("h4", "", title));
      const pre = make("pre");
      lines.forEach((line, i) =>
        pre.append(make("div", line !== other[i] ? cls : "", line || " ")),
      );
      column.append(pre);
      diff.append(column);
    }
    $("dialog-body").append(diff);
    if (pendingAppearanceCSS) {
      $("dialog-body").append(
        make("h4", "", "Изменения оформления · custom.css"),
      );
      const cssDiff = make("div", "diff");
      for (const [title, raw] of [
        ["На диске", pendingAppearanceCSS.original],
        ["После сохранения", pendingAppearanceCSS.raw],
      ]) {
        const col = make("div");
        col.append(make("h4", "", title), make("pre", "", raw));
        cssDiff.append(col);
      }
      $("dialog-body").append(cssDiff);
    }
    $("dialog-actions").append(
      button("Продолжить редактирование", "secondary", () =>
        $("dialog").close(),
      ),
      button("Сохранить изменения", "primary", () => {
        $("dialog").close();
        save();
      }),
    );
  });
}
async function openHistory() {
  await run(async () => {
    const entries = await api(
      "/api/history?name=" + encodeURIComponent(current.name),
    );
    openDialog(
      "История изменений",
      "Предыдущие версии " +
        current.name +
        ". Восстановление сначала загружает копию в редактор.",
    );
    if (!entries.length)
      $("dialog-body").append(
        make(
          "p",
          "hint",
          "Пока нет резервных копий. Они появятся после изменения существующего файла.",
        ),
      );
    for (const entry of entries) {
      const row = make("div", "history-row");
      const label = make(
        "div",
        "",
        new Date(entry.time).toLocaleString("ru-RU"),
      );
      label.append(make("small", "", entry.size + " байт"));
      row.append(
        label,
        button("Загрузить в редактор", "secondary", async () => {
          if (
            dirty &&
            !confirm("Заменить несохранённые изменения резервной копией?")
          )
            return;
          $("dialog").close();
          await run(async () => {
            const d = await api(
              "/api/backup?name=" +
                encodeURIComponent(current.name) +
                "&id=" +
                encodeURIComponent(entry.id),
            );
            current.raw = d.raw;
            mode = "raw";
            mark();
            renderMode();
            toast(
              "Копия в редакторе. Проверьте и сохраните для восстановления.",
            );
          });
        }),
      );
      $("dialog-body").append(row);
    }
  });
}
$("visual-tab").addEventListener("click", () => switchMode("visual"));
$("raw-tab").addEventListener("click", () => switchMode("raw"));
$("raw").addEventListener("input", () => {
  current.raw = $("raw").value;
  mark();
});
$("raw").addEventListener("keydown", (e) => {
  if (e.key === "Tab") {
    e.preventDefault();
    const t = e.target,
      a = t.selectionStart,
      b = t.selectionEnd;
    t.setRangeText("  ", a, b, "end");
    current.raw = t.value;
    mark();
  }
});
$("save").addEventListener("click", save);
$("review").addEventListener("click", review);
$("history").addEventListener("click", openHistory);
$("reload").addEventListener("click", () => {
  if (!dirty || confirm("Отменить изменения и загрузить файл с диска?"))
    load(current.name, true);
});
$("search").addEventListener("input", filter);
$("add-root").addEventListener("click", () => {
  if (current.name === "services.yaml") addServiceDialog();
  else if (current.name === "widgets.yaml") library();
  else if (root().Kind === 4) parameterDialog(root());
  else addDialog(root());
});
$("dialog-close").addEventListener("click", () => $("dialog").close());
$("menu").addEventListener("click", () =>
  $("sidebar").classList.toggle("open"),
);
$("download").addEventListener("click", () =>
  run(async () => {
    const raw = await serialized();
    const url = URL.createObjectURL(
      new Blob([raw], { type: "text/plain;charset=utf-8" }),
    );
    const a = make("a");
    a.href = url;
    a.download = current.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast("Конфигурация скачана");
  }),
);
$("new-file").addEventListener("click", () => {
  openDialog(
    "Дополнительный YAML",
    "Создайте файл для подключаемой конфигурации. Homepage должен быть настроен на его использование отдельно.",
  );
  const name = field("Имя файла", make("input"));
  name.placeholder = "extra-services.yaml";
  $("dialog-actions").append(
    button("Открыть файл", "primary", () => {
      const n = name.value.trim();
      if (!/^[\p{L}\p{N}_-][\p{L}\p{N}_. -]*\.ya?ml$/u.test(n)) {
        toast("Введите имя файла с расширением .yaml или .yml");
        return;
      }
      if (!names.includes(n)) names.push(n);
      $("dialog").close();
      load(n);
    }),
  );
});
window.addEventListener("beforeunload", (e) => {
  if (dirty) {
    e.preventDefault();
    e.returnValue = "";
  }
});
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
    e.preventDefault();
    if (dirty && !busy && !$("dialog").open) save();
  }
});
$("library").addEventListener("click", library);
$("background-import").addEventListener("click", backgroundImportDialog);
$("icon-import").addEventListener("click", () =>
  imageImportDialog({ iconMode: true }),
);

async function backgroundImportDialog() {
  return imageImportDialog();
}

function findIconTargets(tree) {
  const targets = [];
  function visit(list, prefix = "", depth = 0) {
    for (const item of list.Content || []) {
      if (item.Kind !== 4) continue;
      const content = item.Content || [];
      for (let i = 0; i < content.length; i += 2) {
        const value = content[i + 1],
          name = prefix + content[i].Value;
        if (value?.Kind === 2) {
          if (current.name === "bookmarks.yaml" && depth > 0) {
            for (const config of value.Content || [])
              if (config.Kind === 4) targets.push({ name, target: config });
          } else visit(value, name + " / ", depth + 1);
        } else if (value?.Kind === 4 && depth > 0)
          targets.push({ name, target: value });
      }
    }
  }
  visit(tree.Content[0]);
  return targets;
}

function externalIconURL(template, name) {
  if (!template.includes("{name}"))
    throw Error("В шаблоне нужна подстановка {name}.");
  if (!name.trim()) throw Error("Введите название логотипа.");
  const url = new URL(
    template.replaceAll("{name}", encodeURIComponent(name.trim())),
  );
  if (
    !["https:", "http:"].includes(url.protocol) ||
    url.username ||
    url.password
  )
    throw Error("Нужна HTTP/HTTPS-ссылка без логина и пароля.");
  if (/[{}]/.test(url.href))
    throw Error("Поддерживается только подстановка {name}.");
  return url.href;
}

function logoThumbnail(name, url) {
  const box = make("span", "logo-thumbnail");
  const fallback = make(
    "span",
    "logo-fallback",
    name.slice(0, 2).toUpperCase(),
  );
  const image = make("img");
  image.alt = name;
  image.setAttribute("loading", "lazy");
  image.decoding = "async";
  image.referrerPolicy = "no-referrer";
  image.addEventListener("error", () => {
    image.remove();
    fallback.classList.remove("hidden");
  });
  image.addEventListener("load", () => fallback.classList.add("hidden"));
  image.src = url;
  box.append(fallback, image);
  return box;
}

let iconIndexPromise;
function loadIconIndex() {
  return (iconIndexPromise ||= api("/icon-index.json").catch((e) => {
    iconIndexPromise = null;
    throw e;
  }));
}

function logoMatches(name, pattern) {
  pattern = pattern.trim().toLowerCase();
  if (!/[?*]/.test(pattern)) return name.toLowerCase().includes(pattern);
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replaceAll("*", ".*")
    .replaceAll("?", ".");
  return new RegExp("^" + escaped + "$", "u").test(name.toLowerCase());
}

function storedIconGallery(onPick) {
  const section = make("section", "hidden logo-browser");
  const search = field("Найти загруженную иконку", make("input"));
  search.type = "search";
  search.id = "stored-icon-search";
  const status = make("p", "hint", "Загрузка…");
  status.setAttribute("role", "status");
  const grid = make("div", "logo-grid");
  grid.id = "stored-icon-grid";
  let items = [],
    matches = [],
    shown = 0,
    request = 0;
  const more = button("Показать ещё", "secondary hidden", append);
  const refresh = button("Обновить список", "secondary", () => section.load());
  refresh.id = "stored-icon-refresh";
  function append() {
    const end = Math.min(shown + 60, matches.length);
    for (const item of matches.slice(shown, end)) {
      const card = button("", "logo-card", () => {
        for (const other of grid.children)
          other.setAttribute("aria-pressed", "false");
        card.setAttribute("aria-pressed", "true");
        onPick(item);
      });
      card.title = item.name;
      card.setAttribute("aria-pressed", "false");
      card.append(
        logoThumbnail(item.name, item.preview),
        make("span", "", item.name),
      );
      grid.append(card);
    }
    shown = end;
    more.classList.toggle("hidden", shown >= matches.length);
    status.textContent = items.length
      ? `Показано ${shown} из ${matches.length}. Выберите иконку и нажмите «Применить иконку».`
      : "В каталоге пока нет иконок. Загрузите их из галереи, по ссылке или с компьютера. Поддерживаются PNG, JPEG, WebP и GIF.";
  }
  function render() {
    matches = items.filter((item) =>
      item.name.toLowerCase().includes(search.value.trim().toLowerCase()),
    );
    shown = 0;
    grid.replaceChildren();
    append();
  }
  search.addEventListener("input", render);
  section.load = async () => {
    const id = ++request;
    refresh.disabled = true;
    status.textContent = "Загрузка…";
    try {
      const data = await api("/api/icons/library");
      if (id !== request || !section.isConnected) return;
      items = data;
      render();
    } catch (e) {
      if (id === request)
        status.textContent = "Не удалось прочитать иконки: " + e.message;
    } finally {
      if (id === request) refresh.disabled = false;
    }
  };
  section.append(search.parentElement, refresh, status, grid, more);
  return section;
}

function logoGallery(onPick) {
  const usesSVG = (entry) =>
    entry?.format === "svg" || /\.svg(?:[?#]|$)/i.test(entry?.template || "");
  const section = make("section", "hidden logo-browser");
  section.id = "logo-gallery";
  const source = field("Каталог иконок", select([]));
  source.id = "gallery-source";
  const query = field(
    "Имя или шаблон",
    make("input"),
    "grafana — содержит слово; grafana* — начинается с него; *grafana* — содержит; ? — один символ. Скачиваются все совпадения, включая ещё не показанные карточки.",
  );
  query.type = "search";
  query.id = "gallery-search";
  query.placeholder = "grafana, proxmox, unifi…";
  const info = make("p", "hint", "Загрузка списка иконок…");
  info.setAttribute("role", "status");
  const credit = make("a", "library-doc");
  credit.target = "_blank";
  credit.rel = "noreferrer noopener";
  const grid = make("div", "logo-grid");
  grid.id = "logo-grid";
  let sources = [],
    matches = [],
    shown = 0;
  let downloading = false,
    controller;
  const batchStatus = make("p", "hint");
  batchStatus.id = "logo-batch-status";
  batchStatus.setAttribute("role", "status");
  const batchResults = make("div", "logo-batch-results");
  const stop = button("Остановить загрузку", "secondary hidden", () =>
    controller?.abort(),
  );
  stop.id = "logo-batch-stop";
  const download = button("Скачать найденные", "secondary", async () => {
    if (
      downloading ||
      !matches.length ||
      usesSVG(sources[Number(source.value)])
    )
      return;
    const entry = sources[Number(source.value)];
    const names = [...matches];
    controller = new AbortController();
    const cancel = () => controller.abort();
    $("dialog").addEventListener("close", cancel, { once: true });
    downloading = true;
    let succeeded = 0,
      failed = 0;
    batchResults.replaceChildren();
    stop.classList.remove("hidden");
    const controls = [
      source,
      query,
      more,
      download,
      ...grid.querySelectorAll("button"),
    ];
    controls.forEach((el) => (el.disabled = true));
    try {
      for (const name of names) {
        if (controller.signal.aborted) break;
        batchStatus.textContent = `Загрузка ${succeeded + failed + 1} из ${names.length}: ${name}`;
        const row = make("p");
        try {
          const result = await api("/api/images/import", {
            method: "POST",
            signal: controller.signal,
            body: JSON.stringify({
              url: externalIconURL(entry.template, name),
              purpose: "icon",
              format: "png",
              maxWidth: 256,
              maxHeight: 256,
            }),
          });
          succeeded++;
          row.append(
            make("strong", "", name + " → "),
            make("code", "", result.path),
          );
        } catch (e) {
          if (controller.signal.aborted) break;
          failed++;
          row.textContent = name + ": " + e.message;
          row.classList.add("error");
        }
        batchResults.append(row);
      }
    } finally {
      batchStatus.textContent = `${controller.signal.aborted ? "Загрузка остановлена." : "Загрузка завершена."} Сохранено: ${succeeded}; ошибок: ${failed}; всего совпадений: ${names.length}. Конфигурация сервисов не изменялась.`;
      downloading = false;
      controls.forEach((el) => (el.disabled = false));
      stop.classList.add("hidden");
      $("dialog").removeEventListener("close", cancel);
      download.disabled =
        !matches.length || usesSVG(sources[Number(source.value)]);
    }
  });
  download.id = "logo-batch-download";
  const more = button("Показать ещё", "secondary hidden", () => append());
  function append() {
    const entry = sources[Number(source.value)];
    if (!entry) return;
    const end = Math.min(shown + 60, matches.length);
    for (const name of matches.slice(shown, end)) {
      let url;
      try {
        url = externalIconURL(entry.template, name);
      } catch {
        continue;
      }
      const remote = usesSVG(entry);
      const card = button("", "logo-card", () => onPick(url, remote));
      card.title =
        (remote ? "Применить SVG по ссылке: " : "Выбрать и загрузить: ") + name;
      card.append(logoThumbnail(name, url), make("span", "", name));
      grid.append(card);
    }
    shown = end;
    more.classList.toggle("hidden", shown >= matches.length);
    info.textContent =
      `Показано ${shown} из ${matches.length}. ` +
      (usesSVG(entry)
        ? "SVG применяется как внешняя ссылка. Локальная конвертация и массовое скачивание SVG пока недоступны."
        : "Нажмите на иконку для загрузки на сервер.");
  }
  function render() {
    grid.replaceChildren();
    shown = 0;
    const entry = sources[Number(source.value)];
    matches = (entry?.names || []).filter((n) => logoMatches(n, query.value));
    download.textContent = `Скачать найденные (${matches.length})`;
    download.disabled = !matches.length || downloading || usesSVG(entry);
    download.classList.toggle("hidden", usesSVG(entry));
    credit.textContent = entry?.repository
      ? "Источник и лицензия: " +
        entry.name +
        (entry.license ? " · " + entry.license : "") +
        " ↗"
      : "Своя база";
    credit.href = entry?.repository || "#";
    credit.classList.toggle("hidden", !entry?.repository);
    append();
  }
  source.addEventListener("change", render);
  query.addEventListener("input", render);
  section.append(
    source.parentElement,
    query.parentElement,
    info,
    credit,
    make(
      "p",
      "hint",
      "Массовая загрузка сохраняет PNG 256 × 256 в каталог иконок на сервере. Пути появятся ниже; сервисы не меняются. Для своей базы нужен список имён.",
    ),
    download,
    stop,
    batchStatus,
    batchResults,
    grid,
    more,
  );
  let loaded = false;
  section.load = async () => {
    if (loaded) return;
    try {
      const index = await loadIconIndex();
      if (!section.isConnected) return;
      sources = index.sources;
      source.replaceChildren(
        ...sources.map((s, i) => {
          const option = make(
            "option",
            "",
            s.name +
              ` (${s.names.length} · ${usesSVG(s) ? "SVG-ссылка" : "загрузка PNG"})`,
          );
          option.value = String(i);
          return option;
        }),
      );
      loaded = true;
      render();
    } catch (e) {
      info.textContent = "Не удалось открыть каталог: " + e.message;
    }
  };
  return section;
}

async function imageImportDialog({ iconMode = false, target = null } = {}) {
  if (
    busy ||
    !current ||
    isCode() ||
    (!iconMode && current.name !== "settings.yaml")
  )
    return;
  const kind = iconMode ? "icon" : "background";
  // Parse unsaved YAML before downloading; never silently discard a broken draft.
  let tree;
  await run(async () => {
    if (mode === "raw") {
      const parsed = await api("/api/convert", {
        method: "POST",
        body: JSON.stringify({ name: current.name, raw: $("raw").value }),
      });
      tree = parsed.tree;
    } else tree = current.tree;
    const config = await api(iconMode ? "/api/icons" : "/api/images");
    const targets = iconMode
      ? target
        ? [{ name: "Текущее поле icon", target }]
        : findIconTargets(tree)
      : [];
    if (iconMode && !targets.length)
      throw Error(
        "Сначала добавьте сервис или закладку, для которых нужна иконка.",
      );
    openDialog(
      iconMode ? "Загрузить иконку" : "Загрузить фон по ссылке",
      "Изображение будет сохранено локально. Применение добавит путь в черновик — затем сохраните изменения.",
    );
    const destination = iconMode
      ? field(
          "Сервис или закладка",
          select(targets.map((t, i) => [String(i), t.name])),
        )
      : null;
    if (destination) destination.id = "icon-destination";
    const source = iconMode
      ? field(
          "Источник",
          select([
            ["url", "По ссылке"],
            ["gallery", "Галерея иконок — выбрать и загрузить"],
            ["stored", "Загруженные иконки"],
            ["file", "Файл с компьютера"],
          ]),
        )
      : null;
    if (source) source.id = "icon-source";
    const urlInput = field(
      "Ссылка на изображение",
      make("input"),
      "Публичная HTTP/HTTPS-ссылка на JPEG, PNG, GIF или WebP; до 20 MiB и 16 Мп.",
    );
    urlInput.type = "url";
    urlInput.placeholder = iconMode
      ? "https://example.com/icon.png"
      : "https://example.com/wallpaper.jpg";
    urlInput.id = kind + "-url";
    const file = iconMode
      ? field(
          "Файл изображения",
          make("input"),
          "JPEG, PNG, GIF или WebP; до 20 MiB. SVG, ICO и AVIF пока не поддерживаются.",
        )
      : null;
    if (file) {
      file.type = "file";
      file.accept = "image/png,image/jpeg,image/webp,image/gif";
      file.id = "icon-file";
      file.parentElement.classList.add("hidden");
    }
    source?.addEventListener("change", () => {
      urlInput.parentElement.classList.toggle(
        "hidden",
        source.value === "file",
      );
      file.parentElement.classList.toggle("hidden", source.value !== "file");
    });
    const format = field(
      "Формат результата",
      select([
        ["webp", "WebP — без потерь"],
        ["jpeg", "JPEG — для фотографий"],
        ["png", "PNG — без потерь, с прозрачностью"],
      ]),
    );
    format.id = kind + "-format";
    if (iconMode) format.value = "png";
    const quality = field("Качество JPEG (1–100)", make("input"));
    quality.id = kind + "-quality";
    quality.type = "number";
    quality.min = "1";
    quality.max = "100";
    quality.value = "85";
    const toggleQuality = () => {
      quality.disabled = format.value !== "jpeg";
    };
    toggleQuality();
    format.addEventListener("change", toggleQuality);
    const width = field("Максимальная ширина, px", make("input"));
    width.id = kind + "-width";
    width.type = "number";
    width.min = "0";
    width.max = "8192";
    width.value = iconMode ? "256" : "2560";
    const height = field(
      "Максимальная высота, px",
      make("input"),
      "Пропорции сохраняются, маленькие изображения не увеличиваются. 0 — без ограничения. GIF превращается в статичный первый кадр; SVG и AVIF не поддерживаются.",
    );
    height.id = kind + "-height";
    height.type = "number";
    height.min = "0";
    height.max = "8192";
    height.value = iconMode ? "256" : "1440";
    const storage = make(
      "p",
      "hint",
      "Каталог: " +
        config.directory +
        ". Этот каталог должен быть доступен Homepage как public/" +
        (iconMode ? "icons" : "images") +
        " (URL: " +
        config.urlPrefix +
        "). В Docker смонтируйте его в /app/public/" +
        (iconMode ? "icons" : "images") +
        ". После добавления нового файла может потребоваться перезапуск Homepage.",
    );
    $("dialog-body").append(storage);
    const error = make("p", "error hidden");
    error.setAttribute("role", "alert");
    $("dialog-body").append(error);
    const result = make("div", "background-result hidden");
    $("dialog-body").append(result);
    const controller = new AbortController();
    const cancel = () => controller.abort();
    $("dialog").addEventListener("close", cancel, { once: true });
    let imported;
    const apply = button(
      iconMode ? "Применить иконку" : "Применить фон",
      "primary hidden",
      () => {
        if (iconMode) {
          const config = targets[Number(destination.value)].target;
          config.Content ||= [];
          const index = config.Content.findIndex(
            (n, i) => i % 2 === 0 && n.Value === "icon",
          );
          if (index < 0)
            config.Content.push(scalar("icon"), scalar(imported.path));
          else
            Object.assign(config.Content[index + 1], scalar(imported.path), {
              Style: 0,
              Alias: null,
            });
        } else {
          const settings = tree.Content[0];
          settings.Content ||= [];
          let background;
          for (let i = 0; i < settings.Content.length; i += 2) {
            if (settings.Content[i].Value === "background") {
              background = settings.Content[i + 1];
              break;
            }
          }
          if (!background) {
            background = node({ image: imported.path });
            settings.Content.push(scalar("background"), background);
          } else if (background.Kind === 4) {
            background.Content ||= [];
            const index = background.Content.findIndex(
              (n, i) => i % 2 === 0 && n.Value === "image",
            );
            if (index < 0)
              background.Content.push(scalar("image"), scalar(imported.path));
            else {
              // Preserve comments attached to the old image value.
              const previous = background.Content[index + 1];
              background.Content[index + 1] = {
                ...scalar(imported.path),
                HeadComment: previous.HeadComment,
                LineComment: previous.LineComment,
                FootComment: previous.FootComment,
                Anchor: previous.Anchor,
              };
            }
          } else if (background.Kind === 8) {
            background.Kind = 8;
            background.Tag = "!!str";
            background.Value = imported.path;
            background.Style = 0;
          } else {
            error.textContent =
              "Фон использует YAML-якорь или неподдерживаемый тип. Измените background вручную на " +
              imported.path;
            error.classList.remove("hidden");
            return;
          }
        }
        current.tree = tree;
        current.error = "";
        mode = "visual";
        mark();
        renderMode();
        $("dialog").close();
        toast(
          (iconMode ? "Иконка добавлена" : "Фон добавлен") +
            " в черновик. Нажмите «Сохранить изменения».",
        );
      },
    );
    const submit = button("Загрузить и конвертировать", "primary", async () => {
      if (
        (source?.value !== "file" &&
          (!urlInput.value.trim() || !urlInput.checkValidity())) ||
        (source?.value === "file" &&
          (!file.files[0] || file.files[0].size > 20 * 1024 * 1024)) ||
        !width.checkValidity() ||
        !height.checkValidity() ||
        (format.value === "jpeg" && !quality.checkValidity())
      ) {
        error.textContent =
          "Проверьте источник (ссылка или файл до 20 MiB), качество и размеры изображения.";
        error.classList.remove("hidden");
        return;
      }
      error.classList.add("hidden");
      result.classList.add("hidden");
      apply.classList.add("hidden");
      submit.disabled = true;
      submit.textContent = "Загрузка и конвертация…";
      const fields = [
        urlInput,
        format,
        quality,
        width,
        height,
        ...(file ? [file, source] : []),
      ];
      fields.forEach((el) => {
        el.disabled = true;
      });
      try {
        const parameters = {
          format: format.value,
          quality: Number(quality.value),
          maxWidth: Number(width.value),
          maxHeight: Number(height.value),
          ...(iconMode ? { purpose: "icon" } : {}),
        };
        const body = source?.value === "file" ? new FormData() : null;
        if (body) {
          body.append("file", file.files[0]);
          body.append("options", JSON.stringify(parameters));
        }
        imported = await api(
          body ? "/api/images/upload" : "/api/images/import",
          {
            method: "POST",
            signal: controller.signal,
            body:
              body ||
              JSON.stringify({ url: urlInput.value.trim(), ...parameters }),
          },
        );
        if (controller.signal.aborted) return;
        result.replaceChildren();
        const preview = make(
          "img",
          iconMode ? "background-preview icon-preview" : "background-preview",
        );
        preview.alt = iconMode
          ? "Предпросмотр загруженной иконки"
          : "Предпросмотр загруженного фона";
        preview.src = imported.preview;
        result.append(
          preview,
          make(
            "p",
            "hint",
            imported.width +
              " × " +
              imported.height +
              " · " +
              imported.format.toUpperCase() +
              " · " +
              (imported.size / 1024).toFixed(1) +
              " KiB",
          ),
          make("code", "background-path", imported.path),
        );
        result.classList.remove("hidden");
        apply.classList.remove("hidden");
      } catch (e) {
        if (!controller.signal.aborted) {
          error.textContent = e.message;
          error.classList.remove("hidden");
        }
      } finally {
        submit.disabled = false;
        submit.textContent = "Загрузить и конвертировать";
        fields.forEach((el) => {
          el.disabled = false;
        });
        toggleQuality();
      }
    });
    if (iconMode) {
      const stored = storedIconGallery((item) => {
        if (source.value !== "stored" || !$("dialog").open) return;
        imported = { path: item.path };
        result.replaceChildren();
        const preview = make("img", "background-preview icon-preview");
        preview.src = item.preview;
        preview.alt = item.name;
        result.append(preview, make("code", "background-path", item.path));
        error.classList.add("hidden");
        result.classList.remove("hidden");
        apply.classList.remove("hidden");
      });
      $("dialog-body").append(stored);
      const gallery = logoGallery((url, remote = false) => {
        if (remote) {
          imported = null;
          apply.classList.add("hidden");
          result.replaceChildren();
          const preview = make("img", "background-preview icon-preview");
          preview.alt = "Выбранная SVG-иконка";
          preview.referrerPolicy = "no-referrer";
          preview.onload = () => {
            if (
              !result.contains(preview) ||
              source.value !== "gallery" ||
              !$("dialog").open
            )
              return;
            imported = { path: url };
            apply.classList.remove("hidden");
          };
          preview.onerror = () => {
            if (!result.contains(preview) || source.value !== "gallery") return;
            error.textContent =
              "Не удалось загрузить SVG. Проверьте доступ к базе иконок.";
            error.classList.remove("hidden");
          };
          result.append(
            preview,
            make(
              "p",
              "hint",
              "В конфигурацию будет добавлена внешняя SVG-ссылка. Для отображения нужен доступ к CDN.",
            ),
            make("code", "background-path", url),
          );
          error.classList.add("hidden");
          result.classList.remove("hidden");
          preview.src = url;
          return;
        }
        urlInput.value = url;
        source.value = "url";
        source.dispatchEvent(new Event("change"));
        submit.click();
      });
      $("dialog-body").append(gallery);
      const updateSource = () => {
        const isGallery = source.value === "gallery";
        const isStored = source.value === "stored";
        stored.classList.toggle("hidden", !isStored);
        if (isStored) stored.load();
        gallery.classList.toggle("hidden", !isGallery);
        if (isGallery) gallery.load();
        $("dialog-description").textContent = isStored
          ? "Выберите уже сохранённую иконку. Скачивать и конвертировать её повторно не нужно."
          : isGallery
            ? "Выберите набор и иконку. PNG скачивается на сервер, SVG применяется как внешняя ссылка."
            : "Изображение будет сохранено локально. Применение добавит путь в черновик — затем сохраните изменения.";
        urlInput.parentElement.classList.toggle(
          "hidden",
          source.value !== "url",
        );
        file.parentElement.classList.toggle("hidden", source.value !== "file");
        for (const input of [format, quality, width, height])
          input.parentElement.classList.toggle("hidden", isGallery || isStored);
        storage.classList.toggle("hidden", isGallery || isStored);
        submit.classList.toggle("hidden", isGallery || isStored);
        result.classList.add("hidden");
        error.classList.add("hidden");
        imported = null;
        apply.classList.add("hidden");
      };
      source.addEventListener("change", updateSource);
      source.value = "gallery";
      updateSource();
    }
    $("dialog-actions").append(
      button("Закрыть", "secondary", () => $("dialog").close()),
      submit,
      apply,
    );
    if (iconMode) $("gallery-search").focus();
    else urlInput.focus();
  });
}

(async () => {
  try {
    const data = await api("/api/files");
    names = data.files;
    const parts = data.directory
      .replaceAll("\\", "/")
      .split("/")
      .filter(Boolean);
    $("directory").textContent =
      parts.length > 2 ? "…/" + parts.slice(-2).join("/") : data.directory;
    $("directory").title = data.directory;
    $("copy-directory").addEventListener("click", async () => {
      try {
        if (navigator.clipboard?.writeText)
          await navigator.clipboard.writeText(data.directory);
        else {
          const input = make("textarea", "clipboard-helper");
          input.value = data.directory;
          document.body.append(input);
          input.select();
          try {
            if (!document.execCommand("copy")) throw Error("copy");
          } finally {
            input.remove();
          }
        }
        toast("Путь скопирован");
      } catch {
        toast("Не удалось скопировать путь: " + data.directory);
      }
    });
    try {
      catalog = await api("/catalog.json");
    } catch {
      toast("Каталог шаблонов недоступен. Редактирование файлов работает.");
    }
    navigation();
    await load(preferredPanelSection(names));
  } catch (e) {
    showError(e.message);
    $("file-status").textContent = "Нет подключения";
    $("file-detail").textContent = "Проверьте сервер";
  }
})();
