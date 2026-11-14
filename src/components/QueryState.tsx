import type { ReactNode } from "react";
import type { AsyncState } from "@/hooks/useAsync";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

/** Renders loading skeleton, error with retry, or the data via `children`. */
export function QueryState<T>({
  query,
  children,
}: {
  query: AsyncState<T>;
  children: (data: T) => ReactNode;
}) {
  if (query.data !== undefined) {
    return (
      <>
        {query.error && <ErrorWithRetry message={query.error} onRetry={query.reload} />}
        {children(query.data)}
      </>
    );
  }
  if (query.error) return <ErrorWithRetry message={query.error} onRetry={query.reload} />;
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Chargement">
      <Skeleton className="h-10 w-1/3" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}

function ErrorWithRetry({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Alert variant="error" className="mb-3">
      <div className="flex items-center justify-between gap-3">
        <span>{message}</span>
        <Button size="sm" variant="outline" onClick={onRetry}>
          Réessayer
        </Button>
      </div>
    </Alert>
  );
}
