import {requestJson} from "./common.js";
import {language, translate} from "./i18n.js";

const MAX_EXPLANATION_CHARS = 12_000;
const SCANNED_MESSAGE = "Is PDF mein readable text nahi mila. Barah-e-karam document ka text yahan paste karein.";

function updateCount() {
  const input = document.querySelector("#documentInput");
  document.querySelector("#documentCount").textContent = `${Math.min(input.value.length, MAX_EXPLANATION_CHARS).toLocaleString()} / 12,000 ${translate("haroof")}`;
}

async function extractPdf(file) {
  const status = document.querySelector("#pdfStatus");
  if (!file) return;
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    status.textContent = translate("Meherbani karke PDF file chunein.");
    return;
  }
  if (file.size > 15 * 1024 * 1024) {
    status.textContent = translate("PDF 15 MB se chhoti honi chahiye.");
    return;
  }
  if (!window.pdfjsLib) {
    status.textContent = translate("PDF reader load nahi hua. Internet rabta jaanchein.");
    return;
  }
  status.textContent = translate("PDF ke pehle 15 safhe parha ja rahe hain...");
  try {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    const bytes = await file.arrayBuffer();
    const documentPdf = await window.pdfjsLib.getDocument({data: bytes}).promise;
    const pages = Math.min(documentPdf.numPages, 15);
    const chunks = [];
    for (let pageNumber = 1; pageNumber <= pages; pageNumber += 1) {
      const page = await documentPdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const text = content.items.map(item => typeof item.str === "string" ? item.str : "").join(" ");
      if (text.trim()) chunks.push(text);
      if (chunks.join("\n").length >= MAX_EXPLANATION_CHARS) break;
    }
    const extracted = chunks.join("\n\n").trim().slice(0, MAX_EXPLANATION_CHARS);
    if (!extracted) {
      status.textContent = translate(SCANNED_MESSAGE);
      return;
    }
    document.querySelector("#documentInput").value = extracted;
    updateCount();
    status.textContent = `${pages} ${translate("safhon tak text nikala gaya")}${documentPdf.numPages > 15 ? `; ${translate("mazeed safhe nahi parhe gaye.")}` : "."}`;
  } catch {
    status.textContent = translate("PDF parhi nahi ja saki. File check karein ya text neeche paste karein.");
  }
}

async function explainDocument() {
  const input = document.querySelector("#documentInput");
  const output = document.querySelector("#documentAnalysis");
  const text = input.value.trim().slice(0, MAX_EXPLANATION_CHARS);
  if (!text) {
    output.textContent = translate("Pehle document ka text paste karein ya readable PDF upload karein.");
    return;
  }
  output.textContent = translate("Document ka jaiza tayyar ho raha hai...");
  const prompts = {
    roman: 'Neeche diye gaye document ko simple Roman Urdu mein samjhaein. Sirf document ke facts use karein. In headings ko is order mein dein: "Yeh document kis bare mein hai?", "Aham mali numbers", "Portfolio par mumkin asar", "Munafa/nuqsan ki surat", "Ehtiyat ki baatein", "Mushkil istilahon ke asan maani". Ghair mojood maloomat ko ghair mojood kahein.',
    en: 'Explain the document in clear English using only facts in the document. Use these headings in order: "What is this document about?", "Important financial numbers", "Possible impact on my portfolio", "Profit/loss or financial position", "Points requiring caution", "Plain-language financial terms". Explicitly mark information not present in the document as unavailable.',
    ur: 'اس دستاویز کی وضاحت سادہ اردو میں کریں اور صرف دستاویز کے حقائق استعمال کریں۔ یہ عنوانات اسی ترتیب سے دیں: "یہ دستاویز کس بارے میں ہے؟"، "اہم مالی اعداد و شمار"، "میرے پورٹ فولیو پر ممکنہ اثر"، "منافع/نقصان یا مالی صورتحال"، "احتیاط کے نکات"، "مشکل مالی اصطلاحات کے آسان معنی"۔ جو معلومات دستاویز میں موجود نہ ہوں انہیں واضح طور پر غیر دستیاب کہیں۔',
  };
  const prompt = `${prompts[language()]}\n\nDocument:\n${text}`;
  try {
    const result = await requestJson("/api/ai", {prompt});
    output.textContent = result.text;
  } catch (error) {
    output.textContent = translate(error.message);
    output.classList.add("bad-text");
  }
}

export function initDocuments() {
  document.querySelector("#pdfFile").addEventListener("change", event => extractPdf(event.target.files?.[0]));
  document.querySelector("#documentInput").addEventListener("input", updateCount);
  document.querySelector("#explainDocument").addEventListener("click", explainDocument);
  window.addEventListener("language-changed", () => {
    updateCount();
    if (document.querySelector("#documentAnalysis").textContent.trim()) explainDocument();
  });
  updateCount();
}
