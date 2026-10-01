async function startPremiumPayment(){
 try{
  if(!supabaseClient)throw new Error("Configure Supabase.");
  const {data:{session}}=await supabaseClient.auth.getSession();
  if(!session){showAuth();return}
  const r=await fetch(`${API_BASE}/api/payments/cinetpay/create`,{method:"POST",headers:{Authorization:`Bearer ${session.access_token}`}});
  const d=await r.json(); if(!r.ok)throw new Error(d.error||"Paiement impossible");
  localStorage.setItem("PREDICTIA_LAST_TX",d.transaction_id); location.href=d.payment_url;
 }catch(e){alert(e.message)}
}
async function checkPaymentReturn(){
 const tx=new URLSearchParams(location.search).get("transaction_id"); if(!tx||!supabaseClient)return;
 const {data:{session}}=await supabaseClient.auth.getSession(); if(!session)return;
 const r=await fetch(`${API_BASE}/api/payments/status/${encodeURIComponent(tx)}`,{headers:{Authorization:`Bearer ${session.access_token}`}});
 const d=await r.json(); alert(d.status==="ACCEPTED"?"Paiement confirmé. Premium est activé.":"Paiement en cours de vérification.");
 history.replaceState({},document.title,location.pathname);
}
document.addEventListener("DOMContentLoaded",()=>setTimeout(checkPaymentReturn,800));
