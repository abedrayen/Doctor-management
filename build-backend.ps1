$ErrorActionPreference = "Continue"
$env:Path = "$env:USERPROFILE\.cargo\bin;C:\Strawberry\perl\bin;C:\Strawberry\c\bin;C:\Program Files\NASM;" + [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
$vs = & "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe" -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
Import-Module "$vs\Common7\Tools\Microsoft.VisualStudio.DevShell.dll"
Enter-VsDevShell -VsInstallPath $vs -SkipAutomaticLocation -DevCmdArguments "-arch=x64"
$env:CARGO_TARGET_DIR = "C:\cargo-target-cabinet"
Set-Location "c:\Users\rayen\OneDrive\Desktop\Doctor\src-tauri"
cargo build *>&1 | Out-File -FilePath "c:\Users\rayen\OneDrive\Desktop\Doctor\cargo-build.log" -Encoding utf8
$LASTEXITCODE | Out-File "c:\Users\rayen\OneDrive\Desktop\Doctor\cargo-exit.txt"
