import {api, formatDate, formatNumber, formatPrice, notify, readPortfolio, writePortfolio} from "./common.js";
import {language, translate} from "./i18n.js";
import {analyzePortfolio as analyzePortfolioData} from "./portfolio-ai.js";

let holdings = [];
let allocationChart;

function companyName(symbol) {
  const option = [...document.querySelectorAll("#stockOptions option")].find(item => item.value === symbol);
  return option?.label || symbol;
}

function formatAmount(value) {
  if (!Number.isFinite(value)) return formatPrice(value);
  const cents = value * 100;
  const adjusted = cents + Math.sign(value) * Number.EPSILON * Math.abs(cents);
  return formatPrice(Math.round(adjusted) / 100);
}

function formatQuantity(value, enteredValue) {
  if (typeof enteredValue === "string" && enteredValue.trim()
      && Number(enteredValue) === value) return enteredValue.trim();
  return Number(value).toLocaleString(undefined, {maximumFractionDigits: 4});
}

function pricePeriodLabel(holding) {
  if (holding.manualPrice) return translate("manual");
  if (holding.currentPricePeriod === "eod") return translate("Daily close");
  if (holding.currentPricePeriod === "int") return translate("Intraday price");
  return holding.currentUpdatedAt ? translate("Previously saved PSX quote") : translate("Unavailable");
}

function calc() {
  const invested = holdings.reduce((sum, item) => sum + item.quantity * item.buyPrice, 0);
  const complete = holdings.every(item => Number.isFinite(item.currentPrice) && item.currentPrice > 0);
  const current = complete ? holdings.reduce((sum, item) => sum + item.quantity * item.currentPrice, 0) : null;
  const profit = current === null ? null : current - invested;
  return {invested, current, profit, returnPercent: profit === null || invested === 0 ? null : profit / invested * 100, complete};
}

function renderSummary() {
  const summary = calc();
  document.querySelector("#totalInvested").textContent = holdings.length ? formatAmount(summary.invested) : "—";
  document.querySelector("#totalCurrent").textContent = summary.current === null ? "—" : formatAmount(summary.current);
  const profit = document.querySelector("#totalProfit");
  profit.textContent = summary.profit === null ? "—" : formatAmount(summary.profit);
  profit.classList.toggle("up", summary.profit > 0);
  profit.classList.toggle("down", summary.profit < 0);
  document.querySelector("#totalReturn").textContent = summary.returnPercent === null
    ? translate("Taza qeemat darkar hai")
    : `${summary.returnPercent >= 0 ? "+" : ""}${formatNumber(summary.returnPercent)}% return`;
  document.querySelector("#holdingCount").textContent = String(holdings.length);
  document.querySelector("#holdingsEmpty").classList.toggle("hidden", holdings.length > 0);
}

function renderTable() {
  const body = document.querySelector("#holdingsTable");
  body.replaceChildren();
  holdings.forEach((item, index) => {
    const row = document.createElement("tr");
    const invested = item.quantity * item.buyPrice;
    const currentKnown = Number.isFinite(item.currentPrice) && item.currentPrice > 0;
    const current = currentKnown ? item.quantity * item.currentPrice : null;
    const profit = currentKnown ? current - invested : null;
    const cells = [
      null,
      formatQuantity(item.quantity, item.quantityInput),
      formatPrice(item.buyPrice),
      currentKnown ? `${formatPrice(item.currentPrice)} (${pricePeriodLabel(item)})` : "—",
      formatAmount(invested),
      currentKnown ? formatAmount(current) : "—",
      profit === null ? "—" : `${formatAmount(profit)} (${formatNumber(profit / invested * 100)}%)`,
    ];
    const nameCell = document.createElement("td");
    nameCell.className = "holding-name";
    const name = document.createElement("strong");
    name.textContent = item.symbol;
    const company = document.createElement("small");
    company.textContent = companyName(item.symbol);
    nameCell.append(name, company);
    row.append(nameCell);
    cells.slice(1).forEach((value, cellIndex) => {
      const cell = document.createElement("td");
      cell.textContent = value;
      if (cellIndex === 5 && profit !== null) cell.classList.add(profit >= 0 ? "up" : "down");
      row.append(cell);
    });
    const action = document.createElement("td");
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "delete-holding";
    remove.textContent = translate("Hataein");
    remove.setAttribute("aria-label", `${item.symbol}: ${translate("Remove holding")}`);
    remove.addEventListener("click", () => {
      holdings.splice(index, 1);
      persist();
      render();
    });
    action.append(remove);
    row.append(action);
    body.append(row);
  });
}

function renderAllocation() {
  const empty = document.querySelector("#allocationEmpty");
  const canvas = document.querySelector("#allocationChart");
  if (!holdings.length || !window.Chart) {
    allocationChart?.destroy();
    allocationChart = undefined;
    empty.textContent = translate("Taqseem dikhane ke liye holdings shamil karein.");
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");
  const values = holdings.map(item => item.quantity * item.buyPrice);
  const colors = ["#2bd49c", "#70a7ff", "#ad8cff", "#f5c66c", "#fb7185", "#5bc0eb", "#a3e635"];
  const chartData = {
    labels: holdings.map(item => item.symbol),
    datasets: [{data: values, backgroundColor: holdings.map((_, index) => colors[index % colors.length]), borderColor: "#111b2c", borderWidth: 3, hoverOffset: 8}],
  };
  const options = {
    maintainAspectRatio: false,
    cutout: "66%",
    plugins: {
      legend: {position: "bottom", rtl: language() === "ur", labels: {color: "#91a1bb", boxWidth: 9, padding: 14, font: {size: 11}}},
      tooltip: {callbacks: {label: item => {
        const total = values.reduce((sum, value) => sum + value, 0);
        return `${item.label}: ${formatAmount(item.raw)} (${formatNumber(total ? item.raw / total * 100 : 0)}%)`;
      }}},
    },
    onClick: (_event, elements) => {
      if (!elements.length) return;
      const index = elements[0].index;
      const total = values.reduce((sum, value) => sum + value, 0);
      document.querySelector("#allocationDetail").textContent = `${holdings[index].symbol}: ${formatAmount(values[index])} — ${formatNumber(total ? values[index] / total * 100 : 0)}% ${translate("invested capital")}.`;
    },
  };
  if (allocationChart) {
    allocationChart.data = chartData;
    allocationChart.options = options;
    allocationChart.update("none");
  } else {
    allocationChart = new window.Chart(canvas, {type: "doughnut", data: chartData, options});
  }
}

function render() {
  renderSummary();
  renderTable();
  renderAllocation();
  window.dispatchEvent(new CustomEvent("portfolio-updated"));
}

function persist() {
  writePortfolio(holdings);
}

function validNumber(value) {
  return Number.isFinite(value) && value > 0;
}

function validQuote(quote) {
  return quote && validNumber(quote.price);
}

function parsePositiveDecimal(value) {
  const text = value.trim();
  if (!/^[+]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(text)) return null;
  const number = Number.parseFloat(text);
  return validNumber(number) ? number : null;
}

async function fetchLatestQuote(symbol) {
  let intradayError;
  try {
    const quote = await api(`/api/psx/quote?symbol=${encodeURIComponent(symbol)}&period=int`);
    if (validQuote(quote)) return quote;
    intradayError = new Error(translate("PSX returned no valid intraday price."));
  } catch (error) {
    intradayError = error;
  }
  try {
    const quote = await api(`/api/psx/quote?symbol=${encodeURIComponent(symbol)}&period=eod`);
    if (validQuote(quote)) return quote;
    throw new Error(translate("PSX returned no valid daily closing price."));
  } catch (error) {
    throw new Error(
      `${translate("Could not fetch a valid PSX price.")} ${translate(error.message || intradayError.message)}`,
      {cause: error},
    );
  }
}

function showPortfolioNotice(message, retry) {
  const notice = document.querySelector("#portfolioNotice");
  notice.replaceChildren(document.createTextNode(message));
  if (retry) {
    const button = document.createElement("button");
    button.type = "button";
    button.id = "retryPriceFetch";
    button.className = "button button-quiet";
    button.textContent = translate("Retry price lookup");
    button.addEventListener("click", retry, {once: true});
    notice.append(" ", button);
  }
  notice.classList.remove("hidden");
}

function clearPortfolioNotice() {
  const notice = document.querySelector("#portfolioNotice");
  notice.replaceChildren();
  notice.classList.add("hidden");
}

async function updatePrices(targetHoldings = holdings) {
  if (!holdings.length) {
    notify("Pehle portfolio mein holding shamil karein.", true);
    return;
  }
  const button = document.querySelector("#updatePrices");
  button.disabled = true;
  button.textContent = translate("Qeematein mangwayi ja rahi hain...");
  const results = await Promise.allSettled(targetHoldings.map(async item => ({
    item,
    quote: await fetchLatestQuote(item.symbol),
  })));
  let updated = 0;
  const failed = [];
  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      const {item, quote} = result.value;
      item.currentPrice = quote.price;
      item.currentUpdatedAt = quote.updatedAt;
      item.currentPricePeriod = quote.pricePeriod || "int";
      item.manualPrice = false;
      updated += 1;
    } else {
      failed.push(targetHoldings[index]);
    }
  });
  persist();
  render();
  button.disabled = false;
  button.textContent = translate("Prices Update Karein");
  if (failed.length) {
    const symbols = failed.map(item => item.symbol).join(", ");
    showPortfolioNotice(
      `${symbols}: ${translate("purani qeemat mehfooz hai.")}`,
      () => updatePrices(failed),
    );
    if (updated) notify(`${updated} ${translate("qeematein taza hui.")}`);
  } else {
    clearPortfolioNotice();
    notify("Tamam holdings ki asal PSX qeematein taza ho gayin.");
  }
}

function addReportText(parent, tag, text, className = "") {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.textContent = text;
  parent.append(element);
  return element;
}

function renderPortfolioReport(report, facts) {
  const output = document.querySelector("#portfolioAnalysis");
  output.replaceChildren();
  output.classList.remove("bad-text");
  const summary = document.createElement("section");
  summary.className = "portfolio-report-summary";
  addReportText(summary, "h3", translate("Portfolio health"));
  addReportText(summary, "p", report.overallAssessment || translate("Portfolio ki maloomat kafi nahi"));
  addReportText(summary, "p", translate("Portfolio health score ke liye verified fundamental data kafi nahi."), "helper-text");
  addReportText(summary, "p", `${translate("Portfolio risk")}: ${translate(report.riskLevel || "Unclear")}`, "risk-badge");
  if (Array.isArray(report.strongestHoldings) && report.strongestHoldings.length) {
    addReportText(summary, "p", `${translate("Strongest holdings")}: ${report.strongestHoldings.join(", ")}`);
  }
  if (Array.isArray(report.weakestHoldings) && report.weakestHoldings.length) {
    addReportText(summary, "p", `${translate("Weakest holdings")}: ${report.weakestHoldings.join(", ")}`);
  }
  output.append(summary);
  const analyses = new Map(
    report.holdings
      .filter(item => item && typeof item.symbol === "string")
      .map(item => [item.symbol.toUpperCase(), item]),
  );
  facts.holdings.forEach(item => {
    const analysis = analyses.get(item.symbol) || {};
    const card = document.createElement("article");
    card.className = "portfolio-stock-card";
    const heading = document.createElement("div");
    heading.className = "portfolio-stock-heading";
    addReportText(heading, "h3", `${item.name} (${item.symbol})`);
    const recommendation = item.fundamentalsComplete && ["BUY", "HOLD", "REDUCE", "SELL", "REVIEW"].includes(analysis.recommendation)
      ? analysis.recommendation
      : "REVIEW";
    const recommendationLabels = {
      BUY: "Khareedne par ghour",
      HOLD: "Barqarar rakhne par ghour",
      REDUCE: "Hissa kam karne par ghour",
      SELL: "Bechne par ghour",
      REVIEW: "Jaiza darkar",
    };
    addReportText(heading, "span", translate(recommendationLabels[recommendation]), `recommendation-badge recommendation-${recommendation.toLowerCase()}`);
    card.append(heading);
    addReportText(card, "p", `${translate("Current price")}: ${item.currentPrice === null ? "—" : formatPrice(item.currentPrice)} · ${item.updatedAt ? formatDate(item.updatedAt) : translate("Unavailable")} · ${translate(item.priceSource)}`);
    addReportText(card, "p", `${translate("Units")}: ${formatNumber(item.quantity, 4)} · ${translate("Average purchase price")}: ${formatPrice(item.averageBuyPrice)} · ${translate("Profit / loss")}: ${item.profitLoss === null ? "—" : formatAmount(item.profitLoss)}`);
    addReportText(card, "p", `${translate("Portfolio weight")}: ${formatNumber(item.portfolioWeightPercent)}% · ${translate("Sector")}: ${item.sector || translate("Unavailable")}`);
    const history = item.historical;
    const historicalPerformance = history.observations > 1 && history.periodChangePercent !== null
      ? `${formatDate(history.start.time)}–${formatDate(history.end.time)} · ${formatNumber(history.periodChangePercent)}%`
      : translate("Insufficient market data");
    const historicalRange = Number.isFinite(history.min) && Number.isFinite(history.max)
      ? `${formatPrice(history.min)}–${formatPrice(history.max)}`
      : translate("Unavailable");
    addReportText(card, "p", `${translate("Historical performance (latest 60 sessions)")}: ${historicalPerformance} · ${translate("Observed range")}: ${historicalRange} · ${translate("Observed volatility")}: ${Number.isFinite(history.dailyVolatilityPercent) ? `${formatNumber(history.dailyVolatilityPercent)}%` : translate("Unavailable")} · ${translate("Latest volume")}: ${Number.isFinite(history.latestVolume) ? formatNumber(history.latestVolume, 0) : translate("Unavailable")}`);
    addReportText(card, "p", `${translate("Fundamentals")}: ${translate("Fundamental data dastiyab nahi")}.`);
    addReportText(card, "p", `${translate("Market performance")}: ${analysis.marketAssessment || translate("Insufficient market data")}`);
    addReportText(card, "p", `${translate("Company news")}: ${item.companyNews.length ? analysis.newsImpact || translate("News impact needs review") : translate("No company-specific news found in fetched articles.")}`);
    addReportText(card, "p", `${translate("Concentration impact")}: ${analysis.concentrationImpact || `${formatNumber(item.portfolioWeightPercent)}% ${translate("of invested capital")}`}`);
    addReportText(card, "p", `${translate("Reasoning")}: ${analysis.reason || translate("Portfolio ki maloomat kafi nahi")}`);
    addReportText(card, "p", `${translate("What could change this view")}: ${analysis.whatCouldChange || translate("Updated financial statements and company-specific news.")}`);
    output.append(card);
  });
  if (Array.isArray(report.concerns) && report.concerns.length) {
    addReportText(output, "h3", translate("Key concerns"));
    report.concerns.forEach(text => addReportText(output, "p", text, "report-list-item"));
  }
  if (Array.isArray(report.improvements) && report.improvements.length) {
    addReportText(output, "h3", translate("Possible improvements"));
    report.improvements.forEach(text => addReportText(output, "p", text, "report-list-item"));
  }
}

async function analyzePortfolio() {
  if (!holdings.length) {
    notify("Jaize se pehle portfolio mein holdings shamil karein.", true);
    return;
  }
  const output = document.querySelector("#portfolioAnalysis");
  const button = document.querySelector("#analyzePortfolio");
  output.textContent = translate("AI portfolio ka jaiza tayyar ho raha hai...");
  output.classList.remove("bad-text");
  button.disabled = true;
  try {
    const {report, facts, updated} = await analyzePortfolioData(holdings);
    if (updated) {
      persist();
      render();
    }
    renderPortfolioReport(report, facts);
  } catch (error) {
    output.textContent = translate(error.message);
    output.classList.add("bad-text");
  } finally {
    button.disabled = false;
  }
}

export function initPortfolio() {
  holdings = readPortfolio().map(item => ({
    ...item,
    symbol: item.symbol.toUpperCase(),
    quantity: Number(item.quantity),
    buyPrice: Number(item.buyPrice),
    currentPrice: Number.isFinite(Number(item.currentPrice)) ? Number(item.currentPrice) : null,
    manualPrice: Boolean(item.manualPrice),
  }));
  const form = document.querySelector("#holdingForm");
  const addButton = form.querySelector('button[type="submit"]');
  let addingHolding = false;
  async function addHolding() {
    if (addingHolding) return;
    const symbol = document.querySelector("#holdingSymbol").value.trim().toUpperCase();
    const quantityInput = document.querySelector("#holdingQuantity").value.trim();
    const quantity = parsePositiveDecimal(quantityInput);
    const buyPrice = parsePositiveDecimal(document.querySelector("#holdingBuyPrice").value);
    if (!/^[A-Z0-9][A-Z0-9.-]{0,19}$/.test(symbol) || quantity === null || buyPrice === null) {
      notify("Symbol, units aur qeemat durust darj karein.", true);
      return;
    }

    addingHolding = true;
    addButton.disabled = true;
    showPortfolioNotice(translate("Fetching latest PSX price..."));
    try {
      const quote = await fetchLatestQuote(symbol);
      holdings.push({
        symbol,
        quantity,
        quantityInput,
        buyPrice,
        currentPrice: quote.price,
        currentUpdatedAt: quote.updatedAt,
        currentPricePeriod: quote.pricePeriod || "int",
        manualPrice: false,
      });
      persist();
      render();
      form.reset();
      clearPortfolioNotice();
      notify("Holding portfolio mein shamil ho gayi.");
    } catch (error) {
      showPortfolioNotice(
        `${error.message} ${translate("No holding was added. Check the symbol or retry.")}`,
        () => addHolding(),
      );
    } finally {
      addingHolding = false;
      addButton.disabled = false;
    }
  }

  form.addEventListener("submit", event => {
    event.preventDefault();
    addHolding();
  });
  document.querySelector("#updatePrices").addEventListener("click", () => updatePrices());
  document.querySelector("#analyzePortfolio").addEventListener("click", analyzePortfolio);
  window.addEventListener("language-changed", () => {
    render();
    if (allocationChart) {
      allocationChart.options.plugins.legend.rtl = language() === "ur";
      allocationChart.update("none");
    }
    if (document.querySelector("#portfolioAnalysis").childElementCount && holdings.length) {
      analyzePortfolio();
    }
  });
  render();
}
