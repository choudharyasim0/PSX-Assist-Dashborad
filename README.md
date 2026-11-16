---
title: PSX Assist Dashboard
emoji: 📈
colorFrom: green
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
---
# PSX Assist Dashboard

Pakistan Stock Exchange ka smart AI investment assistant. Dashboard Roman Urdu,
English aur Urdu mein available hai; Urdu select karne par layout right-to-left
ho jata hai.

## Chalana

Python 3.9+ ke saath:

```powershell
python app.py
```

App `http://localhost:8000/` par chalegi aur browser khud kholne ki koshish karegi.
Koi Python package install karne ki zaroorat nahi.

## Server-side API keys

`.env.example` ko `.env` mein copy karein, phir server par zaroori keys set karein:

- `GEMINI_API_KEY` — AI ke liye pehli choice
- `GROQ_API_KEY` — Gemini fail ho to fallback
- `GNEWS_API_KEY` — news ke liye
- `APP_PASSWORD` — optional Basic Authentication
- `GEMINI_MODEL` aur `GROQ_MODEL` — optional model overrides

Real environment variables ko `.env` aur `.env.example` par tarjeeh milti hai.
Browser ko API keys nahi bheji jatin. `.env` ko share ya commit na karein.

## Hugging Face Spaces

Repository ko Hugging Face Space mein Docker SDK ke saath deploy karein. `Dockerfile`
app ko port `7860` par chalata hai. Secrets ko Space Settings mein configure
karein. `SPACE_ID` pehchanne par app `0.0.0.0` aur port `7860` istemal karti hai.
Space ki temporary disk par `.env` tabdeeliyan mustaqil nahi hotin.

## Render par free deployment

GitHub repository ko Render se connect karke **New + → Blueprint** chunein.
Render, `render.yaml` se `psx-assist-dashboard` web service banayega; plan free
hai aur app ka health check `/healthz` par hai. Free web services inactivity ke
baad sleep ho sakti hain, is liye agla request chalne mein zyada waqt le sakta hai.

AI aur news ke liye `GEMINI_API_KEY`, `GROQ_API_KEY`, aur `GNEWS_API_KEY` ko
Render service ke Environment settings mein optional secrets ke taur par add
karein. In keys ko GitHub ya chat mein share na karein. `APP_PASSWORD` set karna
deployment ko Basic Authentication se protect karta hai; warna service ka URL
publicly accessible hoga.

## Data aur ehtiyaat

Market prices aur khabrein sirf PSX Data Portal aur GNews se aati hain. PSX ke
live endpoints ke liye server portal se short-lived request token hasil karta
hai. Source available na ho to dashboard unavailable state dikhata hai, koi demo
price ya fabricated news nahi. Market status quote ki freshness dikhata hai;
stale same-day data ko market-closed qarar nahi diya jata.

Portfolio analysis holdings, PSX prices, available price history, sector data
aur directly matching news par mabni hai. Verified company fundamentals abhi
connected nahi, is liye AI unhein nahi gadh sakta aur recommendation `REVIEW`
hi rehti hai. AI jaiza maloomati hai, financial mashwara nahi.

## Tests

```powershell
python -m unittest -v
```
