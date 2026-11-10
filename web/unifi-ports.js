"use strict";
// Self-contained: embedded into Homepage's custom.js, never given controller credentials.
function homepageUniFiPortsRuntime(bindings) {
  window.__homePagerPortsCleanup?.();
  const ru = (bindings.find(binding => binding.language)?.language || document.documentElement.lang || navigator.language).startsWith("ru");
  const text = (r,e) => ru ? r : e;
  const style = document.createElement("style");
  style.dataset.homePagerPortsStyle = "";
  style.textContent = `
[data-home-pager-ports]{padding:8px 10px 10px;min-width:0;font-size:12px;line-height:1.4}
[data-home-pager-ports] .hp-port-subtitle{opacity:.8;margin-bottom:9px}
[data-home-pager-ports] .hp-port-board{display:flex;align-items:flex-start;gap:16px;overflow-x:auto;padding:3px 2px 8px}
[data-home-pager-ports] .hp-port-grid{display:grid;gap:4px;grid-auto-flow:column;flex:none}
[data-home-pager-ports] .hp-port{position:relative;display:flex;align-items:center;justify-content:center;width:26px;height:26px;padding:0;border:1px solid transparent;border-radius:3px;background:var(--hp-port-color);color:#fff;cursor:pointer;font:600 10px system-ui;box-sizing:border-box;flex:none}
[data-home-pager-ports] .hp-port:hover{filter:brightness(1.25)}
[data-home-pager-ports] .hp-port:focus-visible,[data-home-pager-ports] .hp-port[aria-pressed="true"]{outline:2px solid currentColor;outline-offset:2px}
[data-home-pager-ports] .hp-port-fibre{border:2px solid #9599b8;border-radius:2px}
[data-home-pager-ports] .hp-port-disabled{background:repeating-linear-gradient(135deg,#45485d,#45485d 4px,#26283c 4px,#26283c 7px)}
[data-home-pager-ports] .hp-port-flags{position:absolute;left:1px;top:-2px;font-size:9px;line-height:10px}
[data-home-pager-ports] .hp-port-legend{display:flex;flex-wrap:wrap;gap:5px 12px;margin-top:3px;font-size:10px;opacity:.85}
[data-home-pager-ports] .hp-port-key{display:inline-flex;align-items:center;gap:5px}
[data-home-pager-ports] .hp-port-dot{display:inline-block;width:7px;height:7px;border-radius:1px}
[data-home-pager-ports] .hp-port-detail{margin-top:10px;padding:8px;border-radius:5px;background:rgba(128,128,128,.09)}
[data-home-pager-ports] .hp-port-detail-title{font-weight:600;margin-bottom:6px}
[data-home-pager-ports] .hp-port-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(115px,1fr));gap:6px 12px}
[data-home-pager-ports] .hp-port-stat span{display:block;font-size:10px;opacity:.7}
[data-home-pager-ports] .hp-port-status{font-size:10px;opacity:.65;margin-top:7px}
[data-home-pager-ports] .hp-port-status[data-error="true"]{color:#f5ad55;opacity:1}
`;
  document.head.append(style);
  let stopped = false;
  const states = bindings.filter(b => b.group && b.service).map(binding => ({binding,last:0,pending:false,controller:null,card:null,panel:null,data:null,selected:null,hidden:new Map()}));
  function el(tag, cls, value) { const n=document.createElement(tag); if(cls)n.className=cls; if(value!==undefined)n.textContent=value; return n; }
  function number(value) { return value === undefined || value === null ? "—" : Number(value).toLocaleString(undefined,{maximumFractionDigits:2}); }
  function speed(value) { const n=Number(value);return n>=1000 ? number(n/1000)+text(" Гбит/с"," Gbps") : number(n)+text(" Мбит/с"," Mbps"); }
  function disabled(p) {return p.enable === false || p.enabled === false || p.op_mode === "disabled";}
  function aggregate(p) {return Boolean(p.aggregated_by || p.lag_member || p.op_mode === "aggregate");}
  function mirror(p) {return p.op_mode === "mirror" || p.op_mode === "mirroring";}
  function poe(p) {return p.poe_enable === true || Number(p.poe_power)>0;}
  function colour(p) {if(disabled(p)||!p.up)return "#45485d";const n=Number(p.speed);return n>=10000?"#497edb":n>=2500?"#159db6":n>=1000?"#249c67":n>=100?"#99a923":"#d58c36";}
  function status(p) {return disabled(p)?text("Выключен настройкой","Disabled"):p.up?text("Подключён","Connected"):text("Нет подключения","Disconnected");}
  function findCard(binding) {
    const matches=[...document.querySelectorAll(".service[data-name]")].filter(n=>n.dataset.name===binding.service);
    const item=matches.find(n=>n.closest(".services-group")?.querySelector(".service-group-name")?.textContent.trim()===binding.group) || (matches.length===1?matches[0]:null);
    return item?.querySelector(".service-card") || null;
  }
  function restore(state) {for(const [node,display]of state.hidden)node.style.display=display;state.hidden.clear();}
  function hideFallback(state) {
    for(const node of state.card.querySelectorAll(".service-container")) {
      if(!state.hidden.has(node))state.hidden.set(node,node.style.display);
      node.style.display="none";
    }
  }
  function detail(state, target) {
    const ports=state.data.port_table;
    const p=ports.find(port=>Number(port.port_idx)===Number(state.selected));
    target.replaceChildren(); if(!p){target.hidden=true;return;}target.hidden=false;
    target.append(el("div","hp-port-detail-title",text("Порт ","Port ")+p.port_idx+(p.name?" · "+p.name:"")));
    const stats=el("div","hp-port-stats");
    const values=[[text("Состояние","State"),status(p)],[text("Скорость","Speed"),p.up&&!disabled(p)?speed(p.speed):"—"],[text("Ошибки приёма","RX errors"),number(p.rx_errors)],[text("Ошибки передачи","TX errors"),number(p.tx_errors)],[text("Отброшено RX","RX dropped"),number(p.rx_dropped)],[text("Отброшено TX","TX dropped"),number(p.tx_dropped)]];
    if(poe(p))values.push(["PoE",Number(p.poe_power)>0?number(p.poe_power)+text(" Вт"," W"):text("Включён","Enabled")]);
    if(aggregate(p))values.push([text("Агрегация","Aggregation"),p.aggregated_by?text("С портом ","With port ")+p.aggregated_by:text("Включена","Enabled")]);
    if(mirror(p))values.push([text("Зеркалирование","Mirroring"),text("Включено","Enabled")]);
    for(const [label,value]of values){const stat=el("div","hp-port-stat");stat.append(el("span","",label),el("strong","",value));stats.append(stat)}
    target.append(stats);
  }
  function render(state) {
    const data=state.data, ports=[...data.port_table].sort((a,b)=>Number(a.port_idx)-Number(b.port_idx));
    const focused=state.panel.contains(document.activeElement)?document.activeElement.dataset.portNumber:null;
    state.panel.replaceChildren();
    const uplink=data.uplink||{};
    let subtitle;
    if(uplink.uplink_device_name)subtitle=text("Подключён к ","Connected to ")+uplink.uplink_device_name+(uplink.uplink_remote_port?text(" · порт "," · port ")+uplink.uplink_remote_port:"");
    else subtitle="WAN · "+(uplink.up?text("Подключён","Connected"):text("Нет подключения","Disconnected"))+(uplink.up&&uplink.speed?" · "+speed(uplink.speed):"");
    subtitle+=" · "+ports.filter(p=>p.up&&!disabled(p)).length+" / "+ports.length+text(" портов активно"," ports active");
    state.panel.append(el("div","hp-port-subtitle",subtitle));
    const board=el("div","hp-port-board");
    const isFibre=p=>/sfp/i.test(String(p.media||""))||/^sfp\b/i.test(String(p.name||""));
    const rows=state.binding.kind==="gateway"?1:2;
    const uplinks=new Set([uplink.port_idx,data.wan1?.port_idx,data.wan2?.port_idx].filter(v=>v!==undefined));
    for(const [fibre,subset]of [[false,ports.filter(p=>!isFibre(p))],[true,ports.filter(isFibre)]]) {
      if(!subset.length)continue;
      const grid=el("div","hp-port-grid");grid.setAttribute("aria-label",fibre?"SFP":"RJ45");
      grid.style.gridTemplateRows="repeat("+rows+",26px)";grid.style.gridTemplateColumns="repeat("+Math.ceil(subset.length/rows)+",26px)";
      for(const p of subset){
        const b=el("button","hp-port"+(fibre?" hp-port-fibre":"")+(disabled(p)?" hp-port-disabled":""),p.port_idx);
        b.type="button";b.dataset.portNumber=p.port_idx;b.style.setProperty("--hp-port-color",colour(p));
        b.setAttribute("aria-pressed",String(Number(state.selected)===Number(p.port_idx)));
        const flags=[p.is_uplink||uplinks.has(p.port_idx)?"↑":"",poe(p)?"ϟ":"",aggregate(p)?"⇄":"",mirror(p)?"◉":""].filter(Boolean).join("");
        if(flags)b.append(el("span","hp-port-flags",flags));
        b.title=text("Порт ","Port ")+p.port_idx+(p.name?" · "+p.name:"")+" · "+status(p)+(p.up?" · "+speed(p.speed):"")+(fibre?" · SFP":"");
        b.setAttribute("aria-label",b.title);
        b.onclick=event=>{event.preventDefault();event.stopPropagation();state.selected=Number(state.selected)===Number(p.port_idx)?null:p.port_idx;for(const button of board.querySelectorAll("[data-port-number]"))button.setAttribute("aria-pressed",String(Number(button.dataset.portNumber)===Number(state.selected)));detail(state,info)};
        grid.append(b);
      }
      board.append(grid);
    }
    const legend=el("div","hp-port-legend");
    const keys=[["#99a923","FE · 100M"],["#249c67","GbE · 1G"],["#45485d",text("Нет подключения","Disconnected")]];
    if(ports.some(p=>p.up&&Number(p.speed)>=2500))keys.push(["#159db6","2.5G / 5G"],["#497edb","10G+"]);
    for(const [colour,label]of keys){const item=el("span","hp-port-key");const dot=el("i","hp-port-dot");dot.style.background=colour;item.append(dot,document.createTextNode(label));legend.append(item)}
    for(const [condition,label]of [[true,text("↑ Аплинк / WAN","↑ Uplink / WAN")],[ports.some(aggregate),text("⇄ Агрегация","⇄ Aggregation")],[ports.some(poe),"ϟ PoE"],[ports.some(mirror),text("◉ Зеркалирование","◉ Mirroring")],[ports.some(disabled),text("▧ Выключен","▧ Disabled")]])if(condition)legend.append(el("span","hp-port-key",label));
    const info=el("div","hp-port-detail");detail(state,info);
    const updated=el("div","hp-port-status",text("Обновлено: ","Updated: ")+new Date().toLocaleTimeString());
    state.panel.append(board,legend,info,updated);
    if(focused)[...board.querySelectorAll("[data-port-number]")].find(b=>b.dataset.portNumber===focused)?.focus({preventScroll:true});
    hideFallback(state);
  }
  async function refresh(state) {
    state.pending=true;state.last=Date.now();state.controller=new AbortController();
    const timeout=setTimeout(()=>state.controller?.abort(),20000);
    try {
      const query=new URLSearchParams({group:state.binding.group,service:state.binding.service,index:String(state.binding.index||0)});
      const response=await fetch("/api/services/proxy?"+query,{signal:state.controller.signal});
      if(!response.ok)throw Error("Proxy error");
      const body=await response.json();
      const data=body?.data?.[0];
      if(body.error||!Array.isArray(data?.port_table)||!data.port_table.length)throw Error("No port data");
      if(stopped||!state.panel?.isConnected)return;
      state.data=data;render(state);
    } catch {
      if(stopped||!state.panel?.isConnected)return;
      let status=state.panel.querySelector(".hp-port-status");
      if(!status){status=el("div","hp-port-status");state.panel.append(status)}
      status.dataset.error="true";status.textContent=text("Не удалось обновить порты. Повтор через 30 секунд.","Could not refresh ports. Retrying in 30 seconds.");
      if(!state.data)restore(state);
    } finally {clearTimeout(timeout);state.pending=false;state.controller=null;}
  }
  function tick() {
    if(stopped||document.hidden)return;
    for(const state of states){
      const card=findCard(state.binding);
      if(!card)continue;
      if(card!==state.card||!state.panel?.isConnected){
        restore(state);state.panel?.remove();state.card=card;state.last=0;
        state.panel=el("section","",undefined);state.panel.dataset.homePagerPorts="";
        state.panel.setAttribute("aria-label",text("Схема портов","Port map"));
        card.append(state.panel);
        if(state.data)render(state);
      }
      if(state.data)hideFallback(state);
      if(!state.pending&&Date.now()-state.last>=30000)void refresh(state);
    }
  }
  tick();const timer=setInterval(tick,1000);
  window.__homePagerPortsCleanup=()=>{stopped=true;clearInterval(timer);for(const state of states){state.controller?.abort();restore(state);state.panel?.remove()}style.remove()};
}
