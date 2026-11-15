import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Bell, DatabaseBackup, Lock, LogOut, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAsync } from "@/hooks/useAsync";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/services/tauri";
import { formatDateTime } from "@/utils/dates";

export function TopBar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { doctor, lock, logout } = useAuth();
  const [query, setQuery] = useState("");

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    navigate(q ? `/patients?q=${encodeURIComponent(q)}` : "/patients");
  };

  const confirmLogout = () => {
    if (window.confirm("Se déconnecter du cabinet ? Les données restent sur cet ordinateur.")) {
      void logout();
    }
  };

  return (
    <div className="flex h-16 shrink-0 items-center gap-3 border-b border-line bg-surface px-4 sm:px-6">
      <form onSubmit={onSearch} role="search" className="flex max-w-xl flex-1 items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un enfant…"
            aria-label="Recherche globale"
            className="pl-9"
          />
        </div>
        <Button type="submit" variant="outline" className="shrink-0">
          Rechercher
        </Button>
      </form>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <BackupStatus refreshKey={pathname} />
        <Notifications refreshKey={pathname} />
        <div className="hidden text-right md:block">
          <p className="text-sm font-bold leading-tight text-primary">{doctor?.display_name}</p>
          <p className="text-xs text-muted">{doctor?.specialty}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => void lock()} title="Verrouiller la session">
          <Lock className="size-4" />
          <span className="hidden lg:inline">Verrouiller</span>
        </Button>
        <Button variant="ghost" size="sm" onClick={confirmLogout} title="Se déconnecter">
          <LogOut className="size-4" />
          <span className="hidden lg:inline">Déconnexion</span>
        </Button>
      </div>
    </div>
  );
}

function BackupStatus({ refreshKey }: { refreshKey: string }) {
  const backups = useAsync(() => api.backups.list(), [refreshKey]);
  const last = backups.data?.find((b) => b.status === "success");
  const label = backups.error
    ? "Sauvegarde indisponible"
    : backups.data === undefined
      ? "Sauvegarde…"
      : last
        ? `Sauvegarde ${formatDateTime(last.created_at)}`
        : "Aucune sauvegarde";
  const variant = backups.error ? "danger" : last ? "success" : "warning";
  return (
    <Link to="/parametres" title="Gérer les sauvegardes" className="hidden sm:inline-flex">
      <Badge variant={backups.data === undefined && !backups.error ? "neutral" : variant}>
        <DatabaseBackup className="size-3.5" aria-hidden />
        {label}
      </Badge>
    </Link>
  );
}

function Notifications({ refreshKey }: { refreshKey: string }) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const stats = useAsync(() => api.settings.dashboardStats(), [refreshKey]);
  const items = stats.data
    ? [
        { to: "/consultations", count: stats.data.draft_consultations, text: "consultation(s) en brouillon" },
        { to: "/vaccinations", count: stats.data.overdue_vaccinations, text: "vaccin(s) en retard" },
        { to: "/rendez-vous", count: stats.data.appointments_today, text: "rendez-vous aujourd'hui" },
      ].filter((i) => i.count > 0)
    : [];

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!panelRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div className="relative" ref={panelRef}>
      <Button variant="ghost" size="icon" onClick={() => setOpen((o) => !o)} aria-label="Notifications" aria-expanded={open}>
        <Bell className="size-4" />
        {items.length > 0 && <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-danger" />}
      </Button>
      {open && (
        <div className="absolute right-0 top-11 z-40 w-72 rounded-card border border-line bg-surface p-2 shadow-xl">
          {stats.error ? (
            <p className="p-3 text-sm text-danger">{stats.error}</p>
          ) : items.length === 0 ? (
            <p className="p-3 text-sm text-muted">Aucune notification.</p>
          ) : (
            items.map((i) => (
              <Link
                key={i.to}
                to={i.to}
                onClick={() => setOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm text-ink hover:bg-app"
              >
                <strong className="text-primary">{i.count}</strong> {i.text}
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
