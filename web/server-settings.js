"use strict";

async function openServerSettings() {
  if (busy) return;
  await run(async () => {
    const data = await api("/api/server-config");
    openDialog(
      t("Конфигурация сервера Home Pager"),
      t(
        "Параметры сохраняются в конфиг на сервере и применяются после перезапуска Home Pager. Файлы Homepage и изображения автоматически не переносятся.",
      ),
    );
    const body = $("dialog-body");
    body.append(
      make("p", "hint", t("Файл: ") + data.path),
      make("p", "hint", t("Относительные пути считаются от: ") + data.base),
    );
    if (data.overrides?.length)
      body.append(
        make(
          "p",
          "error",
          t("При запуске заданы CLI-параметры: ") +
            data.overrides.join(", ") +
            t(
              ". Они имеют приоритет над конфигом; уберите соответствующие параметры из команды запуска, чтобы изменения вступили в силу.",
            ),
        ),
      );
    const fields = {};
    for (const [key, title, help] of [
      [
        "listen",
        t("Адрес прослушивания"),
        t(
          "Например: 127.0.0.1:8090 или 0.0.0.0:8090. Новый адрес действует после перезапуска.",
        ),
      ],
      [
        "config_dir",
        t("Каталог конфигурации Homepage"),
        t(
          "Путь на сервере к settings.yaml, services.yaml и остальным файлам. Каталог должен быть доступен панели для записи.",
        ),
      ],
      [
        "icons_dir",
        t("Каталог загруженных иконок"),
        t(
          "Путь на сервере. Пусто — icons внутри каталога конфигурации Homepage.",
        ),
      ],
      [
        "icons_url",
        t("URL-путь иконок в Homepage"),
        t(
          "Например: /icons. Должен соответствовать монтированию или настройкам веб-сервера Homepage.",
        ),
      ],
      [
        "images_dir",
        t("Каталог загруженных фонов"),
        t(
          "Путь на сервере. Пусто — images внутри каталога конфигурации Homepage.",
        ),
      ],
      [
        "images_url",
        t("URL-путь фонов в Homepage"),
        t(
          "Например: /images. Смена пути не переписывает ссылки в сервисах и настройках Homepage.",
        ),
      ],
    ]) {
      const input = field(title, make("input"), help);
      input.id = "server-config-" + key;
      input.value = data.settings[key] || "";
      input.required = !["images_dir", "icons_dir"].includes(key);
      fields[key] = input;
    }
    body.append(make("h3", "", t("Авторизация")));
    const passwordMode = field(
      t("Пароль панели"),
      select([
        [
          "keep",
          data.hasPassword
            ? t("Оставить текущий пароль")
            : t("Оставить текущую настройку — пароль не задан"),
        ],
        ["change", t("Задать новый пароль")],
        ["disable", t("Отключить пароль")],
      ]),
      t(
        "Текущий пароль не передаётся в браузер. Изменение действует после перезапуска.",
      ),
    );
    passwordMode.id = "server-config-password-mode";
    const password = field(t("Новый пароль"), make("input"));
    password.id = "server-config-password";
    password.type = "password";
    password.autocomplete = "new-password";
    password.parentElement.classList.add("hidden");
    passwordMode.addEventListener("change", () =>
      password.parentElement.classList.toggle(
        "hidden",
        passwordMode.value !== "change",
      ),
    );
    body.append(make("h3", "", t("Прокси для скачивания изображений")));
    const proxyModes = {};
    for (const [key, title] of [
      ["http_proxy", t("HTTP-прокси")],
      ["https_proxy", t("HTTPS-прокси")],
      ["no_proxy", t("Без прокси для адресов")],
    ]) {
      const mode = field(
        title + t(": режим"),
        select([
          ["inherit", t("Из окружения процесса")],
          ["off", t("Не использовать")],
          ["custom", t("Указать значение")],
        ]),
      );
      mode.id = "server-config-" + key + "-mode";
      const input = field(
        title,
        make("input"),
        key === "no_proxy"
          ? t("Адреса через запятую: localhost,127.0.0.1,.example.com")
          : t("Например: http://proxy.example.com:3128"),
      );
      input.id = "server-config-" + key;
      const value = data.settings[key];
      mode.value = value == null ? "inherit" : value === "" ? "off" : "custom";
      input.value = value || "";
      const update = () =>
        input.parentElement.classList.toggle("hidden", mode.value !== "custom");
      mode.addEventListener("change", update);
      update();
      fields[key] = input;
      proxyModes[key] = mode;
    }
    const active = make("details", "advanced-options");
    active.append(make("summary", "", t("Действующие параметры процесса")));
    const values = make("pre", "server-config-active");
    values.textContent = [
      "listen",
      "config_dir",
      "icons_dir",
      "icons_url",
      "images_dir",
      "images_url",
    ]
      .map((k) => k + ": " + data.active[k])
      .join("\n");
    active.append(values);
    body.append(active);
    const status = make("p", "hint");
    status.id = "server-config-status";
    status.setAttribute("role", "status");
    body.append(status);
    const save = button(
      t("Сохранить конфиг на сервере"),
      "primary",
      async () => {
        status.className = "hint";
        for (const input of Object.values(fields)) {
          if (!input.checkValidity()) {
            input.reportValidity();
            return;
          }
        }
        if (passwordMode.value === "change" && !password.value) {
          status.className = "error";
          status.textContent = t(
            "Введите новый пароль или выберите отключение пароля.",
          );
          return;
        }
        const settings = {};
        for (const [key, input] of Object.entries(fields)) {
          const mode = proxyModes[key]?.value;
          settings[key] =
            mode === "inherit"
              ? null
              : mode === "off"
                ? ""
                : input.value.trim();
        }
        const request = { revision: data.revision, settings };
        if (passwordMode.value !== "keep")
          request.password =
            passwordMode.value === "disable" ? "" : password.value;
        save.disabled = true;
        try {
          const result = await api("/api/server-config", {
            method: "PUT",
            body: JSON.stringify(request),
          });
          data.revision = result.revision;
          if (request.password !== undefined)
            data.hasPassword = request.password !== "";
          password.value = "";
          passwordMode.value = "keep";
          passwordMode.options[0].textContent = data.hasPassword
            ? t("Оставить текущий пароль")
            : t("Оставить текущую настройку — пароль не задан");
          password.parentElement.classList.add("hidden");
          status.textContent =
            t("Конфиг сохранён. Для применения перезапустите Home Pager.") +
            (result.backup ? t(" Резервная копия: ") + result.backup : "");
        } catch (e) {
          status.className = "error";
          status.textContent = e.message;
        } finally {
          save.disabled = false;
        }
      },
    );
    $("dialog-actions").append(
      button(t("Закрыть"), "secondary", () => $("dialog").close()),
      save,
    );
  });
}
