import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { APPOINTMENT_STATUS, type AppointmentStatus } from "@/types/models";

const VARIANT: Record<AppointmentStatus, BadgeVariant> = {
  confirmed: "success",
  pending: "warning",
  done: "info",
  cancelled: "danger",
  no_show: "neutral",
};

export function AppointmentStatusBadge({ status }: { status: AppointmentStatus }) {
  return <Badge variant={VARIANT[status]}>{APPOINTMENT_STATUS[status]}</Badge>;
}
