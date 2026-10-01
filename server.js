require("dotenv").config();
const express=require("express"), cors=require("cors"), axios=require("axios");
const {createClient}=require("@supabase/supabase-js");
const app=express(); app.use(cors()); app.use(express.json());
const PORT=process.env.PORT||3000, API_KEY=process.env.API_FOOTBALL_KEY;
const supabaseAdmin=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY);
const CP="https://api-checkout.cinetpay.com/v2";
const userFromToken=async(req)=>{const h=req.headers.authorization||"";if(!h.startsWith("Bearer "))return null;const {data}=await supabaseAdmin.auth.getUser(h.slice(7));return data.user||null};
app.get("/api/health",(q,s)=>s.json({ok:true,service:"PredictIA API",version:"5.0"}));
app.get("/api/fixtures",async(q,s)=>{try{const r=await axios.get("https://v3.football.api-sports.io/fixtures",{params:q.query,headers:{"x-apisports-key":API_KEY}});s.json(r.data)}catch(e){s.status(500).json({error:e.message})}});
app.get("/api/predictions/:id",async(q,s)=>{try{const r=await axios.get("https://v3.football.api-sports.io/predictions",{params:{fixture:q.params.id},headers:{"x-apisports-key":API_KEY}});s.json(r.data)}catch(e){s.status(500).json({error:e.message})}});
app.get("/api/odds/:id",async(q,s)=>{try{const r=await axios.get("https://v3.football.api-sports.io/odds",{params:{fixture:q.params.id},headers:{"x-apisports-key":API_KEY}});s.json(r.data)}catch(e){s.status(500).json({error:e.message})}});

app.post("/api/payments/cinetpay/create",async(req,s)=>{
 try{
  const user=await userFromToken(req); if(!user)return s.status(401).json({error:"Connexion requise"});
  const tx=`PIA-${Date.now()}-${user.id.slice(0,8)}`;
  await supabaseAdmin.from("payments").insert({transaction_id:tx,user_id:user.id,amount:2000,currency:"XOF",status:"PENDING"});
  const r=await axios.post(CP+"/payment",{apikey:process.env.CINETPAY_APIKEY,site_id:process.env.CINETPAY_SITE_ID,transaction_id:tx,amount:2000,currency:"XOF",description:"PredictIA Premium - 1 mois",customer_id:user.id,customer_name:user.user_metadata?.full_name||"Client",customer_email:user.email||"",notify_url:`${process.env.PUBLIC_API_URL}/api/payments/cinetpay/notify`,return_url:`${process.env.FRONTEND_URL}/?payment=return&transaction_id=${tx}`,channels:"ALL",metadata:JSON.stringify({user_id:user.id,product:"predictia_premium_1m"}),lang:"FR"});
  if(String(r.data.code)!=="201")return s.status(400).json({error:"Création CinetPay échouée",details:r.data});
  await supabaseAdmin.from("payments").update({payment_token:r.data.data.payment_token,payment_url:r.data.data.payment_url,raw_response:r.data}).eq("transaction_id",tx);
  s.json({transaction_id:tx,payment_url:r.data.data.payment_url});
 }catch(e){s.status(500).json({error:e.message})}
});

async function verify(tx){
 const r=await axios.post(CP+"/payment/check",{apikey:process.env.CINETPAY_APIKEY,site_id:process.env.CINETPAY_SITE_ID,transaction_id:tx});
 const t=r.data?.data||r.data?.transaction||{}; const paid=String(r.data?.code)==="00"||String(t.cpm_result)==="00"||String(t.status)==="ACCEPTED";
 const {data:p}=await supabaseAdmin.from("payments").select("*").eq("transaction_id",tx).maybeSingle();
 if(!p)return false;
 await supabaseAdmin.from("payments").update({status:paid?"ACCEPTED":"FAILED",provider_status:t.status||t.cpm_trans_status||null,raw_response:r.data,verified_at:new Date().toISOString()}).eq("transaction_id",tx);
 if(paid){const until=new Date();until.setMonth(until.getMonth()+1);await supabaseAdmin.from("profiles").update({plan:"premium",premium_until:until.toISOString()}).eq("id",p.user_id)}
 return paid;
}
app.post("/api/payments/cinetpay/notify",async(req,s)=>{try{const tx=req.body?.cpm_trans_id||req.body?.transaction_id;if(tx)await verify(tx);s.send("OK")}catch(e){s.send("OK")}});
app.get("/api/payments/status/:tx",async(req,s)=>{try{const u=await userFromToken(req);if(!u)return s.status(401).json({error:"Connexion requise"});const {data:p}=await supabaseAdmin.from("payments").select("*").eq("transaction_id",req.params.tx).eq("user_id",u.id).maybeSingle();if(!p)return s.status(404).json({error:"Paiement introuvable"});if(p.status==="PENDING")await verify(p.transaction_id);const {data:x}=await supabaseAdmin.from("payments").select("transaction_id,status,amount,currency,verified_at").eq("transaction_id",p.transaction_id).single();s.json(x)}catch(e){s.status(500).json({error:e.message})}});
app.listen(PORT,()=>console.log(`PredictIA V5: http://localhost:${PORT}`));
