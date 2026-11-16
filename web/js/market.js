import {api, formatDate, formatNumber, formatPrice, notify, readPortfolio} from "./common.js";
import {locale, translate} from "./i18n.js";

const INDEXES = ["KSE100", "KSE30", "KMI30", "ALLSHR", "KMIALLSHR"];
let symbols = [];
let selectedSymbol = "KSE100";
let period = "int";
let priceChart;
let refreshTimer;
let quoteRequestId = 0;
const quoteCache = new Map();
const MARKET_CACHE_KEY = "psx-assist-market-quotes";

function readQuoteCache() {
  try {
    const stored = JSON.parse(localStorage.getItem(MARKET_CACHE_KEY) || "{}");
    if (!stored || typeof stored !== "object" || Array.isArray(stored)) return;
    Object.entries(stored).forEach(([key, quote]) => {
      if (quote && typeof quote.symbol === "string" && Number.isFinite(quote.price)
          && Number.isFinite(quote.updatedAt) && Array.isArray(quote.series)) {
        quoteCache.set(key, quote);
      }
    });
  } catch {
    notify("Saved market quote cache could not be read.", true);
  }
}

function cacheQuote(key, quote) {
  quoteCache.set(key, quote);
  try {
    localStorage.setItem(MARKET_CACHE_KEY, JSON.stringify(Object.fromEntries(quoteCache)));
  } catch {
    notify("Purana market data browser mein save nahi ho saka.", true);
  }
}

function statusLabel(status) {
  return translate({
    live: "Live",
    market_closed: "Market Closed",
    delayed: "Delayed",
  }[status] || "Unavailable");
}

function companyName(symbol) {
  return symbols.find(item => item.symbol === symbol)?.name || symbol;
}

function setChange(element, change, percent) {
  element.classList.remove("up", "down", "flat");
  if (!Number.isFinite(change)) {
    element.textContent = translate("Tabdeeli ka data nahi");
    element.classList.add("flat");
    return;
  }
  const positive = change > 0;
  const negative = change < 0;
  element.textContent = `${positive ? "▲" : negative ? "▼" : "•"} ${formatNumber(Math.abs(change))}${Number.isFinite(percent) ? ` (${formatNumber(Math.abs(percent))}%)` : ""}`;
  element.classList.add(positive ? "up" : negative ? "down" : "flat");
}

function drawIndexes(quotes) {
  const container = document.querySelector("#indexCards");
  container.replaceChildren();
  INDEXES.forEach(symbol => {
    const quote = quotes.get(symbol);
    const card = document.createElement("button");
    card.type = "button";
    card.className = "index-card";
    card.setAttribute("aria-label", `${symbol}: ${translate("Market information")}`);
    const name = document.createElement("span");
    name.className = "index-name";
    name.textContent = symbol;
    const value = document.createElement("strong");
    value.className = "index-value";
    value.textContent = quote ? formatNumber(quote.price) : "—";
    const change = document.createElement("span");
    change.className = "index-change";
    if (quote) setChange(change, quote.change, quote.changePercent);
    else {
      change.textContent = translate("Asal data dastiyab nahi");
      change.classList.add("flat");
    }
    card.append(name, value, change);
    card.addEventListener("click", () => selectSymbol(symbol));
    container.append(card);
  });
}

async function loadIndexes() {
  const results = await Promise.all(INDEXES.map(async symbol => {
    try {
      const quote = await api(`/api/psx/quote?symbol=${encodeURIComponent(symbol)}`);
      cacheQuote(`${symbol}:int`, quote);
      return [symbol, quote];
    } catch {
      return [symbol, quoteCache.get(`${symbol}:int`) || null];
    }
  }));
  drawIndexes(new Map(results));
  const newest = results.map(([, quote]) => quote?.updatedAt).filter(Number.isFinite);
  document.querySelector("#marketFreshness").textContent = newest.length
    ? `${translate("Taza data")}: ${formatDate(Math.max(...newest))}`
    : translate("PSX live data dastiyab nahi");
}

async function loadSymbols() {
  const notice = document.querySelector("#symbolNotice");
  const options = document.querySelector("#stockOptions");
  try {
    const data = await api("/api/psx/symbols");
    symbols = Array.isArray(data.items) ? data.items : [];
    options.replaceChildren();
    symbols.forEach(item => {
      const option = document.createElement("option");
      option.value = item.symbol;
      option.label = item.name;
      options.append(option);
    });
    notice.textContent = data.fallback
      ? translate("PSX ki mukammal list nahi mili; mashhoor symbols ki fallback list dikh rahi hai. Qeemat sirf live source se li jayegi.")
      : translate("PSX symbol count", {count: symbols.length.toLocaleString(locale())});
  } catch (error) {
    notice.textContent = error.message;
  }
}

function renderChart(rows) {
  const empty = document.querySelector("#chartEmpty");
  const status = document.querySelector("#chartStatus");
  let data = rows;
  if (period === "eod" && rows.length) {
    const cutoff = Date.now() - 180 * 24 * 60 * 60 * 1000;
    data = rows.filter(row => row.time >= cutoff);
  }
  if (!data.length) {
    priceChart?.destroy();
    priceChart = undefined;
    empty.classList.remove("hidden");
    status.textContent = translate("Chart data dastiyab nahi");
    return;
  }
  empty.classList.add("hidden");
  status.textContent = period === "int" ? translate("Aaj ka asal data") : translate("Rozana asal data • aakhri 180 din");
  if (!window.Chart) {
    status.textContent = "Chart load nahi hua. Internet rabta jaanchein.";
    empty.textContent = "Chart library load nahi hui.";
    empty.classList.remove("hidden");
    return;
  }
  const ctx = document.querySelector("#priceChart").getContext("2d");
  const rising = data.at(-1).price >= data[0].price;
  const color = rising ? "#2bd49c" : "#fb7185";
  const gradient = ctx.createLinearGradient(0, 0, 0, 290);
  gradient.addColorStop(0, rising ? "rgba(43,212,156,.22)" : "rgba(251,113,133,.2)");
  gradient.addColorStop(1, "rgba(17,27,44,0)");
  const config = {
    type: "line",
    data: {
      labels: data.map(row => row.time),
      datasets: [{data: data.map(row => row.price), borderColor: color, backgroundColor: gradient, fill: true, tension: .28, pointRadius: 0, pointHoverRadius: 4, borderWidth: 2}],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {intersect: false, mode: "index"},
      plugins: {
        legend: {display: false},
        tooltip: {callbacks: {
          title: items => formatDate(items[0]?.label),
          label: item => `${translate("Current price")}: ${formatPrice(item.raw)}`,
        }},
      },
      scales: {
        x: {type: "category", grid: {display: false}, ticks: {color: "#91a1bb", maxTicksLimit: 6, callback(value) {
          const date = new Date(this.getLabelForValue(value));
          return Number.isFinite(date.getTime()) ? date.toLocaleString(locale(), period === "int" ? {hour: "2-digit", minute: "2-digit"} : {month: "short", day: "numeric"}) : "";
        }}},
        y: {position: "right", grid: {color: "rgba(145,161,187,.09)"}, ticks: {color: "#91a1bb", callback: value => formatNumber(value, 0)}},
      },
    },
  };
  if (priceChart) {
    priceChart.data = config.data;
    priceChart.options = config.options;
    priceChart.update("none");
  } else {
    priceChart = new window.Chart(ctx, config);
  }
}

async function loadQuote(symbol = selectedSymbol) {
  selectedSymbol = symbol.toUpperCase();
  const requestId = ++quoteRequestId;
  document.querySelector("#quoteName").textContent = companyName(selectedSymbol);
  document.querySelector("#quoteSymbol").textContent = selectedSymbol;
  document.querySelector("#quoteSource").textContent = translate("PSX se rabta...");
  document.querySelector("#chartStatus").textContent = translate("Data load ho raha hai...");
  const cached = quoteCache.get(`${selectedSymbol}:${period}`);
  if (!cached) {
    document.querySelector("#quotePrice").textContent = "—";
    document.querySelector("#quoteChange").textContent = translate("Asal quote milne ka intezar hai");
    document.querySelector("#quoteChange").className = "price-change flat";
    document.querySelector("#quoteHigh").textContent = "—";
    document.querySelector("#quoteLow").textContent = "—";
    document.querySelector("#quoteVolume").textContent = "—";
    document.querySelector("#quoteUpdated").textContent = "—";
  }
  try {
    const data = await api(`/api/psx/quote?symbol=${encodeURIComponent(selectedSymbol)}&period=${period}`);
    if (requestId !== quoteRequestId) return;
    cacheQuote(`${selectedSymbol}:${period}`, data);
    renderQuote(data, false);
  } catch (error) {
    if (requestId !== quoteRequestId) return;
    if (cached) {
      renderQuote(cached, true);
      document.querySelector("#quoteUpdated").textContent = `${translate("Purana data")} — ${error.message}`;
      document.querySelector("#chartStatus").textContent = translate("Taza update fail hua; purana chart mehfooz hai.");
    } else {
      document.querySelector("#quotePrice").textContent = "—";
      document.querySelector("#quoteChange").textContent = error.message;
      document.querySelector("#quoteChange").className = "price-change down";
      document.querySelector("#quoteHigh").textContent = "—";
      document.querySelector("#quoteLow").textContent = "—";
      document.querySelector("#quoteVolume").textContent = "—";
      document.querySelector("#quoteUpdated").textContent = translate("Asal qeemat dastiyab nahi");
      document.querySelector("#quoteSource").textContent = translate("Data dastiyab nahi");
      renderChart([]);
    }
  }
}

function renderQuote(data, stale) {
    document.querySelector("#quoteName").textContent = companyName(data.symbol);
    document.querySelector("#quotePrice").textContent = formatPrice(data.price);
    setChange(document.querySelector("#quoteChange"), data.change, data.changePercent);
    document.querySelector("#quoteHigh").textContent = formatPrice(data.high);
    document.querySelector("#quoteLow").textContent = formatPrice(data.low);
    document.querySelector("#quoteVolume").textContent = Number.isFinite(data.volume) ? formatNumber(data.volume, 0) : "—";
    document.querySelector("#quoteUpdated").textContent = `${translate(stale ? "Purana data" : "Aakhri update")}: ${formatDate(data.updatedAt)}`;
    document.querySelector("#quoteSource").textContent = `${translate(data.source)} • ${statusLabel(data.status)} • ${translate(period === "int" ? "intraday" : "historical")}${stale ? ` • ${translate("Purana data")}` : ""}`;
    renderChart(data.series || []);
    document.querySelector("#marketFreshness").textContent = `${translate(stale ? "Purana data" : "Taza data")}: ${formatDate(data.updatedAt)}`;
}

function selectSymbol(symbol) {
  document.querySelector("#stockSearch").value = symbol;
  loadQuote(symbol);
}

function startRefresh() {
  clearInterval(refreshTimer);
  refreshTimer = setInterval(() => {
    if (!document.hidden && period === "int") loadQuote(selectedSymbol);
  }, 30_000);
}

async function renderGlance() {
  const holdings = readPortfolio();
  const priced = holdings.filter(item => Number.isFinite(Number(item.currentPrice)));
  const invested = holdings.reduce((sum, item) => sum + Number(item.quantity) * Number(item.buyPrice), 0);
  const complete = priced.length === holdings.length;
  const current = priced.reduce((sum, item) => sum + Number(item.quantity) * Number(item.currentPrice), 0);
  document.querySelector("#glanceInvested").textContent = holdings.length ? formatPrice(invested) : "—";
  document.querySelector("#glanceCurrent").textContent = complete && holdings.length ? formatPrice(current) : "—";
  const profit = complete && holdings.length ? current - invested : null;
  const profitElement = document.querySelector("#glanceProfit");
  profitElement.textContent = profit === null ? "—" : formatPrice(profit);
  profitElement.classList.toggle("up", profit > 0);
  profitElement.classList.toggle("down", profit < 0);
  document.querySelector("#glanceHoldings").textContent = String(holdings.length);
  const empty = document.querySelector("#glanceChartEmpty");
  const canvas = document.querySelector("#glanceChart");
  if (!holdings.length || !window.Chart) {
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");
  const chartData = holdings.map(item => Number(item.quantity) * Number(item.buyPrice));
  const chart = window.__glanceChart;
  if (chart) {
    chart.data.labels = holdings.map(item => item.symbol);
    chart.data.datasets[0].data = chartData;
    chart.update("none");
  } else {
    window.__glanceChart = new window.Chart(canvas, {
      type: "doughnut",
      data: {labels: holdings.map(item => item.symbol), datasets: [{data: chartData, backgroundColor: ["#2bd49c", "#70a7ff", "#ad8cff", "#f5c66c", "#fb7185", "#5bc0eb"], borderColor: "#111b2c", borderWidth: 3}]},
      options: {maintainAspectRatio: false, cutout: "68%", plugins: {legend: {position: "bottom", labels: {color: "#91a1bb", boxWidth: 9, padding: 12, font: {size: 10}}}, tooltip: {callbacks: {label: item => `${item.label}: ${formatPrice(item.raw)}`}}}},
    });
  }
}

export function initMarket() {
  readQuoteCache();
  document.querySelector("#stockSearchForm").addEventListener("submit", event => {
    event.preventDefault();
    const query = document.querySelector("#stockSearch").value.trim();
    const found = symbols.find(item => item.symbol.toLowerCase() === query.toLowerCase())
      || symbols.find(item => item.name.toLowerCase() === query.toLowerCase());
    if (!query) return;
    loadQuote(found?.symbol || query);
  });
  document.querySelectorAll("[data-period]").forEach(button => {
    button.addEventListener("click", () => {
      period = button.dataset.period;
      document.querySelectorAll("[data-period]").forEach(item => item.classList.toggle("active", item === button));
      loadQuote(selectedSymbol);
    });
  });
  document.querySelector("#refreshQuote").addEventListener("click", () => loadQuote(selectedSymbol));
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && period === "int") loadQuote(selectedSymbol);
  });
  window.addEventListener("portfolio-updated", renderGlance);
  window.addEventListener("language-changed", () => {
    renderGlance();
    const currentQuote = quoteCache.get(`${selectedSymbol}:${period}`);
    if (currentQuote) renderQuote(currentQuote, Date.now() - currentQuote.updatedAt > 120_000);
    drawIndexes(new Map(INDEXES.map(symbol => [symbol, quoteCache.get(`${symbol}:int`) || null])));
    if (symbols.length) {
      const notice = document.querySelector("#symbolNotice");
      notice.textContent = translate("PSX symbol count", {count: symbols.length.toLocaleString(locale())});
    }
  });
  loadSymbols().then(() => {
    loadQuote(selectedSymbol);
    loadIndexes();
  });
  startRefresh();
  renderGlance();
}
