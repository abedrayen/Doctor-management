# Architecture

## Vue d'ensemble

```
React (UI) ──invoke──▶ Tauri commands (Rust) ──▶ services ──▶ SQLCipher / fichiers chiffrés / DPAPI
```

- Le frontend ne lit jamais SQLite ni le système de fichiers : tout passe par des commandes Tauri typées.
- Toutes les données restent sur le poste (`%APPDATA%\CabinetPediatrique\`). Aucune requête réseau.

## Frontend (`src/`)

| Dossier | Rôle |
| --- | --- |
| `app/` | `providers.tsx` (auth + paramètres), `AuthGate.tsx` (setup / login / app), `IdleLock.tsx` (verrouillage), `router.tsx` (routes hash) |
| `components/ui/` | Primitives (button, input, card, dialog, tabs, table, …), sans dépendance Radix |
| `components/layout/` | `AppShell`, `Sidebar`, `TopBar`, `PageHeader` |
| `components/form/` | `FormFields` : champs RHF pilotés par configuration |
| `features/*` | Une page par module (dashboard, patients, consultations, growth, vaccinations, appointments, documents, settings, auth) |
| `services/tauri.ts` | **Seul** point d'accès à `invoke` : objet `api` typé par domaine |
| `schemas/` | Schémas Zod partagés (les champs de formulaire restent des chaînes ; conversion dans `to*Input`) |
| `hooks/` | `useAuth`, `useSettings`, `useIdleLock`, `useAsync` (lecture), `useAction` (mutation) |
| `types/models.ts` | DTO échangés avec Rust (champs `snake_case`) et libellés français des énumérations |
| `utils/` | `dates` (JJ/MM/AAAA, 24 h), `age`, `format` (téléphone +216), `print` |

## Flux d'authentification

1. Au démarrage : `is_setup_required`.
2. `true` → `SetupPage` (nom, spécialité, mot de passe) puis connexion automatique ; sinon `LoginPage`.
3. Authentifié → `AppShell` + routes. `IdleLock` appelle `lock_session` après `idle_timeout_minutes` d'inactivité (défaut 15) et affiche un écran de déverrouillage opaque (`unlock_session`).

## Conventions IPC

- Arguments Tauri en `camelCase` (`patientId`), charges utiles dans `input` (champs `snake_case`).
- Dates : `yyyy-MM-dd` ; dates-heures locales : `yyyy-MM-ddTHH:mm`.
- Les erreurs Rust (`Err(String)`) sont affichées telles quelles à l'utilisateur (`toErrorMessage`).
- Consultations : brouillon modifiable ; finalisée = jamais écrasée, correction via `amend_consultation` (motif obligatoire, historique conservé).
