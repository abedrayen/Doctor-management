import type { ComponentProps } from "react";
import { cn } from "@/utils/cn";

export function Table({ className, ...props }: ComponentProps<"table">) {
  return (
    <div className="overflow-x-auto">
      <table className={cn("w-full border-collapse text-sm", className)} {...props} />
    </div>
  );
}

export const THead = (props: ComponentProps<"thead">) => <thead className="bg-app" {...props} />;
export const TBody = (props: ComponentProps<"tbody">) => <tbody {...props} />;

export function TR({ className, ...props }: ComponentProps<"tr">) {
  return <tr className={cn("border-b border-line last:border-0", className)} {...props} />;
}

export function TH({ className, ...props }: ComponentProps<"th">) {
  return (
    <th
      className={cn("px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-muted", className)}
      {...props}
    />
  );
}

export function TD({ className, ...props }: ComponentProps<"td">) {
  return <td className={cn("px-4 py-3 align-middle", className)} {...props} />;
}
