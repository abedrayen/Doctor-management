import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAction } from "@/hooks/useAction";
import { api } from "@/services/tauri";
import { PRINTABLE_KIND, type PrintableKind } from "@/types/models";
import { printInFrame } from "@/utils/print";

interface PrintButtonProps {
  kind: PrintableKind;
  patientId: string;
  consultationId?: string;
  label?: string;
}

/** Fetches printable HTML from the backend and prints it. */
export function PrintButton({ kind, patientId, consultationId, label }: PrintButtonProps) {
  const { run, pending, error } = useAction();
  const print = () =>
    run(async () => printInFrame({ srcdoc: await api.printing.generateHtml(kind, patientId, consultationId) }));

  return (
    <>
      <Button variant="outline" size="sm" onClick={print} disabled={pending}>
        <Printer className="size-4" /> {label ?? `Imprimer — ${PRINTABLE_KIND[kind]}`}
      </Button>
      {error && (
        <span role="alert" className="text-xs text-danger">
          {error}
        </span>
      )}
    </>
  );
}
