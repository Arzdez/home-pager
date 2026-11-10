"use strict";
// Finite choices from Homepage's information widgets and Intl formatting options.
const infoWidgetFields = {
  search: {provider:"google",target:"_blank",focus:false,showSearchSuggestions:false,url:"https://example.com/?q=",suggestionUrl:""},
  datetime: {text_size:"xl",locale:"ru",format:{timeStyle:"short",dateStyle:"short",hourCycle:"h23",hour12:false,weekday:"long",era:"short",year:"numeric",month:"long",day:"numeric",hour:"2-digit",minute:"2-digit",second:"2-digit",timeZoneName:"short",fractionalSecondDigits:3,dayPeriod:"short",calendar:"gregory",numberingSystem:"latn",formatMatcher:"best fit",localeMatcher:"best fit",timeZone:"Europe/Moscow"}},
  greeting: {text_size:"xl",text:""},
  resources: {cpu:true,memory:true,cputemp:false,uptime:false,disk:"/",network:true,units:"metric",diskUnits:"bytes",expanded:false,label:"",refresh:3000,tempmin:0,tempmax:100},
  glances: {url:"http://glances:61208",version:4,cpu:true,mem:true,cputemp:false,uptime:false,disk:"/",unit:"metric",diskUnits:"bytes",expanded:false,label:"",username:"",password:"",cpuSensorLabel:""},
  openmeteo: {label:"",latitude:0,longitude:0,timezone:"Europe/Moscow",units:"metric",cache:5,format:{maximumFractionDigits:1,minimumFractionDigits:0,style:"decimal",notation:"standard",compactDisplay:"short",signDisplay:"auto",currencyDisplay:"symbol",currencySign:"standard",unitDisplay:"short",roundingMode:"halfExpand",roundingPriority:"auto",trailingZeroDisplay:"auto",useGrouping:true}},
  openweathermap: {label:"",latitude:0,longitude:0,units:"metric",provider:"openweathermap",apiKey:"",cache:5,format:{maximumFractionDigits:1,minimumFractionDigits:0,style:"decimal",notation:"standard",compactDisplay:"short",signDisplay:"auto",currencyDisplay:"symbol",currencySign:"standard",unitDisplay:"short",roundingMode:"halfExpand",roundingPriority:"auto",trailingZeroDisplay:"auto",useGrouping:true}},
  kubernetes: {cluster:{show:true,cpu:true,memory:true,showLabel:true,label:"cluster"},nodes:{show:true,cpu:true,memory:true,showLabel:true}},
  longhorn: {expanded:false,total:true,labels:true,nodes:true,include:[]},
  logo: {icon:"homepage.png"},
  stocks: {provider:"finnhub",color:true,cache:1,watchlist:[]},
  unifi_console: {url:"https://unifi",site:"default",username:"",password:"",key:""},
  customapi: {url:"https://example.com/api",icon:"mdi-api",label:"",href:"",refreshInterval:10000,username:"",password:"",method:"GET",headers:{},requestBody:"",mappings:[]},
};
function infoFieldContext(parent) {
  if (current?.name !== "widgets.yaml") return null;
  function locate(value, path = []) {
    if (value === parent) return path;
    for (let i = 0; i < (value?.Content?.length || 0); i += value.Kind === 4 ? 2 : 1) {
      const found = locate(value.Content[i + (value.Kind === 4 ? 1 : 0)], [...path, value.Kind === 4 ? value.Content[i].Value : i]);
      if (found) return found;
    }
    return null;
  }
  for (const item of root()?.Content || []) {
    if (item.Kind !== 4) continue;
    for (let i = 0; i < item.Content.length; i += 2) {
      const path = locate(item.Content[i + 1]);
      if (path) return {type:item.Content[i].Value,path};
    }
  }
  return null;
}
function infoParameterDefaults(parent) {
  const context = infoFieldContext(parent);
  if (!context) return null;
  if (context.type === "customapi" && context.path[0] === "mappings")
    return {field:"value",label:"",format:"text",scale:1,prefix:"",suffix:"",dateStyle:"long",timeStyle:"short",style:"long",numeric:"auto",locale:"ru"};
  let data = infoWidgetFields[context.type];
  for (const part of context.path) data = data?.[part];
  return data && typeof data === "object" && !Array.isArray(data) ? data : null;
}
function infoFieldChoices(name, parent) {
  const context = infoFieldContext(parent);
  if (!context) return null;
  const {type,path} = context;
  const top = path.length === 0;
  let choices;
  if (type === "search" && path[0] === "provider" && parent.Kind === 2) choices = ["google","duckduckgo","bing","baidu","brave"];
  if (top) {
    if (["datetime","greeting"].includes(type) && name === "text_size") choices = ["xs","sm","md","lg","xl","2xl","3xl","4xl"];
    if (type === "search" && name === "provider") choices = ["google","duckduckgo","bing","baidu","brave","custom"];
    if (type === "stocks" && name === "provider") choices = ["finnhub"];
    if (type === "openweathermap" && name === "provider") choices = ["openweathermap"];
    if (["resources","glances","openmeteo","openweathermap"].includes(type) && ["unit","units"].includes(name)) choices = ["metric","imperial"];
    if (["resources","glances"].includes(type) && name === "diskUnits") choices = ["bytes","bbytes"];
    if (type === "glances" && name === "version") choices = ["3","4"];
    if (type === "customapi" && name === "method") choices = ["GET","POST","PUT","PATCH","DELETE","HEAD","OPTIONS"];
  }
  const dateOptions = {dateStyle:["full","long","medium","short"],timeStyle:["full","long","medium","short"],hourCycle:["h11","h12","h23","h24"],weekday:["long","short","narrow"],era:["long","short","narrow"],year:["numeric","2-digit"],month:["numeric","2-digit","long","short","narrow"],day:["numeric","2-digit"],hour:["numeric","2-digit"],minute:["numeric","2-digit"],second:["numeric","2-digit"],timeZoneName:["long","short","shortOffset","longOffset","shortGeneric","longGeneric"],fractionalSecondDigits:["1","2","3"],dayPeriod:["long","short","narrow"],formatMatcher:["basic","best fit"],localeMatcher:["lookup","best fit"]};
  if (type === "datetime" && path[0] === "format") {
    choices = dateOptions[name];
    if (["calendar","numberingSystem"].includes(name)) {
      try { choices = Intl.supportedValuesOf(name); } catch {}
    }
  }
  if (["openmeteo","openweathermap"].includes(type) && path[0] === "format") choices = {
    style:["decimal","currency","percent","unit"],notation:["standard","scientific","engineering","compact"],compactDisplay:["short","long"],signDisplay:["auto","always","exceptZero","negative","never"],currencyDisplay:["symbol","narrowSymbol","code","name"],currencySign:["standard","accounting"],unitDisplay:["short","long","narrow"],roundingMode:["ceil","floor","expand","trunc","halfCeil","halfFloor","halfExpand","halfTrunc","halfEven"],roundingPriority:["auto","morePrecision","lessPrecision"],trailingZeroDisplay:["auto","stripIfInteger"]
  }[name];
  if (type === "customapi" && path[0] === "mappings") choices = {
    format:["text","number","float","percent","duration","bytes","bitrate","date","relativeDate","size"],dateStyle:dateOptions.dateStyle,timeStyle:dateOptions.timeStyle,style:["long","short","narrow"],numeric:["always","auto"]
  }[name];
  if (type === "search" && name === "target" && top) return [
    ["_blank", t("В новой вкладке")],
    ["_self", t("В текущей вкладке")],
    ["_parent", t("В родительском окне")],
    ["_top", t("В основном окне")],
  ];
  return choices?.map(value => [value,value]) || null;
}
