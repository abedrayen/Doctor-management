# Build guide (Windows)

## Prerequisites

| Tool | Notes |
|------|-------|
| **Visual Studio Build Tools** | Workload *Développement Desktop en C++* (MSVC + Windows SDK). Provides `link.exe`. |
| **Strawberry Perl** | Required to compile the vendored OpenSSL used by SQLCipher (`bundled-sqlcipher-vendored-openssl`). |
| **NASM** | Required by the OpenSSL build; make sure `nasm.exe` is on `PATH`. |
| **Rust** (stable, edition 2024 → 1.85+) | `rustup default stable` with the `x86_64-pc-windows-msvc` toolchain. |
| **Node.js 20+** and npm | Frontend and Tauri CLI. |
| **WebView2 runtime** | Preinstalled on Windows 11. |

## Windows Smart App Control must be Off

Cargo compiles and runs unsigned executables (`build.rs` scripts, test binaries). Smart App Control blocks them and
`cargo build` fails with **`os error 4551`** ("Une stratégie de contrôle d'application a bloqué ce fichier").

Turn it off before building:

**Paramètres → Confidentialité et sécurité → Sécurité Windows → Contrôle des applications et du navigateur →
Paramètres de Smart App Control → Désactiver.**

It cannot be re-enabled without reinstalling Windows.

## Build and run

From a **Developer PowerShell for VS** (MSVC, Perl and NASM on `PATH`):

```powershell
npm install
$env:CARGO_TARGET_DIR = "C:\cargo-target-cabinet"   # recommended: outside OneDrive
npm run tauri:dev
```

Production installers (NSIS + MSI):

```powershell
$env:CARGO_TARGET_DIR = "C:\cargo-target-cabinet"
npm run tauri:build
```

Code signing (Authenticode) is not configured in-repo; add a certificate before clinical deployment.

Backend only (`build-backend.ps1` sets up the environment and writes `cargo-build.log`):

```powershell
.\build-backend.ps1
```

Rust unit tests (Argon2, AES-GCM, migrations):

```powershell
cd src-tauri
cargo test
```

Frontend checks (tests + type-check + bundle): `.\scripts\verify-frontend.ps1`.

Keeping the Cargo target directory outside OneDrive avoids sync locks: `$env:CARGO_TARGET_DIR = "C:\cargo-target-cabinet"`.

## Data location

Everything lives locally in `%APPDATA%\CabinetPediatrique\`:

| Folder | Content |
|--------|---------|
| `database\` | `medical.db` (SQLCipher-encrypted) |
| `documents\` | Encrypted patient documents (`patients\{id}\{uuid}.enc`) |
| `backups\` | Encrypted database backups |
| `configuration\` | `key.dpapi`: database key protected by Windows DPAPI (current user) |
| `logs\` | Application logs |

Do not delete `configuration\key.dpapi`: without it the database and documents are unreadable. Back it up together with
the database, and note that it only works on the same Windows user account.
