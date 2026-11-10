"use strict";
const $ = (id) => document.getElementById(id);
const meta = {
  "settings.yaml": [
    t("Настройки"),
    t("Настройте внешний вид и поведение главной страницы."),
    "⚙",
    "settings",
  ],
  "services.yaml": [
    t("Сервисы"),
    t("Приложения, группы и виджеты ваших сервисов в одном месте."),
    "▦",
    "services",
  ],
  "bookmarks.yaml": [
    t("Закладки"),
    t("Соберите полезные ссылки и распределите их по группам."),
    "⌑",
    "bookmarks",
  ],
  "widgets.yaml": [
    t("Инфовиджеты"),
    t("Поиск, часы, погода и информация о вашей системе."),
    "◫",
    "info-widgets",
  ],
  "docker.yaml": [
    "Docker",
    t("Подключения для обнаружения контейнеров и их статуса."),
    "◇",
    "docker",
  ],
  "kubernetes.yaml": [
    "Kubernetes",
    t("Обнаружение сервисов и настройки подключения к кластеру."),
    "⎈",
    "kubernetes",
  ],
  "proxmox.yaml": [
    "Proxmox",
    t("Подключения к узлам виртуализации Proxmox."),
    "▱",
    "proxmox",
  ],
  "custom.css": [
    t("Стили CSS"),
    t("Добавьте собственные стили для вашего Homepage."),
    "{ }",
    "custom-css-js",
  ],
  "custom.js": [
    t("Скрипты JS"),
    t("Собственный JavaScript, который выполняется в Homepage."),
    "</>",
    "custom-css-js",
  ],
};
const labels = {
  title: [t("Название страницы"), t("Отображается во вкладке браузера")],
  description: [t("Описание"), t("Описание вашей главной страницы")],
  theme: [t("Тема оформления"), t("Светлый или тёмный интерфейс Homepage")],
  color: [t("Цветовая палитра"), t("Основной цвет элементов интерфейса")],
  language: [t("Язык интерфейса"), t("Например: ru, en, de")],
  headerStyle: [t("Стиль заголовка"), t("Оформление заголовков групп")],
  layout: [
    t("Расположение групп"),
    t("Столбцы, вкладки, иконки и порядок групп"),
  ],
  background: [t("Фон страницы"), t("URL изображения или объект с фильтрами")],
  cardBlur: [t("Размытие карточек"), "xs, sm, md, lg, xl…"],
  cardStyle: [t("Обводка карточек"), t("Тень или тонкая рамка")],
  blockStyle: [
    t("Оформление показателей"),
    t("Стиль чисел и подписей внутри виджетов"),
  ],
  font: [t("Шрифт страницы"), t("Основной шрифт или моноширинное оформление")],
  header: [t("Название группы"), t("Показывать заголовок этой группы")],
  initiallyCollapsed: [
    t("Сворачивать при открытии"),
    t("Начальное состояние группы на странице"),
  ],
  tab: [t("Вкладка"), t("На какой вкладке показывать группу")],
  favicon: [t("Иконка страницы"), t("URL или путь к favicon")],
  target: [
    t("Открывать ссылки"),
    t("Где открывать страницу при нажатии на ссылку"),
  ],
  startUrl: [t("Стартовый адрес"), t("Стартовый URL для PWA")],
  base: [t("Базовый URL"), t("Базовый URL вашего Homepage")],
  fullWidth: [t("На всю ширину"), t("Использовать доступную ширину страницы")],
  maxGroupColumns: [t("Максимум колонок"), t("Число колонок для групп")],
  useEqualHeights: [
    t("Одинаковая высота карточек"),
    t("Выравнивать высоту карточек сервисов"),
  ],
  hideVersion: [t("Скрыть версию"), t("Не показывать версию Homepage")],
  disableUpdateCheck: [
    t("Отключить проверку обновлений"),
    t("Не проверять доступность новых версий"),
  ],
  showStats: [t("Статистика контейнеров"), t("Показывать статистику Docker")],
  statusStyle: [t("Стиль статуса"), t("Как показывать доступность сервиса")],
  hideErrors: [
    t("Скрыть ошибки виджетов"),
    t("Скрывать сообщения об ошибках в виджетах"),
  ],
  disableIndexing: [
    t("Запретить индексацию"),
    t("Попросить поисковые системы не индексировать страницу"),
  ],
  instanceName: [
    t("Имя экземпляра"),
    t("Различать несколько экземпляров Homepage"),
  ],
  quicklaunch: [t("Быстрый поиск"), t("Настройки быстрого запуска")],
  providers: [t("Провайдеры"), t("Общие ключи API для виджетов")],
  logpath: [t("Каталог логов"), t("Путь логов в процессе Homepage")],
  disableCollapse: [t("Запретить сворачивание групп"), t("Блокирует сворачивание и раскрытие групп нажатием на заголовок")],
  groupsInitiallyCollapsed: [t("Сворачивать все группы при открытии"), t("Начальное состояние отдельной группы имеет приоритет над этой настройкой")],
  maxBookmarkGroupColumns: [t("Колонки групп закладок"), t("Максимальное число колонок групп закладок на широком экране — до 8")],
  bookmarksStyle: [t("Вид закладок"), t("Отображение закладок: обычные карточки или только иконки")],
  iconStyle: [t("Оформление иконок"), t("Градиентные иконки или одноцветные в цветах темы")],
  pwa: [t("Установка Homepage как приложения"), t("Иконки и ярлыки установленного веб-приложения (PWA)")],
  blockHighlights: [t("Цвета состояний показателей"), t("Оформление нормального, предупреждающего и критического уровней")],
  volumes: [t("Тома Docker (Compose)"), t("Монтирование каталогов контейнера; задаётся в Docker Compose, а не в настройках Homepage")],
  href: [t("Адрес ссылки"), t("URL приложения или закладки")],
  icon: [t("Иконка"), t("Например: jellyfin.png или mdi-server")],
  widget: [
    t("Виджет сервиса"),
    t("Тип, адрес, ключ API и параметры интеграции"),
  ],
  widgets: [t("Виджеты сервиса"), t("Несколько виджетов в одной карточке")],
  server: [t("Сервер"), t("Имя подключения из docker.yaml")],
  container: [t("Контейнер"), t("Имя Docker-контейнера")],
  ping: [t("Проверка доступности"), t("Адрес для проверки доступности")],
  siteMonitor: [t("HTTP-мониторинг"), t("URL для проверки статуса")],
  type: [t("Тип виджета"), t("Идентификатор интеграции Homepage")],
  url: [t("Адрес подключения"), t("URL вашего сервиса")],
  key: [t("Ключ API"), t("Поддерживаются {{HOMEPAGE_VAR_…}}")],
  username: [
    t("Пользователь / ID токена"),
    t("Учётная запись или идентификатор API-токена сервиса"),
  ],
  password: [
    t("Пароль / секрет токена"),
    t("Секрет для подключения к сервису"),
  ],
  node: [t("Узел"), t("Имя узла, например pve-1")],
  version: [t("Версия API"), t("Версия API, поддерживаемая вашим сервисом")],
  enableBlocks: [
    t("Блоки статистики"),
    t("Показывать блоки статистики виджета"),
  ],
  enableNowPlaying: [
    t("Сейчас воспроизводится"),
    t("Показывать текущие медиасеансы"),
  ],
  socket: ["Docker socket", t("Путь сокета внутри контейнера Homepage")],
  fields: [
    t("Показываемые показатели"),
    t("Список показателей виджета и порядок их отображения"),
  ],
  headers: [
    t("Заголовки API"),
    t("Дополнительные HTTP-заголовки для запросов к сервису"),
  ],
  host: [t("Хост"), t("Адрес сервера")],
  port: [t("Порт"), t("Порт подключения")],
  mode: [t("Режим подключения"), t("default или disabled")],
  abbr: [t("Сокращение"), t("Короткая подпись вместо иконки")],
  id: [t("HTML ID"), t("Идентификатор элемента для CSS и JavaScript; должен быть уникальным")],
  style: [
    t("Расположение"),
    t("Строка на всю ширину или вертикальный столбец"),
  ],
  iconsOnly: [t("Только иконки"), t("Показывать закладки группы без подписей")],
  columns: [
    t("Колонки карточек"),
    t("От 1 до 8; используется при расположении в строку"),
  ],
  image: [t("Изображение"), t("Адрес или локальный путь к изображению")],
  blur: [t("Размытие фона"), t("Степень размытия фонового изображения")],
  brightness: [t("Яркость фона"), t("100 — исходная яркость; меньше — темнее")],
  saturate: [t("Насыщенность фона"), t("100 — исходная насыщенность цветов")],
  opacity: [
    t("Непрозрачность фона"),
    t("От 0 — прозрачный до 100 — непрозрачный"),
  ],
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
      t("Базовое оформление"),
      t("Тема, палитра, язык и заголовок"),
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
      t("Макет групп"),
      t("Группы в три колонки"),
      {
        layout: { Инфраструктура: { style: "row", columns: 3 } },
        useEqualHeights: true,
      },
    ],
  ],
  "services.yaml": [
    [
      t("Группа сервисов"),
      t("Группа с примером приложения"),
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
      t("Медиасервер с виджетом"),
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
      t("Docker-сервис"),
      t("Карточка со статусом контейнера"),
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
      t("Группа закладок"),
      t("Ссылки с иконками и сокращениями"),
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
      t("Поиск"),
      t("Поиск через DuckDuckGo"),
      { search: { provider: "duckduckgo", target: "_blank" } },
    ],
    [
      t("Дата и время"),
      t("Часы в формате 24 часа"),
      {
        datetime: {
          text_size: "xl",
          format: { dateStyle: "long", timeStyle: "short", hour12: false },
        },
      },
    ],
    [
      t("Ресурсы"),
      t("CPU, память и диск процесса Homepage"),
      { resources: { cpu: true, memory: true, disk: "/" } },
    ],
    [
      t("Приветствие"),
      t("Текст в верхней части страницы"),
      { greeting: { text_size: "xl", text: "Добро пожаловать домой" } },
    ],
    [
      "Open-Meteo",
      t("Погода без ключа API"),
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
      t("Локальный Docker socket"),
      { "my-docker": { socket: "/var/run/docker.sock" } },
    ],
    [
      "Socket proxy",
      t("Подключение к Docker socket proxy"),
      { "my-docker": { host: "dockerproxy", port: 2375 } },
    ],
  ],
  "kubernetes.yaml": [
    [
      t("Обнаружение сервисов"),
      t("Использовать конфигурацию кластера"),
      { mode: "default" },
    ],
    [
      t("Отключить"),
      t("Отключить интеграцию с кластером"),
      { mode: "disabled" },
    ],
  ],
  "proxmox.yaml": [
    [
      t("Узел Proxmox"),
      t("URL и API-токен"),
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
  meta[n] || [n, t("Дополнительный файл конфигурации Homepage."), "≡", ""];
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
        ? t("Необходима авторизация. Обновите страницу.")
        : t("Сервер вернул неожиданный ответ (") + response.status + ")",
    );
  const data = await response.json();
  if (!response.ok)
    throw Error(
      data.error ? translateApiError(data.error) : t("Ошибка запроса"),
    );
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
    ? t("Будут сохранены settings.yaml и custom.css")
    : t("Сохраняется только текущий файл");
  $("dirty-label").textContent = dirty
    ? t("Есть несохранённые изменения")
    : t("Нет несохранённых изменений");
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
      t("Есть несохранённые изменения. Перейти к другому файлу и потерять их?"),
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
  inlineStretchFiles = null;
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
  $("raw-tab").textContent = isCode() ? t("</> Код") : "</> YAML";
  $("raw-label").textContent = isCode()
    ? (current.name.endsWith("css") ? "CSS" : "JavaScript") + " · UTF-8"
    : "YAML · UTF-8";
  $("file-status").textContent = current.error
    ? t("Ошибка YAML")
    : current.exists
      ? t("Файл подключён")
      : t("Новая конфигурация");
  $("file-detail").textContent = current.error
    ? t("Исправьте исходный код")
    : current.exists
      ? t("Готов к редактированию")
      : t("Будет создан при сохранении");
  $("visual-tab").disabled = isCode();
  $("appearance-open").classList.toggle(
    "hidden",
    current.name !== "settings.yaml",
  );
  $("bookmark-settings-open").classList.toggle("hidden", current.name !== "bookmarks.yaml");
  $("add-root").textContent = ["services.yaml", "bookmarks.yaml"].includes(
    current.name,
  )
    ? t("＋ Добавить группу")
    : current.name === "widgets.yaml"
      ? t("＋ Добавить виджет")
      : current.name === "settings.yaml"
        ? t("＋ Добавить настройку")
        : t("＋ Добавить параметр");
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
  $("editor-expansion-actions").classList.toggle("hidden", !visual);
  if (visual) renderTree();
  else $("raw").value = current.raw;
  if (typeof renderHomepageExtras === "function") renderHomepageExtras();
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
  toast(t("Блок перемещён. Сохраните изменения, чтобы применить порядок."));
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
    t("Переместить блок"),
    t("Выберите группу для «") +
      source.name +
      t("». Блок будет добавлен в конец выбранной группы."),
  );
  const groups = movableGroups.filter(
    (g) => g.parent !== source.parent && canMoveBlock(source, g.parent),
  );
  const destination = field(
    t("Группа"),
    select(groups.map((g, i) => [String(i), g.name])),
  );
  $("dialog-actions").append(
    button(t("Отмена"), "secondary", () => $("dialog").close()),
    button(t("Переместить"), "primary", () => {
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
  handle.title = t("Перетащить блок «") + source.name + "»";
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
    ["↑", -size, t("выше")],
    ["↓", size, t("ниже")],
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
              t("Переместить «") + source.name + "» " + word,
          )
          ?.focus();
      }
    });
    b.disabled =
      delta < 0
        ? source.index === 0
        : source.index + size >= source.parent.Content.length;
    b.title = t("Переместить «") + source.name + "» " + word;
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
    b.title = t("Переместить «") + source.name + t("» в другую группу");
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
    t("Перетащите блок в группу «") + group.name + "»",
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
  prepareEditorExpansion(resetExpansion);
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
        current.exists
          ? t("Пока здесь пусто")
          : t("Начните с удобного шаблона"),
      ),
      make(
        "p",
        "",
        t(
          "Добавьте настройки вручную или выберите шаблон. Файл появится на диске после сохранения.",
        ),
      ),
    );
    wrap.append(
      button(t("Выбрать шаблон"), "primary", () => templates(n)),
      button(t("Добавить вручную"), "secondary", () => addDialog(n)),
    );
    e.append(wrap);
    return;
  }
  renderChildren(n, e, 0);
  e.append(
    make(
      "p",
      "hint",
      t(
        "Тяните блоки за ⠿ или используйте ↑ / ↓. Кнопка ↗ переносит сервис или закладку в другую группу. Порядок записывается после сохранения.",
      ),
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
function fieldCaption(name, parent) {
  if (name === "description") {
    if (serviceInfo(parent)) return [t("Описание"), t("Описание сервиса")];
    if (current.name === "bookmarks.yaml" && findIconTargets(current.tree).some(item => item.target === parent))
      return [t("Описание"), t("Описание закладки")];
  }
  return labels[name];
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
        t("Новый сервис"),
        t("Название и адрес приложения"),
        () => addServiceDialog(context.node),
      ],
      [
        "service-template",
        t("Сервис из каталога"),
        t("Карточка приложения с готовой интеграцией"),
        () => library({ destinationGroup: context.node }),
      ],
    );
  } else {
    actions.push([
      "parameter",
      context.kind === "service"
        ? t("Параметр сервиса")
        : t("Параметр виджета"),
      context.kind === "service"
        ? t("Иконка, описание, мониторинг и другие свойства")
        : t("Настройки выбранной интеграции"),
      () => parameterDialog(context.node),
    ]);
    if (
      context.kind === "widget" ||
      (!mapValue(context.node, "widget") && !mapValue(context.node, "widgets"))
    ) {
      actions.push([
        "widget",
        context.kind === "widget"
          ? t("Добавить ещё один виджет")
          : t("Подключить виджет"),
        t("Выбрать интеграцию из каталога"),
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
      ? t("Добавить в группу")
      : context.kind === "service"
        ? t("Добавить в сервис")
        : t("Настроить виджет"),
    t("Действие относится только к выбранному блоку."),
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
const layoutGroupDefaults = {
  style: "row",
  columns: 4,
  header: true,
  icon: "mdi-folder",
  initiallyCollapsed: false,
  tab: "Main",
  useEqualHeights: true,
  iconsOnly: false,
};
function isLayoutGroup(parent) {
  if (current?.name !== "settings.yaml" || parent?.Kind !== 4) return false;
  const layout = mapValue(root(), "layout");
  function visit(container) {
    if (container?.Kind === 2) return (container.Content || []).some(visit);
    if (container?.Kind !== 4) return false;
    for (let i = 0; i < (container.Content || []).length; i += 2) {
      const child = container.Content[i + 1];
      if (child?.Kind !== 4) continue;
      if (child === parent || visit(child)) return true;
    }
    return false;
  }
  return visit(layout);
}
function parameterTemplates(parent) {
  let examples = [];
  const infoDefaults = typeof infoParameterDefaults === "function" ? infoParameterDefaults(parent) : null;
  if (infoDefaults) examples = [node(infoDefaults)];
  if (
    current.name === "bookmarks.yaml" &&
    findIconTargets(current.tree).some((item) => item.target === parent)
  ) {
    examples = [
      node({
        href: "https://example.com",
        abbr: "HP",
        icon: "mdi-bookmark",
        description: "",
        target: "_blank",
        id: "bookmark-id",
      }),
    ];
  } else if (current.name === "settings.yaml" && parent === root()) {
    examples = [
      node(settingDefaults),
      ...(catalog.settings || []).map((e) => e.tree.Content[0]),
    ];
  } else if (isLayoutGroup(parent)) {
    examples = [node(layoutGroupDefaults)];
  } else if (serviceInfo(parent)) {
    examples = [
      node({
        href: "https://service.example.com",
        icon: "mdi-server",
        description: t("Описание сервиса"),
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
function appendSettingsFields(parent, ...entries) {
  parent.Content ||= [];
  parent.Content.push(...entries);
  if (current.name !== "settings.yaml" || parent.Kind !== 4) return;
  const fields = [], sections = [];
  for (let i = 0; i < parent.Content.length; i += 2) {
    const value = parent.Content[i + 1];
    const container = value.Kind === 4 || value.Kind === 2 || (value.Kind === 16 && [4, 2].includes(value.Alias?.Kind));
    (container ? sections : fields).push(parent.Content[i], value);
  }
  parent.Content = [...fields, ...sections];
}
function parameterDialog(parent) {
  const templates = parameterTemplates(parent);
  if (!templates.length) {
    addDialog(parent);
    return;
  }
  openDialog(
    t("Добавить параметр"),
    t(
      "Выберите готовую настройку. Подходящее поле ввода и начальное значение добавятся автоматически.",
    ),
  );
  const search = field(t("Найти настройку"), make("input"));
  search.type = "search";
  const grid = make("div", "template-grid");
  if (isLayoutGroup(parent)) {
    const findPath = (map, path = []) => {
      for (let i = 0; i < (map?.Content?.length || 0); i += 2) {
        const child = map.Content[i + 1];
        const next = [...path, map.Content[i].Value];
        if (child === parent) return next;
        if (child?.Kind === 4) {
          const found = findPath(child, next);
          if (found) return found;
        }
      }
      return null;
    };
    const path = findPath(mapValue(root(), "layout"));
    const stretch = button("", "template-card", () => {
      $("dialog").close();
      blockOpenStates.set(parent, true);
      renderTree();
    });
    stretch.dataset.parameter = "groupStretch flex grid";
    stretch.append(
      make("strong", "", t("Растягивать группу")),
      make("small", "", t("Настроить ширину группы через custom.css")),
    );
    grid.append(stretch);
  }
  for (const { key, value } of templates) {
    const exists = Boolean(mapValue(parent, key.Value));
    const caption = fieldCaption(key.Value, parent);
    const b = button("", "template-card", () => {
      parent.Content ||= [];
      appendSettingsFields(parent, structuredClone(key), structuredClone(value));
      mark();
      $("dialog").close();
      renderTree();
    });
    b.disabled = exists;
    b.dataset.parameter = key.Value;
    b.append(
      make("strong", "", caption?.[0] || key.Value),
      make(
        "small",
        "",
        exists
          ? t("Уже добавлено")
          : caption?.[1] ||
              value.LineComment ||
              value.HeadComment ||
              (value.Kind === 4
                ? t("Раздел настроек")
                : value.Kind === 2
                  ? t("Список значений")
                  : value.Tag === "!!bool"
                    ? t("Переключатель")
                    : ["!!int", "!!float"].includes(value.Tag)
                      ? t("Числовое поле")
                      : t("Текстовое поле")),
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
    button(t("Своё поле…"), "secondary", () => {
      $("dialog").close();
      addDialog(parent);
    }),
  );
}
function addServiceDialog(group = null) {
  const bookmark = current.name === "bookmarks.yaml";
  openDialog(
    group
      ? bookmark
        ? t("Добавить закладку")
        : t("Добавить сервис")
      : t("Добавить группу"),
    bookmark
      ? t("Укажите название группы или название и адрес закладки.")
      : group
        ? t(
            "Название и адрес приложения. Виджет и остальные настройки можно добавить в его карточке.",
          )
        : t("Группа объединяет сервисы на главной странице."),
  );
  const name = field(t("Название"), make("input"));
  const href = group
    ? field(bookmark ? t("Адрес ссылки") : t("Адрес приложения"), make("input"))
    : null;
  if (href) href.placeholder = "https://service.example.com";
  $("dialog-actions").append(
    button(t("Добавить"), "primary", () => {
      const title = name.value.trim(),
        list = group || root();
      if (!title || list.Content?.some((item) => mapValue(item, title))) {
        toast(t("Укажите уникальное название"));
        return;
      }
      list.Content ||= [];
      list.Content.push(
        node({
          [title]: group
            ? bookmark
              ? [
                  {
                    href: href.value.trim(),
                    abbr: title.slice(0, 2).toUpperCase(),
                  },
                ]
              : { href: href.value.trim(), description: "" }
            : [],
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
        t(
          "В сервисе неоднозначные настройки виджетов. Выберите явную замену или исправьте их в YAML.",
        ),
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
  if (isLayoutGroup(parent)) renderInlineGroupStretch(parent, container);
  const content = parent.Content || [];
  if (
    current.name === "bookmarks.yaml" &&
    parent.Kind === 2 &&
    content.length === 1 &&
    findIconTargets(current.tree).some((item) => item.target === content[0])
  ) {
    renderChildren(content[0], container, depth);
    return;
  }
  if (depth > 24) {
    container.append(
      make(
        "p",
        "hint",
        t("Большая глубина вложенности — используйте YAML-режим."),
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
      let title = t("Элемент ") + (i + 1);
      if (value.Kind === 4 && value.Content?.length)
        title = mapValue(value, "type")?.Value || value.Content[0].Value;
      renderEntry(parent, i, title, value, container, depth);
    });
  }
  const bookmarkGroup =
    current.name === "bookmarks.yaml" &&
    movableGroups.some((group) => group.parent === parent);
  if (bookmarkGroup)
    container.append(
      button(t("＋ Добавить закладку"), "add-inline", () =>
        addServiceDialog(parent),
      ),
    );
  else if (!blockContext(parent) && depth > 0)
    container.append(
      button(
        parent.Kind === 4
          ? parameterTemplates(parent).length
            ? t("＋ Параметр из шаблона")
            : t("＋ Добавить своё поле")
          : t("＋ Добавить элемент"),
        "add-inline",
        () => (parent.Kind === 4 ? parameterDialog(parent) : addDialog(parent)),
      ),
    );
  appendGroupDropzone(parent, container);
}
function fieldChoices(name, parent) {
  const infoChoices = typeof infoFieldChoices === "function" ? infoFieldChoices(name, parent) : null;
  if (infoChoices) return infoChoices;
  if (mapValue(parent, "type")?.Value === "grafana") {
    if (name === "alerts")
      return [
        ["grafana", t("Встроенный Alertmanager Grafana")],
        ["alertmanager", t("Внешний источник с UID alertmanager")],
      ];
    if (name === "version")
      return [
        ["2", t("Grafana новее 10.4")],
        ["1", t("Grafana 10.4 и старше")],
      ];
  }
  if (name === "target")
    return [
      ["_blank", t("В новой вкладке")],
      ["_self", t("В текущей вкладке")],
      ["_parent", t("В родительском окне")],
      ["_top", t("В основном окне")],
    ];
  if (current.name !== "settings.yaml") return null;
  if (isLayoutGroup(parent)) {
    if (name === "style")
      return [
        ["row", t("На всю ширину строки")],
        ["column", t("Вертикальный столбец")],
      ];
    if (name === "columns")
      return Array.from({ length: 8 }, (_, i) => [
        String(i + 1),
        String(i + 1),
      ]);
  }
  if (
    (parent === root() && name === "cardBlur") ||
    (parent === mapValue(root(), "background") && name === "blur")
  )
    return [
      ["", t("Без размытия")],
      ...["xs", "sm", "md", "lg", "xl", "2xl", "3xl"].map((value, i) => [
        value,
        [
          t("Очень слабое"),
          t("Слабое"),
          t("Стандартное"),
          t("Среднее"),
          t("Сильное"),
          t("Очень сильное"),
          t("Максимальное"),
        ][i],
      ]),
    ];
  const top = parent === root();
  if (top && name === "bookmarksStyle")
    return [["default", t("Обычные карточки")], ["icons", t("Только иконки")]];
  if (top && name === "maxBookmarkGroupColumns")
    return [6, 7, 8].map(value => [String(value), String(value)]);
  if (top && name === "theme")
    return [
      ["dark", t("Тёмная")],
      ["light", t("Светлая")],
    ];
  if (top && name === "headerStyle")
    return [
      ["underlined", t("С подчёркиванием")],
      ["boxed", t("В рамке")],
      ["clean", t("Минималистичный")],
      ["boxedWidgets", t("Виджеты в рамке")],
    ];
  if (top && name === "statusStyle")
    return [
      ["dot", t("Цветная точка")],
      ["basic", t("Текстовый статус")],
    ];
  if (top && name === "language")
    return [
      ["ru", t("Русский")],
      ["en", "English"],
      ["de", "Deutsch"],
      ["fr", "Français"],
      ["es", "Español"],
    ];
  if (top && name === "color")
    return [
      ["slate", t("Серо-синий")],
      ["gray", t("Серый")],
      ["zinc", t("Цинковый")],
      ["neutral", t("Нейтральный")],
      ["stone", t("Каменный")],
      ["red", t("Красный")],
      ["orange", t("Оранжевый")],
      ["amber", t("Янтарный")],
      ["yellow", t("Жёлтый")],
      ["lime", t("Лаймовый")],
      ["green", t("Зелёный")],
      ["emerald", t("Изумрудный")],
      ["teal", t("Бирюзовый")],
      ["cyan", t("Голубой")],
      ["sky", t("Небесный")],
      ["blue", t("Синий")],
      ["indigo", t("Индиго")],
      ["violet", t("Фиолетовый")],
      ["purple", t("Пурпурный")],
      ["fuchsia", t("Фуксия")],
      ["pink", t("Розовый")],
      ["rose", t("Розовый коралл")],
    ];
  return null;
}

function advancedFieldDialog(name, value) {
  openDialog(
    t("Дополнительные настройки поля"),
    (labels[name]?.[0] || name) +
      " · " +
      name +
      t(". Обычно способ ввода определяется автоматически."),
  );
  const kind = field(
    t("Как задавать значение"),
    select([
      ["!!str", t("Текст или адрес")],
      ["!!bool", t("Переключатель: включено / выключено")],
      ["!!int", t("Число без дробной части")],
      ["!!float", t("Число с дробной частью")],
      ["!!null", t("Не задавать значение (по умолчанию)")],
    ]),
  );
  kind.value = value.Tag || "!!str";
  $("dialog-actions").append(
    button(t("Отмена"), "secondary", () => $("dialog").close()),
    button(t("Применить"), "primary", () => {
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
    toast(t("Копия добавлена в черновик. Сохраните изменения."));
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
      let next = name + t(" (копия)"),
        i = 2;
      while (names.has(next)) next = name + t(" (копия ") + i++ + ")";
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
    t("Копировать блок"),
    t(
      "Укажите новое имя группы или параметра. Все вложенные настройки будут скопированы.",
    ),
  );
  const title = field(t("Название копии"), make("input"));
  let next = name + t(" (копия)"),
    i = 2;
  while (mapValue(parent, next)) next = name + t(" (копия ") + i++ + ")";
  title.value = next;
  $("dialog-actions").append(
    button(t("Создать копию"), "primary", () => {
      const next = title.value.trim();
      if (!next || mapValue(parent, next)) {
        toast(t("Укажите уникальное название"));
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
    if (!confirm(t("Удалить «") + name + "»?")) return;
    parent.Content.splice(index, parent.Kind === 4 ? 2 : 1);
    mark();
    renderTree();
  };
  if (value.Kind === 4 || value.Kind === 2) {
    const details = make("details", "tree-group");
    details.open =
      blockOpenStates.get(value) ?? savedEditorExpansion(value) ?? panelDefaultOpen(current.name, depth);
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
            (value.Kind === 4 ? t("полей") : t("элементов")),
        ),
      );
    const actions = make("span", "group-actions");
    attachEditorExpansion(details, value, actions);
    attachBlockMovement(details, summary, actions, source);
    const duplicate = button("⧉", "duplicate-block", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      duplicateBlock(parent, index, name, value);
    });
    duplicate.title = t("Создать копию «") + name + "»";
    duplicate.setAttribute("aria-label", duplicate.title);
    actions.append(duplicate);
    if(current.name === "bookmarks.yaml" && movableGroups.some(group=>group.parent===value)) {
      const settings=button("⚙", "bookmark-group-settings", event=>{
        event.preventDefault();event.stopPropagation();openBookmarkSettings(name);
      });
      settings.title=t("Настройки этой группы");settings.setAttribute("aria-label",settings.title);
      actions.append(settings);
    }
    const context = blockContext(value);
    if (context) {
      const role = make(
        "span",
        "block-role",
        {
          group: t("Группа"),
          service: t("Сервис"),
          widget: t("Виджет"),
          widgets: t("Виджеты"),
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
          ? t("Добавить сервис в эту группу")
          : context.kind === "widgets"
            ? t("Добавить виджет в этот сервис")
            : context.kind === "widget"
              ? t("Настроить этот виджет")
              : t("Добавить параметры сервиса");
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
            t("Пользователь Grafana"),
            t(
              "Логин пользователя с правами серверного администратора. Это не имя service account.",
            ),
          ],
          password: [
            t("Пароль пользователя Grafana"),
            t(
              "Для /api/admin/stats нужен пароль пользователя; токен service account не поддерживается.",
            ),
          ],
          alerts: [
            t("Источник оповещений"),
            t(
              "Обычно встроенный Grafana. Внешний источник выбирайте только если он настроен.",
            ),
          ],
          version: [
            t("Совместимость виджета"),
            t("Версия 2 — для Grafana новее 10.4, включая 12.x."),
          ],
          url: [
            t("Адрес Grafana"),
            t(
              "Полный адрес с http:// или https://, например http://192.168.2.2:3000",
            ),
          ],
        }[name]
      : null) || fieldCaption(name, parent);
  const label = make("label", "field-label"),
    id = "field-" + ++renderEntry.id;
  label.htmlFor = id;
  label.append(
    make("strong", "", caption?.[0] || name),
    make(
      "small",
      "",
      caption ? caption[1] : value.HeadComment || t("Параметр конфигурации"),
    ),
  );
  const control = make("div", "field-input");
  if (value.Kind === 16) {
    control.append(
      make(
        "span",
        "hint",
        t("Ссылка на YAML-якорь: *") +
          value.Value +
          t(" · редактируется в YAML"),
      ),
    );
  } else {
    const bool = value.Tag === "!!bool",
      multiline = value.Value?.includes("\n"),
      secret = /key|token|secret|password|authorization/i.test(name);
    const choices =
      (value.Tag === "!!str" ||
        (current.name === "widgets.yaml" && value.Tag === "!!int") ||
        (current.name === "settings.yaml" && name === "maxBookmarkGroupColumns" && value.Tag === "!!int") ||
        (grafana && name === "version" && value.Tag === "!!int") ||
        (isLayoutGroup(parent) &&
          name === "columns" &&
          value.Tag === "!!int")) &&
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
        const custom = make(
          "option",
          "",
          (isLayoutGroup(parent) &&
          ["style", "columns"].includes(name) &&
          !value.Value.includes("{{")
            ? t("Неподдерживаемое значение: ")
            : t("Другое: ")) + value.Value,
        );
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
        input.placeholder = t("По умолчанию");
      }
    }
    input.addEventListener("input", () => {
      value.Value = bool ? String(input.checked) : input.value;
      if (
        isLayoutGroup(parent) &&
        name === "columns" &&
        choices?.some(([v]) => v === input.value)
      )
        value.Tag = "!!int";
      value.Style = 0;
      if (bool) {
        input.setAttribute("aria-checked", String(input.checked));
        control.querySelector(".switch-state").textContent = input.checked
          ? t("Включено")
          : t("Выключено");
      }
      mark();
      if (name === "provider" && input.value === "custom" &&
          typeof infoFieldContext === "function" &&
          infoFieldContext(parent)?.type === "search" &&
          infoFieldContext(parent)?.path.length === 0 && !mapValue(parent, "url")) {
        appendSettingsFields(parent, scalar("url"), scalar(""));
        renderTree();
      }
    });
    control.append(input);
    if (bool)
      control.append(
        make(
          "span",
          "switch-state",
          input.checked ? t("Включено") : t("Выключено"),
        ),
      );
    if (value.Tag === "!!null")
      control.append(
        button(t("Задать"), "soft-button", () => {
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
    extra.title = t("Дополнительные настройки: ") + name;
    extra.setAttribute("aria-label", extra.title);
    rowActions.append(extra);
  }
  if (name === "icon" && parent.Kind === 4) {
    const upload = button("▧", "icon-upload-button", () =>
      imageImportDialog({ iconMode: true, target: parent }),
    );
    upload.title = t("Выбрать иконку: ссылка, файл или сторонняя база");
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
    parent.Kind === 4 ? t("Добавить параметр") : t("Добавить элемент"),
    t("Любые поля Homepage доступны через вложенные объекты и списки."),
  );
  let name;
  if (parent.Kind === 4) {
    name = field(
      t("Имя параметра"),
      make("input"),
      current.name === "settings.yaml"
        ? t("Выберите известный параметр или введите своё имя.")
        : t("Имя поля в конфигурации Homepage"),
    );
    name.placeholder = t("Например: title");
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
    t("Как задавать значение"),
    select([
      ["auto", t("Определить автоматически")],
      ["map", t("Раздел с вложенными настройками")],
      ["seq", t("Список элементов")],
      ["bool", t("Переключатель")],
      ["int", t("Целое число")],
      ["float", t("Число")],
      ["null", t("Не задавать значение (по умолчанию)")],
    ]),
  );
  const advanced = make("details", "advanced-options");
  advanced.append(
    make("summary", "", t("Дополнительные настройки")),
    type.parentElement,
  );
  $("dialog-body").append(advanced);
  const value = field(
    t("Значение"),
    make("input"),
    t("Для объекта и списка поля можно добавить после создания."),
  );
  value.placeholder = t("Значение параметра");
  $("dialog-actions").append(
    button(t("Отмена"), "secondary", () => $("dialog").close()),
    button(t("Добавить"), "primary", () => {
      const k = name?.value.trim();
      if (
        parent.Kind === 4 &&
        (!k || parent.Content.some((n, i) => i % 2 === 0 && n.Value === k))
      ) {
        toast(t("Укажите уникальное имя параметра"));
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
          toast(t("Введите корректное число"));
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
      if (parent.Kind === 4) appendSettingsFields(parent, scalar(k), v);
      else parent.Content.push(v);
      mark();
      $("dialog").close();
      renderTree();
    }),
  );
  name?.focus();
}
function renameDialog(key) {
  openDialog(
    t("Переименовать"),
    t("Название группы или параметра в конфигурации."),
  );
  const input = field(t("Название"), make("input"));
  input.value = key.Value;
  $("dialog-actions").append(
    button(t("Применить"), "primary", () => {
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
    t("Добавить из шаблона"),
    t("Шаблон — отправная точка. Измените адреса и ключи перед сохранением."),
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
          toast(
            t("Уже есть поля: ") + collisions.map((k) => k.Value).join(", "),
          );
          return;
        }
        appendSettingsFields(parent, ...n.Content);
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
      button(t("Весь каталог Homepage →"), "template-card", () => {
        $("dialog").close();
        library();
      }),
    );
  grid.append(
    button(t("Пустой объект / своё поле"), "template-card", () => {
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
    t("Каталог Homepage"),
    entries.length +
      t(" примеров из официальной документации · снимок ") +
      catalog.snapshot +
      t(". Параметры можно изменить после добавления."),
  );
  let group, service, attachMode;
  if (current.name === "services.yaml") {
    if (serviceTarget) {
      if (
        mapValue(serviceTarget, "widget") ||
        mapValue(serviceTarget, "widgets")
      ) {
        attachMode = field(
          t("Что сделать"),
          select([
            ["append", t("Добавить ещё один виджет, сохранив текущий")],
            ["replace", t("Заменить существующие виджеты")],
          ]),
        );
        attachMode.id = "widget-attach-mode";
      }
      $("dialog-description").textContent = t(
        "Выберите интеграцию для текущего сервиса. Её параметры появятся внутри карточки; адрес, иконка и мониторинг сохранятся.",
      );
    } else {
      if (!destinationGroup) {
        group = field(t("Группа сервисов"), make("input"));
        group.value = t("Сервисы");
      } else
        $("dialog-description").textContent = t(
          "Сервис будет добавлен в выбранную группу. Укажите название и выберите интеграцию.",
        );
      service = field(
        t("Название сервиса"),
        make("input"),
        t("Оставьте пустым, чтобы использовать название интеграции."),
      );
      service.placeholder = t("Название интеграции");
    }
  }
  const search = field(t("Найти интеграцию или параметр"), make("input"));
  search.type = "search";
  search.placeholder = "Jellyfin, Proxmox, layout…";
  const grid = make("div", "template-grid");
  const groups = new Map();
  for (const item of entries) {
    const key = item.slug;
    if (!groups.has(key)) groups.set(key, []);
    const variants = groups.get(key);
    if (!variants.some((variant) => variant.example === item.example))
      variants.push(item);
  }
  for (const variants of groups.values()) {
    let entry = variants[0];
    const wrap = make("div", "library-entry");
    wrap.dataset.catalogKey = entry.slug;
    const b = button("", "template-card", () => {
      const n = structuredClone(entry.tree.Content[0]),
        r = root();
      r.Content ||= [];
      if (current.name === "services.yaml") {
        if (serviceTarget) {
          const widget = mapValue(n, "widget");
          if (!widget) {
            toast(t("В этом шаблоне нет настроек виджета"));
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
            t(
              "Виджет добавлен в сервис. Укажите адрес и ключи, затем сохраните изменения.",
            ),
          );
          return;
        }
        const groupName = destinationGroup ? "" : group.value.trim(),
          serviceName = service.value.trim() || entry.title;
        if (!destinationGroup && !groupName) {
          toast(t("Укажите название группы"));
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
          toast(t("В этой группе уже есть сервис с таким названием"));
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
          icon: (entry.slug.startsWith("unifi-") ? "unifi" : entry.slug) + ".png",
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
            t("Поле ") +
              collision.Value +
              t(" уже существует. Измените его в редакторе."),
          );
          return;
        }
        appendSettingsFields(r, ...n.Content);
      }
      mark();
      $("dialog").close();
      renderTree();
      toast(t("Шаблон добавлен. Укажите адреса и ключи своего сервиса."));
    });
    if (current.name === "services.yaml") {
      const aliases = {
        "unifi-customapi": "unifi",
        proxmoxbackupserver: "proxmox",
        unifi: "unifi",
        truenas: "truenas",
      };
      b.append(
        logoThumbnail(
          entry.title,
          "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/" +
            encodeURIComponent(entry.slug.startsWith("unifi-") ? "unifi" : aliases[entry.slug] || entry.slug) +
            ".png",
        ),
      );
    }
    const setting = current.name === "settings.yaml";
    const label = setting ? labels[entry.slug] : null;
    b.append(make("strong", "", label?.[0] || entry.title));
    if (label?.[1]) b.append(make("small", "", label[1]));
    else if (entry.slug !== entry.title)
      b.append(make("small", "", entry.slug));
    const link = make("a", "library-doc", t("Документация ↗"));
    link.href = entry.url;
    link.target = "_blank";
    link.rel = "noreferrer";
    wrap.append(b, link);
    const added = make("span", "catalog-added", t("Уже добавлено"));
    wrap.insertBefore(added, link);
    const updateAvailability = () => {
      const template = entry.tree.Content[0];
      const exists =
        root().Kind === 4 &&
        template.Kind === 4 &&
        (template.Content || []).some(
          (key, index) =>
            index % 2 === 0 && Boolean(mapValue(root(), key.Value)),
        );
      b.disabled = exists;
      added.classList.toggle("hidden", !exists);
      wrap.classList.toggle("catalog-entry-added", exists);
      b.title = exists
        ? t("Параметр уже есть в конфигурации. Измените его в редакторе.")
        : "";
    };
    updateAvailability();
    if (variants.length > 1) {
      const options = select(
        variants.map((variant, index) => [
          String(index),
          t("Вариант {0}", index + 1),
        ]),
      );
      options.setAttribute("aria-label", t("Вариант шаблона"));
      const preview = make("pre", "catalog-example", entry.example);
      options.addEventListener("change", () => {
        entry = variants[Number(options.value)];
        preview.textContent = entry.example;
        link.href = entry.url;
        updateAvailability();
      });
      wrap.insertBefore(options, link);
      wrap.insertBefore(preview, link);
    }
    wrap.dataset.search = (
      entry.title +
      " " +
      entry.slug +
      " " +
      (label || []).join(" ")
    )
      .trim()
      .toLowerCase();
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
        ? t("Укажите полный URL с http:// или https:// в поле «")
        : t("Укажите корректное число в поле «")) +
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
        : current.name === "bookmarks.yaml"
          ? await saveBookmarksWithAppearance(payload)
          : await api("/api/file", {
            method: "PUT",
            body: JSON.stringify(payload),
          });
    const previousMode = mode;
    install(d);
    mode = previousMode;
    renderMode();
    toast(t("Сохранено. Обновите страницу Homepage, чтобы увидеть изменения."));
  });
}
async function review() {
  await run(async () => {
    const raw = await serialized();
    openDialog(
      t("Изменения перед сохранением"),
      current.name + t(" · данные на диске и текущая версия"),
    );
    const diff = make("div", "diff");
    const oldLines = original.split("\n"),
      newLines = raw.split("\n");
    for (const [title, lines, other, cls] of [
      [t("На диске"), oldLines, newLines, "removed"],
      [t("После сохранения"), newLines, oldLines, "added"],
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
        make("h4", "", t("Изменения оформления · custom.css")),
      );
      const cssDiff = make("div", "diff");
      for (const [title, raw] of [
        [t("На диске"), pendingAppearanceCSS.original],
        [t("После сохранения"), pendingAppearanceCSS.raw],
      ]) {
        const col = make("div");
        col.append(make("h4", "", title), make("pre", "", raw));
        cssDiff.append(col);
      }
      $("dialog-body").append(cssDiff);
    }
    $("dialog-actions").append(
      button(t("Продолжить редактирование"), "secondary", () =>
        $("dialog").close(),
      ),
      button(t("Сохранить изменения"), "primary", () => {
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
      t("История изменений"),
      t("Предыдущие версии ") +
        current.name +
        t(". Восстановление сначала загружает копию в редактор."),
    );
    if (!entries.length)
      $("dialog-body").append(
        make(
          "p",
          "hint",
          t(
            "Пока нет резервных копий. Они появятся после изменения существующего файла.",
          ),
        ),
      );
    for (const entry of entries) {
      const row = make("div", "history-row");
      const label = make(
        "div",
        "",
        new Date(entry.time).toLocaleString(
          panelLanguage === "en" ? "en-US" : "ru-RU",
        ),
      );
      label.append(make("small", "", entry.size + t(" байт")));
      row.append(
        label,
        button(t("Загрузить в редактор"), "secondary", async () => {
          if (
            dirty &&
            !confirm(t("Заменить несохранённые изменения резервной копией?"))
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
              t("Копия в редакторе. Проверьте и сохраните для восстановления."),
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
  if (!dirty || confirm(t("Отменить изменения и загрузить файл с диска?")))
    load(current.name, true);
});
$("search").addEventListener("input", filter);
$("add-root").addEventListener("click", () => {
  if (["services.yaml", "bookmarks.yaml"].includes(current.name))
    addServiceDialog();
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
    toast(t("Конфигурация скачана"));
  }),
);
$("new-file").addEventListener("click", () => {
  openDialog(
    t("Дополнительный YAML"),
    t(
      "Создайте файл для подключаемой конфигурации. Homepage должен быть настроен на его использование отдельно.",
    ),
  );
  const name = field(t("Имя файла"), make("input"));
  name.placeholder = "extra-services.yaml";
  $("dialog-actions").append(
    button(t("Открыть файл"), "primary", () => {
      const n = name.value.trim();
      if (!/^[\p{L}\p{N}_-][\p{L}\p{N}_. -]*\.ya?ml$/u.test(n)) {
        toast(t("Введите имя файла с расширением .yaml или .yml"));
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
    throw Error(t("В шаблоне нужна подстановка {name}."));
  if (!name.trim()) throw Error(t("Введите название логотипа."));
  const url = new URL(
    template.replaceAll("{name}", encodeURIComponent(name.trim())),
  );
  if (
    !["https:", "http:"].includes(url.protocol) ||
    url.username ||
    url.password
  )
    throw Error(t("Нужна HTTP/HTTPS-ссылка без логина и пароля."));
  if (/[{}]/.test(url.href))
    throw Error(t("Поддерживается только подстановка {name}."));
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
  const search = field(t("Найти загруженную иконку"), make("input"));
  search.type = "search";
  search.id = "stored-icon-search";
  const status = make("p", "hint", t("Загрузка…"));
  status.setAttribute("role", "status");
  const grid = make("div", "logo-grid");
  grid.id = "stored-icon-grid";
  let items = [],
    matches = [],
    shown = 0,
    request = 0;
  const more = button(t("Показать ещё"), "secondary hidden", append);
  const refresh = button(t("Обновить список"), "secondary", () =>
    section.load(),
  );
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
      ? t(
          "Показано {0} из {1}. Выберите иконку и нажмите «Применить иконку».",
          shown,
          matches.length,
        )
      : t(
          "В каталоге пока нет иконок. Загрузите их из галереи, по ссылке или с компьютера. Поддерживаются PNG, JPEG, WebP и GIF.",
        );
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
    status.textContent = t("Загрузка…");
    try {
      const data = await api("/api/icons/library");
      if (id !== request || !section.isConnected) return;
      items = data;
      render();
    } catch (e) {
      if (id === request)
        status.textContent = t("Не удалось прочитать иконки: ") + e.message;
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
  const source = field(t("Каталог иконок"), select([]));
  source.id = "gallery-source";
  const query = field(
    t("Имя или шаблон"),
    make("input"),
    t(
      "grafana — содержит слово; grafana* — начинается с него; *grafana* — содержит; ? — один символ. Скачиваются все совпадения, включая ещё не показанные карточки.",
    ),
  );
  query.type = "search";
  query.id = "gallery-search";
  query.placeholder = "grafana, proxmox, unifi…";
  const info = make("p", "hint", t("Загрузка списка иконок…"));
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
  const stop = button(t("Остановить загрузку"), "secondary hidden", () =>
    controller?.abort(),
  );
  stop.id = "logo-batch-stop";
  const download = button(t("Скачать найденные"), "secondary", async () => {
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
        batchStatus.textContent = t(
          "Загрузка {0} из {1}: {2}",
          succeeded + failed + 1,
          names.length,
          name,
        );
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
      batchStatus.textContent = t(
        "{0} Сохранено: {1}; ошибок: {2}; всего совпадений: {3}. Конфигурация сервисов не изменялась.",
        controller.signal.aborted
          ? t("Загрузка остановлена.")
          : t("Загрузка завершена."),
        succeeded,
        failed,
        names.length,
      );
      downloading = false;
      controls.forEach((el) => (el.disabled = false));
      stop.classList.add("hidden");
      $("dialog").removeEventListener("close", cancel);
      download.disabled =
        !matches.length || usesSVG(sources[Number(source.value)]);
    }
  });
  download.id = "logo-batch-download";
  const more = button(t("Показать ещё"), "secondary hidden", () => append());
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
        (remote ? t("Применить SVG по ссылке: ") : t("Выбрать и загрузить: ")) +
        name;
      card.append(logoThumbnail(name, url), make("span", "", name));
      grid.append(card);
    }
    shown = end;
    more.classList.toggle("hidden", shown >= matches.length);
    info.textContent =
      t("Показано {0} из {1}. ", shown, matches.length) +
      (usesSVG(entry)
        ? t(
            "SVG применяется как внешняя ссылка. Локальная конвертация и массовое скачивание SVG пока недоступны.",
          )
        : t("Нажмите на иконку для загрузки на сервер."));
  }
  function render() {
    grid.replaceChildren();
    shown = 0;
    const entry = sources[Number(source.value)];
    matches = (entry?.names || []).filter((n) => logoMatches(n, query.value));
    download.textContent = t("Скачать найденные ({0})", matches.length);
    download.disabled = !matches.length || downloading || usesSVG(entry);
    download.classList.toggle("hidden", usesSVG(entry));
    credit.textContent = entry?.repository
      ? t("Источник и лицензия: ") +
        entry.name +
        (entry.license ? " · " + entry.license : "") +
        " ↗"
      : t("Своя база");
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
      t(
        "Массовая загрузка сохраняет PNG 256 × 256 в каталог иконок на сервере. Пути появятся ниже; сервисы не меняются. Для своей базы нужен список имён.",
      ),
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
              ` (${s.names.length} · ${usesSVG(s) ? t("SVG-ссылка") : t("загрузка PNG")})`,
          );
          option.value = String(i);
          return option;
        }),
      );
      loaded = true;
      render();
    } catch (e) {
      info.textContent = t("Не удалось открыть каталог: ") + e.message;
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
        ? [{ name: t("Текущее поле icon"), target }]
        : findIconTargets(tree)
      : [];
    if (iconMode && !targets.length)
      throw Error(
        t("Сначала добавьте сервис или закладку, для которых нужна иконка."),
      );
    openDialog(
      iconMode ? t("Загрузить иконку") : t("Загрузить фон по ссылке"),
      t(
        "Изображение будет сохранено локально. Применение добавит путь в черновик — затем сохраните изменения.",
      ),
    );
    const destination = iconMode
      ? field(
          t("Сервис или закладка"),
          select(targets.map((t, i) => [String(i), t.name])),
        )
      : null;
    if (destination) destination.id = "icon-destination";
    const source = iconMode
      ? field(
          t("Источник"),
          select([
            ["url", t("По ссылке")],
            ["gallery", t("Галерея иконок — выбрать и загрузить")],
            ["stored", t("Загруженные иконки")],
            ["file", t("Файл с компьютера")],
          ]),
        )
      : null;
    if (source) source.id = "icon-source";
    const urlInput = field(
      t("Ссылка на изображение"),
      make("input"),
      t(
        "Публичная HTTP/HTTPS-ссылка на JPEG, PNG, GIF или WebP; до 20 MiB и 16 Мп.",
      ),
    );
    urlInput.type = "url";
    urlInput.placeholder = iconMode
      ? "https://example.com/icon.png"
      : "https://example.com/wallpaper.jpg";
    urlInput.id = kind + "-url";
    const file = iconMode
      ? field(
          t("Файл изображения"),
          make("input"),
          t(
            "JPEG, PNG, GIF или WebP; до 20 MiB. SVG, ICO и AVIF пока не поддерживаются.",
          ),
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
      t("Формат результата"),
      select([
        ["webp", t("WebP — без потерь")],
        ["jpeg", t("JPEG — для фотографий")],
        ["png", t("PNG — без потерь, с прозрачностью")],
      ]),
    );
    format.id = kind + "-format";
    if (iconMode) format.value = "png";
    const quality = field(t("Качество JPEG (1–100)"), make("input"));
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
    const width = field(t("Максимальная ширина, px"), make("input"));
    width.id = kind + "-width";
    width.type = "number";
    width.min = "0";
    width.max = "8192";
    width.value = iconMode ? "256" : "2560";
    const height = field(
      t("Максимальная высота, px"),
      make("input"),
      t(
        "Пропорции сохраняются, маленькие изображения не увеличиваются. 0 — без ограничения. GIF превращается в статичный первый кадр; SVG и AVIF не поддерживаются.",
      ),
    );
    height.id = kind + "-height";
    height.type = "number";
    height.min = "0";
    height.max = "8192";
    height.value = iconMode ? "256" : "1440";
    const storage = make(
      "p",
      "hint",
      t("Каталог: ") +
        config.directory +
        t(". Этот каталог должен быть доступен Homepage как public/") +
        (iconMode ? "icons" : "images") +
        " (URL: " +
        config.urlPrefix +
        t("). В Docker смонтируйте его в /app/public/") +
        (iconMode ? "icons" : "images") +
        t(
          ". После добавления нового файла может потребоваться перезапуск Homepage.",
        ),
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
      iconMode ? t("Применить иконку") : t("Применить фон"),
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
              t(
                "Фон использует YAML-якорь или неподдерживаемый тип. Измените background вручную на ",
              ) + imported.path;
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
          (iconMode ? t("Иконка добавлена") : t("Фон добавлен")) +
            t(" в черновик. Нажмите «Сохранить изменения»."),
        );
      },
    );
    const submit = button(
      t("Загрузить и конвертировать"),
      "primary",
      async () => {
        if (
          (source?.value !== "file" &&
            (!urlInput.value.trim() || !urlInput.checkValidity())) ||
          (source?.value === "file" &&
            (!file.files[0] || file.files[0].size > 20 * 1024 * 1024)) ||
          !width.checkValidity() ||
          !height.checkValidity() ||
          (format.value === "jpeg" && !quality.checkValidity())
        ) {
          error.textContent = t(
            "Проверьте источник (ссылка или файл до 20 MiB), качество и размеры изображения.",
          );
          error.classList.remove("hidden");
          return;
        }
        error.classList.add("hidden");
        result.classList.add("hidden");
        apply.classList.add("hidden");
        submit.disabled = true;
        submit.textContent = t("Загрузка и конвертация…");
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
            ? t("Предпросмотр загруженной иконки")
            : t("Предпросмотр загруженного фона");
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
          submit.textContent = t("Загрузить и конвертировать");
          fields.forEach((el) => {
            el.disabled = false;
          });
          toggleQuality();
        }
      },
    );
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
          preview.alt = t("Выбранная SVG-иконка");
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
            error.textContent = t(
              "Не удалось загрузить SVG. Проверьте доступ к базе иконок.",
            );
            error.classList.remove("hidden");
          };
          result.append(
            preview,
            make(
              "p",
              "hint",
              t(
                "В конфигурацию будет добавлена внешняя SVG-ссылка. Для отображения нужен доступ к CDN.",
              ),
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
          ? t(
              "Выберите уже сохранённую иконку. Скачивать и конвертировать её повторно не нужно.",
            )
          : isGallery
            ? t(
                "Выберите набор и иконку. PNG скачивается на сервер, SVG применяется как внешняя ссылка.",
              )
            : t(
                "Изображение будет сохранено локально. Применение добавит путь в черновик — затем сохраните изменения.",
              );
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
      button(t("Закрыть"), "secondary", () => $("dialog").close()),
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
        toast(t("Путь скопирован"));
      } catch {
        toast(t("Не удалось скопировать путь: ") + data.directory);
      }
    });
    try {
      catalog = await api("/catalog.json");
    } catch {
      toast(t("Каталог шаблонов недоступен. Редактирование файлов работает."));
    }
    navigation();
    await load(preferredPanelSection(names));
  } catch (e) {
    showError(e.message);
    $("file-status").textContent = t("Нет подключения");
    $("file-detail").textContent = t("Проверьте сервер");
  }
})();
