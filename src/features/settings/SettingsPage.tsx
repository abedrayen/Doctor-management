import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { DatabaseBackup, ShieldCheck } from "lucide-react";
import { FormFields, type FieldDef } from "@/components/form/FormFields";
import { PageHeader } from "@/components/layout/PageHeader";
import { QueryState } from "@/components/QueryState";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { useAction } from "@/hooks/useAction";
import { useAsync } from "@/hooks/useAsync";
import { useSettings } from "@/hooks/useSettings";
import { changePasswordSchema, type ChangePasswordValues } from "@/schemas/authSchemas";
import { fromSettings, settingsSchema, toSettingsInput, type SettingsValues } from "@/schemas/settingsSchemas";
import { api } from "@/services/tauri";
import type { AppSettings, BackupEntry } from "@/types/models";
import { formatDateTime } from "@/utils/dates";
import { formatBytes } from "@/utils/format";

const CABINET_FIELDS: FieldDef<SettingsValues>[] = [
  { name: "cabinet_name", label: "Nom du cabinet" },
  { name: "cabinet_phone", label: "Téléphone", kind: "phone" },
  { name: "cabinet_address", label: "Adresse", wide: true },
  { name: "cabinet_email", label: "E-mail", kind: "email" },
];

const PREFERENCE_FIELDS: FieldDef<SettingsValues>[] = [
  {
    name: "idle_timeout_minutes",
    label: "Verrouillage automatique (minutes d'inactivité)",
    kind: "decimal",
    required: true,
  },
  { name: "default_appointment_duration_minutes", label: "Durée par défaut d'un rendez-vous (minutes)", kind: "decimal", required: true },
];

export function SettingsPage() {
  const { settings, error } = useSettings();

  return (
    <>
      <PageHeader title="Paramètres" description="Cabinet, préférences, sécurité et sauvegardes." />
      <div className="space-y-6">
        {settings ? (
          <>
            <CabinetForm settings={settings} />
            <SecurityCard settings={settings} />
          </>
        ) : error ? (
          <Alert variant="error">{error}</Alert>
        ) : (
          <Skeleton className="h-64 w-full" />
        )}
        <BackupCard />
      </div>
    </>
  );
}

function CabinetForm({ settings }: { settings: AppSettings }) {
  const { setSettings } = useSettings();
  const { run, pending, error } = useAction();
  const [saved, setSaved] = useState(false);
  const form = useForm<SettingsValues>({ resolver: zodResolver(settingsSchema), defaultValues: fromSettings(settings) });

  const onSubmit = form.handleSubmit(async (values) => {
    setSaved(false);
    const updated = await run(() => api.settings.update(toSettingsInput(values)));
    if (updated) {
      setSettings(updated);
      form.reset(fromSettings(updated));
      setSaved(true);
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <Card>
        <CardHeader title="Informations du cabinet" description="Affichées sur les documents imprimés." />
        <CardContent>
          <FormFields form={form} fields={CABINET_FIELDS} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader title="Préférences" />
        <CardContent>
          <FormFields form={form} fields={PREFERENCE_FIELDS} />
        </CardContent>
      </Card>
      {error && <Alert variant="error">{error}</Alert>}
      {saved && <Alert variant="success">Paramètres enregistrés.</Alert>}
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Enregistrement…" : "Enregistrer les paramètres"}
        </Button>
      </div>
    </form>
  );
}

function SecurityCard({ settings }: { settings: AppSettings }) {
  const { encryption } = settings;
  const { run, pending, error } = useAction();
  const [changed, setChanged] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordValues>({ resolver: zodResolver(changePasswordSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setChanged(false);
    const done = await run(async () => {
      await api.auth.changePassword(values.current, values.next);
      return true;
    });
    if (done) {
      reset();
      setChanged(true);
    }
  });

  return (
    <Card>
      <CardHeader title="Sécurité" description="Chiffrement des données et mot de passe." />
      <CardContent className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <ShieldCheck className="size-5 text-success" aria-hidden />
          <Badge variant={encryption.database_encrypted ? "success" : "danger"}>
            Base de données {encryption.database_encrypted ? "chiffrée" : "non chiffrée"}
          </Badge>
          <Badge variant={encryption.documents_encrypted ? "success" : "danger"}>
            Documents {encryption.documents_encrypted ? "chiffrés" : "non chiffrés"}
          </Badge>
          <span className="text-sm text-muted">Protection de la clé : {encryption.key_protection}</span>
        </div>

        <form onSubmit={onSubmit} noValidate className="grid gap-4 md:grid-cols-3">
          <Field label="Mot de passe actuel" error={errors.current?.message}>
            <Input type="password" autoComplete="current-password" {...register("current")} />
          </Field>
          <Field label="Nouveau mot de passe" error={errors.next?.message}>
            <Input type="password" autoComplete="new-password" {...register("next")} />
          </Field>
          <Field label="Confirmer" error={errors.confirm?.message}>
            <Input type="password" autoComplete="new-password" {...register("confirm")} />
          </Field>
          <div className="space-y-3 md:col-span-3">
            {error && <Alert variant="error">{error}</Alert>}
            {changed && <Alert variant="success">Mot de passe modifié.</Alert>}
            <Button type="submit" variant="outline" disabled={pending}>
              {pending ? "Modification…" : "Changer le mot de passe"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function BackupCard() {
  const backups = useAsync(() => api.backups.list(), []);
  const create = useAction();
  const restore = useAction();
  const [toRestore, setToRestore] = useState<BackupEntry | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const createBackup = async () => {
    setMessage(null);
    if (await create.run(() => api.backups.create())) {
      setMessage("Sauvegarde créée.");
      backups.reload();
    }
  };

  const confirmRestore = async () => {
    const entry = toRestore;
    if (!entry) return;
    setMessage(null);
    const done = await restore.run(async () => {
      await api.backups.restore(entry.id);
      return true;
    });
    setToRestore(null);
    if (done) {
      setMessage("Sauvegarde restaurée. Redémarrez l'application pour recharger les données.");
      backups.reload();
    }
  };

  return (
    <Card>
      <CardHeader
        title="Sauvegardes"
        description="Copies chiffrées de la base de données, vérifiées par somme de contrôle."
        action={
          <Button size="sm" onClick={createBackup} disabled={create.pending}>
            <DatabaseBackup className="size-4" /> {create.pending ? "Création…" : "Créer une sauvegarde"}
          </Button>
        }
      />
      {(create.error || restore.error) && <Alert variant="error" className="m-4">{create.error ?? restore.error}</Alert>}
      {message && <Alert variant="success" className="m-4">{message}</Alert>}
      <QueryState query={backups}>
        {(rows) =>
          rows.length === 0 ? (
            <EmptyState icon={DatabaseBackup} title="Aucune sauvegarde" description="Créez une première sauvegarde." />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Date</TH>
                  <TH>Taille</TH>
                  <TH>Somme de contrôle</TH>
                  <TH>Statut</TH>
                  <TH className="w-32" />
                </TR>
              </THead>
              <TBody>
                {rows.map((b) => (
                  <TR key={b.id}>
                    <TD>{formatDateTime(b.created_at)}</TD>
                    <TD>{formatBytes(b.size_bytes)}</TD>
                    <TD className="font-mono text-xs">{b.checksum.slice(0, 12)}…</TD>
                    <TD>
                      <Badge variant={b.status === "success" ? "success" : "danger"}>{b.status === "success" ? "Réussie" : "Échec"}</Badge>
                    </TD>
                    <TD>
                      <Button variant="outline" size="sm" disabled={b.status !== "success"} onClick={() => setToRestore(b)}>
                        Restaurer
                      </Button>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )
        }
      </QueryState>

      <Dialog
        open={toRestore !== null}
        onClose={() => setToRestore(null)}
        title="Restaurer cette sauvegarde ?"
        description={`Les données actuelles seront remplacées par celles du ${formatDateTime(toRestore?.created_at)}. Une copie de l'état actuel est conservée avant la restauration.`}
        footer={
          <>
            <Button variant="outline" onClick={() => setToRestore(null)}>
              Annuler
            </Button>
            <Button variant="danger" onClick={confirmRestore} disabled={restore.pending}>
              {restore.pending ? "Restauration…" : "Restaurer"}
            </Button>
          </>
        }
      />
    </Card>
  );
}
