# PSX Assist Dashboard — ek file, ek command:  python app.py   (browser khud khul jata hai)
import base64
import hmac
import json
import ipaddress
import os
import re
import tempfile
import urllib.error
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
ALLOWED = ("gnews.io", "dps.psx.com.pk")
MAX_AI_REQUEST_BYTES = 64 * 1024
AI_SYSTEM_INSTRUCTION = (
    'Tum PSX (Pakistan Stock Exchange) ke maahir ho. Hamesha asaan Roman Urdu '
    'mein jawab do (Urdu alfaz English harf mein, jaise "aap ka portfolio '
    'theek hai"). Mushkil lafzon ki wazahat karo. Yeh moali mashwara nahi hai, '
    'yeh baat aakhir mein yaad dilao.'
)


def load_env_file():
    # .env pehle, phir .env.example (khali ya "your_..." values ignore hoti hain). Asli environment/Secrets sab se upar.
    for name in (".env", ".env.example"):
        env_path = BASE_DIR / name
        if not env_path.exists():
            continue
        for line in env_path.read_text(encoding="utf-8-sig").splitlines():
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if line.startswith("export "):
                line = line[7:].lstrip()
            key, separator, value = line.partition("=")
            key = key.strip()
            if not separator or not key:
                continue
            value = value.strip()
            if len(value) >= 2 and value[0] == value[-1] and value[0] in ("'", '"'):
                value = value[1:-1]
            elif " #" in value:
                value = value.split(" #", 1)[0].rstrip()
            if value and not value.lower().startswith("your_") and not os.environ.get(key):
                os.environ[key] = value


HTML = r"""<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>PSX Assist Dashboard</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
<style>
:root{--bg:#0b1220;--card:#131c31;--line:#22304f;--tx:#e8eefc;--mut:#8ea0c4;--ac:#22d3a0;--ac2:#6366f1;--red:#f87171;--grn:#34d399;--yel:#fbbf24}
*{box-sizing:border-box;margin:0}
body{font-family:system-ui,sans-serif;background:radial-gradient(circle at 20% 0,#1a2550,var(--bg) 45%);color:var(--tx);min-height:100vh;padding-bottom:80px}
header{display:flex;justify-content:space-between;align-items:center;padding:16px 18px}
h1{font-size:1.2rem;background:linear-gradient(90deg,var(--ac),var(--ac2));-webkit-background-clip:text;color:transparent}
nav{position:fixed;bottom:0;left:0;right:0;display:flex;background:#0e1730ee;backdrop-filter:blur(10px);border-top:1px solid var(--line);z-index:5}
nav button{flex:1;padding:12px 4px;background:none;border:0;color:var(--mut);font-size:.8rem;cursor:pointer}
nav button.on{color:var(--ac);font-weight:700}
main{max-width:900px;margin:auto;padding:0 14px}
.tab{display:none}.tab.on{display:block}
.card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:16px;margin-bottom:14px}
input,select,textarea{width:100%;padding:11px;border-radius:10px;border:1px solid var(--line);background:#0b1426;color:var(--tx);font-size:.95rem}
.row{display:flex;gap:8px;flex-wrap:wrap}.row>*{flex:1;min-width:90px}
.btn{padding:11px 16px;border:0;border-radius:10px;background:linear-gradient(90deg,var(--ac),var(--ac2));color:#04121a;font-weight:700;cursor:pointer}
.btn.g{background:#1d2a48;color:var(--tx)}
.mut{color:var(--mut);font-size:.85rem}
.big{font-size:1.8rem;font-weight:800}
.up{color:var(--grn)}.dn{color:var(--red)}
.tag{display:inline-block;padding:3px 10px;border-radius:99px;font-size:.75rem;font-weight:700}
.Positive{background:#064e3b;color:var(--grn)}.Negative{background:#5b1d1d;color:var(--red)}.Neutral{background:#4a3b0a;color:var(--yel)}
.news h3{font-size:1rem;margin-bottom:6px}
.ai{background:#0b1426;border-left:3px solid var(--ac);padding:10px;border-radius:8px;margin-top:8px;white-space:pre-wrap;line-height:1.6}
table{width:100%;border-collapse:collapse;font-size:.85rem}th,td{padding:8px 4px;text-align:right;border-bottom:1px solid var(--line)}th:first-child,td:first-child{text-align:left}
.x{background:none;border:0;color:var(--red);cursor:pointer}
.load{color:var(--ac);animation:p 1s infinite}@keyframes p{50%{opacity:.3}}
dialog{background:var(--card);color:var(--tx);border:1px solid var(--line);border-radius:16px;padding:18px;width:min(92vw,420px)}
dialog::backdrop{background:#000a}
</style></head><body>
<header><h1>📈 PSX Assist Dashboard</h1><button class="btn g" onclick="$('#set').showModal();loadAiStatus()">⚙️ Settings</button></header>
<main>
<section id="t-market" class="tab on">
 <div class="card">
  <select id="dd" onchange="$('#sym').value='';loadChart(this.value)"><option>Symbols load ho rahe hain...</option></select>
  <div class="row" style="margin-top:8px"><input id="sym" list="sl" autocomplete="off" placeholder="🔍 Koi bhi symbol likhein (OGDC, HUBC, LUCK...)" onkeydown="if(event.key==='Enter')loadChart()"><datalist id="sl"></datalist><button class="btn" style="flex:0 0 auto" onclick="loadChart()">Search</button></div>
  <div class="row" style="margin-top:8px"><select id="tf" onchange="loadChart()"><option value="int">Aaj ka (Live intraday)</option><option value="eod">Roz ka (Daily history)</option></select></div>
  <div style="margin-top:14px"><div class="mut" id="nm"></div><span class="big" id="px">--</span> <span id="chg" class="mut"></span></div>
  <div class="row" style="margin-top:8px"><div><div class="mut">High</div><b id="hi">-</b></div><div><div class="mut">Low</div><b id="lo">-</b></div><div><div class="mut">Volume</div><b id="vo">-</b></div></div>
  <div class="mut" id="src" style="margin-top:6px"></div>
  <div style="height:300px;margin-top:10px"><canvas id="ch"></canvas></div></div>
</section>
<section id="t-news" class="tab">
 <div class="card"><button class="btn" onclick="loadNews()">📰 Taza PSX khabrain + Impact</button><div class="mut" style="margin-top:6px">GNews free plan par din ki limit hoti hai. Agar browser block kare to Settings mein CORS proxy daalein.</div></div>
 <div id="newsBox"></div>
</section>
<section id="t-pf" class="tab">
 <div class="card"><div class="row"><input id="ps" placeholder="Symbol"><input id="pq" type="number" placeholder="Quantity"><input id="pb" type="number" step="0.01" placeholder="Buy price"><input id="pc" type="number" step="0.01" placeholder="Abhi ki price (optional)"></div>
 <div class="row" style="margin-top:8px"><button class="btn" onclick="addPF()">➕ Add</button><button class="btn g" onclick="refreshPF()">🔄 Prices update</button></div></div>
 <div class="card"><div class="row"><div><div class="mut">Invested</div><div class="big" id="inv">0</div></div><div><div class="mut">Current</div><div class="big" id="cur">0</div></div><div><div class="mut">Profit/Loss</div><div class="big" id="pl">0</div></div></div>
 <div style="overflow-x:auto;margin-top:12px"><table><thead><tr><th>Symbol</th><th>Qty</th><th>Buy</th><th>Now</th><th>P/L</th><th></th></tr></thead><tbody id="pfb"></tbody></table></div></div>
 <div class="card"><div style="height:220px"><canvas id="pie"></canvas></div><button class="btn" style="margin-top:10px" onclick="advice()">🤖 Portfolio ka AI jaiza</button><div id="adv"></div></div>
</section>
<section id="t-doc" class="tab">
 <div class="card"><p class="mut" style="margin-bottom:8px">Broker ki PDF, statement ya market summary upload karein ya text paste karein.</p>
 <input type="file" id="pdf" accept="application/pdf"><textarea id="dtx" rows="6" placeholder="Ya yahan text paste karein..." style="margin-top:8px"></textarea>
 <button class="btn" style="margin-top:8px" onclick="explainDoc()">🗣️ Roman Urdu mein samjhao</button><div id="docOut"></div></div>
</section>
</main>
<nav><button class="on" data-t="market">📊 Market</button><button data-t="news">📰 News</button><button data-t="pf">💼 Portfolio</button><button data-t="doc">📄 Documents</button></nav>
<dialog id="set"><h3 style="margin-bottom:10px">Settings</h3><p class="mut" style="margin-bottom:8px">Gemini, Groq aur GNews keys server ki .env (ya .env.example) file se khud load hoti hain; Settings mein dalne ki zaroorat nahi.</p>
 <div id="aiStatus" class="mut" role="status">AI keys ka status check ho raha hai...</div>
 <p class="mut" style="margin-top:8px">Gemini primary hai; fail ho to Groq fallback chalta hai. .env ko seedha edit karein to server restart karein.</p>
 <details id="legacyKeys" style="margin-top:10px"><summary class="mut">.env mein AI keys add/change karein</summary>
  <p class="mut" style="margin:8px 0">Keys sirf isi computer ke local server ko bheji jayengi. Agar purani key yahan khud nahi aayi, file:// wali dashboard Settings se copy karke yahan paste karein.</p>
  <p class="mut">Gemini API Key</p><div class="row"><input id="migrationGem" type="password" autocomplete="new-password"><button class="btn g" onclick="toggleMigrationKey('migrationGem',this)">Dikhayein</button></div>
  <p class="mut" style="margin-top:8px">Groq API Key</p><div class="row"><input id="migrationGroq" type="password" autocomplete="new-password"><button class="btn g" onclick="toggleMigrationKey('migrationGroq',this)">Dikhayein</button></div>
  <div id="legacyStatus" class="mut" role="status"></div>
  <button class="btn g" style="margin-top:8px" onclick="migrateLegacyKeys()">Local .env mein save karein</button>
  <button class="btn g" style="margin-top:8px" onclick="clearLegacyKeys()">Is browser se purani keys mita dein</button>
 </details>
 <p class="mut" style="margin-top:8px">GNews API Key</p><input id="kn" type="password" autocomplete="off">
 <p class="mut" style="margin-top:8px">CORS Proxy (optional, jaise https://myproxy.com/?url=)</p><input id="kp">
 <div id="setErr" class="mut" style="margin-top:8px" role="status"></div>
 <div class="row" style="margin-top:12px"><button class="btn" onclick="saveSet()">Save</button><button class="btn g" onclick="$('#set').close()">Band</button></div></dialog>
<script>
const $=s=>document.querySelector(s);
const ls={g:k=>{try{return localStorage.getItem(k)||''}catch(e){return''}},s:(k,v)=>{localStorage.setItem(k,v)}};
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt=n=>Number(n).toLocaleString('en-PK',{maximumFractionDigits:2});
let chart,pie,timer,pf=JSON.parse(ls.g('pf')||'[]');
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>{document.querySelectorAll('nav button,.tab').forEach(e=>e.classList.remove('on'));b.classList.add('on');$('#t-'+b.dataset.t).classList.add('on')});
$('#kn').value=ls.g('gnewsKey');$('#kp').value=ls.g('kp');
let oldGemKey=ls.g('gemKey'),oldGroqKey=ls.g('groqKey');
$('#migrationGem').value=oldGemKey;$('#migrationGroq').value=oldGroqKey;
function toggleMigrationKey(id,button){const input=$('#'+id),show=input.type==='password';input.type=show?'text':'password';button.textContent=show?'Chhupayein':'Dikhayein'}
function clearLegacyKeys(){localStorage.removeItem('gemKey');localStorage.removeItem('groqKey');oldGemKey='';oldGroqKey='';$('#migrationGem').value='';$('#migrationGroq').value='';$('#legacyStatus').textContent='Purani keys is browser se mita di gayi hain.'}
async function migrateLegacyKeys(){
 const geminiKey=$('#migrationGem').value.trim(),groqKey=$('#migrationGroq').value.trim();
 if(!geminiKey&&!groqKey){$('#legacyStatus').textContent='Kam az kam aik API key daalein.';return}
 $('#legacyStatus').textContent='Local .env mein keys transfer ho rahi hain...';
 try{
  const r=await fetch('/api/migrate-keys',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({geminiKey,groqKey})});
  let d;try{d=await r.json()}catch(e){throw new Error('Local server ka jawab parh nahi saka')}
  if(!r.ok)throw new Error(d.error||'Transfer fail hua (HTTP '+r.status+')');
  localStorage.removeItem('gemKey');localStorage.removeItem('groqKey');oldGemKey='';oldGroqKey='';
  $('#migrationGem').value='';$('#migrationGroq').value='';
  $('#legacyStatus').textContent='.env mein keys save ho gayi hain; browser copies mita di gayi hain.';
  loadAiStatus()
 }catch(e){$('#legacyStatus').textContent=(e.message||e)+' — server chala kar http://localhost:8000 kholen.'}
}
function saveSet(){try{ls.s('gnewsKey',$('#kn').value.trim());ls.s('kp',$('#kp').value.trim());$('#setErr').textContent='Settings browser mein save ho gayi hain.';$('#set').close()}catch(e){$('#setErr').textContent='Settings save nahi ho sakin: '+(e.message||e)}}
async function loadAiStatus(){try{const r=await fetch('/api/config');const d=await r.json();if(!r.ok)throw new Error(d.error||'HTTP '+r.status);$('#aiStatus').textContent='Gemini: '+(d.geminiConfigured?'configured':'missing')+' • Groq fallback: '+(d.groqConfigured?'configured':'missing')+' • GNews: '+(d.gnewsConfigured?'configured':'missing')}catch(e){$('#aiStatus').textContent='AI status nahi mil saka: '+(e.message||e)}}
const px=u=>ls.g('kp')?ls.g('kp')+encodeURIComponent(u):(location.protocol.startsWith('http')?'/proxy?url='+encodeURIComponent(u):u);

async function ai(prompt,json){
 if(!location.protocol.startsWith('http'))throw new Error('AI ke liye server chalayein: python server.py, phir http://localhost:8000 kholen');
 const r=await fetch('/api/ai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt,json})});
 let d;try{d=await r.json()}catch(e){throw new Error('AI server ka jawab parh nahi saka (HTTP '+r.status+')')}
 if(!r.ok)throw new Error(d.error||'AI server error HTTP '+r.status);
 if(typeof d.text!=='string'||!d.text.trim())throw new Error('AI ne jawab nahi diya, dobara koshish karein');
 return d.text
}

/* ---------- MARKET (PSX Data Portal, live) ---------- */
const IDX=['KSE100','KSE30','KMI30','ALLSHR','KMIALLSHR','BKTI','OGTI'];
let SYMS=[],cur='KSE100';
async function jget(u){const r=await fetch(px(u));if(!r.ok)throw new Error('HTTP '+r.status);return r.json()}
async function psxQuote(sym){
 const isIndex=IDX.includes(sym),url=isIndex?'https://dps.psx.com.pk/indices':`https://dps.psx.com.pk/company/${encodeURIComponent(sym)}`;
 const r=await fetch(px(url));if(!r.ok)throw new Error('PSX quote HTTP '+r.status);
 const doc=new DOMParser().parseFromString(await r.text(),'text/html');
 const number=el=>{if(!el)return null;const raw=(el.getAttribute('data-order')||el.textContent||'').replace(/,/g,'').replace(/^[^\d-]+/,'').replace(/[^\d.-]/g,'');if(!raw)return null;const n=Number(raw);return Number.isFinite(n)?n:null};
 let price,change,high,low,volume,previousClose,name='',asOf='';
 if(isIndex){
  const row=[...doc.querySelectorAll('#indicesTable tbody tr')].find(x=>x.querySelector('a[data-code]')?.dataset.code.toUpperCase()===sym);
  const cells=row?.querySelectorAll('td');if(!cells||cells.length<5)throw new Error('PSX index quote nahi mila');
  name=sym;high=number(cells[1]);low=number(cells[2]);price=number(cells[3]);change=number(cells[4]);volume=null;
  previousClose=price!==null&&change!==null?price-change:null;
  asOf=doc.querySelector('#indicesTable > div')?.textContent.trim()||'';
 }else{
  price=number(doc.querySelector('.quote__close'));
  const changeBox=doc.querySelector('.quote__change'),magnitude=number(changeBox?.querySelector('.change__value'));
  change=magnitude===null?null:(changeBox?.classList.contains('change__text--neg')?-Math.abs(magnitude):Math.abs(magnitude));
  const stats=[...doc.querySelectorAll('.company__quote .stats_item')];
  const stat=label=>stats.find(x=>x.querySelector('.stats_label')?.textContent.trim().toUpperCase()===label)?.querySelector('.stats_value');
  high=number(stat('HIGH'));low=number(stat('LOW'));volume=number(stat('VOLUME'));previousClose=number(stat('LDCP'));
  name=doc.querySelector('.quote__name')?.childNodes[0]?.textContent.trim()||sym;
  asOf=doc.querySelector('.quote__date')?.textContent.trim()||'';
 }
 if(price===null)throw new Error('PSX latest quote nahi mila ('+sym+')');
 return{price,change,high,low,volume,previousClose,name,asOf};
}
async function series(sym,type='int'){
 let d;
 try{d=await jget(`https://dps.psx.com.pk/timeseries/${type}/${encodeURIComponent(sym.toUpperCase())}`)}
 catch(e){if(!(e instanceof Error)||!/^HTTP 404\b/.test(e.message))throw e;const quote=await psxQuote(sym.toUpperCase());const a=[[Date.now(),quote.price,quote.volume||0]];a.quote=quote;return a}
 const a=(d.data||[]).map(x=>[x[0]<1e12?x[0]*1000:x[0],+x[1],+x[2]||0]).sort((p,q)=>p[0]-q[0]);
 if(!a.length)throw new Error('Is symbol ka data nahi mila (symbol check karein)');return a}
async function loadSyms(){
 let list;
 try{const d=await jget('https://dps.psx.com.pk/symbols');list=(Array.isArray(d)?d:d.data||[]).map(x=>Array.isArray(x)?{s:x[0],n:x[1]||''}:{s:x.symbol||x.s,n:x.name||x.n||'',x:x.isDebt||x.isETF}).filter(x=>x.s&&!x.x)}catch(e){list=[]}
 if(!list.length)list=['OGDC','PPL','HUBC','LUCK','ENGRO','FFC','MEBL','UBL','HBL','PSO','MCB','EFERT','SYS','NBP','MARI','POL','BAHL','FCCL','DGKC'].map(s=>({s,n:''}));
 SYMS=list.sort((p,q)=>p.s.localeCompare(q.s));
 $('#dd').innerHTML='<optgroup label="Indices">'+IDX.map(i=>`<option>${i}</option>`).join('')+'</optgroup><optgroup label="Stocks">'+SYMS.map(x=>`<option value="${esc(x.s)}">${esc(x.s)}${x.n?' — '+esc(x.n):''}</option>`).join('')+'</optgroup>';
 $('#sl').innerHTML=SYMS.map(x=>`<option value="${esc(x.s)}">${esc(x.n)}</option>`).join('')}
async function loadChart(sym){
 clearTimeout(timer);
 sym=(sym||$('#sym').value.trim()||$('#dd').value||'KSE100').toUpperCase();cur=sym;
 const tf=$('#tf').value;if([...$('#dd').options].some(o=>o.value===sym||o.text===sym))$('#dd').value=sym;
 $('#src').innerHTML='<span class="load">Live data aa raha hai...</span>';
 try{
  let a=await series(sym,tf);const quote=a.quote;if(tf==='eod')a=a.slice(-180);
  const last=a.at(-1)[1],base=quote?.previousClose??(tf==='eod'&&a.length>1?a.at(-2)[1]:a[0][1]),c=quote?.change??(last-base);
  const ps=a.map(x=>x[1]);
  $('#nm').textContent=(quote?.name||SYMS.find(x=>x.s===sym)?.n||'')+' ('+sym+')';
  $('#px').textContent=fmt(last);
  $('#chg').innerHTML=`<span class="${c>=0?'up':'dn'}">${c>=0?'▲':'▼'} ${fmt(c)} (${fmt(c/base*100)}%)</span>`;
  $('#hi').textContent=fmt(quote?.high??Math.max(...ps));$('#lo').textContent=fmt(quote?.low??Math.min(...ps));
  $('#vo').textContent=quote?(quote.volume==null?'-':fmt(quote.volume)):(tf==='int'?fmt(a.reduce((t,x)=>t+x[2],0)):fmt(a.at(-1)[2]));
  $('#src').textContent=quote?`🟡 PSX latest quote${quote.asOf?' • '+quote.asOf:''} • Historical chart feed is unavailable; latest quote only.`:'🟢 Live: PSX Data Portal • '+new Date().toLocaleTimeString()+(tf==='int'?' • har 30 sec update':'');
  const col=c>=0?'#34d399':'#f87171';
  const data={labels:a.map(x=>tf==='int'?new Date(x[0]).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}):new Date(x[0]).toLocaleDateString('en-GB',{day:'2-digit',month:'short'})),datasets:[{data:ps,borderColor:col,backgroundColor:col+'22',fill:true,pointRadius:quote?4:0,tension:.25,borderWidth:2}]};
  if(chart){chart.data=data;chart.update()}else chart=new Chart($('#ch'),{type:'line',data,options:{maintainAspectRatio:false,interaction:{intersect:false,mode:'index'},plugins:{legend:{display:false}},scales:{x:{ticks:{color:'#8ea0c4',maxTicksLimit:6},grid:{display:false}},y:{ticks:{color:'#8ea0c4'},grid:{color:'#22304f'}}}}});
  if(tf==='int')timer=setTimeout(()=>loadChart(cur),30000)
 }catch(e){const hint=e.message==='Failed to fetch'&&location.protocol==='file:'?' App ko python server.py chala kar http://localhost:8000 se kholen.':'';$('#src').textContent='❌ '+(e.message||e)+hint}}

/* ---------- NEWS ---------- */
async function loadNews(){
 const cfg=await fetch('/api/config').then(r=>r.json()).catch(()=>({}));const k=ls.g('gnewsKey');if(!cfg.gnewsConfigured&&!k){$('#set').showModal();return}
 const box=$('#newsBox');box.innerHTML='<div class="card load">Khabrain aa rahi hain...</div>';
 try{
  const q=encodeURIComponent('"Pakistan Stock Exchange" OR PSX OR "KSE-100"');
  const r=await fetch(px(`https://gnews.io/api/v4/search?q=${q}&lang=en&max=8&sortby=publishedAt&apikey=${cfg.gnewsConfigured?'SERVER':encodeURIComponent(k)}`));
  const d=await r.json();if(d.errors)throw new Error([].concat(d.errors).join(', ')+' — Settings mein GNews ki apni key (gnews.io dashboard se) bina extra space ke daalein. Gemini key yahan na daalein.');
  const arts=d.articles||[];if(!arts.length){box.innerHTML='<div class="card">Koi khabar nahi mili.</div>';return}
  box.innerHTML=arts.map((a,i)=>`<div class="card news"><h3>${esc(a.title)}</h3><div class="mut">${esc(a.source.name)} • ${new Date(a.publishedAt).toLocaleString()}</div><div id="n${i}" class="load" style="margin-top:8px">Impact analyze ho raha hai...</div><a href="${esc(a.url)}" target="_blank" rel="noopener" class="mut">Poori khabar ➜</a></div>`).join('');
  const list=arts.map((a,i)=>`${i}. ${a.title} — ${a.description||''}`).join('\n');
  const out=JSON.parse(await ai(`In khabron ka PSX par asar batao. Sirf JSON do: {"items":[{"i":0,"khulasa":"2 jumlon ka Roman Urdu khulasa","impact":"Positive|Negative|Neutral","sectors":"mutasir sectors/stocks","wajah":"asar ki wajah Roman Urdu mein"}]}\n${list}`,true));
  out.items.forEach(x=>{const e=$('#n'+x.i);if(!e)return;e.className='';e.innerHTML=`<span class="tag ${esc(x.impact)}">${esc(x.impact)}</span> <span class="mut">${esc(x.sectors)}</span><div class="ai">${esc(x.khulasa)}\n\n<b>Asar:</b> ${esc(x.wajah)}</div>`})
 }catch(e){box.innerHTML=`<div class="card dn">${esc(e.message||e)}</div>`}}

/* ---------- PORTFOLIO ---------- */
function savePF(){ls.s('pf',JSON.stringify(pf));drawPF()}
function addPF(){const s=$('#ps').value.trim().toUpperCase(),q=+$('#pq').value,b=+$('#pb').value,c=+$('#pc').value||b;if(!s||!q||!b)return;pf.push({s,q,b,c});['ps','pq','pb','pc'].forEach(i=>$('#'+i).value='');savePF()}
function delPF(i){pf.splice(i,1);savePF()}
async function refreshPF(){for(const p of pf){try{p.c=(await series(p.s)).at(-1)[1]}catch(e){}}savePF()}
function drawPF(){
 let inv=0,cur=0;
 $('#pfb').innerHTML=pf.map((p,i)=>{const pl=(p.c-p.b)*p.q;inv+=p.b*p.q;cur+=p.c*p.q;return`<tr><td>${esc(p.s)}</td><td>${p.q}</td><td>${fmt(p.b)}</td><td>${fmt(p.c)}</td><td class="${pl>=0?'up':'dn'}">${fmt(pl)}</td><td><button class="x" onclick="delPF(${i})">✕</button></td></tr>`}).join('');
 $('#inv').textContent=fmt(inv);$('#cur').textContent=fmt(cur);const t=cur-inv;$('#pl').textContent=fmt(t);$('#pl').className='big '+(t>=0?'up':'dn');
 const data={labels:pf.map(p=>p.s),datasets:[{data:pf.map(p=>p.c*p.q),backgroundColor:['#22d3a0','#6366f1','#f59e0b','#ef4444','#38bdf8','#a78bfa','#f472b6','#84cc16'],borderWidth:0}]};
 if(pie){pie.data=data;pie.update()}else pie=new Chart($('#pie'),{type:'doughnut',data,options:{maintainAspectRatio:false,plugins:{legend:{position:'right',labels:{color:'#e8eefc'}}}}})}
async function advice(){
 if(!pf.length){$('#adv').innerHTML='<div class="ai">Pehle shares add karein.</div>';return}
 $('#adv').innerHTML='<div class="ai load">Jaiza ho raha hai...</div>';
 try{const t=await ai('Mera PSX portfolio (symbol, qty, buy price, current price):\n'+pf.map(p=>`${p.s}, ${p.q}, ${p.b}, ${p.c}`).join('\n')+'\nDiversification, risk, sab se achi aur kamzor holdings ka jaiza do. Chhote bullet points mein.');$('#adv').innerHTML=`<div class="ai">${esc(t)}</div>`}
 catch(e){$('#adv').innerHTML=`<div class="ai dn">${esc(e.message)}</div>`}}

/* ---------- DOCUMENTS ---------- */
pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
$('#pdf').onchange=async e=>{const f=e.target.files[0];if(!f)return;$('#docOut').innerHTML='<div class="ai load">PDF parhi ja rahi hai...</div>';
 try{const p=await pdfjsLib.getDocument({data:await f.arrayBuffer()}).promise;let t='';for(let i=1;i<=Math.min(p.numPages,15);i++){t+=(await(await p.getPage(i)).getTextContent()).items.map(x=>x.str).join(' ')+'\n'}
 $('#dtx').value=t.trim();$('#docOut').innerHTML=`<div class="mut">${p.numPages} pages mein se text nikal liya. Ab "samjhao" dabayein.</div>`}
 catch(err){$('#docOut').innerHTML='<div class="ai dn">PDF nahi parh saka (scanned ho sakti hai). Text paste karein.</div>'}};
async function explainDoc(){
 const t=$('#dtx').value.trim().slice(0,12000);if(!t)return;
 $('#docOut').innerHTML='<div class="ai load">Samjha raha hoon...</div>';
 try{const r=await ai('Yeh broker/market document hai. Asaan Roman Urdu mein samjhao: 1) Yeh kya hai 2) Aham numbers/baatein 3) Mere liye kya matlab hai 4) Kisi cheez par ehtiyat karni chahiye. Mushkil lafzon ki wazahat karo.\n\n'+t);$('#docOut').innerHTML=`<div class="ai">${esc(r)}</div>`}
 catch(e){$('#docOut').innerHTML=`<div class="ai dn">${esc(e.message)}</div>`}}

drawPF();loadSyms().then(()=>loadChart("KSE100"));
</script></body></html>
"""


class ProviderError(Exception):
    pass


def post_json(url, headers, payload, provider):
    request = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={**headers, "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=45) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        try:
            details = json.loads(error.read().decode("utf-8"))
            message = details.get("error", {}).get("message") or details.get("message")
        except (ValueError, AttributeError):
            message = None
        raise ProviderError(f"{provider} HTTP {error.code}: {message or error.reason}") from error
    except (urllib.error.URLError, TimeoutError, UnicodeDecodeError, json.JSONDecodeError) as error:
        raise ProviderError(f"{provider} request failed: {error}") from error


def gemini_response(api_key, prompt, wants_json):
    payload = {
        "model": "gemini-3.8-flash",
        "input": prompt,
        "system_instruction": AI_SYSTEM_INSTRUCTION,
        "generation_config": {"temperature": 0.3},
    }
    if wants_json:
        payload["response_format"] = {"type": "text", "mime_type": "application/json"}
    data = post_json(
        "https://generativelanguage.googleapis.com/v1beta/interactions",
        {"x-goog-api-key": api_key},
        payload,
        "Gemini",
    )
    text = data.get("output_text")
    if not text:
        text = "".join(
            part.get("text", "")
            for step in data.get("steps", [])
            if step.get("type") == "model_output"
            for part in step.get("content", [])
            if part.get("type") == "text"
        )
    if not text:
        raise ProviderError("Gemini ne jawab nahi diya")
    return text


def groq_response(api_key, prompt, wants_json):
    payload = {
        "model": "llama-3.3-70b-versatile",
        "messages": [
            {"role": "system", "content": AI_SYSTEM_INSTRUCTION},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.3,
    }
    if wants_json:
        payload["response_format"] = {"type": "json_object"}
    data = post_json(
        "https://api.groq.com/openai/v1/chat/completions",
        {"Authorization": f"Bearer {api_key}"},
        payload,
        "Groq",
    )
    text = data.get("choices", [{}])[0].get("message", {}).get("content")
    if not isinstance(text, str) or not text.strip():
        raise ProviderError("Groq ne jawab nahi diya")
    return text


def generate_ai_response(prompt, wants_json):
    gemini_key = os.environ.get("GEMINI_API_KEY", "").strip()
    groq_key = os.environ.get("GROQ_API_KEY", "").strip()
    if not gemini_key and not groq_key:
        raise ProviderError("Server ki .env file mein Gemini ya Groq API key set karein")

    gemini_error = None
    if gemini_key:
        try:
            return {"text": gemini_response(gemini_key, prompt, wants_json), "provider": "Gemini"}
        except ProviderError as error:
            gemini_error = error
            if not groq_key:
                raise

    if groq_key:
        try:
            return {"text": groq_response(groq_key, prompt, wants_json), "provider": "Groq"}
        except ProviderError as error:
            if gemini_error:
                raise ProviderError(f"{gemini_error}; Groq fallback bhi fail hua ({error})") from error
            raise
    raise gemini_error


def save_api_keys_to_env(gemini_key, groq_key):
    updates = {}
    if gemini_key:
        updates["GEMINI_API_KEY"] = gemini_key
    if groq_key:
        updates["GROQ_API_KEY"] = groq_key
    env_path = BASE_DIR / ".env"
    lines = env_path.read_text(encoding="utf-8").splitlines() if env_path.exists() else []
    found = set()
    for index, line in enumerate(lines):
        key, separator, _ = line.partition("=")
        key = key.removeprefix("export ").strip()
        if separator and key in updates:
            lines[index] = f"{key}={updates[key]}"
            found.add(key)
    for key, value in updates.items():
        if key not in found:
            lines.append(f"{key}={value}")

    temporary_path = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="w",
            encoding="utf-8",
            newline="\n",
            dir=BASE_DIR,
            prefix=".env.",
            suffix=".tmp",
            delete=False,
        ) as temporary_file:
            temporary_file.write("\n".join(lines) + "\n")
            temporary_path = Path(temporary_file.name)
        if os.name != "nt":
            os.chmod(temporary_path, 0o600)
        os.replace(temporary_path, env_path)
    finally:
        if temporary_path and temporary_path.exists():
            temporary_path.unlink()

    for key, value in updates.items():
        os.environ[key] = value


class H(BaseHTTPRequestHandler):
    def authorized(self):
        if not APP_PASSWORD:
            return True
        header = self.headers.get("Authorization", "")
        if header.startswith("Basic "):
            try:
                _, _, password = base64.b64decode(header[6:]).decode("utf-8").partition(":")
                return hmac.compare_digest(password.encode(), APP_PASSWORD.encode())
            except Exception:
                return False
        return False

    def deny(self):
        body = b"Password chahiye"
        self.send_response(401)
        self.send_header("WWW-Authenticate", 'Basic realm="PSX Dashboard"')
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/healthz":
            return self.reply(200, b"ok", "text/plain; charset=utf-8")
        if not self.authorized():
            return self.deny()
        if self.path == "/api/config":
            return self.reply_json(
                200,
                {
                    "geminiConfigured": bool(os.environ.get("GEMINI_API_KEY", "").strip()),
                    "groqConfigured": bool(os.environ.get("GROQ_API_KEY", "").strip()),
                    "gnewsConfigured": bool(os.environ.get("GNEWS_API_KEY", "").strip()),
                },
            )
        if self.path.startswith("/proxy?url="):
            query = urllib.parse.parse_qs(urllib.parse.urlsplit(self.path).query)
            url = query.get("url", [""])[0]
            parsed_url = urllib.parse.urlparse(url)
            if parsed_url.scheme != "https" or parsed_url.hostname not in ALLOWED:
                return self.reply(403, b"blocked", "text/plain; charset=utf-8")
            gnews_key = os.environ.get("GNEWS_API_KEY", "").strip()
            if parsed_url.hostname == "gnews.io" and gnews_key:
                params = [(k, v) for k, v in urllib.parse.parse_qsl(parsed_url.query) if k != "apikey"]
                params.append(("apikey", gnews_key))
                url = urllib.parse.urlunparse(parsed_url._replace(query=urllib.parse.urlencode(params)))
            try:
                request = urllib.request.Request(
                    url,
                    headers={"User-Agent": "Mozilla/5.0"},
                )
                with urllib.request.urlopen(request, timeout=20) as response:
                    self.reply(response.status, response.read(), response.headers.get_content_type())
            except urllib.error.HTTPError as error:
                self.reply(error.code, error.read(), "application/json")
            except urllib.error.URLError as error:
                self.reply(502, str(error.reason).encode("utf-8"), "text/plain; charset=utf-8")
            return
        if self.path not in ("/", "/psx-dashboard.html"):
            return self.reply(404, b"not found", "text/plain; charset=utf-8")
        try:
            body = HTML.encode("utf-8")
        except OSError as error:
            return self.reply(500, str(error).encode("utf-8"), "text/plain; charset=utf-8")
        self.reply(200, body, "text/html; charset=utf-8")

    def do_POST(self):
        if not self.authorized():
            return self.deny()
        if self.path == "/api/migrate-keys":
            return self.migrate_keys()
        if self.path != "/api/ai":
            return self.reply(404, b"not found", "text/plain; charset=utf-8")
        try:
            content_length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            return self.reply_json(400, {"error": "Invalid request length"})
        if content_length <= 0 or content_length > MAX_AI_REQUEST_BYTES:
            return self.reply_json(413, {"error": "AI request is empty or too large"})
        try:
            payload = json.loads(self.rfile.read(content_length).decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            return self.reply_json(400, {"error": "Invalid JSON request"})
        prompt = payload.get("prompt") if isinstance(payload, dict) else None
        wants_json = payload.get("json", False) if isinstance(payload, dict) else False
        if not isinstance(prompt, str) or not prompt.strip():
            return self.reply_json(400, {"error": "Prompt is required"})
        if len(prompt) > 50_000 or not isinstance(wants_json, bool):
            return self.reply_json(400, {"error": "Invalid prompt or JSON mode"})
        try:
            result = generate_ai_response(prompt, wants_json)
        except ProviderError as error:
            status = 503 if "API key set karein" in str(error) else 502
            return self.reply_json(status, {"error": str(error)})
        self.reply_json(200, result)

    def migrate_keys(self):
        host = urllib.parse.urlsplit("//" + self.headers.get("Host", "")).hostname
        origin = urllib.parse.urlsplit(self.headers.get("Origin", ""))
        origin_host = origin.hostname
        try:
            is_loopback = ipaddress.ip_address(self.client_address[0]).is_loopback
        except ValueError:
            is_loopback = False
        if (
            not is_loopback
            or host not in ("localhost", "127.0.0.1", "::1")
            or origin.scheme not in ("http", "https")
            or origin_host != host
        ):
            return self.reply_json(403, {"error": "Keys sirf isi computer ke local server par save ki ja sakti hain"})

        try:
            content_length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            return self.reply_json(400, {"error": "Invalid request length"})
        if content_length <= 0 or content_length > 16 * 1024:
            return self.reply_json(413, {"error": "Invalid key request size"})
        try:
            payload = json.loads(self.rfile.read(content_length).decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            return self.reply_json(400, {"error": "Invalid JSON request"})
        if not isinstance(payload, dict):
            return self.reply_json(400, {"error": "Invalid key request"})
        gemini_key = payload.get("geminiKey", "")
        groq_key = payload.get("groqKey", "")
        if not isinstance(gemini_key, str) or not isinstance(groq_key, str):
            return self.reply_json(400, {"error": "Invalid API key format"})
        gemini_key, groq_key = gemini_key.strip(), groq_key.strip()
        key_pattern = re.compile(r"[A-Za-z0-9._-]{1,4096}\Z")
        if (gemini_key and not key_pattern.fullmatch(gemini_key)) or (
            groq_key and not key_pattern.fullmatch(groq_key)
        ):
            return self.reply_json(400, {"error": "Invalid API key format"})
        if not gemini_key and not groq_key:
            return self.reply_json(400, {"error": "Koi saved API key nahi mili"})
        try:
            save_api_keys_to_env(gemini_key, groq_key)
        except OSError as error:
            return self.reply_json(500, {"error": f".env file save nahi hui: {error}"})
        self.reply_json(200, {"saved": True})

    def reply_json(self, code, data):
        body = json.dumps(data).encode("utf-8")
        self.reply(code, body, "application/json; charset=utf-8")

    def reply(self, code, body, content_type):
        self.send_response(code)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(body)


load_env_file()
APP_PASSWORD = os.environ.get("APP_PASSWORD", "").strip()
ON_HF = bool(os.environ.get("SPACE_ID"))
PORT = int(os.environ.get("PORT", 7860 if ON_HF else 8000))
HOST = os.environ.get("HOST", "0.0.0.0" if ON_HF else "127.0.0.1")
if __name__ == "__main__":
    url = f"http://localhost:{PORT}"
    print(f"Chal gaya: {url}")
    if not ON_HF:
        import threading
        import webbrowser

        threading.Timer(1.0, lambda: webbrowser.open(url)).start()
    ThreadingHTTPServer((HOST, PORT), H).serve_forever()
