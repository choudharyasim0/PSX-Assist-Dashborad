import {api, notify} from "./common.js";
import {initMarket} from "./market.js";
import {initNews} from "./news.js";
import {initPortfolio} from "./portfolio.js";
import {initDocuments} from "./documents.js";
import {initSettings} from "./settings.js";
import {initI18n} from "./i18n.js";
import {translate} from "./i18n.js";

function initNavigation() {
  document.querySelectorAll(".nav-item").forEach(button => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".nav-item").forEach(item => item.classList.remove("active"));
      document.querySelectorAll(".view").forEach(view => view.classList.remove("active"));
      button.classList.add("active");
      document.querySelector(`#panel-${button.dataset.view}`).classList.add("active");
      if (button.dataset.view === "settings") {
        window.dispatchEvent(new CustomEvent("settings-opened"));
      }
    });
  });
  document.querySelectorAll("[data-open]").forEach(button => {
    button.addEventListener("click", () => {
      document.querySelector(`.nav-item[data-view="${button.dataset.open}"]`).click();
    });
  });
}

async function checkBackend() {
  const status = document.querySelector("#connectionStatus");
  const dot = status.querySelector(".status-dot");
  try {
    await api("/healthz");
    dot.classList.add("good");
    status.lastElementChild.textContent = translate("Server chal raha hai");
  } catch (error) {
    dot.classList.add("bad");
    status.lastElementChild.textContent = translate(error.message);
  }
}

initI18n();
initNavigation();
initMarket();
initNews();
initPortfolio();
initDocuments();
initSettings();
checkBackend();
window.addEventListener("language-changed", checkBackend);

window.addEventListener("unhandledrejection", event => {
  event.preventDefault();
  notify(event.reason?.message || "Achanak masla hua. Dobara koshish karein.", true);
});
