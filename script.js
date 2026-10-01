/*
 PredictIA V3 - frontend connecté au backend
 Backend par défaut: http://localhost:3000
 Si le frontend est hébergé ailleurs, change API_BASE.
*/
const API_BASE = localStorage.getItem("PREDICTIA_API") || "http://localhost:3000";

const demoMatches = [
  {id:1,home:"Manchester City",away:"Arsenal",league:"Premier League",time:"20:00",h:61,d:22,a:17,over:68,btts:64,confidence:82},
  {id:2,home:"Real Madrid",away:"Barcelona",league:"La Liga",time:"21:00",h:58,d:24,a:18,over:71,btts:67,confidence:84},
  {id:3,home:"PSG",away:"Lyon",league:"Ligue 1",time:"19:00",h:64,d:21,a:15,over:70,btts:61,confidence:86}
];

let matches = [];
let usingDemo = false;

function todayISO(){
  const d = new Date();
  const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,"0"), day=String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}

async function api(path){
  const response = await fetch(`${API_BASE}${path}`);
  const data = await response.json().catch(()=>({}));
  if(!response.ok) throw new Error(data.error || `Erreur HTTP ${response.status}`);
  return data;
}

function setStatus(text, ok=true){
  const el=document.getElementById("apiStatus");
  if(!el) return;
  el.textContent=text;
  el.style.cssText=`padding:10px 14px;margin:0 0 20px;border-radius:10px;border:1px solid ${ok?"#19d27c":"#ff5c68"};color:${ok?"#19d27c":"#ff8790"};background:#0d1b2d`;
}

function normalizeFixture(f){
  const home=f.teams?.home?.name || "Équipe domicile";
  const away=f.teams?.away?.name || "Équipe extérieur";
  const league=f.league?.name || "Compétition";
  const date=f.fixture?.date ? new Date(f.fixture.date) : null;
  return {
    id:f.fixture?.id,
    home, away, league,
    time:date ? date.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"}) : "--:--",
    h:null,d:null,a:null,over:null,btts:null,confidence:null
  };
}

async function loadRealMatches(){
  const data=await api(`/api/fixtures?date=${todayISO()}`);
  const fixtures=Array.isArray(data.response) ? data.response : [];
  matches=fixtures.map(normalizeFixture);
  usingDemo=false;
  setStatus(`● Connecté au backend · ${matches.length} match(s) réel(s) chargé(s)`, true);
  renderMatches();
}

async function loadMatches(){
  try {
    await api("/api/health");
    await loadRealMatches();
  } catch(error) {
    matches=demoMatches;
    usingDemo=true;
    setStatus("Mode démonstration · backend/API non disponible", false);
    renderMatches();
  }
}

function renderMatches(){
  const grid=document.getElementById("matchGrid");
  if(!grid) return;
  const q=(document.getElementById("search")?.value||"").toLowerCase();
  const league=document.getElementById("league")?.value||"all";
  const filtered=matches.filter(m=>
    (league==="all" || m.league===league) &&
    `${m.home} ${m.away}`.toLowerCase().includes(q)
  );

  grid.innerHTML=filtered.map((m,i)=>`
    <article class="match-card">
      <div class="league">${m.league} · ${m.time}</div>
      <div class="teams"><span>${m.home}</span><span>VS</span><span>${m.away}</span></div>
      ${m.h !== null ? `
        <div class="prob-row"><span>Victoire ${m.home}</span><b>${m.h}%</b></div>
        <div class="prob-row"><span>Nul</span><b>${m.d}%</b></div>
        <div class="prob-row"><span>Victoire ${m.away}</span><b>${m.a}%</b></div>
        <div class="prob-row"><span>Over 2.5</span><b>${m.over}%</b></div>
        <div class="prob-row"><span>BTTS</span><b>${m.btts}%</b></div>
        <div class="confidence-line">● Confiance : ${m.confidence}%</div>
      ` : `<p style="color:#91a1b5">Données du match récupérées. Ouvre l'analyse pour charger les prédictions.</p>`}
      <button class="btn btn-primary analysis-btn" onclick="showAnalysis(${i})">Voir l'analyse</button>
    </article>
  `).join("") || "<p>Aucun match trouvé pour ces critères.</p>";
}

async function showAnalysis(index){
  const m=matches[index];
  const modal=document.getElementById("modal");
  const box=document.querySelector(".modal-box");
  modal.classList.remove("hidden");

  box.innerHTML=`
    <button class="close" onclick="closeModal()">×</button>
    <p class="eyebrow">${m.league}</p>
    <h2>${m.home} vs ${m.away}</h2>
    <p style="color:#91a1b5">Chargement de l'analyse réelle…</p>
  `;

  if(usingDemo || !m.id){
    renderAnalysis(m, box, "Données de démonstration");
    return;
  }

  try{
    const data=await api(`/api/predictions/${m.id}`);
    const prediction=data.response?.[0]?.predictions || data.response?.[0] || {};
    const percent=prediction.percent || {};
    const advice=prediction.advice || "";
    const h=parsePercent(percent.home);
    const d=parsePercent(percent.draw);
    const a=parsePercent(percent.away);
    const over=parsePercent(prediction.goals?.over || prediction.over);
    const btts=parsePercent(prediction.btts);

    renderAnalysis({
      ...m,
      h:h ?? m.h, d:d ?? m.d, a:a ?? m.a,
      over:over ?? m.over, btts:btts ?? m.btts,
      confidence:prediction.winner?.name ? 80 : null,
      advice
    }, box, "Données API-Football");
  }catch(error){
    box.innerHTML+=`<p style="color:#ff8790">Analyse indisponible : ${escapeHtml(error.message)}</p>`;
  }
}

function parsePercent(v){
  if(v===undefined || v===null || v==="") return null;
  const n=parseFloat(String(v).replace("%",""));
  return Number.isFinite(n)?n:null;
}

function renderAnalysis(m, box, source){
  const rows = [
    ["1", m.h],["X",m.d],["2",m.a],
    ["Over 2.5",m.over],["BTTS",m.btts]
  ].filter(x=>x[1]!==null && x[1]!==undefined);

  box.innerHTML=`
    <button class="close" onclick="closeModal()">×</button>
    <p class="eyebrow">${escapeHtml(source)}</p>
    <h2>${escapeHtml(m.home)} vs ${escapeHtml(m.away)}</h2>
    ${rows.map(([k,v])=>`<div class="prob-row"><span>${k}</span><b>${v}%</b></div>`).join("")}
    ${m.advice?`<div class="confidence-line">${escapeHtml(m.advice)}</div>`:""}
    <p style="color:#91a1b5;font-size:12px;margin-top:20px">
      Les probabilités sont des estimations statistiques. Elles ne garantissent pas le résultat d'un match.
    </p>
  `;
}

function escapeHtml(value){
  return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
}

function showLogin(){document.getElementById("modal").classList.remove("hidden")}
function closeModal(){document.getElementById("modal").classList.add("hidden")}

document.getElementById("search")?.addEventListener("input",renderMatches);
document.getElementById("league")?.addEventListener("change",renderMatches);
loadMatches();
