export type ColorMode = "light" | "dark";

const STORAGE_KEY = "rezerv-dt-theme";
const EVENT = "rezerv-dt-theme-change";

function read(): ColorMode {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "dark" || stored === "light") return stored;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  } catch {
    return "light";
  }
}

/** External store so the initial client render adopts the saved mode without a setState-in-effect. */
export const colorModeStore = {
  subscribe(callback: () => void): () => void {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    window.addEventListener(EVENT, callback);
    window.addEventListener("storage", callback);
    media.addEventListener("change", callback);
    return () => {
      window.removeEventListener(EVENT, callback);
      window.removeEventListener("storage", callback);
      media.removeEventListener("change", callback);
    };
  },
  getSnapshot: read,
  getServerSnapshot: (): ColorMode => "light",
  set(mode: ColorMode): void {
    try {
      window.localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // storage unavailable — the in-memory event still updates the UI
    }
    window.dispatchEvent(new Event(EVENT));
  },
};
