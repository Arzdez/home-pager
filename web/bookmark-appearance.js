"use strict";
const bookmarkAppearancePattern = /\/\* HOME-PAGER BOOKMARK STYLE START \*\/[\s\S]*?\/\* HOME-PAGER BOOKMARK STYLE END \*\//g;
const bookmarkAppearanceDefaults = {iconSize:48,tileSize:80,gap:8,radius:12,background:"default",backgroundColor:"#1e293b",border:"default",borderColor:"#64748b",borderWidth:1};
function normalizeBookmarkAppearance(value) {
  const result = {...bookmarkAppearanceDefaults};
  for (const [key,min,max] of [["iconSize",16,128],["tileSize",32,192],["gap",0,48],["radius",0,96],["borderWidth",1,8]])
    if (Number.isInteger(value?.[key]) && value[key]>=min && value[key]<=max) result[key]=value[key];
  for (const key of ["backgroundColor","borderColor"])
    if (/^#[\da-f]{6}$/i.test(value?.[key])) result[key]=value[key];
  if (["default","transparent","custom"].includes(value?.background)) result.background=value.background;
  if (["default","none","solid"].includes(value?.border)) result.border=value.border;
  return result;
}
function readBookmarkAppearance(raw) {
  try {
    const block=raw.match(bookmarkAppearancePattern)?.[0];
    const parsed=JSON.parse(block?.match(/\/\* controls: (.+?) \*\//)?.[1]);
    return Object.fromEntries(Object.entries(parsed).filter(([,v])=>v && typeof v==='object')
      .map(([name,v])=>[name,{...normalizeBookmarkAppearance(v),anchor:v.anchor}]));
  } catch { return {}; }
}
function bookmarkCSSString(text) {
  return '"'+Array.from(text, c=>/[a-z\d _-]/i.test(c)?c:'\\'+c.codePointAt(0).toString(16)+' ').join('')+'"';
}
const bookmarkDefaultsPattern=/\/\* HOME-PAGER BOOKMARK DEFAULTS START \*\/[\s\S]*?\/\* HOME-PAGER BOOKMARK DEFAULTS END \*\//g;
const bookmarkModesPattern=/\/\* HOME-PAGER BOOKMARK MODES START \*\/[\s\S]*?\/\* HOME-PAGER BOOKMARK MODES END \*\//g;
function readBookmarkDefaults(raw) {
  try {const block=raw.match(bookmarkDefaultsPattern)?.[0];return block?normalizeBookmarkAppearance(JSON.parse(block.match(/\/\* defaults: (.+?) \*\//)[1])):null;}catch{return null;}
}
function replaceBookmarkBlock(raw,pattern,block) {
  return raw.match(pattern)?raw.replace(pattern,()=>block):raw+(block?(!raw||raw.endsWith('\n')?'':'\n')+block+'\n':'');
}
function bookmarkAppearanceRules(scope,rule) {
  const v=normalizeBookmarkAppearance(rule);
  const card=[`border-radius: ${v.radius}px !important`,"margin-bottom: 0 !important"];
  if(v.background!=="default") card.push(`background: ${v.background==="transparent"?"transparent":v.backgroundColor} !important`);
  if(v.border!=="default") card.push(`border: ${v.border==="none"?"none":`${v.borderWidth}px solid ${v.borderColor}`} !important`,"box-shadow: none !important");
  return `${scope} .bookmark > a { ${card.join('; ')}; }
${scope} ul { gap: ${v.gap}px !important; }
${scope}:not([data-home-pager-bookmark-cards]) ul:has(> .bookmark.grid) { grid-template-columns: repeat(auto-fill, ${v.tileSize}px) !important; }
${scope}:not([data-home-pager-bookmark-cards]) .bookmark.grid > a { width: ${v.tileSize}px !important; height: ${v.tileSize}px !important; }
${scope} .bookmark-icon > div, ${scope} .bookmark-icon img, ${scope} .bookmark-icon svg, ${scope} .bookmark-icon > div > div { width: ${v.iconSize}px !important; height: ${v.iconSize}px !important; }
${scope} .bookmark:not(.grid) .bookmark-icon, ${scope}[data-home-pager-bookmark-cards] .bookmark-icon { width: ${v.iconSize+16}px !important; min-height: ${v.iconSize+16}px !important; }
${scope} .bookmark-icon img { object-fit: contain !important; }`;
}
function buildBookmarkAppearanceCSS(raw,rules,defaults=readBookmarkDefaults(raw),modes=Boolean(raw.match(bookmarkModesPattern))) {
  modes=modes||Boolean(defaults)||Object.keys(rules).length>0;
  const modeCSS=modes?`/* HOME-PAGER BOOKMARK MODES START */
.bookmark-group[data-home-pager-bookmark-cards] ul { display: flex !important; flex-direction: column !important; gap: 8px; }
.bookmark-group[data-home-pager-bookmark-cards="row"] ul { display: grid !important; grid-template-columns: var(--home-pager-bookmark-columns, 1fr) !important; }
.bookmark-group[data-home-pager-bookmark-cards] .bookmark > a { display: flex !important; align-items: stretch !important; width: 100% !important; height: auto !important; min-height: 44px; margin-bottom: 0 !important; }
.bookmark-group[data-home-pager-bookmark-cards] .bookmark-icon { width: 44px; flex-shrink: 0; }
.home-pager-bookmark-text { display: flex; flex: 1; align-items: center; justify-content: space-between; gap: 8px; min-width: 0; padding: 8px 12px; font-size: 12px; }
.home-pager-bookmark-description { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; opacity: .75; }
/* HOME-PAGER BOOKMARK MODES END */`:'';
  raw=replaceBookmarkBlock(raw,bookmarkModesPattern,modeCSS);
  const globalCSS=defaults?'/* HOME-PAGER BOOKMARK DEFAULTS START */\n/* defaults: '+JSON.stringify(normalizeBookmarkAppearance(defaults))+' */\n'+bookmarkAppearanceRules('.bookmark-group:not([data-home-pager-bookmark-custom])',defaults)+'\n/* HOME-PAGER BOOKMARK DEFAULTS END */':'';
  raw=replaceBookmarkBlock(raw,bookmarkDefaultsPattern,globalCSS);
  const entries=Object.entries(rules);
  let block="";
  if (entries.length) {
    const metadata=JSON.stringify(rules).replace(/[*/<>\u2028\u2029]/g,c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0'));
    const styles=entries.map(([name,rule])=>{
      const scope=`.bookmark-group[data-home-pager-bookmark-group=${bookmarkCSSString(name)}]`;
      return bookmarkAppearanceRules(scope,rule);
    }).join('\n');
    block=`/* HOME-PAGER BOOKMARK STYLE START */\n/* controls: ${metadata} */\n${styles}\n/* HOME-PAGER BOOKMARK STYLE END */`;
  }
  return raw.match(bookmarkAppearancePattern) ? raw.replace(bookmarkAppearancePattern,()=>block)
    : raw+(block?(!raw||raw.endsWith('\n')?'':'\n')+block+'\n':'');
}

// Homepage does not expose group names as DOM attributes. Tag groups by their
// heading, or match the current tab's ordered bookmark data when headers are hidden.
function homepageBookmarkAppearanceRuntime(customGroups=[]) {
  window.__homePagerBookmarkAppearanceCleanup?.();
  let pending=false, stopped=false;
  function update() {
    pending=false;
    if(stopped)return;
    let props={};
    try { props=JSON.parse(document.getElementById('__NEXT_DATA__')?.textContent||'{}').props?.pageProps||{}; } catch {}
    const settings=props.initialSettings||{}, groups=props.fallback?.['/api/bookmarks']||[];
    const slug=value=>encodeURIComponent(String(value||'').replace(/\s+/g,'-').toLowerCase());
    const tabs=[...new Set(Object.values(settings.layout||{}).map(g=>g?.tab).filter(Boolean))];
    const active=location.hash.slice(1)||slug(tabs[0]);
    const visible=groups.filter(g=>!settings.layout?.[g.name]?.tab||slug(settings.layout[g.name].tab)===active);
    const used=new Set(), elements=[...document.querySelectorAll('.bookmark-group')];
    function tag(element,name){
      if(name===undefined)element.removeAttribute('data-home-pager-bookmark-group');
      else element.setAttribute('data-home-pager-bookmark-group',name);
      element.toggleAttribute('data-home-pager-bookmark-custom',customGroups.includes(name));
    }
    for(const element of elements){
      const heading=element.querySelector('.bookmark-group-name');
      if(heading){const name=heading.textContent.trim();tag(element,name);used.add(name);}
    }
    for(const element of elements.filter(el=>!el.querySelector('.bookmark-group-name'))){
      const links=[...element.querySelectorAll('.bookmark')].map(item=>({name:item.getAttribute('data-name'),href:item.querySelector('a')?.getAttribute('href')}));
      const group=visible.find(g=>!used.has(g.name)&&g.bookmarks?.length===links.length&&g.bookmarks.every((item,i)=>item.name===links[i].name&&item.href===links[i].href));
      tag(element,group?.name);if(group)used.add(group.name);
    }
    for(const element of elements){
      const name=element.getAttribute('data-home-pager-bookmark-group'), layout=settings.layout?.[name];
      const cards=settings.bookmarksStyle==='icons'&&layout?.iconsOnly===false;
      if(cards){
        element.setAttribute('data-home-pager-bookmark-cards',layout.style==='row'?'row':'column');
        const columns=Math.min(8,Math.max(1,Number(layout.columns)||1));
        element.style.setProperty('--home-pager-bookmark-columns',`repeat(${columns},minmax(0,1fr))`);
      }else {element.removeAttribute('data-home-pager-bookmark-cards');element.style.removeProperty('--home-pager-bookmark-columns');}
      for(const item of element.querySelectorAll('.bookmark')){
        let text=item.querySelector('[data-home-pager-bookmark-label]');
        if(!cards){text?.remove();continue;}
        const link=item.querySelector('a');if(!link)continue;
        if(!text){
          text=document.createElement('span');text.dataset.homePagerBookmarkLabel='';text.className='home-pager-bookmark-text';
          text.append(document.createElement('span'),document.createElement('span'));text.lastChild.className='home-pager-bookmark-description';link.append(text);
        }
        const title=item.getAttribute('data-name')||link.title;
        const entry=groups.find(g=>g.name===name)?.bookmarks?.find(b=>b.name===title&&b.href===link.getAttribute('href'));
        let description=entry?.description;
        if(description==null){try{description=new URL(link.href).hostname}catch{description='';}}
        if(text.firstChild.textContent!==title)text.firstChild.textContent=title;
        if(text.lastChild.textContent!==String(description))text.lastChild.textContent=String(description);
      }
    }
  }
  function schedule(){if(!pending&&!stopped){pending=true;queueMicrotask(update);}}
  const observer=new MutationObserver(schedule);
  observer.observe(document.documentElement,{childList:true,subtree:true,characterData:true});
  window.addEventListener('hashchange',schedule);update();
  window.__homePagerBookmarkAppearanceCleanup=()=>{stopped=true;observer.disconnect();window.removeEventListener('hashchange',schedule);document.querySelectorAll('[data-home-pager-bookmark-label]').forEach(el=>el.remove());document.querySelectorAll('[data-home-pager-bookmark-group]').forEach(el=>{el.removeAttribute('data-home-pager-bookmark-group');el.removeAttribute('data-home-pager-bookmark-custom');el.removeAttribute('data-home-pager-bookmark-cards');el.style.removeProperty('--home-pager-bookmark-columns');});};
}
const bookmarkAppearanceScriptPattern=/\/\* HOME-PAGER BOOKMARK STYLE SCRIPT START \*\/[\s\S]*?\/\* HOME-PAGER BOOKMARK STYLE SCRIPT END \*\//g;
function buildBookmarkAppearanceScript(raw,rules,force=false) {
  const names=JSON.stringify(Object.keys(rules)).replace(/[*/<>]/g,c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0'));
  const block=Object.keys(rules).length||force?'/* HOME-PAGER BOOKMARK STYLE SCRIPT START */\n('+homepageBookmarkAppearanceRuntime.toString()+')('+names+');\n/* HOME-PAGER BOOKMARK STYLE SCRIPT END */':'';
  return raw.match(bookmarkAppearanceScriptPattern)?raw.replace(bookmarkAppearanceScriptPattern,()=>block):raw+(block?(!raw||raw.endsWith('\n')?'':'\n')+block+'\n':'');
}
function reconcileBookmarkAppearance(rules,groups) {
  const names=new Set(groups.map(g=>g.name));
  for(const group of groups){
    if(!Object.hasOwn(rules,group.name)){
      const prior=Object.entries(rules).filter(([name,rule])=>!names.has(name)&&rule.anchor&&group.cards.some(card=>card.name===rule.anchor.name&&appearanceRead(card.config,'href','')===rule.anchor.href));
      if(prior.length===1){rules[group.name]=rules[prior[0][0]];delete rules[prior[0][0]];}
    }
    const saved=Object.hasOwn(rules,group.name)?rules[group.name]:null;
    const card=group.cards.find(card=>appearanceRead(card.config,'href',''));
    if(saved&&card)saved.anchor={name:card.name,href:appearanceRead(card.config,'href','')};
  }
  return rules;
}
async function saveBookmarksWithAppearance(payload) {
  const css=await api('/api/file?name=custom.css');
  const rules=readBookmarkAppearance(css.raw);
  const defaults=readBookmarkDefaults(css.raw), modes=Boolean(css.raw.match(bookmarkModesPattern));
  if(!Object.keys(rules).length&&!defaults&&!modes)return api('/api/file',{method:'PUT',body:JSON.stringify(payload)});
  const tree=payload.tree||(await api('/api/convert',{method:'POST',body:JSON.stringify({name:payload.name,raw:payload.raw})})).tree;
  reconcileBookmarkAppearance(rules,appearanceGroups(tree,true));
  const raw=buildBookmarkAppearanceCSS(css.raw,rules), script=await api('/api/file?name=custom.js');
  const js=buildBookmarkAppearanceScript(script.raw,rules,Boolean(defaults)||modes);
  if(raw===css.raw&&js===script.raw)return api('/api/file',{method:'PUT',body:JSON.stringify(payload)});
  return (await api('/api/appearance',{method:'PUT',body:JSON.stringify({bookmarks:payload,css:{name:'custom.css',raw,revision:css.revision},script:{name:'custom.js',raw:js,revision:script.revision}})})).bookmarks;
}

function renderBookmarkAppearance(container,group,groups,rules,options={}) {
  const candidates=group.cards.filter(card=>card.config && appearanceRead(card.config,'href',''));
  const anchor=candidates[0];
  const saved=Object.hasOwn(rules,group.name)?rules[group.name]:null;
  const value=normalizeBookmarkAppearance(saved||options.inherit?.());
  let initialized=Boolean(saved);
  const enabled=make('input'); enabled.type='checkbox'; enabled.setAttribute('role','switch');
  enabled.dataset.bookmarkAppearance='enabled'; enabled.checked=Boolean(saved);
  const state=make('span','switch-state');
  const toggle=make('span','field-input');toggle.append(enabled,state);
  const label=make('label','dialog-field');label.append(make('span','',options.global?t('Общее оформление иконок'):t('Переопределить оформление для группы')),toggle);
  label.append(make('small','',t('Размеры и оформление сохраняются в custom.css. Размер плитки применяется только в режиме «Только иконки».')));
  container.append(label);
  if(!options.global)container.append(make('p','hint',t('Выключено — наследовать общее оформление. Включено — использовать размеры, фон и рамку этой группы.')));
  const fields=make('div','bookmark-appearance-fields');container.append(fields);
  const preview=make('div','bookmark-appearance-preview');preview.setAttribute('aria-label',t('Пример оформления иконок'));container.append(preview);
  const controls=[];
  function sync(commit=false) {
    enabled.setAttribute('aria-checked',String(enabled.checked));
    state.textContent=enabled.checked?t('Включено'):t('Выключено');
    fields.hidden=!enabled.checked; preview.hidden=!enabled.checked;
    if(commit){
      if(enabled.checked)rules[group.name]={...value,...(anchor?{anchor:{name:anchor.name,href:appearanceRead(anchor.config,'href','')}}:{})};
      else delete rules[group.name];
    }
    preview.replaceChildren();preview.style.gap=value.gap+'px';
    for(const card of candidates.slice(0,3)){
      const tile=make('span','bookmark-appearance-tile');
      Object.assign(tile.style,{width:value.tileSize+'px',height:value.tileSize+'px',borderRadius:value.radius+'px'});
      if(value.background!=='default')tile.style.background=value.background==='transparent'?'transparent':value.backgroundColor;
      if(value.border!=='default')tile.style.border=value.border==='none'?'none':`${value.borderWidth}px solid ${value.borderColor}`;
      const icon=appearanceRead(card.config,'icon','');
      const content=/^(https?:\/\/|\/)/.test(icon)?make('img'):make('span','',appearanceRead(card.config,'abbr',card.name.slice(0,2)));
      if(content.tagName==='IMG'){content.src=icon.startsWith('/icons/')?'/api/icons/'+icon.split('/').pop():icon;content.alt=card.name;}
      Object.assign(content.style,{width:value.iconSize+'px',height:value.iconSize+'px',objectFit:'contain'});tile.append(content);preview.append(tile);
    }
  }
  function add(key,title,options,min,max) {
    const input=options?select(options):make('input');input.dataset.bookmarkAppearance=key;
    if(!options){input.type=key.endsWith('Color')?'color':'number';if(input.type==='number'){input.min=min;input.max=max;input.step='1';input.required=true;}}
    input.value=String(value[key]);controls.push(input);
    const label=make('label','dialog-field');label.append(make('span','',title),input);fields.append(label);
    input.addEventListener(options?'change':'input',()=>{value[key]=input.type==='number'?Number(input.value):input.value;sync(true);});
    return input;
  }
  add('iconSize',t('Размер иконки, px'),null,16,128);
  add('tileSize',t('Размер плитки, px'),null,32,192);
  add('gap',t('Расстояние между закладками, px'),null,0,48);
  add('radius',t('Скругление плитки, px'),null,0,96);
  const bg=add('background',t('Фон плитки'),[['default',t('Как в Homepage')],['transparent',t('Прозрачный')],['custom',t('Свой цвет')]]);
  const bgColor=add('backgroundColor',t('Цвет фона'));
  const border=add('border',t('Рамка плитки'),[['default',t('Как в Homepage')],['none',t('Без рамки')],['solid',t('Своя рамка')]]);
  const borderColor=add('borderColor',t('Цвет рамки'));
  const borderWidth=add('borderWidth',t('Толщина рамки, px'),null,1,8);
  function dependencies(){bgColor.disabled=bg.value!=='custom';borderColor.disabled=borderWidth.disabled=border.value!=='solid';}
  bg.addEventListener('change',dependencies);border.addEventListener('change',dependencies);
  enabled.addEventListener('change',()=>{
    if(enabled.checked&&!initialized){
      Object.assign(value,normalizeBookmarkAppearance(options.inherit?.()));
      controls.forEach(input=>{input.value=String(value[input.dataset.bookmarkAppearance]);});
      initialized=true;dependencies();
    }
    sync(true);
  });dependencies();sync();
  return ()=>{
    if(!enabled.checked)return;
    if(controls.some(input=>!input.checkValidity()) || value.tileSize<value.iconSize+8)
      throw Error(t('Проверьте размеры: плитка должна быть минимум на 8 px больше иконки.'));
  };
}
