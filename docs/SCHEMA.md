# Schéma de données

Base SQLite chiffrée (SQLCipher), clés primaires UUID (`TEXT`), `FOREIGN KEY` activées, archivage logique (pas de suppression ordinaire des données cliniques).

## Fondation

| Table | Contenu |
| --- | --- |
| `doctors` | `id`, `display_name`, `specialty`, `password_hash` (Argon2id), horodatages |
| `application_settings` | Informations du cabinet, délai de verrouillage, durée de RDV par défaut |
| `audit_logs` | `action`, `entity_type`, `entity_id`, `created_at` (jamais de copie de données cliniques) |
| `backup_history` | `path`, `created_at`, `size`, `checksum`, `status` |

## Patients

| Table | Contenu |
| --- | --- |
| `patients` | `reference` (unique), nom, prénom, naissance, sexe, adresse, gouvernorat, délégation, `archived_at` |
| `parent_contacts` | Père/mère, téléphones (+216), e-mail, contact d'urgence |
| `patient_medical_histories` | Données de naissance (terme, poids, taille, PC, Apgar, accouchement) et antécédents |
| `patient_notes` | Notes libres du dossier |

## Clinique

| Table | Contenu |
| --- | --- |
| `consultations` | Date-heure, type, motif, mesures, examen, diagnostic, traitement, conseils, `status` (`draft` / `finalized`), `finalized_at` |
| `consultation_amendments` | Amendements append-only : motif, date, version précédente |
| `growth_measurements` | `patient_id`, `measured_at`, poids, taille, PC, notes — index `(patient_id, measured_at)` |
| `vaccination_schedule_versions` / `_items` | Calendrier versionné (source, validation clinique) |
| `vaccination_records` | Statut (`done`, `upcoming`, `overdue`, `unknown`), dates, lot, observations |

## Pratique

| Table | Contenu |
| --- | --- |
| `appointments` | Début, durée, motif, statut (`confirmed`, `pending`, `done`, `cancelled`, `no_show`), notes |
| `patient_documents` | Nom d'origine, MIME, taille, chemin chiffré, somme de contrôle |

Le contrat exact des DTO côté interface est dans `src/types/models.ts`.
