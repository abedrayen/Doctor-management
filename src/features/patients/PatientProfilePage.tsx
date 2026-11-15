import { useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Archive, ArchiveRestore, Pencil, Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PrintButton } from "@/components/PrintButton";
import { QueryState } from "@/components/QueryState";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Tabs } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAction } from "@/hooks/useAction";
import { useToast } from "@/hooks/useToast";
import { useAsync } from "@/hooks/useAsync";
import { api } from "@/services/tauri";
import { SEX, type PatientOverview } from "@/types/models";
import { formatAge } from "@/utils/age";
import { formatDate, formatDateTime } from "@/utils/dates";
import { formatPhone, fullName, numToStr } from "@/utils/format";
import { ConsultationTable } from "../consultations/ConsultationsPage";
import { DocumentsPanel } from "../documents/DocumentsPage";
import { GrowthPanel } from "../growth/GrowthPage";
import { VaccinationPanel } from "../vaccinations/VaccinationsPage";
import { InfoGrid } from "./InfoGrid";
import { fromPatient, toPatientInput } from "./patientSchemas";

type Tab = "overview" | "history" | "consultations" | "growth" | "vaccinations" | "documents" | "notes";
const TABS: { value: Tab; label: string }[] = [
  { value: "overview", label: "Vue d'ensemble" },
  { value: "history", label: "Antécédents" },
  { value: "consultations", label: "Consultations" },
  { value: "growth", label: "Croissance" },
  { value: "vaccinations", label: "Vaccinations" },
  { value: "documents", label: "Documents" },
  { value: "notes", label: "Notes" },
];

export function PatientProfilePage() {
  const { id = "" } = useParams();
  const overview = useAsync(() => api.patients.overview(id), [id]);

  return <QueryState query={overview}>{(data) => <Profile key={id} data={data} onChanged={overview.reload} />}</QueryState>;
}

function Profile({ data, onChanged }: { data: PatientOverview; onChanged: () => void }) {
  const { patient: p } = data;
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("overview");
  const [confirmArchive, setConfirmArchive] = useState(false);
  const archive = useAction();
  const archived = p.archived_at !== null;

  const toggleArchive = async () => {
    setConfirmArchive(false);
    const done = await archive.run(async () => {
      await api.patients.archive(p.id, !archived);
      return true;
    });
    if (done) onChanged();
  };

  return (
    <>
      <PageHeader
        title={fullName(p)}
        description={`${p.reference} · ${SEX[p.sexe]} · né(e) le ${formatDate(p.date_naissance)} (${formatAge(p.date_naissance)})`}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => navigate(`/patients/${p.id}/modifier`)}>
              <Pencil className="size-4" /> Modifier
            </Button>
            <PrintButton kind="fiche" patientId={p.id} label="Imprimer la fiche" />
            <PrintButton kind="historique" patientId={p.id} label="Imprimer l'historique" />
            <Button variant="outline" size="sm" onClick={() => setConfirmArchive(true)}>
              {archived ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />}
              {archived ? "Restaurer" : "Archiver"}
            </Button>
            <Button size="sm" onClick={() => navigate(`/consultations/nouvelle?patient=${p.id}`)}>
              <Plus className="size-4" /> Nouvelle consultation
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {archived && <Badge variant="warning">Dossier archivé</Badge>}
        {p.allergies && <Badge variant="danger">Allergies : {p.allergies}</Badge>}
        {p.maladies_chroniques && <Badge variant="warning">Maladies chroniques : {p.maladies_chroniques}</Badge>}
        {data.overdue_vaccinations > 0 && <Badge variant="danger">{data.overdue_vaccinations} vaccin(s) en retard</Badge>}
      </div>
      {archive.error && <Alert variant="error" className="mb-4">{archive.error}</Alert>}

      <Tabs items={TABS} value={tab} onChange={setTab} className="mb-6" />
      {tab === "overview" && (
        <Card>
          <CardContent>
            <OverviewTab data={data} />
          </CardContent>
        </Card>
      )}
      {tab === "history" && (
        <Card>
          <CardContent>
            <InfoGrid
              items={[
                ["Allergies", p.allergies],
                ["Maladies chroniques", p.maladies_chroniques],
                ["Médicaments en cours", p.medicaments_en_cours],
                ["Antécédents familiaux", p.antecedents_familiaux],
                ["Antécédents chirurgicaux", p.antecedents_chirurgicaux],
              ]}
            />
          </CardContent>
        </Card>
      )}
      {tab === "consultations" && <PatientConsultations patientId={p.id} />}
      {tab === "growth" && <GrowthPanel patientId={p.id} />}
      {tab === "vaccinations" && <VaccinationPanel patientId={p.id} />}
      {tab === "documents" && <DocumentsPanel patientId={p.id} />}
      {tab === "notes" && (
        <Card>
          <CardContent>
            <NotesTab data={data} onSaved={onChanged} />
          </CardContent>
        </Card>
      )}

      <Dialog
        open={confirmArchive}
        onClose={() => setConfirmArchive(false)}
        title={archived ? "Restaurer le dossier ?" : "Archiver le dossier ?"}
        description={
          archived
            ? "Le dossier réapparaîtra dans la liste des patients actifs."
            : "Le dossier est conservé mais masqué de la liste des patients actifs. Aucune donnée n'est supprimée."
        }
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmArchive(false)}>
              Annuler
            </Button>
            <Button onClick={toggleArchive}>{archived ? "Restaurer" : "Archiver"}</Button>
          </>
        }
      />
    </>
  );
}

function OverviewTab({ data }: { data: PatientOverview }) {
  const { patient: p, last_consultation: lc, last_measurement: lm, next_appointment: na } = data;
  return (
    <div className="space-y-8">
      <Section title="Identité">
        <InfoGrid
          items={[
            ["Date de naissance", formatDate(p.date_naissance)],
            ["Âge", formatAge(p.date_naissance)],
            ["Sexe", SEX[p.sexe]],
            ["Adresse", [p.adresse, p.delegation, p.gouvernorat].filter(Boolean).join(", ")],
          ]}
        />
      </Section>
      <Section title="Parents et contacts">
        <InfoGrid
          items={[
            ["Père", p.nom_pere],
            ["Téléphone du père", formatPhone(p.telephone_pere)],
            ["Mère", p.nom_mere],
            ["Téléphone de la mère", formatPhone(p.telephone_mere)],
            ["E-mail", p.email],
            ["Contact d'urgence", [p.contact_urgence_nom, p.contact_urgence_telephone && formatPhone(p.contact_urgence_telephone)].filter(Boolean).join(" · ")],
          ]}
        />
      </Section>
      <Section title="Naissance">
        <InfoGrid
          items={[
            ["Terme (SA)", numToStr(p.terme_semaines)],
            ["Mode d'accouchement", p.mode_accouchement],
            ["Poids de naissance (g)", numToStr(p.poids_naissance_g)],
            ["Taille (cm)", numToStr(p.taille_naissance_cm)],
            ["Périmètre crânien (cm)", numToStr(p.perimetre_cranien_naissance_cm)],
            ["Apgar 1 / 5 min", p.apgar_1 != null || p.apgar_5 != null ? `${numToStr(p.apgar_1) || "?"} / ${numToStr(p.apgar_5) || "?"}` : ""],
          ]}
        />
      </Section>
      <Section title="Suivi">
        <InfoGrid
          items={[
            ["Consultations", String(data.consultation_count)],
            [
              "Dernière consultation",
              lc ? (
                <Link to={`/consultations/${lc.id}`} className="text-medical hover:underline">
                  {formatDateTime(lc.consulted_at)} — {lc.motif}
                </Link>
              ) : (
                ""
              ),
            ],
            [
              "Dernière mesure",
              lm
                ? `${formatDate(lm.measured_at)} · ${[lm.weight_kg != null && `${numToStr(lm.weight_kg)} kg`, lm.height_cm != null && `${numToStr(lm.height_cm)} cm`, lm.head_cm != null && `PC ${numToStr(lm.head_cm)} cm`].filter(Boolean).join(" · ")}`
                : "",
            ],
            ["Prochain rendez-vous", na ? `${formatDateTime(na.starts_at)}${na.reason ? ` — ${na.reason}` : ""}` : ""],
            ["Documents", String(data.documents_count)],
          ]}
        />
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-primary">{title}</h3>
      {children}
    </section>
  );
}

function PatientConsultations({ patientId }: { patientId: string }) {
  const navigate = useNavigate();
  const consultations = useAsync(() => api.consultations.list({ patientId }), [patientId]);
  return (
    <Card>
      <CardHeader
        title="Consultations"
        action={
          <Button size="sm" onClick={() => navigate(`/consultations/nouvelle?patient=${patientId}`)}>
            <Plus className="size-4" /> Nouvelle consultation
          </Button>
        }
      />
      <QueryState query={consultations}>{(items) => <ConsultationTable items={items} showPatient={false} />}</QueryState>
    </Card>
  );
}

function NotesTab({ data, onSaved }: { data: PatientOverview; onSaved: () => void }) {
  const [notes, setNotes] = useState(data.patient.notes);
  const { push } = useToast();
  const { run, pending, error } = useAction();
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setSaved(false);
    const result = await run(() => api.patients.update(data.patient.id, { ...toPatientInput(fromPatient(data.patient)), notes }));
    if (result) {
      setSaved(true);
      push("Notes enregistrées.");
      onSaved();
    }
  };

  return (
    <div className="space-y-3">
      <Textarea rows={10} value={notes} onChange={(e) => setNotes(e.target.value)} aria-label="Notes du dossier" />
      {error && <Alert variant="error">{error}</Alert>}
      {saved && <Alert variant="success">Notes enregistrées.</Alert>}
      <div className="flex justify-end">
        <Button onClick={save} disabled={pending || notes === data.patient.notes}>
          {pending ? "Enregistrement…" : "Enregistrer les notes"}
        </Button>
      </div>
    </div>
  );
}
