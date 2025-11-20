import JSZip from "https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm";

const dropzone = document.getElementById("devDropzone");
const fileInput = document.getElementById("devFileInput");
const folderInput = document.getElementById("devFolderInput");
const selectFilesBtn = document.getElementById("devSelectFilesBtn");
const selectFolderBtn = document.getElementById("devSelectFolderBtn");

const fileCountEl = document.getElementById("devFileCount");
const totalSizeEl = document.getElementById("devSize");
const mainLanguageEl = document.getElementById("devMainLanguage");
const dominantBadge = document.getElementById("dominantBadge");
const frameworkShortEl = document.getElementById("devFrameworkShort");
const languageList = document.getElementById("languageList");
const frameworksList = document.getElementById("frameworksList");
const analysisSummaryEl = document.getElementById("analysisSummary");
const blueprintListEl = document.getElementById("blueprintList");
const suggestionPill = document.getElementById("suggestionPill");
const structurePreview = document.getElementById("structurePreview");
const previewTitle = document.getElementById("previewTitle");
const previewSummary = document.getElementById("previewSummary");
const treeContainer = document.getElementById("treeContainer");
const mappingList = document.getElementById("mappingList");
const downloadBtn = document.getElementById("downloadBlueprintBtn");

const loadingOverlay = document.getElementById("loadingOverlay");
const loadingMessage = document.getElementById("loadingMessage");
const loadingCountEl = document.getElementById("loadingCount");

let projectFiles = [];
let emptyDirectories = [];
let currentInsights = null;
let selectedBlueprint = null;

const LANGUAGE_MAP = {
  js: "JavaScript",
  mjs: "JavaScript",
  cjs: "JavaScript",
  jsx: "JavaScript",
  ts: "TypeScript",
  tsx: "TypeScript",
  html: "HTML",
  htm: "HTML",
  css: "CSS",
  scss: "CSS",
  sass: "CSS",
  less: "CSS",
  styl: "CSS",
  json: "JSON",
  md: "Documentação",
  markdown: "Documentação",
  yml: "Configuração",
  yaml: "Configuração",
  toml: "Configuração",
  xml: "Configuração",
  svg: "Assets",
  png: "Assets",
  jpg: "Assets",
  jpeg: "Assets",
  webp: "Assets",
  gif: "Assets",
  ico: "Assets",
  mp4: "Media",
  mov: "Media",
  mp3: "Media",
  wav: "Media",
};

const FILE_FAMILIES = {
  script: ["js", "mjs", "cjs", "jsx", "ts", "tsx"],
  style: ["css", "scss", "sass", "less", "styl"],
  html: ["html", "htm"],
  docs: ["md", "markdown"],
  config: ["json", "yml", "yaml", "toml", "xml"],
  assets: ["svg", "png", "jpg", "jpeg", "webp", "gif", "ico"],
  media: ["mp4", "mov", "mp3", "wav"],
};

const FRAMEWORK_HINTS = [
  { label: "React", matchers: ["react", "react-dom", ".jsx", ".tsx"] },
  { label: "Preact", matchers: ["preact"] },
  { label: "Vue", matchers: ["vue", ".vue", "nuxt"] },
  { label: "Svelte", matchers: ["svelte"] },
  { label: "Solid", matchers: ["solid-js"] },
  { label: "Astro", matchers: ["astro"] },
  { label: "Next.js", matchers: ["next"] },
  { label: "Remix", matchers: ["remix"] },
  { label: "Angular", matchers: ["angular", "angular.json"] },
  { label: "Lit", matchers: ["lit", "lit-element"] },
];

const TOOLING_HINTS = [
  { label: "Vite", matchers: ["vite", "vite.config"] },
  { label: "Webpack", matchers: ["webpack", "webpack.config"] },
  { label: "Rollup", matchers: ["rollup", "rollup.config"] },
  { label: "Parcel", matchers: ["parcel", "parcel config"] },
  { label: "esbuild", matchers: ["esbuild"] },
  { label: "Snowpack", matchers: ["snowpack"] },
];

const BLUEPRINTS = [
  {
    id: "vanilla-foundation",
    title: "Base Vanilla Modular",
    badges: ["Vanilla", "Sem build"],
    description: "Separa origem e distribuição, pronto para alojar em qualquer static host.",
    tree: [
      {
        name: "public/",
        children: [
          { name: "index.html" },
          { name: "assets/", children: [{ name: "images/" }, { name: "fonts/" }] },
        ],
      },
      {
        name: "src/",
        children: [
          { name: "scripts/" },
          { name: "styles/" },
          { name: "modules/" },
        ],
      },
      { name: "docs/" },
    ],
    score: (insights) => {
      if (!insights) return 0;
      const noFrameworks = insights.frameworks.length === 0 ? 30 : 0;
      const htmlWeight = insights.languageRatios.HTML * 25;
      const scriptWeight = insights.languageRatios.JavaScript * 30;
      return noFrameworks + htmlWeight + scriptWeight;
    },
  },
  {
    id: "component-slices",
    title: "Component Driven",
    badges: ["Componentes", "Escalável"],
    description: "Ideal para React/Vue/Svelte ou para modularizar vanilla JS em slices.",
    tree: [
      {
        name: "src/",
        children: [
          { name: "components/" },
          { name: "hooks/" },
          { name: "services/" },
          { name: "styles/" },
        ],
      },
      {
        name: "app/",
        children: [
          { name: "routes/" },
          { name: "layouts/" },
        ],
      },
      { name: "tests/" },
      { name: "public/" },
    ],
    score: (insights) => {
      if (!insights) return 0;
      const frameworks = insights.frameworks.length ? 40 : 0;
      const tsWeight = insights.languageRatios.TypeScript * 35;
      const scriptWeight = insights.languageRatios.JavaScript * 20;
      return frameworks + tsWeight + scriptWeight;
    },
  },
  {
    id: "content-hub",
    title: "Content & Assets",
    badges: ["Docs", "Assets"],
    description: "Para projectos com muitos media e documentação, mantendo código isolado.",
    tree: [
      {
        name: "content/",
        children: [
          { name: "docs/" },
          { name: "guides/" },
          { name: "changelogs/" },
        ],
      },
      {
        name: "src/",
        children: [
          { name: "scripts/" },
          { name: "styles/" },
        ],
      },
      {
        name: "assets/",
        children: [
          { name: "images/" },
          { name: "media/" },
          { name: "vectors/" },
        ],
      },
      { name: "dist/" },
    ],
    score: (insights) => {
      if (!insights) return 0;
      const docsWeight = insights.familyRatios.docs * 40;
      const assetsWeight = insights.familyRatios.assets * 35;
      return docsWeight + assetsWeight + insights.familyRatios.media * 20;
    },
  },
];

const BLUEPRINT_PLACEMENTS = {
  "vanilla-foundation": (meta) => {
    switch (meta.family) {
      case "html":
        return joinPath("public", meta.relativeDir, meta.file.name);
      case "style":
        return joinPath("src/styles", meta.relativeDir, meta.file.name);
      case "script":
        return joinPath("src/scripts", meta.relativeDir, meta.file.name);
      case "docs":
        return joinPath("docs", meta.relativeDir, meta.file.name);
      case "assets":
      case "media":
        return joinPath("public/assets", meta.relativeDir, meta.file.name);
      case "config":
        return joinPath("config", meta.relativeDir, meta.file.name);
      default:
        return joinPath("src/modules", meta.relativeDir, meta.file.name);
    }
  },
  "component-slices": (meta) => {
    switch (meta.family) {
      case "script":
        return joinPath("src/components", meta.relativeDir, meta.file.name);
      case "style":
        return joinPath("src/styles", meta.relativeDir, meta.file.name);
      case "html":
        return joinPath("app/routes", meta.relativeDir, meta.file.name);
      case "docs":
        return joinPath("docs", meta.relativeDir, meta.file.name);
      case "config":
        return joinPath("config", meta.relativeDir, meta.file.name);
      case "assets":
      case "media":
        return joinPath("public/assets", meta.relativeDir, meta.file.name);
      default:
        return joinPath("src/services", meta.relativeDir, meta.file.name);
    }
  },
  "content-hub": (meta) => {
    switch (meta.family) {
      case "docs":
        return joinPath("content/docs", meta.relativeDir, meta.file.name);
      case "html":
        return joinPath("content/guides", meta.relativeDir, meta.file.name);
      case "style":
        return joinPath("src/styles", meta.relativeDir, meta.file.name);
      case "script":
        return joinPath("src/scripts", meta.relativeDir, meta.file.name);
      case "assets":
        return joinPath("assets/images", meta.relativeDir, meta.file.name);
      case "media":
        return joinPath("assets/media", meta.relativeDir, meta.file.name);
      case "config":
        return joinPath("config", meta.relativeDir, meta.file.name);
      default:
        return joinPath("content/misc", meta.relativeDir, meta.file.name);
    }
  },
};

const startLoading = (message) => {
  loadingMessage.textContent = message;
  loadingCountEl.textContent = "0";
  loadingOverlay.classList.add("active");
  loadingOverlay.setAttribute("aria-hidden", "false");
};

const stopLoading = () => {
  loadingOverlay.classList.remove("active");
  loadingOverlay.setAttribute("aria-hidden", "true");
};

const bumpLoading = () => {
  const current = Number(loadingCountEl.textContent.replace(/\D/g, "")) || 0;
  loadingCountEl.textContent = (current + 1).toLocaleString("pt-PT");
};

const formatBytes = (bytes) => {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
};

const normalizePath = (value = "") => value.replace(/\\/g, "/").replace(/^\/+/, "");

const joinPath = (...segments) => {
  const cleaned = segments
    .filter(Boolean)
    .map((part) => normalizePath(part))
    .filter((part) => part.length);
  return cleaned.join("/");
};

const getRelativeDirectory = (relativePath, filename) => {
  if (!relativePath) return "";
  const normalized = normalizePath(relativePath);
  if (!normalized.includes("/")) return "";
  const idx = normalized.lastIndexOf("/");
  const dir = normalized.slice(0, idx);
  if (dir === filename.replace(/\\/g, "/")) return "";
  return dir;
};

const classifyFile = (filename) => {
  const ext = filename.includes(".") ? filename.split(".").pop().toLowerCase() : "";
  const lang = LANGUAGE_MAP[ext] || "Outros";
  const family = Object.entries(FILE_FAMILIES).find(([, list]) => list.includes(ext))?.[0] || "other";
  return { ext, language: lang, family };
};

const detectFrameworksFromName = (name) => {
  const lower = name.toLowerCase();
  return FRAMEWORK_HINTS.filter((hint) =>
    hint.matchers.some((matcher) => lower.includes(matcher))
  ).map((hint) => hint.label);
};

const detectToolingFromName = (name) => {
  const lower = name.toLowerCase();
  return TOOLING_HINTS.filter((hint) =>
    hint.matchers.some((matcher) => lower.includes(matcher))
  ).map((hint) => hint.label);
};

const analyzeProject = async (entries) => {
  if (!entries.length) return null;

  const stats = {
    totalFiles: entries.length,
    totalSize: 0,
    languageCounts: {},
    familyCounts: {
      script: 0,
      style: 0,
      html: 0,
      docs: 0,
      config: 0,
      assets: 0,
      media: 0,
      other: 0,
    },
    frameworks: new Set(),
    tooling: new Set(),
    packageManagers: new Set(),
    packageJson: null,
  };

  const packageEntry = entries.find(({ file }) => file.name.toLowerCase() === "package.json");
  if (packageEntry) {
    try {
      const pkgRaw = await packageEntry.file.text();
      stats.packageJson = JSON.parse(pkgRaw);
      const deps = {
        ...(stats.packageJson.dependencies || {}),
        ...(stats.packageJson.devDependencies || {}),
      };
      FRAMEWORK_HINTS.forEach((hint) => {
        if (hint.matchers.some((matcher) => deps[matcher])) {
          stats.frameworks.add(hint.label);
        }
      });
      TOOLING_HINTS.forEach((hint) => {
        if (hint.matchers.some((matcher) => deps[matcher])) {
          stats.tooling.add(hint.label);
        }
      });
    } catch {
      // Ignorar erros de parsing
    }
  }

  entries.forEach(({ file }) => {
    stats.totalSize += file.size;
    const { language, family } = classifyFile(file.name);
    stats.languageCounts[language] = (stats.languageCounts[language] || 0) + 1;
    stats.familyCounts[family] = (stats.familyCounts[family] || 0) + 1;

    detectFrameworksFromName(file.name).forEach((fw) => stats.frameworks.add(fw));
    detectToolingFromName(file.name).forEach((tool) => stats.tooling.add(tool));

    const lower = file.name.toLowerCase();
    if (lower === "package-lock.json") stats.packageManagers.add("npm");
    if (lower === "yarn.lock") stats.packageManagers.add("yarn");
    if (lower === "pnpm-lock.yaml") stats.packageManagers.add("pnpm");
    if (lower === "bun.lockb") stats.packageManagers.add("bun");
  });

  const ratios = {};
  Object.entries(stats.languageCounts).forEach(([lang, count]) => {
    ratios[lang] = count / stats.totalFiles;
  });
  stats.languageRatios = ratios;

  const familyRatios = {};
  Object.entries(stats.familyCounts).forEach(([family, count]) => {
    familyRatios[family] = count / stats.totalFiles;
  });
  stats.familyRatios = familyRatios;

  return stats;
};

const renderLanguageList = (insights) => {
  languageList.innerHTML = "";
  if (!insights || !insights.totalFiles) {
    languageList.innerHTML = "<li>—</li>";
    return;
  }

  const sorted = Object.entries(insights.languageCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  sorted.forEach(([language, count]) => {
    const li = document.createElement("li");
    const percent = Math.round((count / insights.totalFiles) * 100);
    li.innerHTML = `<span>${language}</span><strong>${percent}%</strong>`;
    languageList.appendChild(li);
  });
};

const renderFrameworkList = (insights) => {
  frameworksList.innerHTML = "";
  if (!insights || (!insights.frameworks.size && !insights.tooling.size)) {
    frameworksList.innerHTML = "<li>Nenhum framework detectado</li>";
    return;
  }

  const items = [
    ...Array.from(insights.frameworks).map((fw) => `Framework · ${fw}`),
    ...Array.from(insights.tooling).map((tool) => `Tooling · ${tool}`),
    ...Array.from(insights.packageManagers).map((pm) => `Gestor · ${pm}`),
  ];

  if (!items.length) {
    frameworksList.innerHTML = "<li>Nenhum framework detectado</li>";
    return;
  }

  items.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    frameworksList.appendChild(li);
  });
};

const renderInsights = (insights) => {
  if (!insights) {
    fileCountEl.textContent = "0";
    totalSizeEl.textContent = "0 B";
    mainLanguageEl.textContent = "—";
    dominantBadge.textContent = "Aguardando ficheiros";
    frameworkShortEl.textContent = "—";
    analysisSummaryEl.textContent = "Ainda sem dados. Arraste ficheiros para gerar recomendações.";
    renderLanguageList(null);
    renderFrameworkList(null);
    return;
  }

  fileCountEl.textContent = insights.totalFiles.toLocaleString("pt-PT");
  totalSizeEl.textContent = formatBytes(insights.totalSize);

  const [dominantLanguage] =
    Object.entries(insights.languageCounts).sort((a, b) => b[1] - a[1])[0] || [];
  mainLanguageEl.textContent = dominantLanguage || "—";
  if (dominantLanguage) {
    const percent = Math.round(
      (insights.languageCounts[dominantLanguage] / insights.totalFiles) * 100
    );
    dominantBadge.textContent = `${percent}% ${dominantLanguage}`;
  } else {
    dominantBadge.textContent = "Sem predominância clara";
  }

  frameworkShortEl.textContent = insights.frameworks.size
    ? Array.from(insights.frameworks).join(", ")
    : "Nenhum";

  const assetRatio = Math.round(insights.familyRatios.assets * 100);
  const docRatio = Math.round(insights.familyRatios.docs * 100);
  analysisSummaryEl.textContent = [
    `Projecto com ${insights.totalFiles.toLocaleString("pt-PT")} ficheiros`,
    dominantLanguage ? `· ${dominantBadge.textContent}` : "",
    assetRatio ? `· ${assetRatio}% assets` : "",
    docRatio ? `· ${docRatio}% docs` : "",
  ]
    .filter(Boolean)
    .join(" ");

  renderLanguageList(insights);
  renderFrameworkList(insights);
};

const renderBlueprints = (insights) => {
  blueprintListEl.innerHTML = "";
  if (!insights) {
    suggestionPill.textContent = "Adicione ficheiros para ver sugestões";
    return;
  }

  const ranked = BLUEPRINTS.map((bp) => ({
    ...bp,
    score: bp.score(insights),
  })).sort((a, b) => b.score - a.score);

  if (!selectedBlueprint) {
    selectedBlueprint = ranked[0]?.id || null;
  }

  suggestionPill.textContent = ranked[0]
    ? `Sugestão principal: ${ranked[0].title}`
    : "Sem recomendação";

  ranked.forEach((bp) => {
    const card = document.createElement("article");
    card.className = "blueprint-card";
    card.setAttribute("data-blueprint", bp.id);
    card.tabIndex = 0;
    if (bp.id === selectedBlueprint) {
      card.classList.add("blueprint-card--selected");
    }
    card.innerHTML = `
      <div class="blueprint-card__head">
        <h4>${bp.title}</h4>
        <span class="blueprint-score">${Math.round(bp.score)}</span>
      </div>
      <p>${bp.description}</p>
      <div class="blueprint-card__badges">
        ${bp.badges.map((badge) => `<span>${badge}</span>`).join("")}
      </div>
    `;
    card.addEventListener("click", () => {
      selectedBlueprint = bp.id;
      renderBlueprints(insights);
    });
    card.addEventListener("keypress", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        card.click();
      }
    });
    blueprintListEl.appendChild(card);
  });

  const activeBlueprint = ranked.find((bp) => bp.id === selectedBlueprint);
  if (activeBlueprint) {
    renderPreview(activeBlueprint);
    renderMapping();
  } else {
    renderPreview(null);
  }
};

const renderPreview = (blueprint) => {
  if (!blueprint) {
    structurePreview.setAttribute("aria-hidden", "true");
    treeContainer.innerHTML =
      '<p class="placeholder">Selecione um blueprint para visualizar a estrutura proposta.</p>';
    previewTitle.textContent = "Seleccione um blueprint";
    previewSummary.textContent = "Mostramos a árvore recomendada e o motivo.";
    downloadBtn.disabled = true;
    downloadBtn.textContent = "Gerar ZIP com blueprint";
    return;
  }

  structurePreview.setAttribute("aria-hidden", "false");
  previewTitle.textContent = blueprint.title;
  previewSummary.textContent = blueprint.description;
  downloadBtn.disabled = !projectFiles.length;
  downloadBtn.textContent = projectFiles.length
    ? `Gerar ZIP · ${blueprint.title}`
    : "Adicione ficheiros para gerar ZIP";

  treeContainer.innerHTML = "";
  treeContainer.appendChild(createTree(blueprint.tree));
};

const createTree = (nodes) => {
  const ul = document.createElement("ul");
  ul.className = "tree-list";
  nodes.forEach((node) => {
    const li = document.createElement("li");
    li.textContent = node.name;
    if (node.children?.length) {
      li.appendChild(createTree(node.children));
    }
    ul.appendChild(li);
  });
  return ul;
};

const renderMapping = () => {
  mappingList.innerHTML = "";
  if (!projectFiles.length || !selectedBlueprint) {
    mappingList.innerHTML =
      '<li class="placeholder">Seleccione um blueprint para ver a distribuição.</li>';
    return;
  }

  const summary = {};
  projectFiles.forEach(({ file, relativePath }) => {
    const placement = getPlacementPath(selectedBlueprint, file, relativePath);
    if (!placement) return;
    const topFolder = placement.split("/")[0];
    summary[topFolder] = (summary[topFolder] || 0) + 1;
  });

  Object.entries(summary)
    .sort((a, b) => b[1] - a[1])
    .forEach(([folder, count]) => {
      const li = document.createElement("li");
      li.className = "mapping-item";
      li.innerHTML = `<strong>${folder}</strong><span>${count.toLocaleString("pt-PT")} ficheiros</span>`;
      mappingList.appendChild(li);
    });

  if (!mappingList.children.length) {
    mappingList.innerHTML =
      '<li class="placeholder">Sem mapeamento disponível para este blueprint.</li>';
  }
};

const getPlacementPath = (blueprintId, file, relativePath) => {
  const placementFn = BLUEPRINT_PLACEMENTS[blueprintId];
  if (!placementFn) return null;
  const relativeDir = getRelativeDirectory(relativePath, file.name);
  const { family } = classifyFile(file.name);
  return placementFn({ file, relativeDir, family });
};

const handleItems = async (incoming) => {
  const fileEntries = incoming.filter((item) => item.file);
  emptyDirectories = incoming.filter((item) => item.directory);
  projectFiles = fileEntries;

  if (!projectFiles.length) {
    currentInsights = null;
    renderInsights(null);
    renderBlueprints(null);
    renderMapping();
    downloadBtn.disabled = true;
    return;
  }

  currentInsights = await analyzeProject(projectFiles);
  renderInsights(currentInsights);
  renderBlueprints(currentInsights);
  renderMapping();
};

const readDirectoryEntries = (directoryReader) =>
  new Promise((resolve, reject) => {
    const entries = [];
    const readBatch = () => {
      directoryReader.readEntries((batch) => {
        if (!batch.length) {
          resolve(entries);
          return;
        }
        entries.push(...batch);
        readBatch();
      }, reject);
    };
    readBatch();
  });

const traverseFileEntry = async (entry, pathPrefix = "", onProgress) => {
  if (!entry) return [];
  const prefix = pathPrefix ? `${pathPrefix}/` : "";

  if (entry.isFile) {
    try {
      const file = await new Promise((resolve, reject) => entry.file(resolve, reject));
      onProgress?.(file);
      return [{ file, relativePath: `${prefix}${file.name}` }];
    } catch (error) {
      console.error("Erro ao ler ficheiro da pasta:", entry.fullPath, error);
      return [];
    }
  }

  if (entry.isDirectory) {
    const newPrefix = `${prefix}${entry.name}`;
    const reader = entry.createReader();
    const children = await readDirectoryEntries(reader);
    if (!children.length) {
      onProgress?.(null);
      return [{ directory: true, relativePath: newPrefix }];
    }
    const results = [];
    for (const child of children) {
      const descendants = await traverseFileEntry(child, newPrefix, onProgress);
      results.push(...descendants);
    }
    return results;
  }

  return [];
};

const extractFilesFromDataTransfer = async (dataTransfer, onProgress) => {
  if (!dataTransfer) return [];
  const items = Array.from(dataTransfer.items || []).filter((item) => item.kind === "file");
  const entries = items
    .map((item) => item.webkitGetAsEntry && item.webkitGetAsEntry())
    .filter(Boolean);

  if (!entries.length) {
    return Array.from(dataTransfer.files || []).map((file) => {
      onProgress?.(file);
      return { file, relativePath: file.name };
    });
  }

  const collected = [];
  for (const entry of entries) {
    const descendants = await traverseFileEntry(entry, "", onProgress);
    collected.push(...descendants);
  }
  if (!collected.length && dataTransfer.files && dataTransfer.files.length) {
    return Array.from(dataTransfer.files).map((file) => {
      onProgress?.(file);
      return { file, relativePath: file.name };
    });
  }
  return collected;
};

const normalizeFileInput = async (inputEl, onProgress) => {
  const files = Array.from(inputEl.files || []);
  return files.map((file) => {
    onProgress?.(file);
    return {
      file,
      relativePath: file.webkitRelativePath || file.name,
    };
  });
};

const generateBlueprintZip = async () => {
  if (!projectFiles.length || !selectedBlueprint) return;
  const zip = new JSZip();
  const blueprintId = selectedBlueprint;

  for (const { file, relativePath } of projectFiles) {
    const targetPath = getPlacementPath(blueprintId, file, relativePath);
    if (!targetPath) continue;
    const data = await file.arrayBuffer();
    zip.file(targetPath, data);
  }

  emptyDirectories.forEach((dir) => {
    const target = joinPath("ORIGINAL_EMPTY", dir.relativePath);
    zip.folder(target);
  });

  const content = await zip.generateAsync({ type: "blob" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(content);
  link.download = `${blueprintId}-ziplifica.zip`;
  link.click();
};

downloadBtn.addEventListener("click", async () => {
  if (downloadBtn.disabled) return;
  downloadBtn.disabled = true;
  downloadBtn.textContent = "A gerar ZIP...";
  try {
    await generateBlueprintZip();
    downloadBtn.textContent = "ZIP pronto";
  } catch (error) {
    console.error("Erro ao gerar ZIP:", error);
    downloadBtn.textContent = "Falha ao gerar ZIP";
  } finally {
    setTimeout(() => {
      downloadBtn.disabled = !projectFiles.length;
      if (selectedBlueprint) {
        const blueprint = BLUEPRINTS.find((bp) => bp.id === selectedBlueprint);
        downloadBtn.textContent = projectFiles.length
          ? `Gerar ZIP · ${blueprint?.title || ""}`
          : "Adicione ficheiros para gerar ZIP";
      } else {
        downloadBtn.textContent = "Gerar ZIP com blueprint";
      }
    }, 1200);
  }
});

["dragenter", "dragover"].forEach((eventName) => {
  dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropzone.classList.add("dragover");
  });
});

["dragleave", "drop"].forEach((eventName) => {
  dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropzone.classList.remove("dragover");
  });
});

dropzone.addEventListener("drop", async (event) => {
  startLoading("A analisar itens arrastados...");
  try {
    const extracted = await extractFilesFromDataTransfer(event.dataTransfer, bumpLoading);
    await handleItems(extracted);
  } finally {
    stopLoading();
  }
});

selectFilesBtn.addEventListener("click", () => fileInput.click());
selectFolderBtn.addEventListener("click", () => folderInput.click());

fileInput.addEventListener("change", async () => {
  if (!fileInput.files?.length) return;
  startLoading("A carregar ficheiros selecionados...");
  try {
    const normalized = await normalizeFileInput(fileInput, bumpLoading);
    await handleItems(normalized);
  } finally {
    stopLoading();
  }
});

folderInput.addEventListener("change", async () => {
  if (!folderInput.files?.length) return;
  startLoading("A carregar pastas selecionadas...");
  try {
    const normalized = await normalizeFileInput(folderInput, bumpLoading);
    await handleItems(normalized);
  } finally {
    stopLoading();
  }
});

