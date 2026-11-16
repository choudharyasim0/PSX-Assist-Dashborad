import {language, locale, translate} from "./i18n.js";

let toastTimer;

export async function api(path, options = {}) {
  let response;
  try {
    response = await fetch(path, options);
  } catch {
    throw new Error(translate("Server se rabta nahi ho saka. Dobara koshish karein."));
  }
  const body = await response.text();
  let data;
  try {
    data = body ? JSON.parse(body) : {};
  } catch {
    data = {error: "Server ka jawab samajh nahi aaya."};
  }
  if (!response.ok) {
    throw new Error(typeof data.error === "string"
      ? translate(data.error)
      : `${translate("Request failed")} (${response.status}).`);
  }
  return data;
}

export function notify(message, error = false) {
  const toast = document.querySelector("#toast");
  toast.textContent = translate(message);
  toast.classList.toggle("error", error);
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 4200);
}

export function formatPrice(value, decimals = 2) {
  if (!Number.isFinite(Number(value))) return "—";
  return `Rs. ${Number(value).toLocaleString(locale(), {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

export function formatNumber(value, decimals = 2) {
  if (!Number.isFinite(Number(value))) return "—";
  return Number(value).toLocaleString(locale(), {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatDate(value, options = {}) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "—";
  const datePart = date.toLocaleDateString(locale(), {day: "2-digit", month: "short", year: "numeric"});
  const timePart = date.toLocaleTimeString(locale(), {hour: "2-digit", minute: "2-digit", ...options});
  return `${datePart} ${timePart}`;
}

export function requestJson(path, data) {
  return api(path, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({...data, language: language()}),
  });
}

export function readPortfolio() {
  try {
    const raw = localStorage.getItem("psx-assist-portfolio");
    const rows = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(rows)) throw new TypeError("Portfolio format");
    return rows.filter(item =>
      item && typeof item.symbol === "string"
      && Number.isFinite(Number(item.quantity)) && Number(item.quantity) > 0
      && Number.isFinite(Number(item.buyPrice)) && Number(item.buyPrice) > 0
    );
  } catch {
    notify("Browser mein portfolio nahi parha ja saka. Storage settings jaanchein.", true);
    return [];
  }
}

export function writePortfolio(items) {
  try {
    localStorage.setItem("psx-assist-portfolio", JSON.stringify(items));
    return true;
  } catch {
    notify("Portfolio save nahi hua. Browser ki storage jagah jaanchein.", true);
    return false;
  }
}

export function setText(selector, value) {
  const element = document.querySelector(selector);
  if (element) element.textContent = value;
}
