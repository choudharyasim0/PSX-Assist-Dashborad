import {api} from "./common.js";
import {translate} from "./i18n.js";

function showStatus(selector, text, good) {
  const element = document.querySelector(selector);
  element.textContent = text;
  element.classList.toggle("good-text", Boolean(good));
  element.classList.toggle("bad-text", !good);
}

async function refreshSettings() {
  showStatus("#backendStatus", translate("Jaanch ho rahi hai..."), false);
  try {
    await api("/healthz");
    showStatus("#backendStatus", translate("Server chal raha hai"), true);
  } catch {
    showStatus("#backendStatus", translate("Server se rabta nahi ho saka. Dobara koshish karein."), false);
  }
  try {
    const config = await api("/api/config");
    document.querySelector("#appVersion").textContent = config.version || "—";
    showStatus("#geminiStatus", translate(config.keys?.GEMINI_API_KEY ? "Configured" : "Missing"), Boolean(config.keys?.GEMINI_API_KEY));
    showStatus("#groqStatus", translate(config.keys?.GROQ_API_KEY ? "Configured" : "Missing"), Boolean(config.keys?.GROQ_API_KEY));
    showStatus("#gnewsApiStatus", translate(config.keys?.GNEWS_API_KEY ? "Configured" : "Missing"), Boolean(config.keys?.GNEWS_API_KEY));
    showStatus("#gnewsStatus", translate(config.keys?.GNEWS_API_KEY ? "Configured" : "Khabrein band hain"), Boolean(config.keys?.GNEWS_API_KEY));
  } catch (error) {
    showStatus("#geminiStatus", translate(error.message), false);
    showStatus("#groqStatus", translate("Status dastiyab nahi"), false);
    showStatus("#gnewsApiStatus", translate("Status dastiyab nahi"), false);
    showStatus("#gnewsStatus", translate("Status dastiyab nahi"), false);
  }
  try {
    const data = await api("/api/psx/symbols");
    showStatus("#psxStatus", translate(data.fallback ? "PSX source dastiyab nahi — fallback list" : "PSX symbol count", {count: data.items.length.toLocaleString()}), !data.fallback);
  } catch (error) {
    showStatus("#psxStatus", `${translate("Unavailable")}: ${translate(error.message)}`, false);
  }
}

export function initSettings() {
  document.querySelector("#refreshSettings").addEventListener("click", refreshSettings);
  window.addEventListener("settings-opened", refreshSettings);
  window.addEventListener("language-changed", refreshSettings);
  refreshSettings();
}
