const LANGUAGE_KEY = "psx-assist-language";
const LANGUAGES = ["roman", "en", "ur"];
const DICTIONARY = {
  "PSX Assist Dashboard": ["PSX Assist Dashboard", "PSX Assist Dashboard", "PSX Assist Dashboard"],
  "Pakistan Stock Exchange ka smart assistant": ["Pakistan Stock Exchange ka smart assistant", "Pakistan Stock Exchange smart assistant", "پاکستان اسٹاک ایکسچینج کا اسمارٹ معاون"],
  "Server se rabta ho raha hai": ["Server se rabta ho raha hai", "Connecting to server", "سرور سے رابطہ ہو رہا ہے"],
  "Aaj ka bazaar": ["Aaj ka bazaar", "Today's market", "آج کی مارکیٹ"],
  "BAZAAR KA KHALASA": ["BAZAAR KA KHALASA", "MARKET OVERVIEW", "مارکیٹ کا خلاصہ"],
  "Pakistan Stock Exchange ki taza surat-e-haal": ["Pakistan Stock Exchange ki taza surat-e-haal", "Latest Pakistan Stock Exchange overview", "پاکستان اسٹاک ایکسچینج کی تازہ صورتحال"],
  "Asal data ka intezar hai": ["Asal data ka intezar hai", "Waiting for verified data", "مصدقہ ڈیٹا کا انتظار"],
  "Share talash": ["Share talash", "Stock search", "شیئر تلاش"],
  "Share talash karein": ["Share talash karein", "Search for a stock", "شیئر تلاش کریں"],
  "PSX KA ASAL DATA": ["PSX KA ASAL DATA", "VERIFIED PSX DATA", "مصدقہ پی ایس ایکس ڈیٹا"],
  "Share ka naam ya symbol": ["Share ka naam ya symbol", "Company name or symbol", "شیئر کا نام یا علامت"],
  "Misal: OGDC ya company ka naam": ["Misal: OGDC ya company ka naam", "Example: OGDC or a company name", "مثال: OGDC یا کمپنی کا نام"],
  "Misal: OGDC": ["Misal: OGDC", "Example: OGDC", "مثال: OGDC"],
  "Talash": ["Talash", "Search", "تلاش"],
  "Share ki list aa rahi hai...": ["Share ki list aa rahi hai...", "Loading stock list...", "شیئرز کی فہرست لوڈ ہو رہی ہے..."],
  "CHUNA HUA SHARE": ["CHUNA HUA SHARE", "SELECTED STOCK", "منتخب شیئر"],
  "Koi share chunein": ["Koi share chunein", "Select a stock", "کوئی شیئر منتخب کریں"],
  "PSX symbol": ["PSX symbol", "PSX symbol", "پی ایس ایکس علامت"],
  "Data dastiyab nahi": ["Data dastiyab nahi", "Data unavailable", "ڈیٹا دستیاب نہیں"],
  "Asal quote milne par yahan nazar aayega": ["Asal quote milne par yahan nazar aayega", "Verified quote will appear here", "مصدقہ قیمت یہاں دکھائی جائے گی"],
  "Aakhri update": ["Aakhri update", "Last updated", "آخری تازہ کاری"],
  "Din ki bulandi": ["Din ki bulandi", "Day high", "دن کی بلند ترین قیمت"],
  "Din ki kami": ["Din ki kami", "Day low", "دن کی کم ترین قیمت"],
  "Volume": ["Volume", "Trading volume", "تجارتی حجم"],
  "Qeemat ka chart": ["Qeemat ka chart", "Price chart", "قیمت کا چارٹ"],
  "Data ka intezar hai": ["Data ka intezar hai", "Waiting for data", "ڈیٹا کا انتظار"],
  "Chart ka waqt": ["Chart ka waqt", "Chart period", "چارٹ کا دورانیہ"],
  "Aaj ka": ["Aaj ka", "Intraday", "آج"],
  "Roz ka": ["Roz ka", "Daily", "روزانہ"],
  "Share ki qeemat ka chart": ["Share ki qeemat ka chart", "Stock price chart", "شیئر کی قیمت کا چارٹ"],
  "Chart data milne par yahan dikhaya jayega.": ["Chart data milne par yahan dikhaya jayega.", "Chart data will appear here when available.", "چارٹ ڈیٹا دستیاب ہونے پر یہاں دکھایا جائے گا۔"],
  "Qeemat taza karein": ["Qeemat taza karein", "Refresh price", "قیمت تازہ کریں"],
  "Chart tabhi taza hoga jab yeh page khula ho.": ["Chart tabhi taza hoga jab yeh page khula ho.", "The chart refreshes while this page is open.", "یہ صفحہ کھلا ہونے پر چارٹ تازہ ہوتا ہے۔"],
  "Aap ka portfolio": ["Aap ka portfolio", "Your portfolio", "میرا پورٹ فولیو"],
  "Portfolio khulasa": ["Portfolio khulasa", "Portfolio summary", "پورٹ فولیو کا خلاصہ"],
  "Tafseel": ["Tafseel", "Details", "تفصیل"],
  "Lagayi hui raqam": ["Lagayi hui raqam", "Invested amount", "لگائی گئی رقم"],
  "Abhi ki qeemat": ["Abhi ki qeemat", "Current value", "موجودہ قیمت"],
  "Munafa / nuqsan": ["Munafa / nuqsan", "Profit / loss", "منافع / نقصان"],
  "Holdings": ["Holdings", "Holdings", "ہولڈنگز"],
  "return": ["return", "return", "منافع"],
  "Portfolio ki taqseem": ["Portfolio ki taqseem", "Portfolio allocation", "پورٹ فولیو کی تقسیم"],
  "Abhi holdings nahi hain.": ["Abhi holdings nahi hain.", "There are no holdings yet.", "ابھی کوئی ہولڈنگ نہیں ہے۔"],
  "KHABRON KA AI JAIZA": ["KHABRON KA AI JAIZA", "AI NEWS ANALYSIS", "خبروں کا مصنوعی ذہانت سے تجزیہ"],
  "Bazaar ki khabrain": ["Bazaar ki khabrain", "Market news", "مارکیٹ کی خبریں"],
  "GNews se taza khabrain aur AI ka ehtiyati jaiza": ["GNews se taza khabrain aur AI ka ehtiyati jaiza", "Latest GNews articles and cautious AI analysis", "GNews کی تازہ خبریں اور محتاط AI تجزیہ"],
  "Taza khabrain laayein": ["Taza khabrain laayein", "Load latest news", "تازہ خبریں لائیں"],
  "Kisi share se mutaliq khabar dekhein": ["Kisi share se mutaliq khabar dekhein", "Filter news for a stock", "کسی شیئر سے متعلق خبر دیکھیں"],
  "Symbol ya company ka naam": ["Symbol ya company ka naam", "Symbol or company name", "علامت یا کمپنی کا نام"],
  "Filter": ["Filter", "Filter", "فلٹر"],
  "Filter hataein": ["Filter hataein", "Clear filter", "فلٹر ہٹائیں"],
  "News API se asal khabrain mangwayein.": ["News API se asal khabrain mangwayein.", "Load verified articles from the news service.", "نیوز سروس سے مستند خبریں لائیں۔"],
  "PORTFOLIO MANAGEMENT": ["PORTFOLIO MANAGEMENT", "PORTFOLIO MANAGEMENT", "پورٹ فولیو مینجمنٹ"],
  "Holdings aap ke browser mein rehti hain; API keys yahan save nahi hotin.": ["Holdings aap ke browser mein rehti hain; API keys yahan save nahi hotin.", "Your holdings stay in this browser; API keys are never stored here.", "آپ کی ہولڈنگز اسی براؤزر میں محفوظ رہتی ہیں؛ API کیز یہاں محفوظ نہیں ہوتیں۔"],
  "Prices Update Karein": ["Prices Update Karein", "Refresh prices", "قیمتیں تازہ کریں"],
  "Abhi ki portfolio qeemat": ["Abhi ki portfolio qeemat", "Current portfolio value", "پورٹ فولیو کی موجودہ قیمت"],
  "Kul munafa / nuqsan": ["Kul munafa / nuqsan", "Total profit / loss", "کل منافع / نقصان"],
  "Taza qeemat darkar hai": ["Taza qeemat darkar hai", "Current prices required", "تازہ قیمتیں درکار ہیں"],
  "Holdings ki tadaad": ["Holdings ki tadaad", "Number of holdings", "ہولڈنگز کی تعداد"],
  "Shares shamil karein": ["Shares shamil karein", "Add holdings", "شیئرز شامل کریں"],
  "Symbol": ["Symbol", "Symbol", "علامت"],
  "Units": ["Units", "Units", "یونٹس"],
  "Ausat khareed qeemat": ["Ausat khareed qeemat", "Average purchase price", "اوسط خرید قیمت"],
  "Abhi ki qeemat (ikhtiyari)": ["Abhi ki qeemat (ikhtiyari)", "Current price (optional)", "موجودہ قیمت (اختیاری)"],
  "Khali chhor sakte hain": ["Khali chhor sakte hain", "Leave blank if unknown", "معلوم نہ ہو تو خالی چھوڑیں"],
  "Holding shamil karein": ["Holding shamil karein", "Add holding", "ہولڈنگ شامل کریں"],
  "PORTFOLIO KI TAQSEEM": ["PORTFOLIO KI TAQSEEM", "PORTFOLIO ALLOCATION", "پورٹ فولیو کی تقسیم"],
  "Taqseem dikhane ke liye holdings shamil karein.": ["Taqseem dikhane ke liye holdings shamil karein.", "Add holdings to view allocation.", "تقسیم دیکھنے کے لیے ہولڈنگز شامل کریں۔"],
  "Chart ke kisi hisse par tap karein.": ["Chart ke kisi hisse par tap karein.", "Select a chart segment for details.", "تفصیل کے لیے چارٹ کے حصے کو منتخب کریں۔"],
  "HISAAB": ["HISAAB", "PORTFOLIO", "حساب"],
  "Aap ki holdings": ["Aap ki holdings", "Your holdings", "آپ کی ہولڈنگز"],
  "Symbol / company": ["Symbol / company", "Symbol / company", "علامت / کمپنی"],
  "Ausat qeemat": ["Ausat qeemat", "Average price", "اوسط قیمت"],
  "Abhi ki value": ["Abhi ki value", "Current value", "موجودہ قدر"],
  "Abhi koi holding shamil nahi ki gayi.": ["Abhi koi holding shamil nahi ki gayi.", "No holdings have been added.", "ابھی کوئی ہولڈنگ شامل نہیں کی گئی۔"],
  "AI PORTFOLIO SAATHI": ["AI PORTFOLIO SAATHI", "AI PORTFOLIO ASSISTANT", "AI پورٹ فولیو معاون"],
  "Portfolio ka ehtiyati jaiza": ["Portfolio ka ehtiyati jaiza", "Portfolio analysis", "پورٹ فولیو کا محتاط تجزیہ"],
  "AI sirf aap ke diye gaye hisaab ko dekhega. Yeh signal ya guaranteed prediction nahi hai.": ["AI sirf aap ke diye gaye hisaab ko dekhega. Yeh signal ya guaranteed prediction nahi hai.", "AI uses only the information you provide. This is not a trading signal or guaranteed prediction.", "AI صرف آپ کی فراہم کردہ معلومات استعمال کرتا ہے۔ یہ ٹریڈنگ سگنل یا یقینی پیش گوئی نہیں۔"],
  "AI Se Portfolio Ka Jaiza Lein": ["AI Se Portfolio Ka Jaiza Lein", "Analyze portfolio with AI", "AI سے پورٹ فولیو کا تجزیہ کروائیں"],
  "DOCUMENT KI WAZAHAT": ["DOCUMENT KI WAZAHAT", "DOCUMENT EXPLAINER", "دستاویز کی وضاحت"],
  "Document samjhein": ["Document samjhein", "Understand a document", "دستاویز سمجھیں"],
  "Broker statement, financial report ya market summary ka Roman Urdu khulasa": ["Broker statement, financial report ya market summary ka Roman Urdu khulasa", "A plain-language summary of a broker statement, financial report or market summary", "بروکر اسٹیٹمنٹ، مالی رپورٹ یا مارکیٹ خلاصے کی آسان وضاحت"],
  "PDF file upload karein": ["PDF file upload karein", "Upload a PDF", "PDF فائل اپ لوڈ کریں"],
  "Sirf pehle 15 safhon ka text nikala jayega.": ["Sirf pehle 15 safhon ka text nikala jayega.", "Text is extracted from the first 15 pages only.", "صرف پہلے 15 صفحات سے متن حاصل کیا جائے گا۔"],
  "Agar PDF scanned ho to us ka text neeche paste karein.": ["Agar PDF scanned ho to us ka text neeche paste karein.", "If the PDF is scanned, paste its text below.", "اگر PDF اسکین شدہ ہے تو اس کا متن نیچے پیسٹ کریں۔"],
  "Document ka text": ["Document ka text", "Document text", "دستاویز کا متن"],
  "Yahan document ka text paste karein...": ["Yahan document ka text paste karein...", "Paste document text here...", "دستاویز کا متن یہاں پیسٹ کریں..."],
  "Roman Urdu mein samjhaein": ["Roman Urdu mein samjhaein", "Explain in English", "اردو میں وضاحت کریں"],
  "APP KI SETTING": ["APP KI SETTING", "APP SETTINGS", "ایپ کی ترتیبات"],
  "App ki maloomat": ["App ki maloomat", "App information", "ایپ کی معلومات"],
  "Configuration status — koi API key browser mein nahi dikhayi jati.": ["Configuration status — koi API key browser mein nahi dikhayi jati.", "Configuration status — API keys are never shown in the browser.", "ترتیب کی حالت — API کیز براؤزر میں نہیں دکھائی جاتیں۔"],
  "Dobara jaanchein": ["Dobara jaanchein", "Check again", "دوبارہ جانچیں"],
  "APP": ["APP", "APP", "ایپ"],
  "Version": ["Version", "Version", "ورژن"],
  "Backend": ["Backend", "Backend", "بیک اینڈ"],
  "PSX data": ["PSX data", "PSX data", "PSX ڈیٹا"],
  "GNews": ["GNews", "GNews", "GNews"],
  "AI KI KHUDMAT": ["AI KI KHUDMAT", "AI SERVICES", "AI خدمات"],
  "Server ki setting": ["Server ki setting", "Server configuration", "سرور کی ترتیبات"],
  "Gemini API": ["Gemini API", "Gemini API", "Gemini API"],
  "Groq API": ["Groq API", "Groq API", "Groq API"],
  "GNews API": ["GNews API", "GNews API", "GNews API"],
  "API keys server ke environment ya deployment Secrets mein rakhi jati hain.": ["API keys server ke environment ya deployment Secrets mein rakhi jati hain.", "API keys are kept in server environment variables or deployment secrets.", "API کیز سرور کے ماحول یا ڈیپلائمنٹ سیکرٹس میں رکھی جاتی ہیں۔"],
  "Zaban": ["Zaban", "Language", "زبان"],
  "Roman Urdu": ["Roman Urdu", "English", "رومن اردو"],
  "English": ["English", "English", "انگریزی"],
  "Urdu": ["Urdu", "Urdu", "اردو"],
  "Hugging Face Spaces": ["Hugging Face Spaces", "Hugging Face Spaces", "Hugging Face Spaces"],
  "Space ki temporary disk par .env ki tabdeeliyan mehfooz nahi rehtin. Keys ko Space Settings ke Secrets mein set karein.": ["Space ki temporary disk par .env ki tabdeeliyan mehfooz nahi rehtin. Keys ko Space Settings ke Secrets mein set karein.", "Changes to .env on a Space's temporary disk do not persist. Set keys in Space Settings secrets.", "Space کی عارضی ڈسک پر .env کی تبدیلیاں محفوظ نہیں رہتیں۔ کیز کو Space Settings کے Secrets میں رکھیں۔"],
  "Dashboard ke tabs": ["Dashboard ke tabs", "Dashboard navigation", "ڈیش بورڈ نیویگیشن"],
  "Market": ["Market", "Market", "مارکیٹ"],
  "Khabrain": ["Khabrain", "News", "خبریں"],
  "Portfolio": ["Portfolio", "Portfolio", "پورٹ فولیو"],
  "Documents": ["Documents", "Documents", "دستاویزات"],
  "Settings": ["Settings", "Settings", "ترتیبات"],
  "Server chal raha hai": ["Server chal raha hai", "Server is running", "سرور چل رہا ہے"],
  "Asal data dastiyab nahi": ["Asal data dastiyab nahi", "Verified data unavailable", "مصدقہ ڈیٹا دستیاب نہیں"],
  "PSX live data dastiyab nahi": ["PSX live data dastiyab nahi", "PSX live data unavailable", "PSX کا لائیو ڈیٹا دستیاب نہیں"],
  "Asal quote milne ka intezar hai": ["Asal quote milne ka intezar hai", "Waiting for a verified quote", "مصدقہ قیمت کا انتظار"],
  "PSX se rabta...": ["PSX se rabta...", "Connecting to PSX...", "PSX سے رابطہ ہو رہا ہے..."],
  "Data load ho raha hai...": ["Data load ho raha hai...", "Loading data...", "ڈیٹا لوڈ ہو رہا ہے..."],
  "Chart data dastiyab nahi": ["Chart data dastiyab nahi", "Chart data unavailable", "چارٹ ڈیٹا دستیاب نہیں"],
  "Aaj ka asal data": ["Aaj ka asal data", "Today's verified data", "آج کا مصدقہ ڈیٹا"],
  "Rozana asal data • aakhri 180 din": ["Rozana asal data • aakhri 180 din", "Daily verified data • latest 180 days", "روزانہ مصدقہ ڈیٹا • تازہ ترین 180 دن"],
  "Taza data": ["Taza data", "Latest data", "تازہ ترین ڈیٹا"],
  "Market Closed": ["Market band", "Market closed", "مارکیٹ بند"],
  "Delayed": ["Dair se milne wala data", "Delayed", "تاخیر سے موصول ڈیٹا"],
  "Live": ["Live", "Live", "براہ راست"],
  "Unavailable": ["Dastiyab nahi", "Unavailable", "دستیاب نہیں"],
  "Taza khabrein load ho rahi hain...": ["Taza khabrein load ho rahi hain...", "Loading latest news...", "تازہ خبریں لوڈ ہو رہی ہیں..."],
  "AI khabron ka ehtiyati jaiza kar raha hai...": ["AI khabron ka ehtiyati jaiza kar raha hai...", "AI is cautiously analyzing the news...", "AI خبروں کا محتاط تجزیہ کر رہا ہے..."],
  "AI portfolio ka jaiza tayyar ho raha hai...": ["AI portfolio ka jaiza tayyar ho raha hai...", "Preparing AI portfolio analysis...", "AI پورٹ فولیو کا تجزیہ تیار کر رہا ہے..."],
  "Portfolio ki maloomat kafi nahi": ["Portfolio ki maloomat kafi nahi", "Insufficient portfolio information", "پورٹ فولیو کی معلومات ناکافی ہیں"],
  "Fundamental data dastiyab nahi": ["Fundamental data dastiyab nahi", "Fundamental data unavailable", "بنیادی مالی ڈیٹا دستیاب نہیں"],
  "Kam risk": ["Kam risk", "Low risk", "کم خطرہ"],
  "Darmiyani risk": ["Darmiyani risk", "Moderate risk", "درمیانہ خطرہ"],
  "Zyada risk": ["Zyada risk", "High risk", "زیادہ خطرہ"],
  "Jaiza darkar": ["Jaiza darkar", "Review", "مزید جائزہ"],
  "Khareedne par ghour": ["Khareedne par ghour", "Consider buying", "خریدنے پر غور"],
  "Barqarar rakhne par ghour": ["Barqarar rakhne par ghour", "Consider holding", "برقرار رکھنے پر غور"],
  "Hissa kam karne par ghour": ["Hissa kam karne par ghour", "Consider reducing", "حصہ کم کرنے پر غور"],
  "Bechne par ghour": ["Bechne par ghour", "Consider selling", "فروخت کرنے پر غور"],
  "Asal khabar parhein": ["Asal khabar parhein", "Read original article", "اصل خبر پڑھیں"],
  "Impact AI ka andaza hai, tasdeeq shuda market fact nahi.": ["Impact AI ka andaza hai, tasdeeq shuda market fact nahi.", "AI-estimated impact, not a verified market fact.", "اثر AI کا اندازہ ہے، مصدقہ مارکیٹ حقیقت نہیں۔"],
  "Yeh maloomati jaiza hai, financial mashwara nahi.": ["Yeh maloomati jaiza hai, financial mashwara nahi.", "This is informational analysis, not financial advice.", "یہ معلوماتی تجزیہ ہے، مالی مشورہ نہیں۔"],
  "Configured": ["Tayyar", "Configured", "ترتیب شدہ"],
  "Missing": ["Maujood nahi", "Missing", "موجود نہیں"],
  "Khabrein band hain": ["Khabrein band hain", "News is unavailable", "خبریں دستیاب نہیں"],
  "Status dastiyab nahi": ["Status dastiyab nahi", "Status unavailable", "حالت دستیاب نہیں"],
  "Jaanch ho rahi hai...": ["Jaanch ho rahi hai...", "Checking...", "جانچ ہو رہی ہے..."],
  "PSX source dastiyab nahi — fallback list": ["PSX source dastiyab nahi — fallback list", "PSX source unavailable — fallback list", "PSX ماخذ دستیاب نہیں — متبادل فہرست"],
  "Request failed": ["Darkhwast nakaam hui", "Request failed", "درخواست ناکام ہوئی"],
  "Pehle document ka text paste karein ya readable PDF upload karein.": ["Pehle document ka text paste karein ya readable PDF upload karein.", "Paste document text or upload a readable PDF first.", "پہلے دستاویز کا متن پیسٹ کریں یا قابلِ مطالعہ PDF اپ لوڈ کریں۔"],
  "PDF reader load nahi hua. Internet rabta jaanchein.": ["PDF reader load nahi hua. Internet rabta jaanchein.", "The PDF reader could not load. Check your internet connection.", "PDF ریڈر لوڈ نہیں ہوا۔ انٹرنیٹ کنکشن چیک کریں۔"],
  "Meherbani karke PDF file chunein.": ["Meherbani karke PDF file chunein.", "Please choose a PDF file.", "براہِ کرم PDF فائل منتخب کریں۔"],
  "PDF 15 MB se chhoti honi chahiye.": ["PDF 15 MB se chhoti honi chahiye.", "The PDF must be smaller than 15 MB.", "PDF فائل 15 MB سے کم ہونی چاہیے۔"],
  "PDF ke pehle 15 safhe parha ja rahe hain...": ["PDF ke pehle 15 safhe parha ja rahe hain...", "Reading the first 15 PDF pages...", "PDF کے پہلے 15 صفحات پڑھے جا رہے ہیں..."],
  "Is PDF mein readable text nahi mila. Barah-e-karam document ka text yahan paste karein.": ["Is PDF mein readable text nahi mila. Barah-e-karam document ka text yahan paste karein.", "No readable text was found in the PDF. Please paste the document text here.", "PDF میں قابلِ مطالعہ متن نہیں ملا۔ براہِ کرم دستاویز کا متن یہاں پیسٹ کریں۔"],
  "PDF parhi nahi ja saki. File check karein ya text neeche paste karein.": ["PDF parhi nahi ja saki. File check karein ya text neeche paste karein.", "The PDF could not be read. Check the file or paste its text below.", "PDF پڑھی نہیں جا سکی۔ فائل چیک کریں یا متن نیچے پیسٹ کریں۔"],
  "Document ka jaiza tayyar ho raha hai...": ["Document ka jaiza tayyar ho raha hai...", "Preparing document analysis...", "دستاویز کا تجزیہ تیار ہو رہا ہے..."],
  "haroof": ["haroof", "characters", "حروف"],
  "safhon tak text nikala gaya": ["safhon tak text nikala gaya", "pages of text extracted", "صفحات سے متن نکالا گیا"],
  "mazeed safhe nahi parhe gaye.": ["mazeed safhe nahi parhe gaye.", "additional pages were not read.", "مزید صفحات نہیں پڑھے گئے۔"],
  "Koi text nahi mila": ["Koi text nahi mila", "No text found", "کوئی متن نہیں ملا"],
  "Saaf nahi hai": ["Saaf nahi hai", "Unclear", "واضح نہیں"],
  "Financial facts and ratios are not available from the connected PSX source.": ["Financial facts and ratios are not available from the connected PSX source.", "Financial facts and ratios are not available from the connected PSX source.", "منسلک PSX ماخذ سے مالی حقائق اور تناسب دستیاب نہیں ہیں۔"],
  "Positive": ["Musbat", "Positive", "مثبت"],
  "Negative": ["Manfi", "Negative", "منفی"],
  "Neutral": ["Ghair janibdar", "Neutral", "غیر جانب دار"],
  "Action could not be completed.": ["Yeh kaam nahi ho saka.", "This action could not be completed.", "یہ کام مکمل نہیں ہو سکا۔"],
  "Achanak masla hua. Dobara koshish karein.": ["Achanak masla hua. Dobara koshish karein.", "An unexpected error occurred. Please try again.", "اچانک مسئلہ پیش آیا۔ دوبارہ کوشش کریں۔"],
  "Chart load nahi hua. Internet rabta jaanchein.": ["Chart load nahi hua. Internet rabta jaanchein.", "The chart could not load. Check your internet connection.", "چارٹ لوڈ نہیں ہوا۔ انٹرنیٹ کنکشن چیک کریں۔"],
  "Chart library load nahi hui.": ["Chart library load nahi hui.", "The chart library could not load.", "چارٹ لائبریری لوڈ نہیں ہوئی۔"],
  "Koi khabar dastiyab nahi.": ["Koi khabar dastiyab nahi.", "No news is available.", "کوئی خبر دستیاب نہیں۔"],
  "Is share ke liye fetched khabron mein koi mutaliqa match nahi mila.": ["Is share ke liye fetched khabron mein koi mutaliqa match nahi mila.", "No matching articles were found for this stock.", "اس شیئر کے لیے حاصل شدہ خبروں میں کوئی متعلقہ مضمون نہیں ملا۔"],
  "AI analysis ka format durust nahi.": ["AI analysis ka format durust nahi.", "The AI analysis format is invalid.", "AI تجزیے کی ساخت درست نہیں۔"],
  "GNews ne koi mutaliqa khabar nahi bheji.": ["GNews ne koi mutaliqa khabar nahi bheji.", "GNews returned no relevant articles.", "GNews نے کوئی متعلقہ خبر نہیں بھیجی۔"],
  "PSX data service ne HTTP 502 jawab diya": ["PSX data service ne HTTP 502 jawab diya", "The PSX data service returned HTTP 502.", "PSX ڈیٹا سروس نے HTTP 502 کا جواب دیا۔"],
  "Is symbol ka chart data dastiyab nahi hai": ["Is symbol ka chart data dastiyab nahi hai", "Chart data is unavailable for this symbol.", "اس علامت کے لیے چارٹ ڈیٹا دستیاب نہیں۔"],
  "PSX portal se rabta nahi ho saka": ["PSX portal se rabta nahi ho saka", "Could not connect to the PSX portal.", "PSX پورٹل سے رابطہ نہیں ہو سکا۔"],
  "PSX portal ka request token nahi mila": ["PSX portal ka request token nahi mila", "The PSX portal did not provide a request token.", "PSX پورٹل کا درخواست ٹوکن نہیں ملا۔"],
  "PSX portal ka request token durust nahi": ["PSX portal ka request token durust nahi", "The PSX portal request token is invalid.", "PSX پورٹل کا درخواست ٹوکن درست نہیں۔"],
  "PSX portal ka request token khaali hai": ["PSX portal ka request token khaali hai", "The PSX portal request token is empty.", "PSX پورٹل کا درخواست ٹوکن خالی ہے۔"],
  "PSX data ka format samajh nahi aaya": ["PSX data ka format samajh nahi aaya", "The PSX data format could not be read.", "PSX ڈیٹا کی ساخت سمجھ نہیں آئی۔"],
  "PSX symbols ki list khaali ya ghair-motabar hai": ["PSX symbols ki list khaali ya ghair-motabar hai", "The PSX symbol list is empty or invalid.", "PSX علامات کی فہرست خالی یا غیر معتبر ہے۔"],
  "Symbol durust nahi hai": ["Symbol durust nahi hai", "The symbol is invalid.", "علامت درست نہیں۔"],
  "Chart ka waqt durust nahi hai": ["Chart ka waqt durust nahi hai", "The chart period is invalid.", "چارٹ کا دورانیہ درست نہیں۔"],
  "GNews API key server par set nahi hai": ["GNews API key server par set nahi hai", "The GNews API key is not configured on the server.", "سرور پر GNews API کی موجود نہیں۔"],
  "GNews ka jawab samajh nahi aaya": ["GNews ka jawab samajh nahi aaya", "The GNews response could not be read.", "GNews کا جواب سمجھ نہیں آیا۔"],
  "GNews ne durust khabrein nahi bhejeen": ["GNews ne durust khabrein nahi bhejeen", "GNews returned invalid article data.", "GNews نے درست خبر کا ڈیٹا نہیں بھیجا۔"],
  "Server ki .env ya Secrets mein Gemini ya Groq key set karein": ["Server ki .env ya Secrets mein Gemini ya Groq key set karein", "Configure a Gemini or Groq key in the server environment or deployment secrets.", "سرور کے ماحول یا ڈیپلائمنٹ سیکرٹس میں Gemini یا Groq کی ترتیب دیں۔"],
  "AI ne durust JSON jawab nahi diya": ["AI ne durust JSON jawab nahi diya", "The AI returned invalid JSON.", "AI نے درست JSON جواب نہیں دیا۔"],
  "AI response ki zaban durust nahi hai": ["AI response ki zaban durust nahi hai", "The AI response language is invalid.", "AI جواب کی زبان درست نہیں۔"],
  "Request khali ya bohat bari hai": ["Request khali ya bohat bari hai", "The request is empty or too large.", "درخواست خالی ہے یا بہت بڑی ہے۔"],
  "Request ka format theek nahi": ["Request ka format theek nahi", "The request format is invalid.", "درخواست کی ساخت درست نہیں۔"],
  "Share ka symbol durust nahi hai": ["Share ka symbol durust nahi hai", "The stock symbol is invalid.", "شیئر کی علامت درست نہیں۔"],
  "Sawal khali ya theek nahi hai": ["Sawal khali ya theek nahi hai", "The prompt is empty or invalid.", "سوال خالی ہے یا درست نہیں۔"],
  "Nahi mila": ["Nahi mila", "Not found.", "نہیں ملا۔"],
  "Market information": ["market maloomat kholein", "open market information", "مارکیٹ کی معلومات کھولیں"],
  "Portfolio health": ["Portfolio ki sehat", "Portfolio health", "پورٹ فولیو کی صحت"],
  "Portfolio health score ke liye verified fundamental data kafi nahi.": ["Portfolio health score ke liye verified fundamental data kafi nahi.", "Insufficient verified fundamental data for a portfolio health score.", "پورٹ فولیو کی صحت کا اسکور دینے کے لیے مصدقہ بنیادی مالی ڈیٹا ناکافی ہے۔"],
  "Portfolio risk": ["Portfolio ka risk", "Portfolio risk", "پورٹ فولیو کا خطرہ"],
  "Strongest holdings": ["Behtareen karkardagi wali holdings", "Strongest holdings", "بہترین کارکردگی والی ہولڈنگز"],
  "Weakest holdings": ["Kamzor karkardagi wali holdings", "Weakest holdings", "کمزور کارکردگی والی ہولڈنگز"],
  "Current price": ["Abhi ki qeemat", "Current price", "موجودہ قیمت"],
  "Average purchase price": ["Ausat khareed qeemat", "Average purchase price", "اوسط خرید قیمت"],
  "Profit / loss": ["Munafa / nuqsan", "Profit / loss", "منافع / نقصان"],
  "Portfolio weight": ["Portfolio mein hissa", "Portfolio weight", "پورٹ فولیو میں حصہ"],
  "Sector": ["Shoba", "Sector", "شعبہ"],
  "Fundamentals": ["Bunyadi mali jaiza", "Fundamentals", "بنیادی مالی جائزہ"],
  "Market performance": ["Market karkardagi", "Market performance", "مارکیٹ کی کارکردگی"],
  "Historical performance (latest 60 sessions)": ["Aakhri 60 sessions ki karkardagi", "Historical performance (latest 60 sessions)", "گزشتہ 60 سیشنز کی کارکردگی"],
  "Observed range": ["Dekhi gayi qeematon ki had", "Observed range", "دیکھی گئی قیمتوں کی حد"],
  "Observed volatility": ["Dekhi gayi qeemati utar charhao", "Observed volatility", "دیکھی گئی قیمتوں کا اتار چڑھاؤ"],
  "Latest volume": ["Aakhri tijarati volume", "Latest trading volume", "تازہ ترین تجارتی حجم"],
  "Company news": ["Company ki khabrain", "Company news", "کمپنی کی خبریں"],
  "News impact needs review": ["Khabron ke asar ka jaiza darkar hai", "News impact needs review", "خبروں کے اثر کا جائزہ درکار ہے"],
  "Concentration impact": ["Sarmaye ka yakja hona", "Concentration impact", "سرمائے کا ارتکاز"],
  "of invested capital": ["lagaye gaye sarmaye mein se", "of invested capital", "لگائے گئے سرمائے میں سے"],
  "Reasoning": ["Wajah", "Reasoning", "وجہ"],
  "What could change this view": ["Kin baton se yeh jaiza badal sakta hai", "What could change this view", "کون سی باتیں اس جائزے کو بدل سکتی ہیں"],
  "Updated financial statements and company-specific news.": ["Naye mali bayanat aur company ki mutaliqa khabrain.", "Updated financial statements and company-specific news.", "تازہ مالی بیانات اور کمپنی سے متعلق خبریں۔"],
  "Key concerns": ["Aham khadshaat", "Key concerns", "اہم خدشات"],
  "Possible improvements": ["Mumkin behtari", "Possible improvements", "ممکنہ بہتری"],
  "Low Risk": ["Kam risk", "Low risk", "کم خطرہ"],
  "Moderate Risk": ["Darmiyani risk", "Moderate risk", "درمیانہ خطرہ"],
  "High Risk": ["Zyada risk", "High risk", "زیادہ خطرہ"],
  "Unclear": ["Wazeh nahi", "Unclear", "غیر واضح"],
  "Insufficient market data": ["Market data kafi nahi", "Insufficient market data", "مارکیٹ ڈیٹا ناکافی ہے"],
  "manual": ["khud darj shuda", "manual", "دستی"],
  "Daily close": ["Rozana band hone ki qeemat", "Daily close", "روزانہ اختتامی قیمت"],
  "Intraday price": ["Aaj ke session ki qeemat", "Intraday price", "آج کے سیشن کی قیمت"],
  "Previously saved PSX quote": ["Pehle se mehfooz PSX qeemat", "Previously saved PSX quote", "پہلے سے محفوظ PSX قیمت"],
  "User-entered price": ["User ki darj ki hui qeemat", "User-entered price", "صارف کی درج کردہ قیمت"],
  "Current price is fetched automatically from PSX.": ["Maujooda qeemat PSX se khud li jayegi.", "Current price is fetched automatically from PSX.", "موجودہ قیمت PSX سے خودکار طور پر حاصل ہوگی۔"],
  "Fetching latest PSX price...": ["PSX se taza qeemat li ja rahi hai...", "Fetching the latest PSX price...", "PSX سے تازہ قیمت حاصل کی جا رہی ہے..."],
  "Could not fetch a valid PSX price.": ["PSX se durust qeemat nahi mil saki.", "Could not fetch a valid PSX price.", "PSX سے درست قیمت حاصل نہیں ہو سکی۔"],
  "PSX returned no valid intraday price.": ["PSX se aaj ke session ki durust qeemat nahi mili.", "PSX returned no valid intraday price.", "PSX سے آج کے سیشن کی درست قیمت نہیں ملی۔"],
  "PSX returned no valid daily closing price.": ["PSX se rozana band hone ki durust qeemat nahi mili.", "PSX returned no valid daily closing price.", "PSX سے روزانہ اختتامی درست قیمت نہیں ملی۔"],
  "No holding was added. Check the symbol or retry.": ["Holding shamil nahi hui. Symbol check karein ya dobara koshish karein.", "No holding was added. Check the symbol or retry.", "ہولڈنگ شامل نہیں ہوئی۔ علامت دیکھیں یا دوبارہ کوشش کریں۔"],
  "Retry price lookup": ["Qeemat dobara hasil karein", "Retry price lookup", "قیمت دوبارہ حاصل کریں"],
  "Hataein": ["Hataein", "Remove", "ہٹائیں"],
  "Remove holding": ["holding hataein", "remove holding", "ہولڈنگ ہٹائیں"],
  "invested capital": ["lagaya gaya sarmaya", "invested capital", "لگایا گیا سرمایہ"],
  "Qeematein mangwayi ja rahi hain...": ["Qeematein mangwayi ja rahi hain...", "Fetching prices...", "قیمتیں حاصل کی جا رہی ہیں..."],
  "purani qeemat mehfooz hai.": ["purani qeemat mehfooz hai.", "previous price was preserved.", "پچھلی قیمت محفوظ رکھی گئی ہے۔"],
  "qeematein taza hui.": ["qeematein taza hui.", "prices refreshed.", "قیمتیں تازہ ہوئیں۔"],
  "Tamam holdings ki asal PSX qeematein taza ho gayin.": ["Tamam holdings ki asal PSX qeematein taza ho gayin.", "Verified PSX prices were refreshed for all holdings.", "تمام ہولڈنگز کی مصدقہ PSX قیمتیں تازہ ہو گئیں۔"],
  "Saved market quote cache could not be read.": ["Purana market data browser se nahi parha ja saka.", "Saved market quote cache could not be read.", "محفوظ مارکیٹ ڈیٹا براؤزر سے نہیں پڑھا جا سکا۔"],
  "Browser mein portfolio nahi parha ja saka. Storage settings jaanchein.": ["Browser mein portfolio nahi parha ja saka. Storage settings jaanchein.", "Could not read the portfolio from browser storage. Check storage settings.", "براؤزر اسٹوریج سے پورٹ فولیو نہیں پڑھا جا سکا۔ اسٹوریج کی ترتیبات دیکھیں۔"],
  "Portfolio save nahi hua. Browser ki storage jagah jaanchein.": ["Portfolio save nahi hua. Browser ki storage jagah jaanchein.", "Could not save the portfolio. Check available browser storage.", "پورٹ فولیو محفوظ نہیں ہوا۔ براؤزر اسٹوریج کی دستیاب جگہ دیکھیں۔"],
  "Purana market data browser mein save nahi ho saka.": ["Purana market data browser mein save nahi ho saka.", "Previous market data could not be saved in this browser.", "پچھلا مارکیٹ ڈیٹا اس براؤزر میں محفوظ نہیں ہو سکا۔"],
  "No company-specific news found in fetched articles.": ["Mangi gayi khabron mein company ki khaas khabar nahi mili.", "No company-specific news found in fetched articles.", "حاصل شدہ خبروں میں کمپنی سے متعلق کوئی خبر نہیں ملی۔"],
  "AI portfolio report JSON is invalid.": ["AI portfolio report JSON durust nahi.", "AI portfolio report JSON is invalid.", "AI پورٹ فولیو رپورٹ کا JSON درست نہیں۔"],
  "AI portfolio report format is invalid.": ["AI portfolio report ka format durust nahi.", "AI portfolio report format is invalid.", "AI پورٹ فولیو رپورٹ کی ساخت درست نہیں۔"],
  "Server se rabta nahi ho saka. Dobara koshish karein.": ["Server se rabta nahi ho saka. Dobara koshish karein.", "Could not connect to the server. Please try again.", "سرور سے رابطہ نہیں ہو سکا۔ دوبارہ کوشش کریں۔"],
  "Purana data": ["Purana data", "Stale data", "پرانا ڈیٹا"],
  "Tabdeeli ka data nahi": ["Tabdeeli ka data nahi", "Change unavailable", "تبدیلی دستیاب نہیں"],
  "Asal qeemat dastiyab nahi": ["Asal qeemat dastiyab nahi", "Verified price unavailable", "مصدقہ قیمت دستیاب نہیں"],
  "PSX symbol count": ["{count} symbols PSX se load hue.", "{count} symbols loaded from PSX.", "PSX سے {count} علامات لوڈ ہوئیں۔"],
  "PSX Data Portal": ["PSX Data Portal", "PSX Data Portal", "PSX ڈیٹا پورٹل"],
  "intraday": ["Aaj ke session ka", "Intraday", "دن کے سیشن کا"],
  "historical": ["Tareekhi", "Historical", "تاریخی"],
  "Taza update fail hua; purana chart mehfooz hai.": ["Taza update fail hua; purana chart mehfooz hai.", "Refresh failed; previous chart data is preserved.", "تازہ کاری ناکام؛ پچھلا چارٹ محفوظ ہے۔"],
  "PSX ki mukammal list nahi mili; mashhoor symbols ki fallback list dikh rahi hai. Qeemat sirf live source se li jayegi.": ["PSX ki mukammal list nahi mili; mashhoor symbols ki fallback list dikh rahi hai. Qeemat sirf live source se li jayegi.", "The complete PSX list is unavailable; showing common symbols. Prices will only come from the live source.", "PSX کی مکمل فہرست دستیاب نہیں؛ عام علامات دکھائی جا رہی ہیں۔ قیمت صرف اصل ذریعے سے لی جائے گی۔"],
  "Khabrein load nahi ho sakin: ": ["Khabrein load nahi ho sakin: ", "Could not load news: ", "خبریں لوڈ نہیں ہو سکیں: "],
  "AI jaiza nahi ho saka: ": ["AI jaiza nahi ho saka: ", "AI analysis failed: ", "AI تجزیہ نہیں ہو سکا: "],
  "AI khulasa dastiyab nahi.": ["AI khulasa dastiyab nahi.", "AI summary unavailable.", "AI خلاصہ دستیاب نہیں۔"],
  "Mutasira sectors: ": ["Mutasira sectors: ", "Affected sectors: ", "متاثرہ شعبے: "],
  "Mutaliqa shares: ": ["Mutaliqa shares: ", "Related stocks: ", "متعلقہ شیئرز: "],
  "Wajah: ": ["Wajah: ", "Reason: ", "وجہ: "],
  "Khabron ke saath AI ka andaza dikhaya gaya hai; asal article hi fact ka source hai.": ["Khabron ke saath AI ka andaza dikhaya gaya hai; asal article hi fact ka source hai.", "AI estimates are shown with the news; the original article is the source of facts.", "خبروں کے ساتھ AI کا اندازہ ہے؛ حقائق کا ماخذ اصل مضمون ہے۔"],
  "GNews se khabrein mangwayi ja rahi hain...": ["GNews se khabrein mangwayi ja rahi hain...", "Fetching news from GNews...", "GNews سے خبریں حاصل کی جا رہی ہیں..."],
  "GNews ne koi mutaliqa khabar nahi bheji.": ["GNews ne koi mutaliqa khabar nahi bheji.", "GNews returned no relevant articles.", "GNews نے کوئی متعلقہ خبر نہیں بھیجی۔"],
  "Is share ke liye fetched khabron mein koi mutaliqa match nahi mila.": ["Is share ke liye fetched khabron mein koi mutaliqa match nahi mila.", "No matching fetched articles were found for this stock.", "اس شیئر کے لیے حاصل شدہ خبروں میں کوئی متعلقہ نتیجہ نہیں ملا۔"],
  "Koi khabar dastiyab nahi.": ["Koi khabar dastiyab nahi.", "No news available.", "کوئی خبر دستیاب نہیں۔"],
  "Pehle portfolio mein holding shamil karein.": ["Pehle portfolio mein holding shamil karein.", "Add a portfolio holding first.", "پہلے پورٹ فولیو میں ہولڈنگ شامل کریں۔"],
  "Jaize se pehle portfolio mein holdings shamil karein.": ["Jaize se pehle portfolio mein holdings shamil karein.", "Add holdings before requesting an analysis.", "تجزیے سے پہلے پورٹ فولیو میں ہولڈنگز شامل کریں۔"],
  "Holding portfolio mein shamil ho gayi.": ["Holding portfolio mein shamil ho gayi.", "Holding added to portfolio.", "ہولڈنگ پورٹ فولیو میں شامل ہو گئی۔"],
  "Symbol, units aur qeemat durust darj karein.": ["Symbol, units aur qeemat durust darj karein.", "Enter a valid symbol, quantity and price.", "درست علامت، یونٹس اور قیمت درج کریں۔"],
  "Asal khabrein neeche maujood hain.": ["Asal khabrein neeche maujood hain.", "The original articles are shown below.", "اصل خبریں نیچے موجود ہیں۔"],
};

let currentLanguage = "roman";

function translatedEntry(key, index) {
  const translation = DICTIONARY[key]?.[index];
  if (translation) return translation;
  const patterns = [
    [/^PSX data service ne HTTP (\d+) jawab diya$/, ["PSX data service ne HTTP {code} jawab diya", "The PSX data service returned HTTP {code}.", "PSX ڈیٹا سروس نے HTTP {code} کا جواب دیا۔"]],
    [/^GNews ne HTTP (\d+) jawab diya$/, ["GNews ne HTTP {code} jawab diya", "GNews returned HTTP {code}.", "GNews نے HTTP {code} کا جواب دیا۔"]],
    [/^(Gemini|Groq) ne error diya \(HTTP (\d+)\)$/, ["{provider} ne error diya (HTTP {code})", "{provider} returned HTTP {code}.", "{provider} نے HTTP {code} کی خرابی دی۔"]],
    [/^(Gemini|Groq) tak pohanch nahi saka$/, ["{provider} tak pohanch nahi saka", "Could not connect to {provider}.", "{provider} سے رابطہ نہیں ہو سکا۔"]],
  ];
  for (const [pattern, templates] of patterns) {
    const match = key.match(pattern);
    if (match) {
      return templates[index]
        .replaceAll("{provider}", match[1] || "")
        .replaceAll("{code}", match[2] || match[1] || "");
    }
  }
  return key;
}

export function language() {
  return currentLanguage;
}

export function translate(key, values = {}) {
  const index = LANGUAGES.indexOf(currentLanguage);
  return Object.entries(values).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
    translatedEntry(key, index),
  );
}

export function locale() {
  return {roman: "en-PK", en: "en-US", ur: "ur-PK"}[currentLanguage];
}

function applyTranslations() {
  document.querySelectorAll("[data-i18n]").forEach(element => {
    element.textContent = translate(element.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach(element => {
    element.placeholder = translate(element.dataset.i18nPlaceholder);
  });
  document.querySelectorAll("[data-i18n-aria-label]").forEach(element => {
    element.setAttribute("aria-label", translate(element.dataset.i18nAriaLabel));
  });
  document.querySelectorAll("[data-i18n-title]").forEach(element => {
    element.title = translate(element.dataset.i18nTitle);
  });
  const html = document.documentElement;
  html.lang = {roman: "ur-Latn", en: "en", ur: "ur"}[currentLanguage];
  html.dir = currentLanguage === "ur" ? "rtl" : "ltr";
  document.querySelector("#languageSelect").value = currentLanguage;
}

export function initI18n() {
  let saved = "roman";
  try {
    const stored = localStorage.getItem(LANGUAGE_KEY);
    if (LANGUAGES.includes(stored)) saved = stored;
  } catch {
    saved = "roman";
  }
  currentLanguage = saved;
  document.querySelector("#languageSelect").addEventListener("change", event => {
    const selected = event.target.value;
    if (!LANGUAGES.includes(selected)) return;
    currentLanguage = selected;
    try {
      localStorage.setItem(LANGUAGE_KEY, selected);
    } catch {
      event.target.setAttribute("aria-invalid", "true");
    }
    applyTranslations();
    window.dispatchEvent(new CustomEvent("language-changed", {detail: {language: currentLanguage}}));
  });
  applyTranslations();
}

export function translationDictionary() {
  return DICTIONARY;
}
