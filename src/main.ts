import { invoke } from "@tauri-apps/api/core";
import { COLLECTIONS, BASE_URL, Endpoint, findEndpointById, THEME_PRESETS } from "./collections";

/* ═══════════════════════════════════════
   DOM
   ═══════════════════════════════════════ */
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const methodEl          = $<HTMLSelectElement>("method");
const urlEl             = $<HTMLInputElement>("url");
const tokenEl           = $<HTMLInputElement>("token");
const extraHeadersEl    = $<HTMLTextAreaElement>("extra-headers");
const bodyEl            = $<HTMLTextAreaElement>("body");
const bodyHighlightEl   = $<HTMLPreElement>("body-highlight");
const bodyLineNumbersEl = $<HTMLDivElement>("body-line-numbers");
const idemEl            = $<HTMLInputElement>("idempotency");
const idemField         = $<HTMLElement>("idempotency-field");
const sendBtn           = $<HTMLButtonElement>("send");
const sendLabel         = sendBtn.querySelector(".send-label") as HTMLSpanElement;
const regenBtn          = $<HTMLButtonElement>("regen-key");
const clearTokenBtn     = $<HTMLButtonElement>("clear-token");
const copyBtn           = $<HTMLButtonElement>("copy-response");
const respEl            = $<HTMLPreElement>("response");
const respHeadersEl     = $<HTMLPreElement>("response-headers");
const respMetaEl        = $<HTMLDivElement>("response-meta");
const badgesEl          = $<HTMLDivElement>("badges");
const collectionsEl     = $<HTMLDivElement>("collections");
const searchEl          = $<HTMLInputElement>("search");
const historyListEl     = $<HTMLDivElement>("history-list");
const historyCountEl    = $<HTMLSpanElement>("history-count");
const clearHistoryBtn   = $<HTMLButtonElement>("clear-history");
const authStatusEl      = $<HTMLSpanElement>("auth-status");
const authStatusLabel   = $<HTMLSpanElement>("auth-status-label");
const requestTabContent = $<HTMLDivElement>("request-tab-content");
const presetSelectEl    = $<HTMLSelectElement>("preset-select");
const formatJsonBtn     = $<HTMLButtonElement>("format-json");
const draftStatusEl     = $<HTMLSpanElement>("draft-status");

/* ═══════════════════════════════════════
   localStorage keys
   ═══════════════════════════════════════ */
const STORAGE = {
  TOKEN: "enois-themes.token",
  HISTORY: "enois-themes.history",
  SIDEBAR_TAB: "enois-themes.sidebarTab",
  DRAFT_PREFIX: "enois-themes.draft.",
  RESPONSE_PREFIX: "enois-themes.response.",
  RESPONSE_URL_PREFIX: "enois-themes.response-url.",
};

const saveToken = (t: string) => localStorage.setItem(STORAGE.TOKEN, t);
const loadToken = () => localStorage.getItem(STORAGE.TOKEN) ?? "";

/* ═══════════════════════════════════════
   Endpoints sensíveis (nunca persistir)
   ═══════════════════════════════════════ */
const SENSITIVE_ENDPOINT_IDS = ["auth-login", "auth-signup", "auth-2fa"];

function isSensitiveEndpoint(ep: Endpoint | null): boolean {
  return !!ep && SENSITIVE_ENDPOINT_IDS.includes(ep.id);
}

/* ═══════════════════════════════════════
   UUID / Toast
   ═══════════════════════════════════════ */
function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "idem-" + Date.now() + "-" + Math.random().toString(36).slice(2);
}

function showToast(msg: string) {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = msg;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add("visible"));
  setTimeout(() => {
    el.classList.remove("visible");
    setTimeout(() => el.remove(), 300);
  }, 2800);
}

/* ═══════════════════════════════════════
   Confirm Modal
   ═══════════════════════════════════════ */
function showConfirm(opts: {
  icon?: string;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}): Promise<boolean> {
  return new Promise((resolve) => {
    const modal = document.getElementById("confirm-modal");
    const backdrop = modal?.querySelector(".confirm-backdrop") as HTMLElement | null;
    const iconEl = modal?.querySelector(".confirm-icon") as HTMLElement | null;
    const titleEl = document.getElementById("confirm-title");
    const msgEl = document.getElementById("confirm-message");
    const okBtn = document.getElementById("confirm-ok") as HTMLButtonElement | null;
    const cancelBtn = document.getElementById("confirm-cancel") as HTMLButtonElement | null;

    if (!modal || !backdrop || !iconEl || !titleEl || !msgEl || !okBtn || !cancelBtn) {
      resolve(window.confirm(`${opts.title}\n\n${opts.message.replace(/<[^>]*>/g, "")}`));
      return;
    }

    iconEl.textContent = opts.icon ?? "❓";
    titleEl.textContent = opts.title;
    msgEl.innerHTML = opts.message;
    okBtn.textContent = opts.confirmText ?? "Confirmar";
    cancelBtn.textContent = opts.cancelText ?? "Cancelar";
    okBtn.classList.toggle("confirm-btn-danger", !!opts.danger);

    modal.classList.add("open");
    requestAnimationFrame(() => modal.classList.add("visible"));

    let resolved = false;

    function close(result: boolean) {
      if (resolved) return;
      resolved = true;
      modal!.classList.remove("visible");
      setTimeout(() => {
        modal!.classList.remove("open");
        cleanup();
        resolve(result);
      }, 200);
    }

    function onOk() { close(true); }
    function onCancel() { close(false); }
    function onBackdrop(e: MouseEvent) { if (e.target === backdrop) close(false); }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { e.preventDefault(); close(false); }
      else if (e.key === "Enter") { e.preventDefault(); close(true); }
    }
    function cleanup() {
      okBtn!.removeEventListener("click", onOk);
      cancelBtn!.removeEventListener("click", onCancel);
      backdrop!.removeEventListener("click", onBackdrop);
      document.removeEventListener("keydown", onKey);
    }

    okBtn.addEventListener("click", onOk);
    cancelBtn.addEventListener("click", onCancel);
    backdrop.addEventListener("click", onBackdrop);
    document.addEventListener("keydown", onKey);

    setTimeout(() => okBtn?.focus(), 50);
  });
}

/* ═══════════════════════════════════════
   JSON highlighting
   ═══════════════════════════════════════ */
function highlightJSON(code: string): string {
  const escaped = code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return escaped.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
    (match) => {
      let cls = "j-num";
      if (/^"/.test(match)) cls = /:$/.test(match) ? "j-key" : "j-string";
      else if (/true|false/.test(match)) cls = "j-bool";
      else if (/null/.test(match)) cls = "j-null";
      return `<span class="${cls}">${match}</span>`;
    }
  );
}

function updateLineNumbers() {
  const raw = bodyEl.value;
  if (!raw) { bodyLineNumbersEl.innerHTML = ""; return; }
  const count = raw.split("\n").length;
  if (bodyLineNumbersEl.childElementCount !== count) {
    bodyLineNumbersEl.innerHTML = Array.from({ length: count }, (_, i) => `<div>${i + 1}</div>`).join("");
  }
}

function syncBodyScroll() {
  bodyHighlightEl.scrollTop = bodyEl.scrollTop;
  bodyHighlightEl.scrollLeft = bodyEl.scrollLeft;
  bodyLineNumbersEl.scrollTop = bodyEl.scrollTop;
}

function updateBodyHighlight() {
  const raw = bodyEl.value;
  if (!raw) {
    bodyHighlightEl.innerHTML = "";
    bodyLineNumbersEl.innerHTML = "";
    return;
  }
  const padded = raw.endsWith("\n") ? raw + " " : raw;
  bodyHighlightEl.innerHTML = highlightJSON(padded);
  updateLineNumbers();
  syncBodyScroll();
}

/* ═══════════════════════════════════════
   Drafts (auto-save por endpoint)
   ═══════════════════════════════════════ */
interface Draft {
  body: string;
  extraHeaders: string;
  updatedAt: number;
}

let draftSaveTimer: number | undefined;
let hasUserEdits = false;

function saveDraftNow(endpointId: string, silent = false) {
  if (!endpointId) return;

  // 🔒 Endpoints de auth contêm senha no body — nunca persistir
  if (SENSITIVE_ENDPOINT_IDS.includes(endpointId)) return;

  const draft: Draft = {
    body: bodyEl.value,
    extraHeaders: extraHeadersEl.value,
    updatedAt: Date.now(),
  };
  localStorage.setItem(STORAGE.DRAFT_PREFIX + endpointId, JSON.stringify(draft));
  if (draftSaveTimer) {
    clearTimeout(draftSaveTimer);
    draftSaveTimer = undefined;
  }
  if (!silent) showDraftSavedIndicator();
}

function loadDraft(endpointId: string): Draft | null {
  // 🔒 Defense in depth
  if (SENSITIVE_ENDPOINT_IDS.includes(endpointId)) return null;

  try {
    const raw = localStorage.getItem(STORAGE.DRAFT_PREFIX + endpointId);
    if (!raw) return null;
    return JSON.parse(raw) as Draft;
  } catch { return null; }
}

function scheduleSaveDraft() {
  if (!currentEndpoint) return;
  if (SENSITIVE_ENDPOINT_IDS.includes(currentEndpoint.id)) return;
  if (draftSaveTimer) clearTimeout(draftSaveTimer);
  draftSaveTimer = window.setTimeout(() => {
    if (currentEndpoint) saveDraftNow(currentEndpoint.id);
  }, 500);
}

let draftStatusTimer: number | undefined;
function showDraftSavedIndicator() {
  draftStatusEl.textContent = "✓ Salvo";
  draftStatusEl.classList.add("visible");
  if (draftStatusTimer) clearTimeout(draftStatusTimer);
  draftStatusTimer = window.setTimeout(() => {
    draftStatusEl.classList.remove("visible");
  }, 1500);
}

/* ═══════════════════════════════════════
   Response cache (por endpoint)
   ═══════════════════════════════════════ */
interface CachedResponse {
  method: string;
  endpointName: string;
  status: number;
  headers: Record<string, string>;
  body: string;
  duration: number;
  time: string;
}

function responseKey(ep: Endpoint | null, url: string): string {
  if (ep) return STORAGE.RESPONSE_PREFIX + ep.id;
  return STORAGE.RESPONSE_URL_PREFIX + url;
}

function saveResponse(ep: Endpoint | null, url: string, result: HttpResponse): CachedResponse {
  const MAX = 200_000;
  const trimmed = result.body.length > MAX
    ? result.body.slice(0, MAX) + "\n\n[…truncado]"
    : result.body;

  const cached: CachedResponse = {
    method: ep?.method ?? methodEl.value,
    endpointName: ep?.name ?? url,
    status: result.status,
    headers: result.headers,
    body: trimmed,
    duration: result.duration_ms,
    time: timeNow(),
  };

  // 🔒 Endpoints de auth: nunca persistir resposta
  if (isSensitiveEndpoint(ep)) return cached;

  try {
    localStorage.setItem(responseKey(ep, url), JSON.stringify(cached));
  } catch {}
  return cached;
}

function loadResponse(ep: Endpoint | null, url: string): CachedResponse | null {
  if (isSensitiveEndpoint(ep)) return null;

  try {
    const raw = localStorage.getItem(responseKey(ep, url));
    if (!raw) return null;
    return JSON.parse(raw) as CachedResponse;
  } catch { return null; }
}

function renderCachedResponse(cached: CachedResponse) {
  renderResponse(cached.body, cached.headers, cached.status, cached.duration);
  lastResponseMeta = { method: cached.method, endpointName: cached.endpointName, time: cached.time };
  updateResponseMeta();
}

function clearResponseArea() {
  badgesEl.innerHTML = "";
  respEl.innerHTML = `<span class="empty-state">Nenhuma resposta ainda. Clique em Enviar para fazer a primeira requisição.</span>`;
  respEl.dataset.raw = "";
  respHeadersEl.innerHTML = `<span class="empty-state">—</span>`;
  lastResponseMeta = null;
  updateResponseMeta();
}

/* ═══════════════════════════════════════
   Helpers
   ═══════════════════════════════════════ */
function formatBytes(b: number): string {
  if (b < 1024) return b + " B";
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + " KB";
  return (b / 1024 / 1024).toFixed(2) + " MB";
}

function statusInfo(s: number): { label: string; cls: string } {
  const labels: Record<number, string> = {
    200: "OK", 201: "Created", 204: "No Content",
    400: "Bad Request", 401: "Unauthorized", 403: "Forbidden",
    404: "Not Found", 409: "Conflict", 422: "Unprocessable",
    429: "Too Many Requests", 500: "Server Error",
  };
  const label = labels[s] ?? (s < 300 ? "Success" : s < 400 ? "Redirect" : "Error");
  const cls   = s < 300 ? "ok" : s < 400 ? "redirect" : s < 500 ? "warn" : "err";
  return { label, cls };
}

const timeNow = () => new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

/* ═══════════════════════════════════════
   Preview endpoint (SÓ "Publicar tema")
   ═══════════════════════════════════════ */
function isPreviewEndpoint(ep: Endpoint | null): boolean {
  return ep?.id === "themes-create";
}

/* ═══════════════════════════════════════
   THEME PREVIEW
   ═══════════════════════════════════════ */
let lastThemesResponseBody: string | null = null;
let lastValidBodyPalette: { palette: Record<string, any>; name?: string } | null = null;

const kebabToCamel = (s: string): string => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
const camelToKebab = (s: string): string => s.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase());

function tryParseThemeFromJson(raw: string): { palette: Record<string, any>; name?: string } | null {
  if (!raw) return null;
  try {
    let obj: any = JSON.parse(raw);
    if (Array.isArray(obj)) obj = obj[0];
    if (!obj || typeof obj !== "object") return null;
    let pkg: any = obj;
    if (obj.packageJson) pkg = typeof obj.packageJson === "string" ? JSON.parse(obj.packageJson) : obj.packageJson;
    const palette = pkg.palette ?? pkg;
    if (!palette || typeof palette !== "object") return null;
    return { palette, name: obj.name ?? pkg.name };
  } catch { return null; }
}

function applyThemePalette(palette: Record<string, any>, container: HTMLElement) {
  const get = (k: string): string => palette[k] ?? palette[kebabToCamel(k)] ?? palette[camelToKebab(k)] ?? "";
  const text = (palette.text && typeof palette.text === "object") ? palette.text : {};
  const vars: Record<string, string> = {
    "--tp-bg": get("background"), "--tp-fg": get("foreground"),
    "--tp-surface-card": get("surfaceCard") || get("surface-card") || get("card") || get("surface1"),
    "--tp-surface-1": get("surface1") || get("surface-1") || get("surface"),
    "--tp-surface-2": get("surface2") || get("surface-2"),
    "--tp-border": get("border"), "--tp-border-soft": get("borderSoft") || get("border-soft"),
    "--tp-primary": get("primary"), "--tp-primary-fg": get("primaryForeground") || get("primary-foreground"),
    "--tp-secondary": get("secondary"), "--tp-success": get("success"), "--tp-warning": get("warning"), "--tp-error": get("error"),
    "--tp-text-strong": (text as any).strong ?? get("foreground"),
    "--tp-text-subtle": (text as any).subtle ?? get("subtle") ?? get("mutedForeground") ?? get("muted-foreground"),
    "--tp-link": (text as any).link ?? get("primary"), "--tp-placeholder": get("placeholder"),
  };
  Object.entries(vars).forEach(([k, v]) => { if (v) container.style.setProperty(k, v); else container.style.removeProperty(k); });
}

function updateThemePreview() {
  if (!isPreviewEndpoint(currentEndpoint)) return;
  const container = document.getElementById("theme-preview");
  const emptyEl = document.getElementById("theme-preview-empty");
  const sourceTextEl = document.getElementById("theme-preview-source-text");
  const sourceDotEl = document.querySelector("#theme-preview-source .dot") as HTMLElement | null;
  const nameEl = document.getElementById("theme-preview-name");
  if (!container || !emptyEl) return;

  let parsed: { palette: Record<string, any>; name?: string } | null = null;
  let source: "body" | "response" | null = null;
  const bodyRaw = bodyEl.value.trim();
  let fromBody: { palette: Record<string, any>; name?: string } | null = null;

  if (bodyRaw) {
    fromBody = tryParseThemeFromJson(bodyRaw);
    if (fromBody) lastValidBodyPalette = fromBody;
  } else {
    lastValidBodyPalette = null;
  }

  if (fromBody) { parsed = fromBody; source = "body"; }
  else if (bodyRaw.length > 0 && lastValidBodyPalette) { parsed = lastValidBodyPalette; source = "body"; }
  else if (lastThemesResponseBody) {
    const fromResp = tryParseThemeFromJson(lastThemesResponseBody);
    if (fromResp) { parsed = fromResp; source = "response"; }
  }

  if (!parsed) {
    container.style.display = "none"; emptyEl.style.display = "flex";
    if (sourceTextEl) sourceTextEl.textContent = "Sem tema para visualizar";
    if (sourceDotEl) sourceDotEl.style.background = "var(--fg-faint)";
    if (nameEl) nameEl.textContent = "";
    return;
  }

  applyThemePalette(parsed.palette, container);
  container.style.display = "block"; emptyEl.style.display = "none";
  if (sourceTextEl) sourceTextEl.textContent = source === "body" ? "Preview do body (tempo real)" : "Preview do último response";
  if (sourceDotEl) sourceDotEl.style.background = source === "body" ? "var(--ctp-mocha-green)" : "var(--ctp-mocha-blue)";
  if (nameEl) nameEl.textContent = parsed.name ? `"${parsed.name}"` : "";
}

/* ═══════════════════════════════════════
   Split view / Tabs
   ═══════════════════════════════════════ */
function applyRequestTab(target: string) {
  const shouldSplit = isPreviewEndpoint(currentEndpoint) && target === "body";
  requestTabContent.classList.toggle("split-mode", shouldSplit);

  requestTabContent.querySelectorAll<HTMLElement>("[data-tab-content]").forEach((el) => {
    const name = el.dataset.tabContent;
    if (shouldSplit) {
      el.classList.toggle("hidden", name !== "body" && name !== "preview");
    } else {
      el.classList.toggle("hidden", name !== target);
    }
  });

  if (shouldSplit) updateThemePreview();
}

function setupTabs(group: string) {
  const nav = document.querySelector(`.tabs[data-tabs="${group}"]`) as HTMLElement;
  const content = nav.parentElement!.querySelectorAll(":scope > .tab-content")[0];
  nav.querySelectorAll(".tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      nav.querySelectorAll(".tab").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const target = (btn as HTMLElement).dataset.tab!;
      if (group === "request") applyRequestTab(target);
      else content.querySelectorAll<HTMLElement>("[data-tab-content]").forEach((el) => el.classList.toggle("hidden", el.dataset.tabContent !== target));
    });
  });
}

function setupSidebarTabs() {
  const tabs = document.querySelectorAll<HTMLButtonElement>(".sidebar-tab");
  const panes = document.querySelectorAll<HTMLElement>(".sidebar-pane");
  const saved = localStorage.getItem(STORAGE.SIDEBAR_TAB) ?? "endpoints";
  const activate = (name: string) => {
    tabs.forEach((t) => t.classList.toggle("active", t.dataset.sidebarTab === name));
    panes.forEach((p) => p.classList.toggle("active", p.dataset.sidebarPane === name));
    localStorage.setItem(STORAGE.SIDEBAR_TAB, name);
  };
  tabs.forEach((t) => t.addEventListener("click", () => activate(t.dataset.sidebarTab!)));
  activate(saved);
}

/* ═══════════════════════════════════════
   Auth
   ═══════════════════════════════════════ */
function updateAuthStatus() {
  const t = tokenEl.value.trim();
  if (t) {
    authStatusEl.classList.remove("env-logged-out"); authStatusEl.classList.add("env-logged-in");
    authStatusLabel.textContent = "Autenticado";
  } else {
    authStatusEl.classList.add("env-logged-out"); authStatusEl.classList.remove("env-logged-in");
    authStatusLabel.textContent = "Não autenticado";
  }
}

function tryCaptureToken(ep: Endpoint | null, url: string, result: HttpResponse) {
  const isLogin = ep?.id === "auth-login" || url.includes("/auth/login");
  const is2fa = ep?.id === "auth-2fa" || url.includes("/auth/2fa/verify");
  const isLogout = ep?.id === "auth-logout" || url.includes("/auth/logout");

  if ((isLogin || is2fa) && result.status === 200) {
    try {
      const data = JSON.parse(result.body);
      if (typeof data.token === "string" && data.token) {
        tokenEl.value = data.token;
        saveToken(data.token);
        updateAuthStatus();

        // 🔒 Limpa o body após login (senha não fica visível na tela)
        if (isSensitiveEndpoint(ep)) {
          bodyEl.value = "";
          extraHeadersEl.value = "";
          updateBodyHighlight();
          hasUserEdits = false;
        }

        showToast("🔐 Login realizado — token salvo automaticamente");
      }
    } catch {}
  }
  if (isLogout && result.status >= 200 && result.status < 300) {
    tokenEl.value = ""; saveToken(""); updateAuthStatus();
    showToast("👋 Sessão encerrada");
  }
}

function tryThemeActionToast(ep: Endpoint | null, result: HttpResponse) {
  if (!ep) return;
  const ok = result.status >= 200 && result.status < 300;
  if (ep.id === "themes-create" && result.status === 201) showToast("🎨 Tema publicado com sucesso!");
  else if (ep.id === "themes-install" && ok) showToast("✨ Tema instalado na sua conta!");
  else if (ep.id === "themes-report" && ok) showToast("🚨 Denúncia enviada para moderação");
  else if (ep.id === "themes-hide" && ok) showToast("🙈 Tema escondido da galeria");
  else if (ep.id === "account-theme" && ok) showToast("🎨 Tema salvo na sua conta!");
}

/* ═══════════════════════════════════════
   History
   ═══════════════════════════════════════ */
interface HistoryEntry {
  id: string; method: string; url: string; endpointId: string | null; endpointName: string;
  status: number; duration: number; time: string;
  requestBody: string; extraHeaders: string;
  responseBody: string; responseHeaders: Record<string, string>;
}

let history: HistoryEntry[] = [];

function loadHistoryFromStorage(): HistoryEntry[] {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE.HISTORY) ?? "[]") as Partial<HistoryEntry>[];
    return raw.map((h) => ({
      ...h,
      extraHeaders: h.extraHeaders ?? "",
    } as HistoryEntry));
  } catch { return []; }
}
const saveHistoryToStorage = () => localStorage.setItem(STORAGE.HISTORY, JSON.stringify(history.slice(0, 50)));

function pushHistory(entry: HistoryEntry) {
  // 🔒 Não persiste histórico de endpoints sensíveis
  if (entry.endpointId && SENSITIVE_ENDPOINT_IDS.includes(entry.endpointId)) return;

  history.unshift(entry);
  if (history.length > 50) history.pop();
  saveHistoryToStorage();
  renderHistory();
}

function renderHistory() {
  historyCountEl.textContent = String(history.length);
  if (history.length === 0) {
    historyListEl.innerHTML = `<div class="history-empty">Nenhum request ainda.<br/>Envie uma requisição para começar.</div>`;
    return;
  }
  historyListEl.innerHTML = "";
  history.forEach((h) => {
    const info = statusInfo(h.status);
    const el = document.createElement("button");
    el.className = "history-item";
    el.innerHTML = `<div class="history-item-top"><span class="method-pill method-${h.method}">${h.method}</span><span class="history-name">${h.endpointName}</span><span class="history-status status-${info.cls}">${h.status}</span></div><div class="history-item-bottom"><span class="history-time">${h.time}</span><span class="history-duration">${h.duration} ms</span></div>`;
    el.addEventListener("click", () => openHistory(h));
    historyListEl.appendChild(el);
  });
}

function openHistory(h: HistoryEntry) {
  if (currentEndpoint && hasUserEdits) saveDraftNow(currentEndpoint.id, true);
  hasUserEdits = false;

  const ep = h.endpointId ? findEndpointById(h.endpointId) : null;
  if (ep) {
    currentEndpoint = ep;
    loadEndpoint(ep, true);
  } else {
    currentEndpoint = null;
    idemField.classList.add("hidden"); idemEl.value = "";
    tokenEl.classList.toggle("auth-required", false);
  }
  methodEl.value = h.method;
  urlEl.value = h.url;
  bodyEl.value = h.requestBody;
  extraHeadersEl.value = h.extraHeaders ?? "";
  updateBodyHighlight();
  lastValidBodyPalette = null;
  applyRequestTab("body");
  if (isPreviewEndpoint(currentEndpoint)) updateThemePreview();
  updateAuthStatus();
  renderResponse(h.responseBody, h.responseHeaders, h.status, h.duration);
  lastResponseMeta = { method: h.method, endpointName: h.endpointName, time: h.time };
  updateResponseMeta();
  hasUserEdits = false;
}

/* ═══════════════════════════════════════
   Sidebar
   ═══════════════════════════════════════ */
const openFolders = new Set<string>(["auth", "themes"]);
const PALETTE = ["#cba6f7", "#89b4fa", "#a6e3a1", "#fab387"];

function renderSidebar(filter = "") {
  const q = filter.trim().toLowerCase();
  collectionsEl.innerHTML = "";
  COLLECTIONS.forEach((col, i) => {
    const matched = q ? col.endpoints.filter((e) => e.name.toLowerCase().includes(q) || e.path.toLowerCase().includes(q)) : col.endpoints;
    if (!matched.length) return;
    const isOpen = q ? true : openFolders.has(col.id);
    const folder = document.createElement("div"); folder.className = "folder";
    const header = document.createElement("button");
    header.className = "folder-header" + (isOpen ? " open" : "");
    header.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="chev"><path d="m9 18 6-6-6-6"/></svg><span class="folder-dot" style="background:${PALETTE[i % PALETTE.length]}"></span><span class="folder-name">${col.name}</span><span class="folder-count">${matched.length}</span>`;
    header.addEventListener("click", () => { openFolders.has(col.id) ? openFolders.delete(col.id) : openFolders.add(col.id); renderSidebar(searchEl.value); });
    folder.appendChild(header);
    if (isOpen) {
      const list = document.createElement("div"); list.className = "endpoints";
      matched.forEach((ep) => {
        const el = document.createElement("button"); el.className = "endpoint";
        el.innerHTML = `<span class="method-pill method-${ep.method}">${ep.method}</span><span class="endpoint-name">${ep.name}</span>${ep.auth ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="lock"><rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>` : ""}`;
        el.addEventListener("click", () => loadEndpoint(ep));
        list.appendChild(el);
      });
      folder.appendChild(list);
    }
    collectionsEl.appendChild(folder);
  });
}

/* ═══════════════════════════════════════
   Response meta
   ═══════════════════════════════════════ */
let lastResponseMeta: { method: string; endpointName: string; time: string } | null = null;

function updateResponseMeta() {
  if (!lastResponseMeta) { respMetaEl.innerHTML = `<span class="meta-empty">Aguardando primeira requisição…</span>`; return; }
  respMetaEl.innerHTML = `<span class="meta-label">de</span><span class="method-pill method-${lastResponseMeta.method}">${lastResponseMeta.method}</span><span class="meta-endpoint">${lastResponseMeta.endpointName}</span><span class="meta-time">${lastResponseMeta.time}</span>`;
}

/* ═══════════════════════════════════════
   Load endpoint
   ═══════════════════════════════════════ */
let currentEndpoint: Endpoint | null = null;

function loadEndpoint(ep: Endpoint, preserveResponse = false) {
  if (currentEndpoint && currentEndpoint.id !== ep.id && hasUserEdits) {
    saveDraftNow(currentEndpoint.id, true);
  }
  hasUserEdits = false;

  currentEndpoint = ep;
  methodEl.value = ep.method;
  urlEl.value = BASE_URL + ep.path;

  presetSelectEl.classList.toggle("hidden", !isPreviewEndpoint(ep));

  const draft = loadDraft(ep.id);
  if (draft && draft.body.trim() !== "") {
    bodyEl.value = draft.body;
    extraHeadersEl.value = draft.extraHeaders || "";
  } else {
    bodyEl.value = ep.body ?? "";
    extraHeadersEl.value = "";
  }
  updateBodyHighlight();

  if (ep.idempotencyKey) { idemField.classList.remove("hidden"); idemEl.value = uuid(); }
  else { idemField.classList.add("hidden"); idemEl.value = ""; }

  tokenEl.classList.toggle("auth-required", !!ep.auth);
  tokenEl.placeholder = ep.auth ? "X-Session-Token (obrigatório)" : "Cole aqui o token...";

  lastValidBodyPalette = null;

  const tabs = document.querySelectorAll('.tabs[data-tabs="request"] .tab');
  tabs.forEach((t) => t.classList.remove("active"));
  (document.querySelector('.tabs[data-tabs="request"] [data-tab="body"]') as HTMLButtonElement)?.classList.add("active");
  applyRequestTab("body");

  if (!preserveResponse) {
    const cached = loadResponse(ep, BASE_URL + ep.path);
    if (cached) {
      renderCachedResponse(cached);
    } else {
      clearResponseArea();
    }
  }
}

/* ═══════════════════════════════════════
   Response rendering
   ═══════════════════════════════════════ */
interface HttpResponse { status: number; headers: Record<string, string>; body: string; duration_ms: number; }

function parseHeaders(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  raw.split("\n").forEach((line) => {
    const idx = line.indexOf(":");
    if (idx > 0) out[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  });
  return out;
}

function renderResponse(body: string, headers: Record<string, string>, status: number, duration: number) {
  const info = statusInfo(status);
  const size = new TextEncoder().encode(body).length;
  badgesEl.innerHTML = `<span class="badge badge-${info.cls}">${status} ${info.label}</span><span class="badge badge-neutral">${duration} ms</span><span class="badge badge-neutral">${formatBytes(size)}</span>`;

  let formatted = body; let isJson = false;
  try { formatted = JSON.stringify(JSON.parse(body), null, 2); isJson = true; } catch {}
  respEl.innerHTML = isJson ? highlightJSON(formatted) : `<span class="j-string">${body.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</span>`;
  respEl.dataset.raw = body;

  const h = Object.entries(headers).sort(([a], [b]) => a.localeCompare(b));
  respHeadersEl.innerHTML = h.length ? h.map(([k, v]) => `<span class="j-key">${k}</span><span class="j-string">: ${v}</span>`).join("\n") : `<span class="empty-state">—</span>`;
}

/* ═══════════════════════════════════════
   Palette deriver — preenche campos exigidos pela API
   que os presets antigos não têm (surface, popover, etc.)
   ═══════════════════════════════════════ */
function isValidHexColor(c: any): boolean {
  return typeof c === "string" && /^#[0-9a-fA-F]{3,8}$/.test(c.trim());
}

function safeColor(value: any, fallback: string): string {
  return isValidHexColor(value) ? value.trim() : fallback;
}

function deriveFullPalette(p: Record<string, any>): Record<string, any> {
  const bg         = safeColor(p.background, "#1e1e2e");
  const fg         = safeColor(p.foreground, "#cdd6f4");
  const card       = safeColor(p.card, bg);
  const cardFg     = safeColor(p.cardForeground, fg);
  const primary    = safeColor(p.primary, "#cba6f7");
  const primaryFg  = safeColor(p.primaryForeground, bg);
  const accent     = safeColor(p.accent, card);
  const border     = safeColor(p.border, "#585b70");
  const borderSoft = safeColor(p.borderSoft, accent);
  const input      = safeColor(p.input, accent);
  const success    = safeColor(p.success, "#a6e3a1");
  const warning    = safeColor(p.warning, "#f9e2af");
  const error      = safeColor(p.error, "#f38ba8");
  const placeholder = safeColor(p.placeholder, "#6c7086");
  const muted      = safeColor(p.muted, accent);
  const mutedFg    = safeColor(p.mutedForeground, fg);
  const sidebar    = safeColor(p.sidebar, card);
  const sidebarFg  = safeColor(p.sidebarForeground, fg);

  const userText = (p.text && typeof p.text === "object") ? p.text : {};
  const text = {
    primary:   safeColor(userText.primary, fg),
    strong:    safeColor(userText.strong, fg),
    subtle:    safeColor(userText.subtle, mutedFg),
    disabled:  safeColor(userText.disabled, placeholder),
    onPrimary: safeColor(userText.onPrimary, primaryFg),
    inverse:   safeColor(userText.inverse, primaryFg),
    link:      safeColor(userText.link, primary),
  };

  return {
    background: bg,
    foreground: fg,
    surface: safeColor(p.surface, input),
    surface1: safeColor(p.surface1, card),
    surface2: safeColor(p.surface2, card),
    surface3: safeColor(p.surface3, border),
    surfaceCard: safeColor(p.surfaceCard, card),
    card,
    cardForeground: cardFg,
    popover: safeColor(p.popover, card),
    popoverForeground: safeColor(p.popoverForeground, cardFg),
    border,
    borderSoft,
    input,
    primary,
    primaryForeground: primaryFg,
    primaryText: safeColor(p.primaryText, primary),
    primarySoft: safeColor(p.primarySoft, accent),
    secondary: safeColor(p.secondary, accent),
    secondaryForeground: safeColor(p.secondaryForeground, fg),
    accent,
    accentForeground: safeColor(p.accentForeground, fg),
    destructive: safeColor(p.destructive, error),
    destructiveForeground: safeColor(p.destructiveForeground, primaryFg),
    success,
    warning,
    error,
    growth: safeColor(p.growth, success),
    growthForeground: safeColor(p.growthForeground, primaryFg),
    opportunity: safeColor(p.opportunity, warning),
    opportunityForeground: safeColor(p.opportunityForeground, primaryFg),
    muted,
    mutedForeground: mutedFg,
    ring: safeColor(p.ring, primary),
    textDate: safeColor(p.textDate, mutedFg),
    placeholder,
    sidebar,
    sidebarForeground: sidebarFg,
    sidebarBorder: safeColor(p.sidebarBorder, borderSoft),
    text,
  };
}

/* ═══════════════════════════════════════
   Normalização do body (packageJson + palette completa)
   ═══════════════════════════════════════ */
function normalizeThemeBody(rawBody: string): string {
  if (!rawBody) return rawBody;
  try {
    const parsed = JSON.parse(rawBody);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return rawBody;

    // Extrai palette de packageJson (objeto OU string) ou do root
    let paletteInput: Record<string, any> | null = null;

    if (parsed.packageJson) {
      if (typeof parsed.packageJson === "string") {
        try {
          const pkg = JSON.parse(parsed.packageJson);
          paletteInput = pkg.palette ?? pkg;
        } catch {}
      } else if (typeof parsed.packageJson === "object") {
        paletteInput = parsed.packageJson.palette ?? parsed.packageJson;
      }
    } else if (parsed.palette) {
      paletteInput = parsed.palette;
    }

    if (paletteInput && typeof paletteInput === "object") {
      const fullPalette = deriveFullPalette(paletteInput);
      parsed.packageJson = JSON.stringify({ palette: fullPalette });
      delete parsed.palette;
      return JSON.stringify(parsed);
    }

    return rawBody;
  } catch {
    return rawBody;
  }
}

/* ═══════════════════════════════════════
   Send
   ═══════════════════════════════════════ */
async function sendRequest() {
  const method = methodEl.value;
  const url = urlEl.value.trim();
  const token = tokenEl.value.trim();
  let body = bodyEl.value.trim();
  const extra = parseHeaders(extraHeadersEl.value);
  const idem = idemField.classList.contains("hidden") ? "" : idemEl.value.trim();

  if (!url) { respEl.innerHTML = `<span class="empty-state">⚠ Preencha a URL.</span>`; return; }

  const willSendBody = !!body && ["POST", "PUT", "PATCH"].includes(method);
  if (willSendBody) body = normalizeThemeBody(body);

  const headers: Record<string, string> = { ...extra };
  if (token) headers["X-Session-Token"] = token;
  if (willSendBody) headers["Content-Type"] ??= "application/json";
  if (idem) headers["Idempotency-Key"] = idem;

  if (currentEndpoint) saveDraftNow(currentEndpoint.id, true);

  sendBtn.classList.add("loading"); sendLabel.textContent = "Enviando...";
  badgesEl.innerHTML = "";
  respEl.innerHTML = `<span class="empty-state">Carregando...</span>`;
  const time = timeNow();

  try {
    const result = await invoke<HttpResponse>("make_request", {
      payload: { method, url, headers: Object.keys(headers).length ? headers : null, body: willSendBody ? body : null },
    });

    renderResponse(result.body, result.headers, result.status, result.duration_ms);

    const cached = saveResponse(currentEndpoint, url, result);

    if (isPreviewEndpoint(currentEndpoint)) {
      try {
        const data = JSON.parse(result.body);
        const first = Array.isArray(data) ? data[0] : data;
        if (first && (first.packageJson || first.palette)) { lastThemesResponseBody = result.body; updateThemePreview(); }
      } catch {}
    }

    const MAX = 50_000;
    const trimmed = result.body.length > MAX ? result.body.slice(0, MAX) + "\n\n[…truncado]" : result.body;

    pushHistory({
      id: uuid(), method, url,
      endpointId: currentEndpoint?.id ?? null,
      endpointName: currentEndpoint?.name ?? url,
      status: result.status, duration: result.duration_ms, time,
      requestBody: bodyEl.value.trim(), extraHeaders: extraHeadersEl.value,
      responseBody: trimmed, responseHeaders: result.headers,
    });

    lastResponseMeta = { method: cached.method, endpointName: cached.endpointName, time: cached.time };
    updateResponseMeta();
    tryCaptureToken(currentEndpoint, url, result);
    tryThemeActionToast(currentEndpoint, result);
  } catch (err) {
    badgesEl.innerHTML = `<span class="badge badge-err">Erro de rede</span>`;
    respEl.innerHTML = `<span class="j-null">${String(err)}</span>`;
    respEl.dataset.raw = "";
    respHeadersEl.innerHTML = `<span class="empty-state">—</span>`;
  } finally {
    sendBtn.classList.remove("loading"); sendLabel.textContent = "Enviar";
  }
}

/* ═══════════════════════════════════════
   Formatar JSON
   ═══════════════════════════════════════ */
function formatJson() {
  const raw = bodyEl.value.trim();
  if (!raw) { showToast("Body vazio"); return; }
  try {
    const parsed = JSON.parse(raw);
    bodyEl.value = JSON.stringify(parsed, null, 2);
    updateBodyHighlight();
    if (isPreviewEndpoint(currentEndpoint)) updateThemePreview();
    hasUserEdits = true;
    scheduleSaveDraft();
    showToast("✨ JSON formatado");
  } catch (e) {
    showToast(`❌ JSON inválido: ${(e as Error).message}`);
  }
}

/* ═══════════════════════════════════════
   Presets
   ═══════════════════════════════════════ */
function populatePresets() {
  THEME_PRESETS.forEach((p) => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.name;
    presetSelectEl.appendChild(opt);
  });
}

async function loadPreset(presetId: string) {
  const preset = THEME_PRESETS.find((p) => p.id === presetId);
  if (!preset) return;

  const currentBody = bodyEl.value.trim();
  const defaultBody = currentEndpoint?.body?.trim() ?? "";
  const needsConfirm = currentBody !== "" && currentBody !== defaultBody;

  if (needsConfirm) {
    presetSelectEl.value = "";
    const confirmed = await showConfirm({
      icon: "🎭",
      title: "Substituir o body atual?",
      message: `O conteúdo atual do body será <strong>substituído</strong> pelo preset <code>"${preset.name}"</code>.<br><span class="confirm-hint">Esta ação não pode ser desfeita.</span>`,
      confirmText: "Substituir",
      cancelText: "Cancelar",
    });
    if (!confirmed) return;
  }

  const newBodyObj = {
    name: preset.name,
    description: preset.description,
    modeDefault: preset.modeDefault,
    packageJson: { palette: preset.palette },
  };

  bodyEl.value = JSON.stringify(newBodyObj, null, 2);
  updateBodyHighlight();
  if (isPreviewEndpoint(currentEndpoint)) updateThemePreview();
  hasUserEdits = true;
  scheduleSaveDraft();

  presetSelectEl.value = "";
  showToast(`🎭 "${preset.name}" carregado`);
}

/* ═══════════════════════════════════════
   Botões
   ═══════════════════════════════════════ */
copyBtn.addEventListener("click", async () => {
  const raw = respEl.dataset.raw ?? respEl.textContent ?? "";
  try {
    await navigator.clipboard.writeText(raw);
    copyBtn.classList.add("copied");
    setTimeout(() => copyBtn.classList.remove("copied"), 1200);
  } catch {}
});

clearTokenBtn.addEventListener("click", () => {
  tokenEl.value = ""; saveToken(""); updateAuthStatus();
  showToast("Token esquecido");
});

clearHistoryBtn.addEventListener("click", async () => {
  if (!history.length) {
    showToast("Histórico já está vazio");
    return;
  }
  const confirmed = await showConfirm({
    icon: "🗑️",
    title: "Limpar todo o histórico?",
    message: `As <strong>${history.length} request${history.length > 1 ? "s" : ""}</strong> salvas serão removidas permanentemente.<br><span class="confirm-hint">As respostas em cache dos endpoints NÃO são afetadas.</span>`,
    confirmText: "Limpar",
    cancelText: "Cancelar",
    danger: true,
  });
  if (!confirmed) return;
  history = [];
  saveHistoryToStorage();
  renderHistory();
  showToast("🗑️ Histórico limpo");
});

/* ═══════════════════════════════════════
   Wire-up
   ═══════════════════════════════════════ */
sendBtn.addEventListener("click", sendRequest);
regenBtn.addEventListener("click", () => (idemEl.value = uuid()));
searchEl.addEventListener("input", () => renderSidebar(searchEl.value));
tokenEl.addEventListener("input", () => { saveToken(tokenEl.value.trim()); updateAuthStatus(); });
presetSelectEl.addEventListener("change", () => loadPreset(presetSelectEl.value));
formatJsonBtn.addEventListener("click", formatJson);

bodyEl.addEventListener("input", () => {
  updateBodyHighlight();
  if (isPreviewEndpoint(currentEndpoint)) updateThemePreview();
  hasUserEdits = true;
  scheduleSaveDraft();
});
bodyEl.addEventListener("scroll", syncBodyScroll);
bodyEl.addEventListener("blur", () => {
  if (currentEndpoint && hasUserEdits) saveDraftNow(currentEndpoint.id, true);
});

extraHeadersEl.addEventListener("input", () => {
  hasUserEdits = true;
  scheduleSaveDraft();
});

document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); sendRequest(); return; }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); formatJson(); return; }
  if (e.key === "Escape") document.querySelectorAll(".toast").forEach((t) => t.remove());
});

setupTabs("request");
setupTabs("response");
setupSidebarTabs();
populatePresets();

/* ═══════════════════════════════════════
   Migração de segurança — apaga senhas residuais
   ═══════════════════════════════════════ */
function migrateSensitiveData() {
  SENSITIVE_ENDPOINT_IDS.forEach((id) => {
    localStorage.removeItem(STORAGE.DRAFT_PREFIX + id);
    localStorage.removeItem(STORAGE.RESPONSE_PREFIX + id);
  });

  try {
    const raw = localStorage.getItem(STORAGE.HISTORY);
    if (!raw) return;
    const hist = JSON.parse(raw) as any[];
    const cleaned = hist.map((h) =>
      SENSITIVE_ENDPOINT_IDS.includes(h.endpointId)
        ? { ...h, requestBody: "[redacted]", responseBody: "[redacted]" }
        : h
    );
    localStorage.setItem(STORAGE.HISTORY, JSON.stringify(cleaned));
  } catch {}
}

migrateSensitiveData();

/* ═══════════════════════════════════════
   Boot
   ═══════════════════════════════════════ */
tokenEl.value = loadToken();
updateAuthStatus();
history = loadHistoryFromStorage();
renderHistory();
renderSidebar();
updateResponseMeta();

const hasToken = !!tokenEl.value.trim();
const defaultEp = hasToken ? findEndpointById("themes-create") : findEndpointById("auth-login");
if (defaultEp) loadEndpoint(defaultEp);
updateBodyHighlight();