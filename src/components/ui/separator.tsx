import { cn } from "@/utils/cn";

export function Separator({ className }: { className?: string }) {
  return <hr role="separator" className={cn("border-0 border-t border-line", className)} />;
}
