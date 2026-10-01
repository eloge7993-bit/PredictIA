# PredictIA V3 - Frontend connecté

## 1. Démarrer le backend
Dans le dossier backend de la V2 :
npm install
node server.js

Le serveur doit répondre sur :
http://localhost:3000/api/health

## 2. Ouvrir le frontend
Ouvre index.html avec un serveur local (Live Server de VS Code recommandé).

Le frontend appelle :
GET /api/health
GET /api/fixtures?date=YYYY-MM-DD
GET /api/predictions/:fixtureId

## 3. API réelle
Dans backend/.env :
API_FOOTBALL_KEY=ta_cle

Ne mets jamais cette clé dans script.js.

## 4. Si le backend est en ligne
Dans la console du navigateur :
localStorage.setItem("PREDICTIA_API","https://ton-backend.example.com")
Puis recharge la page.

## 5. Mode démo
Si le backend ou l'API est indisponible, PredictIA affiche automatiquement quelques matchs de démonstration.
