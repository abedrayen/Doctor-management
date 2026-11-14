import { NavLink } from "react-router-dom";
import {
  CalendarDays,
  FileText,
  HeartPulse,
  LayoutDashboard,
  Settings,
  Stethoscope,
  Syringe,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useSettings } from "@/hooks/useSettings";
import { cn } from "@/utils/cn";

export const NAV_ITEMS: { to: string; label: string; icon: LucideIcon; end?: boolean }[] = [
  { to: "/", label: "Tableau de bord", icon: LayoutDashboard, end: true },
  { to: "/patients", label: "Patients", icon: Users },
  { to: "/consultations", label: "Consultations", icon: Stethoscope },
  { to: "/rendez-vous", label: "Rendez-vous", icon: CalendarDays },
  { to: "/vaccinations", label: "Vaccinations", icon: Syringe },
  { to: "/croissance", label: "Suivi de croissance", icon: TrendingUp },
  { to: "/documents", label: "Documents", icon: FileText },
  { to: "/parametres", label: "Paramètres", icon: Settings },
];

export function Sidebar() {
  const { settings } = useSettings();
  return (
    <aside className="flex w-64 shrink-0 flex-col bg-primary text-white">
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex size-10 items-center justify-center rounded-xl bg-white/12">
          <HeartPulse className="size-5" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="truncate text-base font-bold leading-tight">Cabinet Pédiatrique</p>
          <p className="truncate text-xs text-white/60">{settings?.cabinet_name || "Gestion du cabinet"}</p>
        </div>
      </div>
      <nav aria-label="Navigation principale" className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors",
                isActive ? "bg-white/14 text-white" : "text-white/70 hover:bg-white/8 hover:text-white",
              )
            }
          >
            <Icon className="size-[18px]" aria-hidden />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
