import type { ReactNode } from "react";

export function EmptyState({
  icon = "🔎",
  title,
  description,
  action,
}: {
  icon?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-neutral-300 px-6 py-10 text-center">
      <span className="text-3xl" aria-hidden="true">
        {icon}
      </span>
      <p className="font-medium text-neutral-800">{title}</p>
      {description && <p className="max-w-xs text-sm text-neutral-500">{description}</p>}
      {action}
    </div>
  );
}
