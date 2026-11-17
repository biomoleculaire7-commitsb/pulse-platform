# Intégration DAP → PULSE

La plateforme DAP envoie à PULSE, pour chaque parasite **confirmé par un expert**, uniquement :
parasite, wilaya (position approximative du chef-lieu), date. Aucun nom, âge ni identifiant patient n'est transmis
(le `patient_id` est un identifiant technique « DAP-<labo>-<dossier>-<parasite> », haché par PULSE).

## Configuration
1. Sur Render (service PULSE), définir `MASTER_API_KEY` (ou créer une clé d'API en écriture via `/api/auth/keys`).
2. Sur Render (service DAP), définir :
   - `DAP_PULSE_URL` = adresse du backend PULSE (ex. `https://pulse-backend-api.onrender.com`)
   - `DAP_PULSE_KEY` = la clé d'API PULSE
3. Redéployer DAP. Sans ces deux variables, l'envoi est désactivé.

Le compte central DAP voit alors, dans l'onglet « Carte », un bouton « Envoyer à PULSE » (resynchronisation).
