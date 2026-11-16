import {api, formatDate, requestJson} from "./common.js";
import {language, translate} from "./i18n.js";

let fetchedArticles = [];
let currentFilter = "";
let analysisByUrl = new Map();
let symbols = [];

function stockMatch(article, filter) {
  const term = filter.trim().toLowerCase();
  if (!term) return true;
  const symbol = symbols.find(item => item.symbol.toLowerCase() === term);
  const name = symbol?.name?.toLowerCase();
  const text = `${article.title} ${article.description}`.toLowerCase();
  return text.includes(term) || Boolean(name && name !== term && text.includes(name));
}

function impactClass(impact) {
  if (impact === "Positive") return "impact-positive";
  if (impact === "Negative") return "impact-negative";
  return "impact-neutral";
}

function createArticleCard(article, analysis) {
  const card = document.createElement("article");
  card.className = "card news-item";
  const meta = document.createElement("div");
  meta.className = "news-meta";
  const source = document.createElement("span");
  source.textContent = article.source || "GNews";
  meta.append(source);
  if (article.publishedAt) {
    const time = document.createElement("time");
    time.dateTime = article.publishedAt;
    time.textContent = formatDate(article.publishedAt);
    meta.append(time);
  }
  if (analysis) {
    const badge = document.createElement("span");
    badge.className = `impact ${impactClass(analysis.impact)}`;
    badge.textContent = translate(["Positive", "Negative"].includes(analysis.impact) ? analysis.impact : "Neutral");
    meta.append(badge);
  }
  const title = document.createElement("h3");
  title.textContent = article.title;
  card.append(meta, title);
  if (article.description) {
    const description = document.createElement("p");
    description.textContent = article.description;
    card.append(description);
  }
  if (analysis) {
    const block = document.createElement("div");
    block.className = "news-analysis";
    const summary = document.createElement("p");
    summary.textContent = analysis.summary || translate("AI khulasa dastiyab nahi.");
    block.append(summary);
    const details = [];
    if (Array.isArray(analysis.sectors) && analysis.sectors.length) details.push(`${translate("Mutasira sectors: ")}${analysis.sectors.join(", ")}`);
    if (Array.isArray(analysis.stocks) && analysis.stocks.length) details.push(`${translate("Mutaliqa shares: ")}${analysis.stocks.join(", ")}`);
    if (analysis.reason) details.push(`${translate("Wajah: ")}${analysis.reason}`);
    if (details.length) {
      const paragraph = document.createElement("p");
      paragraph.textContent = details.join(" • ");
      block.append(paragraph);
    }
    const disclaimer = document.createElement("p");
    disclaimer.className = "helper-text";
    disclaimer.textContent = translate("Impact AI ka andaza hai, tasdeeq shuda market fact nahi.");
    block.append(disclaimer);
    card.append(block);
  }
  try {
    const link = new URL(article.url);
    if (link.protocol === "https:") {
      const anchor = document.createElement("a");
      anchor.href = link.href;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      anchor.textContent = translate("Asal khabar parhein");
      card.append(anchor);
    }
  } catch {
    // Hide malformed external links rather than rendering an unsafe destination.
  }
  return card;
}

function renderArticles() {
  const container = document.querySelector("#newsArticles");
  container.replaceChildren();
  const articles = fetchedArticles.filter(article => stockMatch(article, currentFilter));
  if (!articles.length) {
    const empty = document.createElement("div");
    empty.className = "card empty-state";
    empty.textContent = translate(currentFilter ? "Is share ke liye fetched khabron mein koi mutaliqa match nahi mila." : "Koi khabar dastiyab nahi.");
    container.append(empty);
    return [];
  }
  articles.forEach(article => container.append(createArticleCard(article, analysisByUrl.get(article.url))));
  return articles;
}

async function analyzeArticles(articles, filter) {
  const status = document.querySelector("#newsStatus");
  if (!articles.length) return;
  status.textContent = translate("AI khabron ka ehtiyati jaiza kar raha hai...");
  const input = articles.map((item, index) => ({
    index,
    title: item.title,
    description: item.description,
    source: item.source,
    publishedAt: item.publishedAt,
  }));
  const stockContext = filter
    ? `Analyze only articles that explicitly mention ${filter} or its exact company name. Skip unrelated articles.`
    : "Analyze each article independently. Do not combine unrelated articles.";
  const prompt = `These are original articles retrieved from GNews. Provide a two-sentence summary and potential market impact for each relevant article in the selected application language. ${stockContext}
Use only the supplied article facts. Impact must be Positive, Negative or Neutral; choose Neutral when evidence is unclear. Name affected sectors and stocks only when supported by the article. Separate reported facts from AI estimates. Do not infer company-specific impact from broad market news.
Return a JSON object with an articles array: {"articles":[{"index":0,"summary":"...","impact":"Positive|Negative|Neutral","sectors":[],"stocks":[],"reason":"..."}]}. Skip irrelevant items.
Articles: ${JSON.stringify(input)}`;
  try {
    const response = await requestJson("/api/ai", {prompt, json: true});
    const parsed = JSON.parse(response.text);
    const rows = Array.isArray(parsed) ? parsed : parsed.articles;
    if (!Array.isArray(rows)) throw new Error("AI analysis ka format durust nahi.");
    analysisByUrl = new Map();
    rows.forEach(row => {
      if (!Number.isInteger(row.index) || row.index < 0 || row.index >= articles.length) return;
      const impact = ["Positive", "Negative", "Neutral"].includes(row.impact) ? row.impact : "Neutral";
      analysisByUrl.set(articles[row.index].url, {...row, impact});
    });
    status.textContent = filter
      ? `${filter}: ${translate("Khabron ke saath AI ka andaza dikhaya gaya hai; asal article hi fact ka source hai.")}`
      : translate("Khabron ke saath AI ka andaza dikhaya gaya hai; asal article hi fact ka source hai.");
    renderArticles();
  } catch (error) {
    status.textContent = `${translate("AI jaiza nahi ho saka: ")}${translate(error.message)} ${translate("Asal khabrein neeche maujood hain.")}`;
    renderArticles();
  }
}

async function loadNews() {
  const status = document.querySelector("#newsStatus");
  status.textContent = translate("GNews se khabrein mangwayi ja rahi hain...");
  document.querySelector("#loadNews").disabled = true;
  try {
    const data = await api("/api/news");
    fetchedArticles = Array.isArray(data.articles) ? data.articles : [];
    analysisByUrl = new Map();
    if (!fetchedArticles.length) {
      status.textContent = translate("GNews ne koi mutaliqa khabar nahi bheji.");
      renderArticles();
      return;
    }
    currentFilter = document.querySelector("#newsStockFilter").value.trim();
    renderArticles();
    await analyzeArticles(fetchedArticles.filter(article => stockMatch(article, currentFilter)), currentFilter);
  } catch (error) {
    status.textContent = `${translate("Khabrein load nahi ho sakin: ")}${translate(error.message)}`;
    renderArticles();
  } finally {
    document.querySelector("#loadNews").disabled = false;
  }
}

export function initNews() {
  document.querySelector("#loadNews").addEventListener("click", loadNews);
  document.querySelector("#filterNews").addEventListener("click", async () => {
    currentFilter = document.querySelector("#newsStockFilter").value.trim();
    const matched = renderArticles();
    if (matched.length) await analyzeArticles(matched, currentFilter);
  });
  document.querySelector("#clearNewsFilter").addEventListener("click", () => {
    document.querySelector("#newsStockFilter").value = "";
    currentFilter = "";
    renderArticles();
  });
  window.addEventListener("language-changed", () => {
    if (fetchedArticles.length) {
      analysisByUrl = new Map();
      const matched = renderArticles();
      if (matched.length) analyzeArticles(matched, currentFilter);
    }
  });
  api("/api/psx/symbols").then(data => { symbols = Array.isArray(data.items) ? data.items : []; }).catch(() => {});
}
