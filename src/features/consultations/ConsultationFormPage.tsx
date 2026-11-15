import { useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormFields, type FieldDef } from "@/components/form/FormFields";
import { PageHeader } from "@/components/layout/PageHeader";
import { PrintButton } from "@/components/PrintButton";
import { QueryState } from "@/components/QueryState";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { useAction } from "@/hooks/useAction";
import { useAsync } from "@/hooks/useAsync";
import { api } from "@/services/tauri";
import { CONSULTATION_TYPE, type ConsultationDetail } from "@/types/models";
import { formatDateTime } from "@/utils/dates";
import { PatientSelect } from "../patients/PatientPicker";
import { ConsultationStatusBadge } from "./ConsultationsPage";
import {
  consultationSchema,
  emptyConsultationValues,
  finalizeSchema,
  fromConsultation,
  toConsultationInput,
  type ConsultationValues,
} from "./consultationSchemas";

type Def = FieldDef<ConsultationValues>;

const SECTIONS: { title: string; fields: Def[] }[] = [
  {
    title: "Consultation",
    fields: [
      { name: "type", label: "Type", kind: "select", options: CONSULTATION_TYPE, required: true },
      { name: "motif", label: "Motif", required: true },
      { name: "date", label: "Date", kind: "date", required: true },
      { name: "time", label: "Heure (24 h)", kind: "time", required: true },
    ],
  },
  {
    title: "Mesures",
    fields: [
      { name: "poids_kg", label: "Poids (kg)", kind: "decimal" },
      { name: "taille_cm", label: "Taille (cm)", kind: "decimal" },
      { name: "perimetre_cranien_cm", label: "Périmètre crânien (cm)", kind: "decimal" },
      { name: "temperature_c", label: "Température (°C)", kind: "decimal" },
    ],
  },
  {
    title: "Examen et diagnostic",
    fields: [
      { name: "histoire_maladie", label: "Histoire de la maladie", kind: "textarea" },
      { name: "examen_clinique", label: "Examen clinique", kind: "textarea" },
      { name: "diagnostic", label: "Diagnostic", kind: "textarea" },
    ],
  },
  {
    title: "Traitement et conseils",
    fields: [
      { name: "traitement", label: "Traitement / ordonnance", kind: "textarea" },
      { name: "conseils", label: "Conseils et conduite à tenir", kind: "textarea" },
    ],
  },
];

export function ConsultationFormPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const detail = useAsync(() => (id ? api.consultations.get(id) : Promise.resolve(null)), [id]);

  return (
    <QueryState query={detail}>
      {(d) => (
        <ConsultationForm
          key={d ? `${d.id}:${d.status}:${d.amendments.length}` : "new"}
          detail={d}
          initialPatientId={params.get("patient") ?? ""}
          onChanged={detail.reload}
        />
      )}
    </QueryState>
  );
}

function ConsultationForm({
  detail,
  initialPatientId,
  onChanged,
}: {
  detail: ConsultationDetail | null;
  initialPatientId: string;
  onChanged: () => void;
}) {
  const navigate = useNavigate();
  const { run, pending, error, setError } = useAction();
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmFinalize, setConfirmFinalize] = useState(false);
  const [amending, setAmending] = useState(false);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);

  const finalized = detail?.status === "finalized";
  const locked = finalized && !amending;

  const form = useForm<ConsultationValues>({
    resolver: zodResolver(consultationSchema),
    defaultValues: detail ? fromConsultation(detail) : emptyConsultationValues(initialPatientId),
  });

  /** Persist the current values as a draft (create or update) and return the draft id. */
  const persistDraft = async (values: ConsultationValues) => {
    const input = toConsultationInput(values);
    return detail ? api.consultations.updateDraft(detail.id, input) : api.consultations.create(input);
  };

  const saveDraft = form.handleSubmit(async (values) => {
    setNotice(null);
    const saved = await run(() => persistDraft(values));
    if (!saved) return;
    if (detail) setNotice("Brouillon enregistré.");
    else navigate(`/consultations/${saved.id}`, { replace: true });
  });

  const askFinalize = form.handleSubmit((values) => {
    const check = finalizeSchema.safeParse(values);
    if (check.success) return setConfirmFinalize(true);
    check.error.issues.forEach((i) => form.setError(i.path[0] as keyof ConsultationValues, { message: i.message }));
  });

  const finalize = async () => {
    setConfirmFinalize(false);
    const done = await run(async () => {
      const draft = await persistDraft(form.getValues());
      await api.consultations.finalize(draft.id);
      return draft.id;
    });
    if (!done) return;
    if (detail) onChanged();
    else navigate(`/consultations/${done}`, { replace: true });
  };

  const saveAmendment = form.handleSubmit(async (values) => {
    if (!reason.trim()) return setReasonError("Le motif de l'amendement est obligatoire.");
    setReasonError(null);
    const saved = await run(() => api.consultations.amend(detail!.id, reason.trim(), toConsultationInput(values)));
    if (saved) onChanged();
  });

  const patientId = form.watch("patient_id");

  return (
    <>
      <PageHeader
        title={detail ? `Consultation du ${formatDateTime(detail.consulted_at)}` : "Nouvelle consultation"}
        description={detail?.patient_name}
        actions={
          <>
            {detail && <ConsultationStatusBadge status={detail.status} />}
            {detail && <PrintButton kind="consultation" patientId={detail.patient_id} consultationId={detail.id} label="Imprimer" />}
          </>
        }
      />

      <form onSubmit={(e) => e.preventDefault()} noValidate className="space-y-6">
        {finalized && (
          <Alert variant="info">
            Consultation finalisée le {formatDateTime(detail?.finalized_at)}. Elle n'est jamais écrasée : toute correction
            crée un <strong>amendement tracé</strong> avec son motif, et la version d'origine est conservée.
          </Alert>
        )}
        {!detail && (
          <Alert variant="info">
            Le brouillon peut être modifié librement. Une fois finalisée, la consultation ne pourra plus être modifiée
            silencieusement.
          </Alert>
        )}

        <Card>
          <CardHeader title="Enfant" />
          <CardContent>
            <Controller
              name="patient_id"
              control={form.control}
              render={({ field }) => (
                <Field
                  label="Enfant"
                  error={form.formState.errors.patient_id?.message}
                  hint="Recherche et liste réunies dans le même champ."
                  required
                >
                  <PatientSelect value={field.value} onChange={field.onChange} disabled={Boolean(detail)} />
                </Field>
              )}
            />
          </CardContent>
        </Card>

        {SECTIONS.map((section) => (
          <Card key={section.title}>
            <CardHeader title={section.title} />
            <CardContent>
              <FormFields form={form} fields={section.fields} disabled={locked} />
            </CardContent>
          </Card>
        ))}

        {amending && (
          <Card>
            <CardHeader title="Amendement" description="Le motif sera conservé dans l'historique de la consultation." />
            <CardContent>
              <Field label="Motif de l'amendement" error={reasonError ?? undefined} required>
                <Textarea value={reason} onChange={(e) => setReason(e.target.value)} />
              </Field>
            </CardContent>
          </Card>
        )}

        {detail && detail.amendments.length > 0 && (
          <Card>
            <CardHeader title="Historique des amendements" />
            <CardContent>
              <ul className="space-y-2 text-sm">
                {detail.amendments.map((a) => (
                  <li key={a.id} className="rounded-lg border border-line px-3 py-2">
                    <strong className="text-primary">{formatDateTime(a.amended_at)}</strong> — <span dir="auto">{a.reason}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {error && <Alert variant="error">{error}</Alert>}
        {notice && <Alert variant="success">{notice}</Alert>}

        <div className="sticky bottom-0 z-10 -mx-1 flex flex-wrap justify-end gap-2 border-t border-line bg-app/95 px-1 py-3 backdrop-blur">
          <Button variant="outline" onClick={() => navigate(patientId ? `/patients/${patientId}` : "/consultations")}>
            Retour
          </Button>
          {!finalized && (
            <>
              <Button variant="outline" onClick={saveDraft} disabled={pending}>
                Enregistrer le brouillon
              </Button>
              <Button onClick={askFinalize} disabled={pending}>
                Finaliser
              </Button>
            </>
          )}
          {finalized && !amending && (
            <Button
              onClick={() => {
                setError(null);
                setAmending(true);
              }}
            >
              Amender la consultation
            </Button>
          )}
          {amending && (
            <>
              <Button
                variant="outline"
                disabled={pending}
                onClick={() => {
                  form.reset(fromConsultation(detail!));
                  setReason("");
                  setReasonError(null);
                  setAmending(false);
                }}
              >
                Annuler l'amendement
              </Button>
              <Button onClick={saveAmendment} disabled={pending}>
                Enregistrer l'amendement
              </Button>
            </>
          )}
        </div>
      </form>

      <Dialog
        open={confirmFinalize}
        onClose={() => setConfirmFinalize(false)}
        title="Finaliser la consultation ?"
        description="Une fois finalisée, la consultation ne pourra plus être modifiée directement : toute correction passera par un amendement tracé."
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmFinalize(false)}>
              Continuer la saisie
            </Button>
            <Button onClick={finalize}>Finaliser</Button>
          </>
        }
      />
    </>
  );
}
