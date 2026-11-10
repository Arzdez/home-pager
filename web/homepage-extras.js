"use strict";
const homepageExtrasPattern = /\/\* HOME-PAGER EXTRAS START \*\/[\s\S]*?\/\* HOME-PAGER EXTRAS END \*\//g;
function homepageExtrasRuntime(options) {
  window.__homePagerExtrasCleanup?.();
  window.__homePagerPortsCleanup?.();
  const clocks = new Map();
  const copyCards = new Map();
  const clockSettings = options.clocks?.length ? options.clocks : [{ label: "", timeZone: "", seconds: false }];
  const ru = (document.documentElement.lang || navigator.language).startsWith("ru");
  async function copy(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    const area = document.createElement("textarea");
    area.value = text;
    area.style.cssText = "position:fixed;opacity:0;pointer-events:none";
    document.body.append(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    if (!ok) throw Error("Clipboard unavailable");
  }
  function update() {
    if (options.collapseGroups) {
      const host = document.querySelector("#widgets-wrap");
      if (host && !document.querySelector("[data-home-pager-groups]")) {
        const actions = document.createElement("div");
        actions.dataset.homePagerGroups = "";
        actions.style.cssText = "display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:4px 0";
        for (const [collapse, title] of [[true, ru ? "Свернуть все группы" : "Collapse all groups"], [false, ru ? "Развернуть все группы" : "Expand all groups"]]) {
          const button = document.createElement("button");
          button.type = "button";
          button.textContent = title;
          button.dataset.groupAction = collapse ? "collapse" : "expand";
          button.style.cssText = "padding:6px 10px;font-size:12px;color:inherit;background:rgba(128,128,128,.12);border:1px solid rgba(128,128,128,.25);border-radius:6px;cursor:pointer";
          button.onclick = () => {
            const headings = [...document.querySelectorAll(".service-group-name, .bookmark-group-name")];
            const buttons = new Set(headings.map(heading => heading.closest("button")).filter(Boolean));
            for (const heading of buttons) {
              if (!heading.disabled && heading.getAttribute("aria-expanded") === String(collapse)) heading.click();
            }
          };
          actions.append(button);
        }
        host.append(actions);
      }
    }
    if (options.clock) {
      const host = document.querySelector("#widgets-wrap");
      if (host) clockSettings.forEach((config, index) => {
        let clock = clocks.get(index);
        if (!clock || !clock.isConnected) {
        clock = document.createElement("time");
        clock.dataset.homePagerClock = "";
        clock.style.cssText = "font-variant-numeric:tabular-nums;align-self:center;padding:8px 12px;font-size:1.25rem";
        clock.setAttribute("aria-label", ru ? "Текущее время" : "Current time");
        host.append(clock);
        clocks.set(index, clock);
        }
        const now = new Date();
        const format = { hour: "2-digit", minute: "2-digit", ...(config.seconds === true ? { second: "2-digit" } : {}), ...(config.timeZone ? { timeZone: config.timeZone } : {}) };
        let time;
        try { time = now.toLocaleTimeString(undefined, format); }
        catch { delete format.timeZone; time = now.toLocaleTimeString(undefined, format); }
        clock.dateTime = now.toISOString();
        clock.textContent = (config.label ? config.label + " · " : "") + time;
        const timeZone = format.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;
        const zonePart = style => {
          try { return new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: style }).formatToParts(now).find(part => part.type === "timeZoneName")?.value || ""; }
          catch { return ""; }
        };
        const suffix = [];
        if (config.zoneAbbreviation) {
          const aliases = { "Europe/Moscow": "MSK", "Europe/Saratov": "SAMT", "Asia/Tokyo": "JST", "UTC": "UTC" };
          const abbreviation = aliases[timeZone] || zonePart("short");
          if (!config.label?.trim()) clock.textContent = abbreviation + " · " + time;
          else suffix.push(abbreviation);
        }
        if (config.utcOffset) suffix.push(zonePart("shortOffset").replace(/^GMT/, "UTC"));
        if (suffix.length) clock.textContent += " · " + [...new Set(suffix.filter(Boolean))].join(" · ");
        clock.title = config.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;
      });
    }
    if (options.copyAddress) document.querySelectorAll(".service-card").forEach(card => {
      if (card.querySelector("[data-home-pager-copy]")) return;
      const link = card.querySelector(".service-title a[href]");
      if (!link || !/^https?:$/.test(new URL(link.href).protocol)) return;
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.homePagerCopy = "";
      const title = ru ? "Копировать адрес" : "Copy address";
      const icons = {
        copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M15 9V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h4"/>',
        done: '<path d="m5 12 4 4L19 6"/>',
        error: '<path d="m6 6 12 12M18 6 6 18"/>',
      };
      const show = (icon, label) => {
        button.innerHTML = '<svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + icons[icon] + '</svg>';
        button.title = label;
        button.setAttribute("aria-label", label);
      };
      show("copy", title);
      button.style.cssText = "position:absolute;right:6px;bottom:3px;z-index:2;display:flex;align-items:center;justify-content:center;width:24px;height:24px;margin:0;padding:4px;color:inherit;background:transparent;border:0;border-radius:6px;opacity:.65;cursor:pointer";
      button.onmouseenter = () => { button.style.opacity = "1"; button.style.background = "rgba(128,128,128,.15)"; };
      button.onmouseleave = () => { button.style.opacity = ".65"; button.style.background = "transparent"; };
      button.onclick = async event => {
        event.preventDefault(); event.stopPropagation();
        try { await copy(link.href); show("done", ru ? "Скопировано" : "Copied"); }
        catch { show("error", ru ? "Не удалось скопировать" : "Copy failed"); }
        setTimeout(() => { show("copy", title); }, 1800);
      };
      copyCards.set(card, card.style.paddingBottom);
      const bottom = parseFloat(getComputedStyle(card).paddingBottom) || 0;
      card.style.paddingBottom = bottom + 26 + "px";
      card.append(button);
    });
  }
  update();
  const timer = setInterval(update, 1000);
  window.__homePagerExtrasCleanup = () => {
    window.__homePagerPortsCleanup?.();
    clearInterval(timer);
    document.querySelectorAll("[data-home-pager-clock], [data-home-pager-copy], [data-home-pager-groups]").forEach(el => el.remove());
    copyCards.forEach((padding, card) => { card.style.paddingBottom = padding; });
  };
}
function buildHomepageExtras(options) {
  if (!(options.clock || options.copyAddress || options.collapseGroups || options.unifiPorts)) return "";
  const portScript = options.unifiPorts ? "\n(" + homepageUniFiPortsRuntime.toString() + ")(" + JSON.stringify(options.portMaps || []) + ");" : "";
  return "/* HOME-PAGER EXTRAS START */\n/* options: " + JSON.stringify(options).replace(/\*/g,"\\u002a") + " */\n(" + homepageExtrasRuntime.toString() + ")(" + JSON.stringify(options) + ");" + portScript + "\n/* HOME-PAGER EXTRAS END */";
}
function renderHomepageExtras() {
  let panel = document.getElementById("homepage-extras");
  if (!panel) { panel = make("div", "editor-body"); panel.id = "homepage-extras"; $("raw-pane").prepend(panel); }
  panel.replaceChildren();
  panel.classList.toggle("hidden", current.name !== "custom.js");
  if (current.name !== "custom.js") return;
  let options = {clock:false,copyAddress:false};
  try { Object.assign(options, JSON.parse($("raw").value.match(homepageExtrasPattern)?.[0]?.match(/\/\* options: (.+?) \*\//)?.[1] || "{}")); } catch {}
  options.clocks = Array.isArray(options.clocks) && options.clocks.length ? options.clocks : [{label:"",timeZone:"",seconds:false}];
  const save = () => {
    const raw = $("raw").value;
    const block = buildHomepageExtras(options);
    $("raw").value = raw.match(homepageExtrasPattern) ? raw.replace(homepageExtrasPattern, () => block) : raw + (block ? "\n" + block + "\n" : "");
    mark();
  };
  const clockPanel = make("div");
  const portsPanel = make("div");
  options.portMaps = Array.isArray(options.portMaps) ? options.portMaps : [];
  function renderPortMaps() {
    portsPanel.replaceChildren();portsPanel.classList.toggle("hidden",!options.unifiPorts);
    portsPanel.append(make("p","hint",t("Укажите группу и сервис с шаблоном «UniFi · Схема портов». Ключ API хранится в конфигурации виджета, а схема читает данные через прокси Homepage.")));
    options.portMaps.forEach((binding,index) => {
      const box=make("section","appearance-section");
      for(const [key,title] of [["group",t("Группа Homepage")],["service",t("Название сервиса")]]) {
        const input=field(title,make("input"));input.value=binding[key]||"";
        input.addEventListener("input",()=>{binding[key]=input.value;save()});box.append(input.parentElement);
      }
      const kind=field(t("Тип устройства"),select([["switch",t("Коммутатор — два ряда портов")],["gateway",t("Шлюз — один ряд портов")]]));
      kind.value=binding.kind||"switch";kind.addEventListener("change",()=>{binding.kind=kind.value;save()});box.append(kind.parentElement);
      box.append(button(t("Удалить схему"),"secondary",()=>{options.portMaps.splice(index,1);save();renderPortMaps()}));
      portsPanel.append(box);
    });
    portsPanel.append(button(t("Добавить схему портов"),"secondary",()=>{options.portMaps.push({group:"",service:"",kind:"switch",index:0});save();renderPortMaps()}));
  }
  function switchState(input, control) {
    const state = make("span", "switch-state");
    const update = () => {
      state.textContent = input.checked ? t("Включено") : t("Выключено");
      input.setAttribute("aria-checked", String(input.checked));
    };
    update();
    input.addEventListener("change", update);
    control.append(state);
  }
  function renderClocks() {
    clockPanel.replaceChildren();
    clockPanel.classList.toggle("hidden", !options.clock);
    let zones;
    try { zones = Intl.supportedValuesOf("timeZone"); } catch { zones = ["Europe/Moscow","Europe/Saratov","Europe/London","America/New_York","Asia/Tokyo"]; }
    options.clocks.forEach((config, index) => {
      const box = make("section", "appearance-section");
      box.dataset.clockIndex = index;
      const name = field(t("Название часов"), make("input"));
      name.value = config.label || "";
      name.dataset.clockField = "label";
      name.addEventListener("input", () => { config.label = name.value; save(); });
      const zone = field(t("Часовой пояс"), make("input"));
      zone.value = config.timeZone || "";
      zone.dataset.clockField = "timeZone";
      zone.placeholder = t("Часовой пояс браузера");
      zone.autocomplete = "off";
      const wrapper = make("div", "timezone-combo");
      zone.parentElement.insertBefore(wrapper, zone);
      wrapper.append(zone);
      const arrow = button("▾", "timezone-arrow", () => {
        if (zone.getAttribute("aria-expanded") === "true") close();
        else { zone.focus(); open(""); }
      });
      arrow.type = "button";
      arrow.setAttribute("aria-label", t("Открыть список часовых поясов"));
      const suggestions = make("div", "timezone-options hidden");
      suggestions.id = "clock-time-zones-" + index;
      suggestions.setAttribute("role", "listbox");
      zone.setAttribute("role", "combobox");
      zone.setAttribute("aria-autocomplete", "list");
      zone.setAttribute("aria-controls", suggestions.id);
      zone.setAttribute("aria-expanded", "false");
      wrapper.append(arrow, suggestions);
      const values = ["", ...new Set(["UTC", ...zones, ...(config.timeZone ? [config.timeZone] : [])])];
      let active = -1, matches = [];
      function close() {
        suggestions.classList.add("hidden"); zone.setAttribute("aria-expanded", "false");
        zone.removeAttribute("aria-activedescendant"); active = -1;
      }
      function choose(value) {
        zone.value = value; config.timeZone = value; zone.setCustomValidity(""); save();
        zone.focus(); close();
      }
      function highlight() {
        [...suggestions.children].forEach((option, i) => option.classList.toggle("active", i === active));
        const option = suggestions.children[active];
        if (option) { zone.setAttribute("aria-activedescendant", option.id); option.scrollIntoView?.({block:"nearest"}); }
      }
      function open(query) {
        matches = values.filter(value => !query || value.toLowerCase().includes(query.toLowerCase().replaceAll(" ", "_")));
        suggestions.replaceChildren(); active = -1;
        for (const [i, value] of matches.entries()) {
          const option = button(value || t("Часовой пояс браузера"), "timezone-option", () => choose(value));
          option.type = "button"; option.tabIndex = -1; option.id = suggestions.id + "-" + i;
          option.dataset.zone = value; option.setAttribute("role", "option");
          option.setAttribute("aria-selected", String(value === config.timeZone));
          option.addEventListener("mousedown", event => event.preventDefault());
          suggestions.append(option);
        }
        if (!matches.length) suggestions.append(make("p", "hint", t("Нет совпадений")));
        suggestions.classList.remove("hidden"); zone.setAttribute("aria-expanded", "true");
      }
      zone.addEventListener("focus", () => open(""));
      zone.addEventListener("click", () => open(""));
      zone.addEventListener("input", () => { zone.setCustomValidity(""); open(zone.value.trim()); });
      zone.addEventListener("keydown", event => {
        if (event.key === "Escape") { event.preventDefault(); close(); return; }
        if (["ArrowDown", "ArrowUp"].includes(event.key)) {
          event.preventDefault(); if (zone.getAttribute("aria-expanded") !== "true") open("");
          active = Math.max(0, Math.min(matches.length - 1, active + (event.key === "ArrowDown" ? 1 : -1))); highlight();
        } else if (event.key === "Enter" && active >= 0 && matches[active] !== undefined) {
          event.preventDefault(); choose(matches[active]);
        }
      });
      wrapper.addEventListener("focusout", () => setTimeout(() => { if (!wrapper.contains(document.activeElement)) close(); }, 0));
      zone.addEventListener("change", () => {
        const value = zone.value.trim();
        try {
          if (value) new Intl.DateTimeFormat(undefined, {timeZone:value});
          config.timeZone = value; zone.setCustomValidity(""); save();
        } catch {
          zone.setCustomValidity(t("Выберите существующий часовой пояс из списка"));
          zone.reportValidity();
        }
      });
      const seconds = make("input"); seconds.type = "checkbox"; seconds.checked = config.seconds === true;
      seconds.setAttribute("role","switch"); seconds.dataset.clockField = "seconds";
      const secondsLabel = make("label", "field-row");
      const control = make("div", "field-input"); control.append(seconds);
      switchState(seconds, control);
      secondsLabel.append(make("span", "field-label", t("Показывать секунды")), control);
      seconds.addEventListener("change", () => { config.seconds = seconds.checked; save(); });
      box.append(name.parentElement, zone.closest("label"), secondsLabel);
      for (const [key, title] of [["utcOffset", t("Показывать смещение UTC")], ["zoneAbbreviation", t("Показывать сокращение пояса (MSK, JST…)")]]) {
        const input = make("input"); input.type = "checkbox"; input.checked = Boolean(config[key]);
        input.setAttribute("role", "switch"); input.dataset.clockField = key;
        const label = make("label", "field-row"), control = make("div", "field-input");
        control.append(input); label.append(make("span", "field-label", title), control);
        switchState(input, control);
        input.addEventListener("change", () => { config[key] = input.checked; save(); });
        box.append(label);
      }
      const remove = button(t("Удалить часы"), "secondary", () => { options.clocks.splice(index,1); save(); renderClocks(); });
      remove.disabled = options.clocks.length === 1;
      box.append(remove); clockPanel.append(box);
    });
    const add = button(t("Добавить часы"), "secondary", () => {
      options.clocks.push({label:"",timeZone:"",seconds:false}); save(); renderClocks();
    });
    add.id = "add-homepage-clock";
    clockPanel.append(add);
  }
  for (const [key, title] of [["clock", t("Часы")], ["copyAddress", t("Кнопка копирования адреса сервиса")], ["collapseGroups", t("Кнопки сворачивания всех групп")], ["unifiPorts",t("Визуальные схемы портов UniFi")]]) {
    const row = make("label", "field-row");
    const input = make("input"); input.type = "checkbox"; input.checked = Boolean(options[key]); input.setAttribute("role","switch"); input.dataset.extra = key;
    const control = make("div", "field-input"); control.append(input);
    switchState(input, control);
    row.append(make("strong", "field-label", title), control); panel.append(row);
    if (key === "collapseGroups") row.querySelector(".field-label").append(make("small", "", t("Требует выключить настройку «Запретить сворачивание групп» в Homepage")));
    input.addEventListener("change", () => { options[key] = input.checked; save(); renderClocks(); renderPortMaps(); });
    if (key === "clock") panel.append(clockPanel);
    if (key === "unifiPorts") panel.append(portsPanel);
  }
  renderClocks();
  renderPortMaps();
}
