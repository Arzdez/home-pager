"use strict";

async function openBookmarkSettings(focusGroup=null) {
  focusGroup=typeof focusGroup==='string'?focusGroup:null;
  if (busy || current?.name !== "bookmarks.yaml") return;
  await run(async () => {
    const [source,css,script] = await Promise.all([api("/api/file?name=settings.yaml"),api("/api/file?name=custom.css"),api("/api/file?name=custom.js")]);
    const rules=readBookmarkAppearance(css.raw), appearanceChecks=[];
    const defaults=readBookmarkDefaults(css.raw), globalRules=defaults?{All:defaults}:{};
    if (source.error) throw Error(t("Сначала исправьте YAML в settings.yaml"));
    const tree = structuredClone(source.tree);
    if (!tree.Content?.[0] || tree.Content[0].Tag === "!!null") tree.Content = [node({})];
    const settings = tree.Content[0];
    if (settings.Kind !== 4) throw Error(t("settings.yaml должен содержать объект настроек"));
    let bookmarkTree = current.tree;
    if (mode === "raw") bookmarkTree = (await api("/api/convert", {method:"POST", body:JSON.stringify({name:current.name,raw:$("raw").value})})).tree;
    const layout = mapValue(settings, "layout");
    if (layout && layout.Kind !== 4) throw Error(t("layout должен содержать объект групп"));
    openDialog(focusGroup?t("Настройки группы: {0}",focusGroup):t("Настройки закладок"), t("Настройки сохраняются в settings.yaml, оформление — в custom.css и custom.js. Несохранённые ссылки остаются в черновике."));
    const body = $("dialog-body"), error = make("div", "error hidden");
    error.setAttribute("role", "alert");
    body.append(error);
    function valueControl(container, map, key, title, options, help) {
      const input = options ? select(options) : make("input");
      const value = mapValue(map, key)?.Value || "";
      if (options && value && !options.some(([option]) => option === value)) {
        const custom = make("option", "", value); custom.value = value; input.append(custom);
      }
      input.value = value;
      input.dataset.bookmarkSetting = key;
      const label = make("label", "dialog-field");
      label.append(make("span", "", title), input);
      if (help) label.append(make("small", "", help));
      container.append(label);
      return input;
    }
    function bind(input, getMap, key) {
      input.addEventListener(input.tagName === "SELECT" ? "change" : "input", () => {
        const map = getMap();
        if (input.value === "") appearanceRemove(map, key);
        else appearanceSet(map, key, ["columns", "maxBookmarkGroupColumns"].includes(key) ? Number(input.value)
          : ["header", "initiallyCollapsed", "iconsOnly"].includes(key) ? input.value === "true" : input.value);
      });
    }
    const groups = appearanceGroups(bookmarkTree, true);
    reconcileBookmarkAppearance(rules,groups);
    const shared=focusGroup?make('div'):body;
    shared.append(make("h3", "", t("Все закладки")));
    const globalStyle = valueControl(shared, settings, "bookmarksStyle", t("Вид закладок"),
      [["", t("По умолчанию — карточки")], ["default", t("Обычные карточки")], ["icons", t("Только иконки")]]);
    bind(globalStyle, () => settings, "bookmarksStyle");
    bind(valueControl(shared, settings, "maxBookmarkGroupColumns", t("Колонки групп закладок"),
      [["", t("Наследовать общую настройку")], ...[6,7,8].map(n => [String(n), String(n)])],
      t("На широком экране: по умолчанию 6, максимум 8. Влияет на вертикальные группы, а не на колонки ссылок внутри группы.")), () => settings, "maxBookmarkGroupColumns");
    shared.append(make("p", "hint", t("У каждой ссылки доступны адрес, сокращение, иконка, описание, открытие ссылки и HTML ID — через «Параметр из шаблона». Иконка имеет приоритет над сокращением; без описания Homepage показывает домен ссылки.")));
    if(!focusGroup){
      const globalContainer=make('div');globalContainer.dataset.bookmarkDefaults='';shared.append(globalContainer);
      appearanceChecks.push(renderBookmarkAppearance(globalContainer,{name:'All',cards:groups.flatMap(g=>g.cards)},groups,globalRules,{global:true}));
    }
    const ordered = (layout?.Content || []).filter((_, i) => i % 2 === 0).map(key => key.Value);
    groups.sort((a,b) => (ordered.includes(a.name) ? ordered.indexOf(a.name) : Infinity) - (ordered.includes(b.name) ? ordered.indexOf(b.name) : Infinity));
    if (!groups.length) body.append(make("p", "hint", t("Сначала добавьте группу закладок.")));
    const inherited = ["", t("Наследовать общую настройку")];
    for (const group of groups.filter(group=>!focusGroup||group.name===focusGroup)) {
      const section = make(focusGroup?"section":"details", "bookmark-settings-group");
      section.dataset.bookmarkGroup = group.name;
      if(!focusGroup)section.append(make("summary", "", group.name));
      const content = make("div", "appearance-group-fields"); section.append(content); body.append(section);
      const groupLayout = appearanceLayout(settings, group.path);
      const getMap = () => appearanceLayout(settings, group.path, true);
      const add = (key, title, options, help) => {
        const input = valueControl(content, groupLayout, key, title, options, help);
        bind(input, getMap, key); return input;
      };
      const style = add("style", t("Расположение"), [["",t("По умолчанию — столбец")],["column",t("Вертикальный столбец")],["row",t("На всю ширину строки")]]);
      const columns = add("columns", t("Колонки ссылок"), [["",t("По умолчанию — одна колонка")], ...Array.from({length:8},(_,i) => [String(i+1),String(i+1)])], t("Работает при расположении в строку; в режиме «Только иконки» количество колонок подбирается автоматически."));
      const icons = add("iconsOnly", t("Только иконки"), [inherited,["true",t("Включено")],["false",t("Выключено")]], t("Настройка группы имеет приоритет над общим видом закладок. Наследование использует общий режим."));
      const updateColumns = () => { columns.disabled = style.value !== "row" || icons.value === "true" || (icons.value!=="false"&&globalStyle.value === "icons"); };
      style.addEventListener("change",updateColumns); icons.addEventListener("change",updateColumns); globalStyle.addEventListener("change",updateColumns); updateColumns();
      add("header", t("Показывать название группы"), [["",t("По умолчанию — показывать")],["true",t("Включено")],["false",t("Выключено")]]);
      add("icon", t("Иконка группы"), null, t("Например: mdi-bookmark или homepage.png"));
      add("initiallyCollapsed", t("Сворачивать при открытии"), [inherited,["true",t("Включено")],["false",t("Выключено")]]);
      add("tab", t("Вкладка"), null, t("Пустое значение — показывать на всех вкладках."));
      appearanceChecks.push(renderBookmarkAppearance(content,group,groups,rules,{inherit:()=>globalRules.All}));
    }
    const save = button(t("Сохранить настройки"), "primary", () => run(async () => {
      save.disabled = true;
      try {
        appearanceChecks.forEach(check=>check());
        const layout=mapValue(settings,'layout');
        const modes=globalStyle.value==='icons'&&(layout?.Content||[]).some((value,i)=>i%2===1&&mapValue(value,'iconsOnly')?.Value==='false');
        const raw=buildBookmarkAppearanceCSS(css.raw,rules,globalRules.All||null,modes);
        const js=buildBookmarkAppearanceScript(script.raw,rules,Boolean(globalRules.All)||modes);
        const settingsPayload={name:"settings.yaml",revision:source.revision,tree};
        if(raw!==css.raw||js!==script.raw)await api("/api/appearance",{method:"PUT",body:JSON.stringify({settings:settingsPayload,css:{name:"custom.css",revision:css.revision,raw},script:{name:"custom.js",revision:script.revision,raw:js}})});
        else await api("/api/file", {method:"PUT",body:JSON.stringify(settingsPayload)});
        $("dialog").close();
        toast(t("Настройки закладок сохранены. Обновите Homepage."));
      } catch (e) { error.textContent = e.message; error.classList.remove("hidden"); error.scrollIntoView?.({block:"nearest"}); }
      finally { save.disabled = false; }
    }));
    $("dialog-actions").append(button(t("Отмена"),"secondary",()=>$("dialog").close()),save);
  });
}
$("bookmark-settings-open").addEventListener("click", openBookmarkSettings);
