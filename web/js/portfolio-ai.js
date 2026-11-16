import {api, requestJson} from "./common.js";

function isPrice(value) {
  return Number.isFinite(value) && value > 0;
}

function statsFor(series) {
  const rows = Array.isArray(series) ? series.filter(row => Number.isFinite(row.price)).slice(-60) : [];
  const prices = rows.map(row => row.price);
  const changes = prices.slice(1).map((price, index) => (price - prices[index]) / prices[index] * 100).filter(Number.isFinite);
  const mean = changes.length ? changes.reduce((sum, value) => sum + value, 0) / changes.length : null;
  return {
    observations: rows.length,
    start: rows[0] || null,
    end: rows.at(-1) || null,
    periodChangePercent: rows.length > 1 && rows[0].price
      ? (rows.at(-1).price - rows[0].price) / rows[0].price * 100
      : null,
    min: prices.length ? Math.min(...prices) : null,
    max: prices.length ? Math.max(...prices) : null,
    dailyVolatilityPercent: changes.length > 1
      ? Math.sqrt(changes.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (changes.length - 1))
      : null,
    latestVolume: rows.at(-1)?.volume ?? null,
  };
}

function matchesArticle(article, symbol, company) {
  const text = `${article.title || ""} ${article.description || ""}`;
  const escaped = symbol.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i").test(text)
    || (company.length > 3 && text.toLocaleLowerCase().includes(company.toLocaleLowerCase()));
}

function symbolInfo(symbol) {
  const option = [...document.querySelectorAll("#stockOptions option")].find(item => item.value === symbol);
  return {name: option?.label || symbol, sector: option?.dataset.sector || null};
}

export async function analyzePortfolio(holdings) {
  const results = await Promise.all(holdings.map(async holding => {
    const [quote, history] = await Promise.allSettled([
      api(`/api/psx/quote?symbol=${encodeURIComponent(holding.symbol)}`),
      api(`/api/psx/series?symbol=${encodeURIComponent(holding.symbol)}&period=eod`),
    ]);
    return {holding, quote, history};
  }));
  const symbolsResponse = await api("/api/psx/symbols").catch(() => ({items: []}));
  const symbols = new Map((symbolsResponse.items || []).map(item => [item.symbol, item]));
  let articles = [];
  let newsUnavailable = false;
  try {
    const newsResponse = await api("/api/news");
    articles = Array.isArray(newsResponse.articles) ? newsResponse.articles : [];
  } catch {
    newsUnavailable = true;
  }

  const totalInvested = holdings.reduce((sum, item) => sum + item.quantity * item.buyPrice, 0);
  let updated = false;
  results.forEach(({holding, quote}) => {
    if (quote.status === "fulfilled" && isPrice(quote.value.price)) {
      holding.currentPrice = quote.value.price;
      holding.currentUpdatedAt = quote.value.updatedAt;
      holding.currentPricePeriod = quote.value.pricePeriod || "int";
      holding.manualPrice = false;
      updated = true;
    }
  });
  const allCurrentPricesKnown = holdings.every(item => isPrice(item.currentPrice));
  const knownCurrentValue = holdings.reduce(
    (sum, item) => sum + (isPrice(item.currentPrice) ? item.quantity * item.currentPrice : 0),
    0,
  );
  const sectors = {};
  const reportHoldings = results.map(({holding, quote, history}) => {
    const official = symbols.get(holding.symbol) || symbolInfo(holding.symbol);
    const company = official.name || holding.symbol;
    const sector = official.sector || null;
    const investedAmount = holding.quantity * holding.buyPrice;
    if (sector) sectors[sector] = (sectors[sector] || 0) + investedAmount;
    const news = articles.filter(article => matchesArticle(article, holding.symbol, company));
    const currentPrice = isPrice(holding.currentPrice) ? Number(holding.currentPrice) : null;
    const latestQuote = quote.status === "fulfilled" && isPrice(quote.value.price) ? quote.value : null;
    const storedPriceSource = holding.manualPrice
      ? "User-entered price"
      : holding.currentPricePeriod === "eod"
        ? "Daily close"
        : holding.currentPricePeriod === "int"
          ? "Intraday price"
          : holding.currentUpdatedAt ? "Previously saved PSX quote" : "Unavailable";
    return {
      symbol: holding.symbol,
      name: company,
      sector,
      quantity: holding.quantity,
      averageBuyPrice: holding.buyPrice,
      currentPrice,
      updatedAt: latestQuote?.updatedAt || (typeof holding.currentUpdatedAt === "number" ? holding.currentUpdatedAt : null),
      priceSource: latestQuote
        ? latestQuote.pricePeriod === "eod" ? "Daily close" : "Intraday price"
        : storedPriceSource,
      investedAmount,
      currentValue: currentPrice === null ? null : holding.quantity * currentPrice,
      profitLoss: currentPrice === null ? null : holding.quantity * (currentPrice - holding.buyPrice),
      portfolioWeightPercent: totalInvested ? investedAmount / totalInvested * 100 : 0,
      historical: statsFor(history.status === "fulfilled" ? history.value.series : []),
      companyNews: news,
      fundamentals: {
        available: false,
        revenueGrowth: null,
        profitGrowth: null,
        eps: null,
        pe: null,
        pb: null,
        dividendYield: null,
        debt: null,
        cashFlow: null,
        financialStability: null,
      },
      fundamentalsComplete: false,
    };
  });
  const facts = {
    holdings: reportHoldings,
    totalInvested,
    currentPortfolioValue: allCurrentPricesKnown ? knownCurrentValue : null,
    knownPartialCurrentValue: knownCurrentValue,
    profitLoss: allCurrentPricesKnown ? knownCurrentValue - totalInvested : null,
    returnPercent: allCurrentPricesKnown && totalInvested
      ? (knownCurrentValue - totalInvested) / totalInvested * 100
      : null,
    currentValuesComplete: allCurrentPricesKnown,
    sectorWeights: sectors,
    maxSectorWeightPercent: Object.keys(sectors).length && totalInvested
      ? Math.max(...Object.values(sectors)) / totalInvested * 100
      : null,
    fundamentalDataSource: "Unavailable: no verified company-fundamentals source is connected.",
    fundamentalsComplete: false,
    newsUnavailable,
  };
  const prompt = `Analyze this PSX portfolio using only the supplied facts and data. Do not browse or infer missing financial facts.
For every holding assess its verified price and timestamp, units, average cost, profit/loss, historical performance sample, observed volatility, available trading volume, portfolio weight, sector concentration, and only directly matching company news. Do not call generic PSX news company-specific.
All fundamentals are explicitly unavailable: do not invent revenue, earnings, EPS, P/E, P/B, dividends, debt, cash flow, valuation, financial health, support/resistance, or targets. Mark all unavailable. Because fundamentals are missing, use REVIEW for each holding; do not emit BUY, HOLD, REDUCE or SELL. Explain what data would be needed to change that view.
Return one JSON object with these fields: overallAssessment, riskLevel (Low Risk|Moderate Risk|High Risk|Unclear), healthScore (must be null because fundamentals are missing), strongestHoldings, weakestHoldings, concerns (array), improvements (array), and holdings (array of objects with symbol, recommendation, riskLevel, marketAssessment, newsImpact, concentrationImpact, reason, whatCouldChange). Provide conditional suggestions on adding units, reducing concentration, valuation checks and downside risks, without inventing target prices or guaranteeing returns. Explain the insufficiency of sector coverage if sector data is absent. Respond in the selected application language, but keep symbols and recommendation enum values unchanged.
Portfolio facts: ${JSON.stringify(facts)}`;
  const response = await requestJson("/api/ai", {prompt, json: true});
  let report;
  try {
    report = JSON.parse(response.text);
  } catch (error) {
    throw new Error("AI portfolio report JSON is invalid.", {cause: error});
  }
  if (!report || typeof report !== "object" || !Array.isArray(report.holdings)) {
    throw new Error("AI portfolio report format is invalid.");
  }
  return {report, facts, updated};
}
