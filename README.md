# Cabinet Pédiatrique

**FR** — Application de bureau **100 % hors ligne** pour la gestion d'un cabinet de pédiatrie (Tunisie) : dossiers patients, consultations, croissance, vaccinations, rendez-vous, documents et sauvegardes chiffrées.

**EN** — Fully **offline** desktop app for a pediatric practice (Tunisia): patient records, consultations, growth charts, vaccinations, appointments, documents and encrypted backups.

Stack: Tauri 2 (Rust, SQLCipher) · React 19 · TypeScript · Vite · Tailwind CSS v4.

## Démarrage rapide / Quick start

### Prérequis / Prerequisites

- Node.js 20+ and npm
- Rust (stable) + [Tauri prerequisites for Windows](https://tauri.app/start/prerequisites/) (WebView2, MSVC Build Tools)

### Installation

```bash
npm install
npm run tauri:dev      # FR: application complète / EN: full app (frontend + Rust backend)
```

Production : `npm run tauri:build` (FR: installeur / EN: installer).

### Windows — Smart App Control (compilation Rust) / Rust builds

**FR** — Si la compilation Rust échoue avec des erreurs du type « Une stratégie de contrôle d'application a bloqué ce fichier » (`os error 4551`) ou si `build.rs` / les binaires de `target\` sont bloqués, **Smart App Control** (Windows 11) en est la cause : il bloque les exécutables non signés générés par Cargo. Solutions :

1. Paramètres Windows → **Sécurité Windows** → **Contrôle des applications et du navigateur** → **Paramètres de Smart App Control** → choisir **Désactivé**. Attention : une fois désactivé, il ne peut pas être réactivé sans réinstaller Windows.
2. Ou développer sur une machine/VM sans Smart App Control (Windows 10, ou Windows 11 en mode « Évaluation »/désactivé).

**EN** — If the Rust build fails with “An Application Control policy has blocked this file” (`os error 4551`), or `build.rs` / binaries under `target\` are blocked, **Smart App Control** (Windows 11) is the cause: it blocks the unsigned executables Cargo produces. Fix:

1. Windows Settings → **Windows Security** → **App & browser control** → **Smart App Control settings** → set to **Off**. Note: once turned off, it cannot be turned back on without reinstalling Windows.
2. Or develop on a machine/VM without Smart App Control (Windows 10, or Windows 11 with it off).

Optionally keep `target\` outside OneDrive (e.g. set `CARGO_TARGET_DIR=C:\cargo-target`) to avoid sync-related locks.

## Scripts

| Command | FR / EN |
| --- | --- |
| `npm run dev` | Frontend seul (Vite, port 1420); `invoke` échoue hors Tauri / frontend only, `invoke` fails outside Tauri |
| `npm run tauri:dev` | Application complète / full app (alias: `npm run tauri dev`) |
| `npm run tauri:build` | Installeur de production / production installer |
| `npm run build` | Vérification TypeScript + build frontend / type-check + frontend build |
| `npm test` | Tests Vitest (une exécution) / single run |
| `npm run test:watch` | Tests en continu / watch mode |

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Schéma de données / Schema](docs/SCHEMA.md)
- [Sécurité / Security](docs/SECURITY.md)
- [Checklist hors ligne / Offline checklist](docs/OFFLINE_CHECKLIST.md)
- [Critères d'acceptation / Acceptance](docs/ACCEPTANCE.md)

## Avertissement clinique / Clinical notice

**FR** — Les courbes OMS et le calendrier vaccinal fournis sont des **jeux de données locaux d'exemple** : ils doivent être validés par le médecin avant tout usage clinique. L'application ne pose aucun diagnostic et n'enregistre jamais une vaccination automatiquement.

**EN** — The bundled WHO growth curves and vaccination schedule are **local sample datasets** that must be clinically reviewed by the doctor before real use. The app never diagnoses and never records a vaccination automatically.
