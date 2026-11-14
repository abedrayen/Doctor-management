import type { ReactNode } from "react";
import { HeartPulse } from "lucide-react";
import { Card } from "@/components/ui/card";

export function AuthCard({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <div className="flex min-h-full items-center justify-center bg-app p-6">
      <Card className="w-full max-w-md p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary text-white">
            <HeartPulse className="size-7" aria-hidden />
          </div>
          <h1 className="text-2xl font-bold text-primary">{title}</h1>
          <p className="mt-1 text-sm text-muted">{description}</p>
        </div>
        {children}
      </Card>
    </div>
  );
}
