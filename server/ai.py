import json
import threading
import time
import urllib.error
import urllib.request

from . import config

SUPPORTED_LANGUAGES = ("roman", "en", "ur")
SYSTEM_INSTRUCTIONS = {
    "roman": (
        "You are a Pakistan Stock Exchange expert and financial analysis assistant. "
        "Always communicate in simple Roman Urdu. Explain difficult financial words. "
        "Use only supplied real data. Never invent market prices, news, financial ratios "
        "or company facts. Mark missing data as unavailable. Never guarantee profits. "
        "Explain uncertainty and investment risks. Recommendations must be conditional "
        "and evidence-based; use REVIEW when evidence is insufficient."
    ),
    "en": (
        "You are a Pakistan Stock Exchange expert and financial analysis assistant. "
        "Always communicate in clear English. Use only supplied real data. Never invent "
        "market prices, news, financial ratios or company facts. Mark missing data as "
        "unavailable. Never guarantee profits. Explain uncertainty and investment risks. "
        "Recommendations must be conditional and evidence-based; use REVIEW when "
        "evidence is insufficient."
    ),
    "ur": (
        "You are a Pakistan Stock Exchange expert and financial analysis assistant. "
        "Always communicate in clear Urdu using Urdu script. Use only supplied real "
        "data. Never invent market prices, news, financial ratios or company facts. "
        "Mark missing data as unavailable. Never guarantee profits. Explain uncertainty "
        "and investment risks. Recommendations must be conditional and evidence-based; "
        "use REVIEW when evidence is insufficient."
    ),
}
DISCLAIMERS = {
    "roman": "\n\nYaad rakhein: yeh maloomati tajziya hai, financial mashwara nahi. Faisla karne se pehle apni research karein.",
    "en": "\n\nThis is informational analysis, not financial advice. Do your own research before making a decision.",
    "ur": "\n\nیاد رکھیں: یہ معلوماتی تجزیہ ہے، مالی مشورہ نہیں۔ فیصلہ کرنے سے پہلے اپنی تحقیق کریں۔",
}


class ProviderError(Exception):
    pass


class NoKeysError(ProviderError):
    pass


class RateLimiter:
    def __init__(self, limit, window):
        self.limit, self.window = limit, window
        self.hits, self.lock = {}, threading.Lock()

    def allow(self, who, now=None):
        now = time.monotonic() if now is None else now
        with self.lock:
            recent = [t for t in self.hits.get(who, []) if now - t < self.window]
            allowed = len(recent) < self.limit
            if allowed:
                recent.append(now)
            self.hits[who] = recent
            return allowed


def _post(url, headers, payload, provider):
    request = urllib.request.Request(
        url,
        data=json.dumps(payload).encode(),
        headers={**headers, "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=config.AI_TIMEOUT) as response:
            return json.loads(response.read())
    except urllib.error.HTTPError as error:
        raise ProviderError(f"{provider} ne error diya (HTTP {error.code})") from error
    except (urllib.error.URLError, TimeoutError, ValueError) as error:
        raise ProviderError(f"{provider} tak pohanch nahi saka") from error


def _gemini(key, prompt, wants_json, language="roman"):
    model = config.get("GEMINI_MODEL", config.DEFAULT_GEMINI_MODEL)
    generation = {"temperature": 0.3}
    if wants_json:
        generation["responseMimeType"] = "application/json"
    data = _post(
        f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
        {"x-goog-api-key": key},
        {
            "systemInstruction": {"parts": [{"text": SYSTEM_INSTRUCTIONS[language]}]},
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": generation,
        },
        "Gemini",
    )
    parts = ((data.get("candidates") or [{}])[0].get("content") or {}).get("parts") or []
    return "".join(part.get("text", "") for part in parts)


def _groq(key, prompt, wants_json, language="roman"):
    payload = {
        "model": config.get("GROQ_MODEL", config.DEFAULT_GROQ_MODEL),
        "messages": [
            {"role": "system", "content": SYSTEM_INSTRUCTIONS[language]},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.3,
    }
    if wants_json:
        payload["response_format"] = {"type": "json_object"}
    data = _post(
        "https://api.groq.com/openai/v1/chat/completions",
        {"Authorization": f"Bearer {key}"},
        payload,
        "Groq",
    )
    return ((data.get("choices") or [{}])[0].get("message") or {}).get("content") or ""


def generate(prompt, wants_json, language="roman"):
    if language not in SUPPORTED_LANGUAGES:
        raise ValueError("AI response ki zaban durust nahi hai")
    providers = [
        (name, fn, config.get(env))
        for name, fn, env in (
            ("Gemini", _gemini, "GEMINI_API_KEY"),
            ("Groq", _groq, "GROQ_API_KEY"),
        )
    ]
    providers = [provider for provider in providers if provider[2]]
    if not providers:
        raise NoKeysError("Server ki .env ya Secrets mein Gemini ya Groq key set karein")
    errors = []
    for name, fn, key in providers:
        try:
            text = fn(key, prompt, wants_json, language).strip()
            if text:
                if wants_json:
                    return {
                        "text": json.dumps(_parse_json(text), ensure_ascii=False),
                        "provider": name,
                    }
                return {"text": text + DISCLAIMERS[language], "provider": name}
            errors.append(f"{name} ne jawab nahi diya")
        except ProviderError as error:
            errors.append(str(error))
    raise ProviderError("; ".join(errors))


def _parse_json(text):
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[-1]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3].strip()
        if cleaned.lower().startswith("json"):
            cleaned = cleaned[4:].lstrip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as error:
        raise ProviderError("AI ne durust JSON jawab nahi diya") from error
