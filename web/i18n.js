"use strict";

// Russian is the default even when the browser or operating system uses English.
const panelLanguage = (() => {
  try {
    return JSON.parse(localStorage.getItem("home-pager.panel-preferences.v1"))
      ?.language === "en"
      ? "en"
      : "ru";
  } catch {
    return "ru";
  }
})();
document.documentElement.lang = panelLanguage;

function t(key, ...values) {
  const text =
    panelLanguage === "en" && Object.hasOwn(englishStrings, key)
      ? englishStrings[key]
      : key;
  return text.replace(/\{(\d+)\}/g, (match, index) =>
    index < values.length ? String(values[index]) : match,
  );
}

function localizeStaticPage() {
  for (const el of document.querySelectorAll("[data-i18n]")) {
    if (el.textContent.trim() === el.dataset.i18n)
      el.textContent = t(el.dataset.i18n);
    el.removeAttribute("data-i18n");
  }
  for (const attr of ["title", "placeholder", "aria-label"]) {
    for (const el of document.querySelectorAll(`[data-i18n-${attr}]`))
      el.setAttribute(attr, t(el.getAttribute(`data-i18n-${attr}`)));
  }
}
if (document.readyState === "loading")
  document.addEventListener("DOMContentLoaded", localizeStaticPage, {
    once: true,
  });
else localizeStaticPage();

function reloadPanelLanguage() {
  window.location.reload();
}

function translateApiError(message) {
  if (panelLanguage !== "en") return message;
  if (Object.hasOwn(englishStrings, message)) return t(message);
  // Translate only known server error wrappers, preserving paths and upstream errors.
  for (const prefix of [
    "Не удалось загрузить изображение: ",
    "Не удалось сохранить резервную копию: ",
    "Сервер изображения вернул HTTP ",
    "Истекло время загрузки изображения. Проверьте доступ к сайту с сервера Home Pager; если нужен прокси, задайте HTTPS_PROXY/HTTP_PROXY и перезапустите панель. Причина: ",
  ])
    if (message.startsWith(prefix))
      return t(prefix) + message.slice(prefix.length);
  const suffix =
    " изменён извне. Загрузите актуальные файлы перед сохранением оформления.";
  if (message.endsWith(suffix))
    return message.slice(0, -suffix.length) + t(suffix);
  return message;
}
