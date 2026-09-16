"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { resolveReport } from "@/lib/actions/admin";
import { Button } from "@/components/ui/Button";

export function ReportActions({ reportId }: { reportId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function resolve(status: "reviewed" | "dismissed" | "actioned") {
    startTransition(async () => {
      await resolveReport(reportId, status);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="secondary" isLoading={isPending} onClick={() => resolve("actioned")}>
        Marcar ação tomada
      </Button>
      <Button size="sm" variant="ghost" isLoading={isPending} onClick={() => resolve("dismissed")}>
        Arquivar
      </Button>
    </div>
  );
}
