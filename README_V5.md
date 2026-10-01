# PredictIA V5
Paiement Premium CinetPay de 2 000 XOF/mois.

1. Exécuter supabase/schema.sql dans Supabase.
2. Copier backend/.env.example vers backend/.env.
3. Renseigner les clés API.
4. `cd backend && npm install && node server.js`.
5. Déployer le backend avec une URL HTTPS publique.
6. Configurer le `PUBLIC_API_URL` et `FRONTEND_URL`.
7. Créer/configurer le compte marchand CinetPay.

Le backend vérifie la transaction auprès de CinetPay avant d'activer Premium.
Ne jamais exposer `CINETPAY_APIKEY` ou `SUPABASE_SERVICE_ROLE_KEY` dans le frontend.
