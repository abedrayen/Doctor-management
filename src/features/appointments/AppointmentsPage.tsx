import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { FormFields, type FieldDef } from "@/components/form/FormFields";
import { PageHeader } from "@/components/layout/PageHeader";
import { QueryState } from "@/components/QueryState";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Tabs } from "@/components/ui/tabs";
import { useAction } from "@/hooks/useAction";
import { useAsync } from "@/hooks/useAsync";
import { useSettings } from "@/hooks/useSettings";
import {
  appointmentSchema,
  fromAppointment,
  toAppointmentInput,
  type AppointmentValues,
} from "@/schemas/appointmentSchemas";
import { api } from "@/services/tauri";
import { APPOINTMENT_STATUS, type Appointment } from "@/types/models";
import { formatTime, toIsoDate } from "@/utils/dates";
import { cn } from "@/utils/cn";
import { PatientSelect } from "../patients/PatientPicker";
import { AppointmentStatusBadge } from "./AppointmentStatusBadge";

type View = "day" | "week" | "month";
const VIEWS: { value: View; label: string }[] = [
  { value: "day", label: "Jour" },
  { value: "week", label: "Semaine" },
  { value: "month", label: "Mois" },
];
const WEEK = { weekStartsOn: 1 } as const;

const FIELDS: FieldDef<AppointmentValues>[] = [
  { name: "date", label: "Date", kind: "date", required: true },
  { name: "time", label: "Heure (24 h)", kind: "time", required: true },
  { name: "duration_minutes", label: "Durée (minutes)", kind: "decimal", required: true },
  { name: "status", label: "Statut", kind: "select", options: APPOINTMENT_STATUS, required: true },
  { name: "reason", label: "Motif", wide: true },
  { name: "notes", label: "Notes", kind: "textarea" },
];

function rangeFor(view: View, anchor: Date) {
  if (view === "day") return { from: anchor, to: anchor };
  if (view === "week") return { from: startOfWeek(anchor, WEEK), to: endOfWeek(anchor, WEEK) };
  return { from: startOfWeek(startOfMonth(anchor), WEEK), to: endOfWeek(endOfMonth(anchor), WEEK) };
}

const shift = (view: View, anchor: Date, dir: 1 | -1) =>
  view === "day" ? addDays(anchor, dir) : view === "week" ? addWeeks(anchor, dir) : addMonths(anchor, dir);

function titleFor(view: View, anchor: Date) {
  if (view === "day") return format(anchor, "EEEE dd/MM/yyyy", { locale: fr });
  if (view === "week") {
    const { from, to } = rangeFor("week", anchor);
    return `Semaine du ${format(from, "dd/MM")} au ${format(to, "dd/MM/yyyy")}`;
  }
  return format(anchor, "MMMM yyyy", { locale: fr });
}

export function AppointmentsPage() {
  const [view, setView] = useState<View>("day");
  const [anchor, setAnchor] = useState(() => new Date());
  const [editing, setEditing] = useState<Appointment | "new" | null>(null);

  const { from, to } = rangeFor(view, anchor);
  const appointments = useAsync(
    () => api.appointments.list({ from: toIsoDate(from), to: toIsoDate(to) }),
    [view, toIsoDate(anchor)],
  );

  const openDay = (day: Date) => {
    setAnchor(day);
    setView("day");
  };

  return (
    <>
      <PageHeader
        title="Rendez-vous"
        description="Planning du cabinet."
        actions={
          <Button onClick={() => setEditing("new")}>
            <Plus className="size-4" /> Ajouter un rendez-vous
          </Button>
        }
      />
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={() => setAnchor(shift(view, anchor, -1))} aria-label="Précédent">
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setAnchor(new Date())}>
              Aujourd'hui
            </Button>
            <Button variant="outline" size="icon" onClick={() => setAnchor(shift(view, anchor, 1))} aria-label="Suivant">
              <ChevronRight className="size-4" />
            </Button>
          </div>
          <h2 className="text-base font-bold capitalize text-primary">{titleFor(view, anchor)}</h2>
          <Tabs items={VIEWS} value={view} onChange={setView} className="border-b-0" />
        </div>

        <div className="p-4">
          <QueryState query={appointments}>
            {(rows) => {
              const on = (day: Date) =>
                rows.filter((a) => isSameDay(parseISO(a.starts_at), day)).sort((a, b) => a.starts_at.localeCompare(b.starts_at));

              if (view === "day") {
                const list = on(anchor);
                return list.length === 0 ? (
                  <EmptyState icon={CalendarDays} title="Aucun rendez-vous ce jour" />
                ) : (
                  <AppointmentList items={list} onEdit={setEditing} />
                );
              }
              const days = eachDayOfInterval({ start: from, end: to });
              return view === "week" ? (
                <div className="grid gap-3 lg:grid-cols-7">
                  {days.map((day) => (
                    <div key={day.toISOString()} className="min-h-32 rounded-lg border border-line p-2">
                      <button
                        type="button"
                        onClick={() => openDay(day)}
                        className={cn("mb-2 text-xs font-bold uppercase text-muted hover:text-primary", isSameDay(day, new Date()) && "text-medical")}
                      >
                        {format(day, "EEE dd/MM", { locale: fr })}
                      </button>
                      <AppointmentList items={on(day)} onEdit={setEditing} compact />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-7 gap-1.5">
                  {days.slice(0, 7).map((day) => (
                    <div key={day.toISOString()} className="px-1 text-center text-xs font-bold uppercase text-muted">
                      {format(day, "EEE", { locale: fr })}
                    </div>
                  ))}
                  {days.map((day) => {
                    const count = on(day).length;
                    return (
                      <button
                        key={day.toISOString()}
                        type="button"
                        onClick={() => openDay(day)}
                        className={cn(
                          "flex min-h-20 flex-col items-start rounded-lg border border-line p-2 text-left transition-colors hover:border-medical",
                          !isSameMonth(day, anchor) && "bg-app text-muted",
                          isSameDay(day, new Date()) && "border-medical bg-medical/5",
                        )}
                      >
                        <span className="text-sm font-semibold">{format(day, "d")}</span>
                        {count > 0 && (
                          <span className="mt-auto rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-white">
                            {count} RDV
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            }}
          </QueryState>
        </div>
      </Card>

      {editing && (
        <AppointmentDialog
          appointment={editing === "new" ? undefined : editing}
          defaultDate={toIsoDate(anchor)}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            appointments.reload();
          }}
        />
      )}
    </>
  );
}

function AppointmentList({ items, onEdit, compact }: { items: Appointment[]; onEdit: (a: Appointment) => void; compact?: boolean }) {
  return (
    <ul className="space-y-2">
      {items.map((a) => (
        <li key={a.id}>
          <button
            type="button"
            onClick={() => onEdit(a)}
            className="flex w-full flex-col gap-1 rounded-lg border border-line bg-surface px-3 py-2 text-left transition-colors hover:border-medical"
          >
            <span className="flex items-center justify-between gap-2">
              <span className="text-sm font-bold text-primary">
                {formatTime(a.starts_at)}
                {!compact && <span className="ml-1 font-normal text-muted">({a.duration_minutes} min)</span>}
              </span>
              <AppointmentStatusBadge status={a.status} />
            </span>
            <span dir="auto" className="text-sm font-semibold">{a.patient_name}</span>
            {!compact && a.reason && <span dir="auto" className="text-sm text-muted">{a.reason}</span>}
          </button>
        </li>
      ))}
    </ul>
  );
}

function AppointmentDialog({
  appointment,
  defaultDate,
  onClose,
  onSaved,
}: {
  appointment?: Appointment;
  defaultDate: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { settings } = useSettings();
  const { run, pending, error } = useAction();
  const form = useForm<AppointmentValues>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: appointment
      ? fromAppointment(appointment)
      : {
          patient_id: "",
          date: defaultDate,
          time: "",
          duration_minutes: String(settings?.default_appointment_duration_minutes ?? 20),
          reason: "",
          status: "confirmed",
          notes: "",
        },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    const input = toAppointmentInput(values);
    const saved = await run(() => (appointment ? api.appointments.update(appointment.id, input) : api.appointments.create(input)));
    if (saved) onSaved();
  });

  const cancelAppointment = async () => {
    if (appointment && (await run(() => api.appointments.cancel(appointment.id)))) onSaved();
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={appointment ? "Modifier le rendez-vous" : "Nouveau rendez-vous"}
      className="max-w-2xl"
      footer={
        <>
          {appointment && appointment.status !== "cancelled" && (
            <Button variant="danger" className="mr-auto" onClick={cancelAppointment} disabled={pending}>
              Annuler le rendez-vous
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
          <Button type="submit" form="appointment-form" disabled={pending}>
            {pending ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </>
      }
    >
      <form id="appointment-form" onSubmit={onSubmit} noValidate className="space-y-4">
        <Controller
          name="patient_id"
          control={form.control}
          render={({ field }) => (
            <Field label="Enfant" error={form.formState.errors.patient_id?.message} required>
              <PatientSelect value={field.value} onChange={field.onChange} disabled={Boolean(appointment)} />
            </Field>
          )}
        />
        <FormFields form={form} fields={FIELDS} />
        {error && <Alert variant="error">{error}</Alert>}
      </form>
    </Dialog>
  );
}
