/*
 PredictIA V4 - Authentification Supabase
 IMPORTANT :
 - Utiliser uniquement la clé publishable/anon côté navigateur.
 - Ne jamais mettre service_role ici.
*/
const SUPABASE_URL = localStorage.getItem("PREDICTIA_SUPABASE_URL") || "https://TON-PROJET.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = localStorage.getItem("PREDICTIA_SUPABASE_KEY") || "TA_CLE_PUBLISHABLE";

let supabaseClient = null;

function initSupabase(){
  if(!window.supabase || SUPABASE_URL.includes("TON-PROJET") || SUPABASE_PUBLISHABLE_KEY.includes("TA_CLE")){
    return false;
  }
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  return true;
}

async function registerUser(email,password,fullName){
  if(!supabaseClient) throw new Error("Supabase n'est pas configuré.");
  const {data,error}=await supabaseClient.auth.signUp({
    email,password,
    options:{data:{full_name:fullName}}
  });
  if(error) throw error;
  return data;
}

async function loginUser(email,password){
  if(!supabaseClient) throw new Error("Supabase n'est pas configuré.");
  const {data,error}=await supabaseClient.auth.signInWithPassword({email,password});
  if(error) throw error;
  return data;
}

async function logoutUser(){
  if(supabaseClient) await supabaseClient.auth.signOut();
  updateAuthUI(null);
}

async function currentUser(){
  if(!supabaseClient) return null;
  const {data}=await supabaseClient.auth.getUser();
  return data.user || null;
}

async function getProfile(userId){
  if(!supabaseClient || !userId) return null;
  const {data,error}=await supabaseClient
    .from("profiles")
    .select("id,full_name,plan,premium_until")
    .eq("id",userId)
    .maybeSingle();
  if(error) throw error;
  return data;
}

async function saveAnalysisHistory(fixtureId, market, result){
  const user=await currentUser();
  if(!supabaseClient || !user) return;
  await supabaseClient.from("analysis_history").insert({
    user_id:user.id, fixture_id:fixtureId, market, result
  });
}

async function getHistory(){
  const user=await currentUser();
  if(!supabaseClient || !user) return [];
  const {data,error}=await supabaseClient
    .from("analysis_history")
    .select("*")
    .eq("user_id",user.id)
    .order("created_at",{ascending:false})
    .limit(30);
  if(error) throw error;
  return data || [];
}

function updateAuthUI(user,profile=null){
  const btn=document.getElementById("authButton");
  const account=document.getElementById("accountBox");
  if(!btn) return;

  if(user){
    btn.textContent="Mon compte";
    btn.onclick=()=>openAccount(profile);
    if(account) account.innerHTML=`<span>Connecté : ${escapeHtml(user.email)}</span>`;
  }else{
    btn.textContent="Connexion";
    btn.onclick=()=>showAuth();
    if(account) account.innerHTML="";
  }
}

function escapeHtml(value){
  return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
}

function showAuth(){
  const modal=document.getElementById("modal");
  const box=document.querySelector(".modal-box");
  modal.classList.remove("hidden");
  box.innerHTML=`
    <button class="close" onclick="closeModal()">×</button>
    <p class="eyebrow">COMPTE PREDICTIA</p>
    <h2 id="authTitle">Connexion</h2>
    <input id="authName" placeholder="Nom complet" style="display:none">
    <input id="authEmail" type="email" placeholder="Adresse e-mail">
    <input id="authPassword" type="password" placeholder="Mot de passe">
    <p id="authError" style="color:#ff8790;font-size:13px"></p>
    <button id="authSubmit" class="btn btn-primary full" onclick="submitAuth()">Se connecter</button>
    <button class="btn btn-outline full" style="margin-top:10px" onclick="toggleAuthMode()">Créer un compte</button>
  `;
}

let authMode="login";

function toggleAuthMode(){
  authMode=authMode==="login"?"register":"login";
  const title=document.getElementById("authTitle");
  const name=document.getElementById("authName");
  const submit=document.getElementById("authSubmit");
  const toggle=document.querySelector(".modal-box button.btn-outline");
  title.textContent=authMode==="login"?"Connexion":"Créer un compte";
  name.style.display=authMode==="register"?"block":"none";
  submit.textContent=authMode==="login"?"Se connecter":"Créer mon compte";
  toggle.textContent=authMode==="login"?"Créer un compte":"J'ai déjà un compte";
}

async function submitAuth(){
  const error=document.getElementById("authError");
  error.textContent="";
  try{
    const email=document.getElementById("authEmail").value.trim();
    const password=document.getElementById("authPassword").value;
    if(authMode==="register"){
      const name=document.getElementById("authName").value.trim();
      if(!name) throw new Error("Entre ton nom.");
      await registerUser(email,password,name);
      error.style.color="#19d27c";
      error.textContent="Compte créé. Vérifie ton e-mail si la confirmation est activée.";
      authMode="login";
    }else{
      await loginUser(email,password);
      const user=await currentUser();
      const profile=await getProfile(user.id);
      updateAuthUI(user,profile);
      closeModal();
    }
  }catch(e){
    error.textContent=e.message || "Une erreur est survenue.";
  }
}

function openAccount(profile){
  const modal=document.getElementById("modal");
  const box=document.querySelector(".modal-box");
  modal.classList.remove("hidden");
  const plan=profile?.plan || "free";
  box.innerHTML=`
    <button class="close" onclick="closeModal()">×</button>
    <p class="eyebrow">MON COMPTE</p>
    <h2>${escapeHtml(profile?.full_name || "Utilisateur")}</h2>
    <div class="prob-row"><span>Formule</span><b>${plan==="premium"?"PREMIUM":"GRATUIT"}</b></div>
    <div class="prob-row"><span>Premium jusqu'au</span><b>${profile?.premium_until ? new Date(profile.premium_until).toLocaleDateString("fr-FR") : "—"}</b></div>
    <button class="btn btn-primary full" onclick="showHistory()">Historique des analyses</button>
    <button class="btn btn-outline full" style="margin-top:10px" onclick="logoutUser();closeModal()">Déconnexion</button>
  `;
}

async function showHistory(){
  const box=document.querySelector(".modal-box");
  try{
    const history=await getHistory();
    box.innerHTML=`
      <button class="close" onclick="closeModal()">×</button>
      <p class="eyebrow">HISTORIQUE</p><h2>Mes analyses</h2>
      ${history.length ? history.map(x=>`
        <div style="padding:12px 0;border-bottom:1px solid #17304a">
          <b>${escapeHtml(x.market||"Analyse")}</b>
          <div style="color:#91a1b5;font-size:12px">${new Date(x.created_at).toLocaleString("fr-FR")}</div>
        </div>`).join("") : `<p style="color:#91a1b5">Aucune analyse enregistrée.</p>`}
    `;
  }catch(e){
    box.innerHTML+=`<p style="color:#ff8790">${escapeHtml(e.message)}</p>`;
  }
}

document.addEventListener("DOMContentLoaded",async()=>{
  const ok=initSupabase();
  if(!ok) return;
  const user=await currentUser();
  const profile=user ? await getProfile(user.id) : null;
  updateAuthUI(user,profile);
});
