import JSZip from "https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm";

const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("fileInput");
const folderInput = document.getElementById("folderInput");
const selectFilesBtn = document.getElementById("selectFilesBtn");
const selectFolderBtn = document.getElementById("selectFolderBtn");
const clearBtn = document.getElementById("clearBtn");
const fileList = document.getElementById("fileList");
const downloadBtn = document.getElementById("downloadBtn");
const fileCount = document.getElementById("fileCount");
const status = document.getElementById("status");
const folderCount = document.getElementById("folderCount");
const fileRowTemplate = document.getElementById("fileRow");
const organizeModeSelect = document.getElementById("organizeMode");
const renameDateModeSelect = document.getElementById("renameDateMode");
const renameCharModeSelect = document.getElementById("renameCharMode");
const advancedOptionsBtn = document.getElementById("advancedOptionsBtn");
const advancedOptionsPanel = document.getElementById("advancedOptionsPanel");
const loadingOverlay = document.getElementById("loadingOverlay");
const loadingMessage = document.getElementById("loadingMessage");
const loadingCountEl = document.getElementById("loadingCount");

let filesToSort = [];
let emptyDirectories = [];
let loadingCount = 0;
let customRules = JSON.parse(localStorage.getItem("ziplifica-custom-rules") || "{}");

const CATEGORIES = {
  IMAGES: ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"],
  PDF: ["pdf"],
  DOCS: ["doc", "docx", "txt", "rtf", "odt", "csv", "xlsx"],
  AUDIO: ["mp3", "wav", "aac", "ogg", "flac", "m4a"],
  VIDEO: ["mp4", "mov", "avi", "mkv", "webm"],
  ARCHIVES: ["zip", "rar", "7z", "gz", "tar"],
  CODE: ["js", "ts", "py", "java", "c", "cpp", "html", "css", "json"],
};

const startLoading = (message) => {
  loadingCount = 0;
  loadingMessage.textContent = message;
  loadingCountEl.textContent = "0";
  loadingOverlay.classList.add("active");
  loadingOverlay.setAttribute("aria-hidden", "false");
};

const bumpLoading = () => {
  loadingCount += 1;
  loadingCountEl.textContent = loadingCount.toLocaleString("pt-PT");
};

const stopLoading = () => {
  loadingOverlay.classList.remove("active");
  loadingOverlay.setAttribute("aria-hidden", "true");
};

const formatBytes = (bytes) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
};

const getFolderForFile = (filename) => {
  const ext = filename.split(".").pop().toLowerCase();
  
  if (customRules[ext]) {
    return customRules[ext];
  }
  
  for (const [folder, extensions] of Object.entries(CATEGORIES)) {
    if (extensions.includes(ext)) return folder;
  }
  return "OTHERS";
};

const getDateParts = (file) => {
  const date = file.lastModified ? new Date(file.lastModified) : new Date();
  const year = `${date.getFullYear()}`;
  const monthNumber = String(date.getMonth() + 1).padStart(2, "0");
  const dayNumber = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  const monthLabel = date
    .toLocaleString("default", { month: "long" })
    .replace(/^./, (char) => char.toUpperCase());
  return {
    year,
    month: monthNumber,
    day: dayNumber,
    hours,
    minutes,
    seconds,
    monthKey: `${monthNumber}-${monthLabel}`,
    monthLabel,
    isoDate: `${year}${monthNumber}${dayNumber}`,
    euDate: `${dayNumber}${monthNumber}${year}`,
    isoDateTime: `${year}${monthNumber}${dayNumber}_${hours}${minutes}${seconds}`,
  };
};

const getSizeBucket = (file) => {
  const sizeMB = file.size / (1024 * 1024);
  if (sizeMB < 1) return "SIZE · Pequeno (<1MB)";
  if (sizeMB < 100) return "SIZE · Médio (1-100MB)";
  return "SIZE · Grande (>=100MB)";
};

const normalizeFileName = (filename) => {
  const parts = filename.split(".");
  const ext = parts.length > 1 ? `.${parts.pop()}` : "";
  const nameWithoutExt = parts.join(".");
  return nameWithoutExt
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "+")
    .replace(/\++/g, "+")
    .trim() + ext;
};

const applyDateFormat = (nameWithoutExt, ext, dateParts) => {
  const dateMode = renameDateModeSelect.value;
  if (dateMode === "none") return nameWithoutExt + ext;

  let result = "";
  switch (dateMode) {
    case "prefix-iso-underscore":
      result = `${dateParts.isoDate}_${nameWithoutExt}`;
      break;
    case "prefix-iso-space":
      result = `${dateParts.isoDate} ${nameWithoutExt}`;
      break;
    case "prefix-eu-underscore":
      result = `${dateParts.euDate}_${nameWithoutExt}`;
      break;
    case "prefix-eu-space":
      result = `${dateParts.euDate} ${nameWithoutExt}`;
      break;
    case "prefix-time-underscore":
      result = `${dateParts.isoDateTime}_${nameWithoutExt}`;
      break;
    case "prefix-time-space":
      result = `${dateParts.isoDateTime} ${nameWithoutExt}`;
      break;
    case "suffix-iso":
      result = `${nameWithoutExt}_${dateParts.isoDate}`;
      break;
    case "suffix-eu":
      result = `${nameWithoutExt}_${dateParts.euDate}`;
      break;
    case "suffix-time":
      result = `${nameWithoutExt}_${dateParts.isoDateTime}`;
      break;
    case "only":
      result = dateParts.isoDate;
      break;
    default:
      result = nameWithoutExt;
  }
  return result + ext;
};

const applyCharManipulation = (nameWithoutExt, ext) => {
  const charMode = renameCharModeSelect.value;
  if (charMode === "none") return nameWithoutExt + ext;

  let result = "";
  switch (charMode) {
    case "normalize":
      result = normalizeFileName(nameWithoutExt + ext);
      return result;
    case "remove-underscore":
      result = nameWithoutExt.replace(/_/g, "");
      break;
    case "remove-underscore-hyphen":
      result = nameWithoutExt.replace(/[_-]/g, "");
      break;
    case "spaces-to-underscore":
      result = nameWithoutExt.replace(/\s+/g, "_");
      break;
    case "spaces-hyphens-to-underscore":
      result = nameWithoutExt.replace(/[\s-]+/g, "_");
      break;
    case "hyphens-to-underscore":
      result = nameWithoutExt.replace(/-/g, "_");
      break;
    case "underscores-to-spaces":
      result = nameWithoutExt.replace(/_/g, " ");
      break;
    case "remove-spaces":
      result = nameWithoutExt.replace(/\s+/g, "");
      break;
    case "remove-hyphens":
      result = nameWithoutExt.replace(/-/g, "");
      break;
    default:
      result = nameWithoutExt;
  }
  return result + ext;
};

const renameFile = (file, originalName) => {
  const dateMode = renameDateModeSelect.value;
  const charMode = renameCharModeSelect.value;
  
  if (dateMode === "none" && charMode === "none") return originalName;

  const parts = originalName.split(".");
  const ext = parts.length > 1 ? `.${parts.pop()}` : "";
  let nameWithoutExt = parts.join(".");

  if (dateMode !== "none") {
    const dateParts = getDateParts(file);
    const withDate = applyDateFormat(nameWithoutExt, ext, dateParts);
    const dateParts2 = withDate.split(".");
    const newExt = dateParts2.length > 1 ? `.${dateParts2.pop()}` : "";
    nameWithoutExt = dateParts2.join(".");
    if (charMode === "none") {
      return nameWithoutExt + newExt;
    }
    return applyCharManipulation(nameWithoutExt, newExt);
  }

  if (charMode !== "none") {
    return applyCharManipulation(nameWithoutExt, ext);
  }

  return nameWithoutExt + ext;
};

const resolveFolderName = (file) => {
  const mode = organizeModeSelect.value;
  const typeFolder = getFolderForFile(file.name);
  const dateParts = getDateParts(file);

  switch (mode) {
    case "year":
      return dateParts.year;
    case "month":
      return dateParts.monthKey;
    case "year-month":
      return `${dateParts.year}/${dateParts.monthKey}`;
    case "year-type":
      return `${dateParts.year}/${typeFolder}`;
    case "size":
      return getSizeBucket(file);
    case "type":
    default:
      return typeFolder;
  }
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


const updateState = (stateText) => {
  status.textContent = stateText;
  downloadBtn.disabled = filesToSort.length === 0;
};

const handleItems = (incoming) => {
  const fileEntries = incoming.filter((item) => item.file);
  emptyDirectories = incoming.filter((item) => item.directory);

  filesToSort = fileEntries;
  renderList();

  if (!fileEntries.length && !emptyDirectories.length) {
    updateState("Aguardando");
  } else if (!fileEntries.length && emptyDirectories.length) {
    updateState("Só pastas vazias");
  } else {
    updateState("Pronto para zip");
  }
};

const reset = () => {
  filesToSort = [];
  emptyDirectories = [];
  fileInput.value = "";
  renderList();
  updateState("Aguardando");
};

["dragenter", "dragover"].forEach((eventName) => {
  dropzone.addEventListener(eventName, (e) => {
    e.preventDefault();
    dropzone.classList.add("dragover");
  });
});

["dragleave", "drop"].forEach((eventName) => {
  dropzone.addEventListener(eventName, (e) => {
    e.preventDefault();
    dropzone.classList.remove("dragover");
  });
});

dropzone.addEventListener("drop", async (event) => {
  startLoading("A carregar itens arrastados...");
  try {
    const extracted = await extractFilesFromDataTransfer(event.dataTransfer, bumpLoading);
    handleItems(extracted);
  } finally {
    stopLoading();
  }
});

fileInput.addEventListener("change", async () => {
  if (!fileInput.files || !fileInput.files.length) return;
  startLoading("A carregar ficheiros selecionados...");
  try {
    const normalized = await normalizeFileInput(fileInput, bumpLoading);
    handleItems(normalized);
  } finally {
    stopLoading();
  }
});

folderInput.addEventListener("change", async () => {
  if (!folderInput.files || !folderInput.files.length) return;
  startLoading("A carregar pastas selecionadas...");
  try {
    const normalized = await normalizeFileInput(folderInput, bumpLoading);
    handleItems(normalized);
  } finally {
    stopLoading();
  }
});

clearBtn.addEventListener("click", reset);

selectFilesBtn.addEventListener("click", () => fileInput.click());
selectFolderBtn.addEventListener("click", () => folderInput.click());

downloadBtn.addEventListener("click", async () => {
  if (!filesToSort.length && !emptyDirectories.length) return;
  updateState("A gerar ZIP...");
  const zip = new JSZip();
  const failures = [];

  for (const { file, relativePath } of filesToSort) {
    try {
      const renamedName = renameFile(file, file.name);
      const folderName = resolveFolderName(file);
      const finalRelativePath = relativePath && relativePath !== file.name
        ? relativePath.replace(file.name, renamedName)
        : renamedName;
      const targetPath = folderName
        ? `${folderName}/${finalRelativePath}`
        : finalRelativePath;
      const data = await file.arrayBuffer();
      zip.file(targetPath, data);
    } catch (error) {
      console.error("Erro ao processar ficheiro:", file.name, error);
      failures.push(file.name);
    }
  }

  emptyDirectories.forEach((dir) => {
    const target = `DIRECTORIES/${dir.relativePath}`;
    zip.folder(target);
  });

  if (Object.keys(zip.files).length === 0) {
    updateState("Não conseguimos gerar o ZIP");
    return;
  }

  const content = await zip.generateAsync({ type: "blob" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(content);
  link.download = "ziplifica.zip";
  link.click();
  updateState(failures.length ? `ZIP pronto (${failures.length} falharam)` : "ZIP pronto");
});

organizeModeSelect.addEventListener("change", () => {
  renderList();
  if (!filesToSort.length) {
    updateState(emptyDirectories.length ? "Só pastas vazias" : "Aguardando");
  } else {
    updateState("Pronto para zip");
  }
});

const updateRenamePreview = () => {
  renderList();
  if (!filesToSort.length) {
    updateState(emptyDirectories.length ? "Só pastas vazias" : "Aguardando");
  } else {
    updateState("Pronto para zip");
  }
};

renameDateModeSelect.addEventListener("change", updateRenamePreview);
renameCharModeSelect.addEventListener("change", updateRenamePreview);

advancedOptionsBtn.addEventListener("click", () => {
  const isHidden = advancedOptionsPanel.getAttribute("aria-hidden") === "true";
  advancedOptionsPanel.setAttribute("aria-hidden", !isHidden);
  advancedOptionsBtn.setAttribute("aria-expanded", isHidden);
});

// Custom rules management
const ruleExtensionInput = document.getElementById("ruleExtension");
const ruleFolderInput = document.getElementById("ruleFolder");
const addRuleBtn = document.getElementById("addRuleBtn");
const customRulesList = document.getElementById("customRulesList");

const renderCustomRules = () => {
  customRulesList.innerHTML = "";
  Object.entries(customRules).forEach(([ext, folder]) => {
    const li = document.createElement("li");
    li.className = "custom-rule-item";
    li.innerHTML = `
      <code>.${ext}</code> <span>→</span> <strong>${folder}</strong>
      <button type="button" class="btn btn--ghost" data-ext="${ext}">Remover</button>
    `;
    li.querySelector("button").addEventListener("click", () => {
      delete customRules[ext];
      localStorage.setItem("ziplifica-custom-rules", JSON.stringify(customRules));
      renderCustomRules();
      renderList();
    });
    customRulesList.appendChild(li);
  });
};

addRuleBtn.addEventListener("click", () => {
  const ext = ruleExtensionInput.value.trim().toLowerCase().replace(/^\./, "");
  const folder = ruleFolderInput.value.trim().toUpperCase();
  
  if (!ext || !folder) return;
  
  customRules[ext] = folder;
  localStorage.setItem("ziplifica-custom-rules", JSON.stringify(customRules));
  ruleExtensionInput.value = "";
  ruleFolderInput.value = "";
  renderCustomRules();
  renderList();
});

ruleExtensionInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") addRuleBtn.click();
});

ruleFolderInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") addRuleBtn.click();
});

renderCustomRules();

// Dark/Light mode auto
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");
const updateTheme = () => {
  document.documentElement.setAttribute("data-theme", prefersDark.matches ? "dark" : "light");
};
prefersDark.addEventListener("change", updateTheme);
updateTheme();

const renderList = () => {
  fileList.innerHTML = "";
  if (!filesToSort.length) {
    fileList.innerHTML = '<li class="placeholder">Ainda sem ficheiros. Arraste-os para começar.</li>';
    fileCount.textContent = "0";
    folderCount.textContent = "0";
    return;
  }

  const folders = new Set();

  filesToSort.forEach(({ file, relativePath }) => {
    const clone = fileRowTemplate.content.cloneNode(true);
    const folder = resolveFolderName(file);
    folders.add(folder);
    const renamedName = renameFile(file, file.name);
    const displayName = renamedName !== file.name ? `${file.name} → ${renamedName}` : file.name;
    const extension = renamedName.includes(".") ? renamedName.split(".").pop().toUpperCase() : "???";
    clone.querySelector(".file-item__ext").textContent = extension;
    clone.querySelector(".file-item__name").textContent = displayName;

    const extraPath = relativePath && relativePath !== file.name ? ` · ${relativePath}` : "";
    clone.querySelector(".file-item__meta").textContent = `${formatBytes(file.size)} · ${file.type || "Tipo não definido"}${extraPath}`;
    clone.querySelector(".file-item__category").textContent = folder;
    
    // Preview para imagens
    if (file.type.startsWith("image/")) {
      const preview = document.createElement("img");
      preview.src = URL.createObjectURL(file);
      preview.className = "file-preview";
      preview.style.maxWidth = "200px";
      preview.style.maxHeight = "150px";
      preview.style.borderRadius = "8px";
      preview.style.marginTop = "8px";
      preview.style.display = "block";
      clone.querySelector(".file-item__info").appendChild(preview);
    }
    
    fileList.appendChild(clone);
  });

  fileCount.textContent = filesToSort.length;
  folderCount.textContent = folders.size;
};

// Register service worker for PWA
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    const swPath = window.location.pathname.includes("/app/") ? "../sw.js" : "sw.js";
    navigator.serviceWorker.register(swPath).catch(() => {});
  });
}

