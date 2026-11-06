// Refresh embedded filename indexes; image assets remain on the upstream CDN.
const fs = require("node:fs");
(async () => {
  const sources = [];
  for (const [id, name, repo, branch, directory, format, license] of [
    [
      "dashboard",
      "Dashboard Icons",
      "homarr-labs/dashboard-icons",
      "main",
      "png",
      "png",
      "Apache-2.0",
    ],
    [
      "selfhst",
      "selfh.st Icons",
      "selfhst/icons",
      "main",
      "png",
      "png",
      "CC-BY-4.0",
    ],
    [
      "simple",
      "Simple Icons · бренды",
      "simple-icons/simple-icons",
      "develop",
      "icons",
      "svg",
      "CC0-1.0",
    ],
    [
      "mdi",
      "Material Design Icons",
      "Templarian/MaterialDesign",
      "master",
      "svg",
      "svg",
      "Apache-2.0",
    ],
    ["lucide", "Lucide", "lucide-icons/lucide", "main", "icons", "svg", "ISC"],
    [
      "tabler",
      "Tabler · Outline",
      "tabler/tabler-icons",
      "main",
      "icons/outline",
      "svg",
      "MIT",
    ],
    [
      "tabler-filled",
      "Tabler · Filled",
      "tabler/tabler-icons",
      "main",
      "icons/filled",
      "svg",
      "MIT",
    ],
    [
      "bootstrap",
      "Bootstrap Icons",
      "twbs/icons",
      "main",
      "icons",
      "svg",
      "MIT",
    ],
    [
      "heroicons",
      "Heroicons · Outline",
      "tailwindlabs/heroicons",
      "master",
      "optimized/24/outline",
      "svg",
      "MIT",
    ],
    [
      "heroicons-solid",
      "Heroicons · Solid",
      "tailwindlabs/heroicons",
      "master",
      "optimized/24/solid",
      "svg",
      "MIT",
    ],
    [
      "fa-solid",
      "Font Awesome Free · Solid",
      "FortAwesome/Font-Awesome",
      "7.x",
      "svgs/solid",
      "svg",
      "CC-BY-4.0",
    ],
    [
      "fa-brands",
      "Font Awesome Free · Brands",
      "FortAwesome/Font-Awesome",
      "7.x",
      "svgs/brands",
      "svg",
      "CC-BY-4.0",
    ],
  ]) {
    const response = await fetch(
      `https://api.github.com/repos/${repo}/git/trees/${branch}?recursive=1`,
      {
        headers: { "User-Agent": "Home-Pager-index-builder" },
        signal: AbortSignal.timeout(60000),
      },
    );
    if (!response.ok) throw Error(`${repo}: HTTP ${response.status}`);
    const data = await response.json();
    if (data.truncated) throw Error("Incomplete tree: " + repo);
    const names = data.tree
      .filter(
        (x) =>
          x.type === "blob" &&
          x.path.startsWith(directory + "/") &&
          x.path.endsWith("." + format) &&
          !x.path.slice(directory.length + 1).includes("/"),
      )
      .map((x) => x.path.slice(directory.length + 1, -(format.length + 1)))
      .sort();
    if (!names.length) throw Error("Empty index: " + repo);
    sources.push({
      id,
      name,
      repository: `https://github.com/${repo}`,
      revision: data.sha,
      format,
      license,
      template: `https://cdn.jsdelivr.net/gh/${repo}@${branch}/${directory}/{name}.${format}`,
      names,
    });
    console.log(`${name}: ${names.length}`);
  }
  fs.writeFileSync(
    "web/icon-index.json",
    JSON.stringify({ updated: new Date().toISOString().slice(0, 10), sources }),
  );
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
