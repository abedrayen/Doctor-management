import { createColumnHelper, tableFeatures, useTable } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { SEX, type PatientSummary } from "@/types/models";
import { formatAge } from "@/utils/age";
import { formatDate } from "@/utils/dates";
import { formatPhone, fullName } from "@/utils/format";

const features = tableFeatures({});
const helper = createColumnHelper<typeof features, PatientSummary>();

const columns = helper.columns([
  helper.accessor("reference", { header: "Référence", cell: (c) => <span className="font-mono text-xs">{c.getValue()}</span> }),
  helper.display({
    id: "nom",
    header: "Nom",
    cell: (c) => (
      <span className="font-semibold text-primary">
        {fullName(c.row.original)}
        {c.row.original.archived && (
          <Badge variant="warning" className="ml-2">
            Archivé
          </Badge>
        )}
      </span>
    ),
  }),
  helper.accessor("date_naissance", { header: "Naissance", cell: (c) => formatDate(c.getValue()) }),
  helper.display({ id: "age", header: "Âge", cell: (c) => formatAge(c.row.original.date_naissance) }),
  helper.accessor("sexe", { header: "Sexe", cell: (c) => SEX[c.getValue()] }),
  helper.accessor("telephone", { header: "Téléphone", cell: (c) => formatPhone(c.getValue()) }),
  helper.accessor("derniere_consultation", { header: "Dernière consultation", cell: (c) => formatDate(c.getValue()) }),
]);

export function PatientTable({ patients, onSelect }: { patients: PatientSummary[]; onSelect: (patient: PatientSummary) => void }) {
  const table = useTable({ features, columns, data: patients });

  return (
    <Table>
      <THead>
        {table.getHeaderGroups().map((group) => (
          <TR key={group.id}>
            {group.headers.map((header) => (
              <TH key={header.id}>{header.isPlaceholder ? null : <table.FlexRender header={header} />}</TH>
            ))}
          </TR>
        ))}
      </THead>
      <TBody>
        {table.getRowModel().rows.map((row) => (
          <TR
            key={row.id}
            tabIndex={0}
            onClick={() => onSelect(row.original)}
            onKeyDown={(e) => e.key === "Enter" && onSelect(row.original)}
            className="cursor-pointer hover:bg-app focus-visible:bg-app"
          >
            {row.getAllCells().map((cell) => (
              <TD key={cell.id}>
                <table.FlexRender cell={cell} />
              </TD>
            ))}
          </TR>
        ))}
      </TBody>
    </Table>
  );
}
