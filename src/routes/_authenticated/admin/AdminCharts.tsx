import { lazy, Suspense } from "react";

const Charts = lazy(() => import("./AdminChartsImpl"));

export type ChartProps = {
  statusData: { name: string; value: number }[];
  stateData: { state: string; count: number }[];
};

export function AdminCharts(props: ChartProps) {
  return (
    <Suspense
      fallback={
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-[260px] animate-pulse rounded-lg border border-border bg-muted/30" />
          <div className="h-[260px] animate-pulse rounded-lg border border-border bg-muted/30" />
        </div>
      }
    >
      <Charts {...props} />
    </Suspense>
  );
}
