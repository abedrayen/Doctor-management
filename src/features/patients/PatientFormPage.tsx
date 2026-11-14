import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PageHeader } from "@/components/layout/PageHeader";
import { QueryState } from "@/components/QueryState";
import { FormFields, type FieldDef } from "@/components/form/FormFields";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { useAction } from "@/hooks/useAction";
import { useAsync } from "@/hooks/useAsync";
import { api } from "@/services/tauri";
import { SEX, type PatientInput, type PatientSummary } from "@/types/models";
import { formatDate } from "@/utils/dates";
import { fullName } from "@/utils/format";
import { GOUVERNORATS } from "@/utils/tunisia";
import { emptyPatientValues, fromPatient, patientSchema, toPatientInput, type PatientFormValues } from "./patientSchemas";

type Def = FieldDef<PatientFormValues>;

const GOUVERNORAT_OPTIONS = Object.fromEntries(GOUVERNORATS.map((g) => [g, g]));
const DELIVERY_OPTIONS = {
  "Voie basse": "Voie basse",
  Césarienne: "Césarienne",
  "Forceps / ventouse": "Forceps / ventouse",
};

const SECTIONS: { title: string; description: string; fields: Def[] }[] = [
  {
    title: "A. Informations personnelles",
    description: "Identité de l'enfant.",
    fields: [
      { name: "nom", label: "Nom", required: true },
      { name: "prenom", label: "Prénom", required: true },
      { name: "date_naissance", label: "Date de naissance", kind: "date", required: true },
      { name: "sexe", label: "Sexe", kind: "select", options: SEX, emptyOption: "— Sélectionner —", required: true },
      { name: "adresse", label: "Adresse", wide: true },
      { name: "gouvernorat", label: "Gouvernorat", kind: "select", options: GOUVERNORAT_OPTIONS, emptyOption: "— Sélectionner —" },
      { name: "delegation", label: "Délégation" },
    ],
  },
  {
    title: "B. Parents et contacts",
    description: "Coordonnées des parents et contact d'urgence.",
    fields: [
      { name: "nom_pere", label: "Nom du père" },
      { name: "nom_mere", label: "Nom de la mère" },
      { name: "telephone_pere", label: "Téléphone du père", kind: "phone" },
      { name: "telephone_mere", label: "Téléphone de la mère", kind: "phone" },
      { name: "email", label: "E-mail", kind: "email" },
      { name: "contact_urgence_nom", label: "Contact d'urgence (nom)" },
      { name: "contact_urgence_telephone", label: "Contact d'urgence (téléphone)", kind: "phone" },
    ],
  },
  {
    title: "C. Naissance",
    description: "Données périnatales.",
    fields: [
      { name: "terme_semaines", label: "Terme (semaines d'aménorrhée)", kind: "decimal" },
      { name: "mode_accouchement", label: "Mode d'accouchement", kind: "select", options: DELIVERY_OPTIONS, emptyOption: "— Sélectionner —" },
      { name: "poids_naissance_g", label: "Poids de naissance (g)", kind: "decimal" },
      { name: "taille_naissance_cm", label: "Taille de naissance (cm)", kind: "decimal" },
      { name: "perimetre_cranien_naissance_cm", label: "Périmètre crânien (cm)", kind: "decimal" },
      { name: "apgar_1", label: "Apgar à 1 min", kind: "decimal" },
      { name: "apgar_5", label: "Apgar à 5 min", kind: "decimal" },
    ],
  },
  {
    title: "D. Antécédents",
    description: "Allergies, pathologies et traitements en cours.",
    fields: [
      { name: "allergies", label: "Allergies", kind: "textarea" },
      { name: "maladies_chroniques", label: "Maladies chroniques", kind: "textarea" },
      { name: "medicaments_en_cours", label: "Médicaments en cours", kind: "textarea" },
      { name: "antecedents_familiaux", label: "Antécédents familiaux", kind: "textarea" },
      { name: "antecedents_chirurgicaux", label: "Antécédents chirurgicaux", kind: "textarea" },
    ],
  },
];

export function PatientFormPage() {
  const { id } = useParams();
  const patient = useAsync(() => (id ? api.patients.get(id) : Promise.resolve(null)), [id]);

  return (
    <>
      <PageHeader title={id ? "Modifier le dossier" : "Ajouter un enfant"} description="Les champs marqués * sont obligatoires." />
      <QueryState query={patient}>
        {(p) => <PatientForm key={p?.id ?? "new"} patientId={id} initial={p ? fromPatient(p) : undefined} />}
      </QueryState>
    </>
  );
}

function PatientForm({ patientId, initial }: { patientId?: string; initial?: PatientFormValues }) {
  const navigate = useNavigate();
  const { run, pending, error } = useAction();
  const [duplicates, setDuplicates] = useState<{ input: PatientInput; matches: PatientSummary[] } | null>(null);

  const form = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
    defaultValues: initial ?? emptyPatientValues,
  });

  const save = (input: PatientInput) =>
    run(async () => {
      const saved = patientId ? await api.patients.update(patientId, input) : await api.patients.create(input);
      navigate(`/patients/${saved.id}`);
    });

  const onSubmit = form.handleSubmit(async (values) => {
    const input = toPatientInput(values);
    if (patientId) return save(input);
    const matches = await run(() => api.patients.findPossibleDuplicates(input));
    if (!matches) return;
    if (matches.length > 0) setDuplicates({ input, matches });
    else await save(input);
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      {SECTIONS.map((section) => (
        <Card key={section.title}>
          <CardHeader title={section.title} description={section.description} />
          <CardContent>
            <FormFields form={form} fields={section.fields} />
          </CardContent>
        </Card>
      ))}

      {error && <Alert variant="error">{error}</Alert>}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => navigate(-1)}>
          Annuler
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Enregistrement…" : patientId ? "Enregistrer les modifications" : "Créer le dossier"}
        </Button>
      </div>

      <Dialog
        open={duplicates !== null}
        onClose={() => setDuplicates(null)}
        title="Doublon possible"
        description="Des dossiers similaires existent déjà (même date de naissance et nom ou téléphone proche)."
        footer={
          <>
            <Button variant="outline" onClick={() => setDuplicates(null)}>
              Corriger la saisie
            </Button>
            <Button
              disabled={pending}
              onClick={async () => {
                const input = duplicates!.input;
                setDuplicates(null);
                await save(input);
              }}
            >
              Créer quand même
            </Button>
          </>
        }
      >
        <ul className="space-y-2">
          {duplicates?.matches.map((m) => (
            <li key={m.id} className="rounded-lg border border-line px-3 py-2 text-sm">
              <strong className="text-primary">{fullName(m)}</strong> — né(e) le {formatDate(m.date_naissance)}
              <span className="ml-2 font-mono text-xs text-muted">{m.reference}</span>
            </li>
          ))}
        </ul>
      </Dialog>
    </form>
  );
}
