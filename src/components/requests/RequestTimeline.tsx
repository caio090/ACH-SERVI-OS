import type { ServiceRequestStatus } from "@/lib/database.types";
import { getRequestTimeline } from "@/lib/request-status";

export function RequestTimeline({ status }: { status: ServiceRequestStatus }) {
  const items = getRequestTimeline(status);

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-4" aria-labelledby="request-timeline-heading">
      <h2 id="request-timeline-heading" className="text-base font-bold text-neutral-950">Acompanhe seu pedido</h2>
      <ol className="mt-4 space-y-0">
        {items.map((item, index) => (
          <li key={`${item.status}-${index}`} className="relative flex gap-3 pb-5 last:pb-0">
            {index < items.length - 1 && (
              <span
                className={`absolute left-[0.6875rem] top-6 h-[calc(100%-1rem)] w-0.5 ${item.state === "complete" ? "bg-action-500" : "bg-neutral-200"}`}
                aria-hidden="true"
              />
            )}
            <span
              className={`relative mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-black ${
                item.state === "complete"
                  ? "border-action-600 bg-action-600 text-white"
                  : item.state === "current"
                    ? "border-action-600 bg-white text-action-700"
                    : "border-neutral-200 bg-neutral-50 text-neutral-400"
              }`}
              aria-hidden="true"
            >
              {item.state === "complete" ? "✓" : index + 1}
            </span>
            <div className={item.state === "upcoming" ? "text-neutral-400" : "text-neutral-800"}>
              <p className="text-sm font-bold">{item.label}</p>
              <p className="mt-0.5 text-xs leading-relaxed">{item.description}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
