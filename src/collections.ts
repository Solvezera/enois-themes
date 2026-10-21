export interface Endpoint {
  id: string;
  name: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  auth?: boolean;
  idempotencyKey?: boolean;
  body?: string;
}

export interface Collection {
  id: string;
  name: string;
  icon: string;
  endpoints: Endpoint[];
}

export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  modeDefault: "dark" | "light";
  palette: Record<string, any>;
}

export const BASE_URL = "https://enois.ia.br/api";

const j = (o: unknown) => JSON.stringify(o, null, 2);

const CATPPUCCIN_MOCHA_PALETTE = {
  background: "#1e1e2e", foreground: "#cdd6f4",
  card: "#181825", cardForeground: "#cdd6f4",
  border: "#585b70", borderSoft: "#313244",
  input: "#45475a",
  primary: "#cba6f7", primaryForeground: "#1e1e2e",
  secondary: "#45475a", secondaryForeground: "#cdd6f4",
  accent: "#313244", accentForeground: "#cdd6f4",
  success: "#a6e3a1", warning: "#f9e2af", error: "#f38ba8",
  placeholder: "#6c7086",
  sidebar: "#181825", sidebarForeground: "#cdd6f4",
  text: { strong: "#cdd6f4", subtle: "#bac2de", disabled: "#a6adc8", link: "#cba6f7" },
};

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "catppuccin-mocha",
    name: "Catppuccin Mocha",
    description: "Paleta pastel suave sobre base escura. Mauve #cba6f7 como accent.",
    modeDefault: "dark",
    palette: CATPPUCCIN_MOCHA_PALETTE,
  },
  {
    id: "catppuccin-latte",
    name: "Catppuccin Latte",
    description: "Versão clara do Catppuccin. Mauve #8839ef como accent.",
    modeDefault: "light",
    palette: {
      background: "#eff1f5", foreground: "#4c4f69",
      card: "#ffffff", cardForeground: "#4c4f69",
      border: "#bcc0cc", borderSoft: "#ccd0da",
      input: "#e6e9ef",
      primary: "#8839ef", primaryForeground: "#ffffff",
      secondary: "#ccd0da", secondaryForeground: "#4c4f69",
      accent: "#dce0e8", accentForeground: "#4c4f69",
      success: "#40a02b", warning: "#df8e1d", error: "#d20f39",
      placeholder: "#9ca0b0",
      sidebar: "#e6e9ef", sidebarForeground: "#4c4f69",
      text: { strong: "#4c4f69", subtle: "#5c5f77", disabled: "#8c8fa1", link: "#8839ef" },
    },
  },
  {
    id: "nord",
    name: "Nord",
    description: "Paleta ártica fria. Frost blue #88c0d0 como accent.",
    modeDefault: "dark",
    palette: {
      background: "#2e3440", foreground: "#eceff4",
      card: "#3b4252", cardForeground: "#eceff4",
      border: "#4c566a", borderSoft: "#434c5e",
      input: "#434c5e",
      primary: "#88c0d0", primaryForeground: "#2e3440",
      secondary: "#434c5e", secondaryForeground: "#eceff4",
      accent: "#434c5e", accentForeground: "#eceff4",
      success: "#a3be8c", warning: "#ebcb8b", error: "#bf616a",
      placeholder: "#616e88",
      sidebar: "#2e3440", sidebarForeground: "#eceff4",
      text: { strong: "#eceff4", subtle: "#d8dee9", disabled: "#a3aab8", link: "#88c0d0" },
    },
  },
  {
    id: "tokyo-night",
    name: "Tokyo Night",
    description: "Azul escuro frio com neon azul, roxo e ciano.",
    modeDefault: "dark",
    palette: {
      background: "#1a1b26", foreground: "#c0caf5",
      card: "#1f2335", cardForeground: "#c0caf5",
      border: "#414868", borderSoft: "#292e42",
      input: "#2f3549",
      primary: "#7aa2f7", primaryForeground: "#16161e",
      secondary: "#2f3549", secondaryForeground: "#c0caf5",
      accent: "#292e42", accentForeground: "#c0caf5",
      success: "#9ece6a", warning: "#e0af68", error: "#f7768e",
      placeholder: "#565f89",
      sidebar: "#16161e", sidebarForeground: "#c0caf5",
      text: { strong: "#c0caf5", subtle: "#a9b1d6", disabled: "#737aa2", link: "#7aa2f7" },
    },
  },
  {
    id: "gruvbox-dark",
    name: "Gruvbox Dark",
    description: "Retrô quente com amarelo e terracota. Nostálgico.",
    modeDefault: "dark",
    palette: {
      background: "#282828", foreground: "#ebdbb2",
      card: "#3c3836", cardForeground: "#ebdbb2",
      border: "#504945", borderSoft: "#3c3836",
      input: "#504945",
      primary: "#fabd2f", primaryForeground: "#282828",
      secondary: "#504945", secondaryForeground: "#ebdbb2",
      accent: "#3c3836", accentForeground: "#ebdbb2",
      success: "#b8bb26", warning: "#fabd2f", error: "#fb4934",
      placeholder: "#928374",
      sidebar: "#1d2021", sidebarForeground: "#ebdbb2",
      text: { strong: "#ebdbb2", subtle: "#bdae93", disabled: "#928374", link: "#fabd2f" },
    },
  },
  {
    id: "rose-pine",
    name: "Rosé Pine",
    description: "Tons de rosa suave, lavanda e ciano. Elegante e aconchegante.",
    modeDefault: "dark",
    palette: {
      background: "#191724", foreground: "#e0def4",
      card: "#1f1d2e", cardForeground: "#e0def4",
      border: "#403d52", borderSoft: "#26233a",
      input: "#26233a",
      primary: "#c4a7e7", primaryForeground: "#191724",
      secondary: "#26233a", secondaryForeground: "#e0def4",
      accent: "#26233a", accentForeground: "#e0def4",
      success: "#9ccfd8", warning: "#f6c177", error: "#eb6f92",
      placeholder: "#6e6a86",
      sidebar: "#1f1d2e", sidebarForeground: "#e0def4",
      text: { strong: "#e0def4", subtle: "#908caa", disabled: "#6e6a86", link: "#c4a7e7" },
    },
  },
  {
    id: "solarized-light",
    name: "Solarized Light",
    description: "O clássico Solarized em versão clara. Azul oceano como accent.",
    modeDefault: "light",
    palette: {
      background: "#fdf6e3", foreground: "#586e75",
      card: "#ffffff", cardForeground: "#586e75",
      border: "#93a1a1", borderSoft: "#eee8d5",
      input: "#eee8d5",
      primary: "#268bd2", primaryForeground: "#fdf6e3",
      secondary: "#eee8d5", secondaryForeground: "#586e75",
      accent: "#eee8d5", accentForeground: "#586e75",
      success: "#859900", warning: "#b58900", error: "#dc322f",
      placeholder: "#93a1a1",
      sidebar: "#eee8d5", sidebarForeground: "#586e75",
      text: { strong: "#073642", subtle: "#657b83", disabled: "#93a1a1", link: "#268bd2" },
    },
  },
  {
    id: "dracula",
    name: "Dracula",
    description: "O clássico tema dark com roxo e rosa neon. Roxo #bd93f9.",
    modeDefault: "dark",
    palette: {
      background: "#282a36", foreground: "#f8f8f2",
      card: "#44475a", cardForeground: "#f8f8f2",
      border: "#6272a4", borderSoft: "#44475a",
      input: "#44475a",
      primary: "#bd93f9", primaryForeground: "#282a36",
      secondary: "#44475a", secondaryForeground: "#f8f8f2",
      accent: "#44475a", accentForeground: "#f8f8f2",
      success: "#50fa7b", warning: "#f1fa8c", error: "#ff5555",
      placeholder: "#6272a4",
      sidebar: "#21222c", sidebarForeground: "#f8f8f2",
      text: { strong: "#f8f8f2", subtle: "#6272a4", disabled: "#6272a4", link: "#bd93f9" },
    },
  },
  {
    id: "cyberpunk-neon",
    name: "Cyberpunk Neon",
    description: "Alto contraste com magenta e ciano neon. Punk visual.",
    modeDefault: "dark",
    palette: {
      background: "#0d0221", foreground: "#f0e7ff",
      card: "#1a0a3e", cardForeground: "#f0e7ff",
      border: "#ff00ff", borderSoft: "#4b1e8f",
      input: "#24114a",
      primary: "#ff00ff", primaryForeground: "#0d0221",
      secondary: "#24114a", secondaryForeground: "#f0e7ff",
      accent: "#24114a", accentForeground: "#f0e7ff",
      success: "#00ff9f", warning: "#ffb800", error: "#ff0055",
      placeholder: "#7d6ca8",
      sidebar: "#0d0221", sidebarForeground: "#f0e7ff",
      text: { strong: "#ffffff", subtle: "#b8a8d9", disabled: "#7d6ca8", link: "#00ffff" },
    },
  },
];

export const COLLECTIONS: Collection[] = [
  {
    id: "auth", name: "Autenticação", icon: "🔐",
    endpoints: [
      { id: "auth-login", name: "Login", method: "POST", path: "/auth/login", idempotencyKey: true, body: j({ email: "ada@exemplo.com", password: "senha-forte-1" }) },
      { id: "auth-2fa", name: "Verificar 2FA", method: "POST", path: "/auth/2fa/verify", body: j({ code: "123456" }) },
      { id: "auth-me", name: "Meu perfil (/me)", method: "GET", path: "/me", auth: true },
      { id: "auth-logout", name: "Logout", method: "POST", path: "/auth/logout", auth: true },
    ],
  },
  {
    id: "themes", name: "Temas", icon: "🎨",
    endpoints: [
      { id: "themes-create", name: "Publicar tema", method: "POST", path: "/temas/galeria", auth: true, idempotencyKey: true,
        body: j({ name: "Catppuccin Mocha", description: "Paleta pastel suave sobre base escura. Mauve #cba6f7 como accent.", modeDefault: "dark", packageJson: { palette: CATPPUCCIN_MOCHA_PALETTE } }) },
      { id: "themes-mine", name: "Meus temas", method: "GET", path: "/temas/galeria/mine", auth: true },
      { id: "themes-install", name: "Instalar tema", method: "POST", path: "/temas/galeria/{themeId}/install", auth: true },
      { id: "themes-report", name: "Denunciar tema", method: "POST", path: "/temas/galeria/{themeId}/report", auth: true, body: j({ reason: "COPYRIGHT", description: "Uso não autorizado de cores" }) },
      { id: "themes-hide", name: "Esconder meu tema", method: "POST", path: "/temas/galeria/{themeId}/hide", auth: true },
    ],
  },
  {
    id: "account", name: "Conta", icon: "👤",
    endpoints: [
      { id: "account-theme", name: "Salvar tema da conta", method: "PUT", path: "/me/theme", auth: true, body: j({ themeId: "tema_…" }) },
    ],
  },
];

export function findEndpointById(id: string): Endpoint | null {
  for (const col of COLLECTIONS) for (const ep of col.endpoints) if (ep.id === id) return ep;
  return null;
}