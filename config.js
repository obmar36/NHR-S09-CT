/**
 * S09-CT runtime configuration.
 * mode: "mock" uses the bundled demonstration dataset.
 * mode: "api" lets app.js call the endpoint declared in apiBaseUrl.
 */
window.S09CT_CONFIG = {
  mode: "mock",
  apiBaseUrl: "",
  refreshSeconds: 30,
  locale: "zh-TW",
  currency: "TWD",
  mapTileUrl: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
  mapAttribution: "&copy; OpenStreetMap contributors &copy; CARTO"
};
