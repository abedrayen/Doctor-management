import { useState, type FormEvent } from "react";
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
    navigate(`/patients?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <div className="flex h-16 shrink-0 items-center gap-4 border-b border-line bg-surface px-6">
      <form onSubmit={onSearch} role="search" className="relative max-w-md flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un enfant (nom, référence, téléphone)…"
          aria-label="Recherche globale"
          className="pl-9"
        />
      </form>

      <div className="ml-auto flex items-center gap-3">
        <BackupStatus refreshKey={pathname} />
        <Notifications refreshKey={pathname} />
        <div className="hidden text-right sm:block">
          <p className="text-sm font-bold leading-tight text-primary">{doctor?.display_name}</p>
          <p className="text-xs text-muted">{doctor?.specialty}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => void lock()} aria-label="Verrouiller" title="Verrouiller">
          <Lock className="size-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => void logout()} aria-label="Se déconnecter" title="Se déconnecter">
          <LogOut className="size-4" />
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
    <Link to="/parametres" title="Gérer les sauvegardes">
      <Badge variant={backups.data === undefined && !backups.error ? "neutral" : variant}>
        <DatabaseBackup className="size-3.5" aria-hidden />
        {label}
      </Badge>
    </Link>
  );
}

function Notifications({ refreshKey }: { refreshKey: string }) {
  const [open, setOpen] = useState(false);
  const stats = useAsync(() => api.settings.dashboardStats(), [refreshKey]);
  const items = stats.data
    ? [
        { to: "/consultations", count: stats.data.draft_consultations, text: "consultation(s) en brouillon" },
        { to: "/vaccinations", count: stats.data.overdue_vaccinations, text: "vaccin(s) en retard" },
        { to: "/rendez-vous", count: stats.data.appointments_today, text: "rendez-vous aujourd'hui" },
      ].filter((i) => i.count > 0)
    : [];

  return (
    <div className="relative">
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
