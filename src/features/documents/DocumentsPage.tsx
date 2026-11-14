import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Eye, FileText, Paperclip, Printer } from "lucide-react";
import { QueryState } from "@/components/QueryState";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { useAction } from "@/hooks/useAction";
import { useAsync } from "@/hooks/useAsync";
import { api } from "@/services/tauri";
import type { PatientDocument } from "@/types/models";
import { formatDateTime } from "@/utils/dates";
import { formatBytes } from "@/utils/format";
import { base64ToBlobUrl, printInFrame } from "@/utils/print";
import { PatientScope } from "../patients/PatientPicker";

const MAX_FILE_BYTES = 20 * 1024 * 1024;
const ACCEPTED_TYPES = "application/pdf,image/png,image/jpeg,image/webp";

const readAsBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("Lecture du fichier impossible."));
    reader.readAsDataURL(file);
  });

export function DocumentsPage() {
  return (
    <PatientScope title="Documents" description="Comptes rendus, analyses et imagerie rattachés au dossier.">
      {(patientId) => <DocumentsPanel key={patientId} patientId={patientId} />}
    </PatientScope>
  );
}

export function DocumentsPanel({ patientId }: { patientId: string }) {
  const documents = useAsync(() => api.documents.list(patientId), [patientId]);
  const attach = useAction();
  const [preview, setPreview] = useState<PatientDocument | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const onFileChosen = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const saved = await attach.run(async () => {
      if (file.size > MAX_FILE_BYTES) throw new Error("Fichier trop volumineux (20 Mo maximum).");
      return api.documents.attach({
        patientId,
        fileName: file.name,
        mime: file.type,
        dataBase64: await readAsBase64(file),
      });
    });
    if (saved) documents.reload();
  };

  return (
    <Card>
      <CardHeader
        title="Documents du dossier"
        description="Les fichiers sont chiffrés et stockés localement."
        action={
          <>
            <input ref={fileInput} type="file" accept={ACCEPTED_TYPES} onChange={onFileChosen} className="hidden" aria-label="Choisir un fichier" />
            <Button size="sm" onClick={() => fileInput.current?.click()} disabled={attach.pending}>
              <Paperclip className="size-4" /> {attach.pending ? "Import…" : "Joindre un document"}
            </Button>
          </>
        }
      />
      {attach.error && <Alert variant="error" className="m-4">{attach.error}</Alert>}
      <QueryState query={documents}>
        {(rows) =>
          rows.length === 0 ? (
            <EmptyState icon={FileText} title="Aucun document" description="Joignez un PDF ou une image au dossier." />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Nom</TH>
                  <TH>Type</TH>
                  <TH>Taille</TH>
                  <TH>Ajouté le</TH>
                  <TH className="w-28" />
                </TR>
              </THead>
              <TBody>
                {rows.map((doc) => (
                  <TR key={doc.id}>
                    <TD dir="auto" className="font-semibold text-primary">{doc.original_name}</TD>
                    <TD>{doc.mime}</TD>
                    <TD>{formatBytes(doc.size_bytes)}</TD>
                    <TD>{formatDateTime(doc.created_at)}</TD>
                    <TD>
                      <Button variant="ghost" size="sm" onClick={() => setPreview(doc)} aria-label={`Aperçu de ${doc.original_name}`}>
                        <Eye className="size-4" /> Aperçu
                      </Button>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )
        }
      </QueryState>
      {preview && <DocumentPreview doc={preview} onClose={() => setPreview(null)} />}
    </Card>
  );
}

function DocumentPreview({ doc, onClose }: { doc: PatientDocument; onClose: () => void }) {
  const file = useAsync(async () => base64ToBlobUrl(await api.documents.getBytes(doc.id), doc.mime), [doc.id]);
  const url = file.data;

  useEffect(() => () => (url ? URL.revokeObjectURL(url) : undefined), [url]);

  const isImage = doc.mime.startsWith("image/");
  const isPdf = doc.mime === "application/pdf";

  return (
    <Dialog
      open
      onClose={onClose}
      title={doc.original_name}
      className="max-w-4xl"
      footer={
        <>
          <Button variant="outline" onClick={() => url && printInFrame({ src: url })} disabled={!url || !(isImage || isPdf)}>
            <Printer className="size-4" /> Imprimer
          </Button>
          <Button onClick={onClose}>Fermer</Button>
        </>
      }
    >
      <QueryState query={file}>
        {(src) =>
          isImage ? (
            <img src={src} alt={doc.original_name} className="mx-auto max-h-[65vh] rounded-lg" />
          ) : isPdf ? (
            <iframe src={src} title={doc.original_name} className="h-[65vh] w-full rounded-lg border border-line" />
          ) : (
            <Alert variant="info">Aperçu indisponible pour ce type de fichier ({doc.mime}).</Alert>
          )
        }
      </QueryState>
    </Dialog>
  );
}
