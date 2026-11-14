# Critères d'acceptation

## Généraux
- Interface entièrement en français ; dates `JJ/MM/AAAA`, heures 24 h, téléphones `+216 XX XXX XXX`, unités kg / cm / °C.
- Texte arabe accepté dans tous les champs de saisie (`dir="auto"`).
- Fonctionne sans connexion Internet.
- Chaque bouton est relié à une commande Tauri ; les erreurs sont affichées en clair.

## Accès
- Premier lancement : création du compte médecin (mot de passe ≥ 8 caractères).
- Verrouillage automatique après le délai configuré ; aucune donnée visible tant que la session est verrouillée.

## Patients
- Liste (référence, nom, naissance, âge, sexe, téléphone, dernière consultation) avec recherche et filtre d'archivage.
- Formulaire en 4 sections (personnelles, parents, naissance, antécédents) validé ; avertissement si doublon possible.
- Fiche avec alertes (allergies, maladies chroniques, vaccins en retard) et 7 onglets.

## Consultations
- Brouillon modifiable ; finalisation avec confirmation ; consultation finalisée jamais écrasée (amendement + motif).

## Croissance et vaccinations
- Courbes poids / taille / PC selon l'âge ; mention « échantillon local en attente de validation clinique » tant que non validé.
- Statuts Effectué, À venir, En retard, Non renseigné ; ajout et modification.

## Rendez-vous, documents, paramètres
- Vues jour / semaine / mois ; statuts Confirmé, En attente, Terminé, Annulé, Absent.
- Aperçu image/PDF et impression des documents.
- Paramètres du cabinet, préférences, changement de mot de passe, statut du chiffrement, sauvegarde / restauration avec confirmation.

## Qualité
- `npm test` et `npm run build` passent.
- `cargo test` (depuis `src-tauri`, avec `CARGO_TARGET_DIR` hors OneDrive) : tests Argon2, AES-GCM, migrations et seed.

## Production (Phase 6)
- Installateur Windows : `npm run tauri:build` produit NSIS + MSI.
- Les données restent dans `%APPDATA%\CabinetPediatrique\` (jamais dans le dossier d'installation).
- Désinstallation de l'application ne doit pas supprimer ce dossier de données.
- Signature de code : à configurer avec un certificat Authenticode avant déploiement clinique (`tauri.conf.json` / CI).
- Contenu clinique (calendrier vaccinal `TN-2024-review`, courbes OMS échantillon) : **à valider par le médecin** avant usage réel (`reviewed: false`).
- Revue juridique CNPD / protection des données : hors périmètre technique, obligatoire avant mise en production.
