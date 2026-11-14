import type { ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/utils/cn";

const badgeVariants = cva("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", {
  variants: {
    variant: {
      neutral: "bg-primary/8 text-primary",
      info: "bg-medical/12 text-medical",
      success: "bg-success/12 text-success",
      warning: "bg-warning/15 text-[#9a6a12]",
      danger: "bg-danger/12 text-danger",
    },
  },
  defaultVariants: { variant: "neutral" },
});

export type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

export function Badge({ className, variant, ...props }: ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
