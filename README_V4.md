# PredictIA V4 - Comptes utilisateurs

## Installation

1. Utilise le schéma Supabase fourni dans la V2 :
   supabase/schema.sql

2. Dans `index.html`, Supabase est chargé automatiquement.

3. Configure les paramètres dans `auth.js` :
   SUPABASE_URL
   SUPABASE_PUBLISHABLE_KEY

Tu peux aussi les définir dans la console du navigateur :

localStorage.setItem("PREDICTIA_SUPABASE_URL","https://xxxx.supabase.co");
localStorage.setItem("PREDICTIA_SUPABASE_KEY","ta_cle_publishable");
location.reload();

## Fonctionnalités

- Création de compte
- Connexion
- Déconnexion
- Profil utilisateur
- Formule Free/Premium
- Historique des analyses
- Enregistrement des analyses dans Supabase

## Sécurité

Ne mets jamais la clé `service_role` dans le frontend.
La clé publishable/anon est la seule clé destinée au navigateur.

## Suite

La prochaine étape est le paiement Premium. Le serveur devra vérifier le paiement avant de modifier `profiles.plan` à `premium`.
