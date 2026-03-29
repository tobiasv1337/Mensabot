const MAPTILER_LIGHT_STYLE = import.meta.env.VITE_MAPTILER_STYLE_URL_LIGHT ?? "";
const MAPTILER_DARK_STYLE = import.meta.env.VITE_MAPTILER_STYLE_URL_DARK ?? "";

export const getMapStyleConfig = (darkMode: boolean) => {
  const styleUrl = darkMode ? MAPTILER_DARK_STYLE : MAPTILER_LIGHT_STYLE;
  const missingLight = !MAPTILER_LIGHT_STYLE.trim();
  const missingDark = !MAPTILER_DARK_STYLE.trim();

  return {
    styleUrl,
    missingLight,
    missingDark,
    missingConfig: missingLight || missingDark,
  };
};
