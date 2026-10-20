import { READINESS_STATUS_LABELS, type ReadinessSummary } from "@/lib/betaReadiness";

const SEGMENTS = [
  { status: "done", className: "bg-green-500" },
  { status: "in_progress", className: "bg-amber-400" },
  { status: "blocked", className: "bg-red-500" },
  { status: "not_started", className: "bg-neutral-300" },
] as const;

/** Barra empilhada por status + legenda com contagens. O % exibido é só de itens concluídos. */
export function ReadinessSummaryBar({ summary }: { summary: ReadinessSummary }) {
  if (summary.total === 0) return <p className="text-sm text-neutral-500">Sem itens cadastrados.</p>;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-2xl font-bold text-neutral-900">{summary.percentDone}%</span>
        <span className="text-xs text-neutral-500">
          {summary.counts.done} de {summary.total} itens concluídos
        </span>
      </div>
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-neutral-100" aria-hidden="true">
        {SEGMENTS.map((segment) =>
          summary.counts[segment.status] > 0 ? (
            <span
              key={segment.status}
              className={segment.className}
              style={{ width: `${(summary.counts[segment.status] / summary.total) * 100}%` }}
            />
          ) : null,
        )}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-600">
        {SEGMENTS.map((segment) => (
          <li key={segment.status} className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${segment.className}`} aria-hidden="true" />
            {READINESS_STATUS_LABELS[segment.status]}: {summary.counts[segment.status]}
          </li>
        ))}
      </ul>
    </div>
  );
}
