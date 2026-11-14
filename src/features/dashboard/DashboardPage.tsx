import { Link, useNavigate } from "react-router-dom";
import { CalendarDays, CalendarPlus, FilePenLine, Search, Stethoscope, Syringe, UserPlus, Users, type LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { QueryState } from "@/components/QueryState";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { useAsync } from "@/hooks/useAsync";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/services/tauri";
import type { DashboardStats } from "@/types/models";
import { formatAge } from "@/utils/age";
import { formatTime, todayIso } from "@/utils/dates";
import { fullName } from "@/utils/format";
import { AppointmentStatusBadge } from "../appointments/AppointmentStatusBadge";

const STATS: { key: keyof Omit<DashboardStats, "recent_patients">; label: string; icon: LucideIcon; to: string }[] = [
  { key: "patients_total", label: "Patients actifs", icon: Users, to: "/patients" },
  { key: "consultations_today", label: "Consultations aujourd'hui", icon: Stethoscope, to: "/consultations" },
  { key: "appointments_today", label: "Rendez-vous aujourd'hui", icon: CalendarDays, to: "/rendez-vous" },
  { key: "draft_consultations", label: "Brouillons à finaliser", icon: FilePenLine, to: "/consultations" },
  { key: "overdue_vaccinations", label: "Vaccins en retard", icon: Syringe, to: "/vaccinations" },
];

export function DashboardPage() {
  const navigate = useNavigate();
  const { doctor } = useAuth();
  const stats = useAsync(() => api.settings.dashboardStats(), []);
  const today = useAsync(() => api.appointments.list({ from: todayIso(), to: todayIso() }), []);

  return (
    <>
      <PageHeader title={`Bonjour ${doctor?.display_name ?? ""}`.trim()} description="Aperçu de l'activité du cabinet." />

      <div className="mb-6 flex flex-wrap gap-3">
        <Button onClick={() => navigate("/patients/nouveau")}>
          <UserPlus className="size-4" /> Ajouter un enfant
        </Button>
        <Button variant="medical" onClick={() => navigate("/consultations/nouvelle")}>
          <Stethoscope className="size-4" /> Nouvelle consultation
        </Button>
        <Button variant="outline" onClick={() => navigate("/rendez-vous")}>
          <CalendarPlus className="size-4" /> Ajouter un rendez-vous
        </Button>
        <Button variant="outline" onClick={() => navigate("/patients")}>
          <Search className="size-4" /> Rechercher
        </Button>
      </div>

      <QueryState query={stats}>
        {(s) => (
          <>
            <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              {STATS.map(({ key, label, icon: Icon, to }) => (
                <Link key={key} to={to}>
                  <Card className="p-4 transition-shadow hover:shadow-lg">
                    <div className="flex items-center justify-between">
                      <p className="text-3xl font-bold text-primary">{s[key]}</p>
                      <div className="flex size-10 items-center justify-center rounded-xl bg-medical/10 text-medical">
                        <Icon className="size-5" aria-hidden />
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-muted">{label}</p>
                  </Card>
                </Link>
              ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader title="Rendez-vous du jour" />
                <QueryState query={today}>
                  {(rows) =>
                    rows.length === 0 ? (
                      <EmptyState icon={CalendarDays} title="Aucun rendez-vous aujourd'hui" />
                    ) : (
                      <ul className="divide-y divide-line">
                        {[...rows]
                          .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
                          .map((a) => (
                            <li key={a.id} className="flex items-center justify-between gap-3 px-5 py-3">
                              <div>
                                <p className="text-sm font-bold text-primary">
                                  {formatTime(a.starts_at)} · <span dir="auto">{a.patient_name}</span>
                                </p>
                                {a.reason && <p dir="auto" className="text-sm text-muted">{a.reason}</p>}
                              </div>
                              <AppointmentStatusBadge status={a.status} />
                            </li>
                          ))}
                      </ul>
                    )
                  }
                </QueryState>
              </Card>

              <Card>
                <CardHeader title="Patients récents" />
                {s.recent_patients.length === 0 ? (
                  <EmptyState icon={Users} title="Aucun patient" description="Ajoutez votre premier patient." />
                ) : (
                  <ul className="divide-y divide-line">
                    {s.recent_patients.map((p) => (
                      <li key={p.id}>
                        <Link to={`/patients/${p.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-app">
                          <span dir="auto" className="text-sm font-bold text-primary">{fullName(p)}</span>
                          <span className="text-sm text-muted">{formatAge(p.date_naissance)}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          </>
        )}
      </QueryState>
    </>
  );
}
