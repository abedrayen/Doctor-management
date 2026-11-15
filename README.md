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

### Exporter l'application (.exe) pour d'autres PC / Export for other PCs

**FR** — Pour distribuer l'app sur d'autres machines Windows, générez un **installateur** (NSIS + MSI), pas l'exe de debug.

Sur le PC de développement, ouvrez un **Developer PowerShell for VS**, puis :

```powershell
cd "c:\Users\rayen\OneDrive\Desktop\Doctor"
$env:CARGO_TARGET_DIR = "C:\cargo-target-cabinet"
npm run tauri:build
```

Fichiers générés :

| Emplacement | Fichier |
| --- | --- |
| `C:\cargo-target-cabinet\release\bundle\nsis\` | `Cabinet Pédiatrique_0.1.0_x64-setup.exe` (**recommandé**) |
| `C:\cargo-target-cabinet\release\bundle\msi\` | Installateur `.msi` |

Sur les autres PC :

1. Copiez le `…-setup.exe` (clé USB, réseau, etc.).
2. Lancez l'installateur et suivez les étapes.
3. Prérequis : **Windows 10/11 64 bits** + **WebView2** (déjà inclus sur Windows 11 ; sur Windows 10, installer [WebView2 Runtime](https://developer.microsoft.com/microsoft-edge/webview2/) si besoin).

Notes importantes :

- Les données patients restent **locales** sur chaque PC dans `%APPDATA%\CabinetPediatrique\` — elles ne sont **pas** incluses dans l'installateur. Chaque machine a sa propre base.
- Ne copiez pas l'exe sous `debug\` : utilisez uniquement l'installateur NSIS/MSI ci-dessus.
- L'app n'est **pas signée** (Authenticode) : SmartScreen peut afficher « éditeur inconnu ». Un certificat sera nécessaire avant un déploiement clinique.
- Désinstaller l'application ne doit **pas** supprimer `%APPDATA%\CabinetPediatrique\`.

**EN** — To distribute the app to other Windows machines, build a **production installer** (NSIS + MSI), not the debug exe.

```powershell
$env:CARGO_TARGET_DIR = "C:\cargo-target-cabinet"
npm run tauri:build
```

Installers land under `C:\cargo-target-cabinet\release\bundle\nsis\` (setup `.exe`, recommended) and `…\bundle\msi\`. Copy the setup file to the target PC. Patient data stays per-machine in `%APPDATA%\CabinetPediatrique\` and is never bundled. WebView2 is required (preinstalled on Windows 11). Code signing is not configured yet.

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

**FR** — Les tables LMS OMS (2006 / 2007) et le calendrier vaccinal sont **embarqués localement** (`src-tauri/src/database/who/`) mais doivent être **validés par le médecin** avant usage clinique (`reviewed: false`). L'application calcule z-scores et percentiles, n'extrapole pas hors plages OMS, ne pose aucun diagnostic et n'enregistre jamais une vaccination automatiquement.

**EN** — Bundled WHO LMS tables (2006 / 2007) and the vaccination schedule are **local offline datasets** that must be clinically reviewed before real use (`reviewed: false`). The app computes z-scores/percentiles, never extrapolates beyond WHO ranges, never diagnoses, and never auto-records vaccinations.
