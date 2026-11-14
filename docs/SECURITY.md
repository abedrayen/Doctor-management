# Sécurité

| Sujet | Approche |
| --- | --- |
| Authentification | Mot de passe unique (médecin), haché Argon2id ; session gardée en mémoire côté Rust |
| Verrouillage | Inactivité (défaut 15 min, configurable) → `lock_session` + écran opaque ; déverrouillage par mot de passe |
| Base de données | Chiffrement complet SQLCipher ; clé générée au premier lancement, protégée par Windows DPAPI |
| Documents | Chiffrés (AES-256-GCM) sur disque ; l'interface ne reçoit que du base64 à la demande (aperçu/impression) |
| IPC | Commandes allow-listées uniquement ; aucun SQL ni accès fichier brut depuis l'interface |
| Audit | Action + identifiants + horodatage, sans contenu médical |
| Sauvegardes | Instantané cohérent, chiffré, somme de contrôle vérifiée avant restauration ; copie pré-restauration conservée |
| Réseau | Aucun appel sortant ; aucune police ni ressource distante (polices embarquées via `@fontsource`) |

## Côté interface

- Aucun secret ni donnée patient en `localStorage` ; l'état vit en mémoire React.
- Les pièces jointes sont lues dans le navigateur (`<input type="file">`) puis transmises à Rust ; la prévisualisation utilise des URL `blob:` révoquées à la fermeture.
- Les consultations finalisées ne sont jamais écrasées (amendements tracés).

## Risques connus

- DPAPI est lié au profil Windows : la perte du profil rend la base illisible sans sauvegarde + méthode de récupération de clé.
- Un logiciel malveillant s'exécutant avec les droits de l'utilisateur peut accéder aux données déverrouillées.
- Le verrouillage repose sur l'inactivité mesurée dans la fenêtre de l'application.
- `csp` est actuellement `null` dans `tauri.conf.json` : à durcir avant la mise en production.
