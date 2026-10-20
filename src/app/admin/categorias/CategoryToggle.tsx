"use client";

import { toggleCategoryActive } from "@/lib/actions/admin";
import { Button } from "@/components/ui/Button";
import { ActionError } from "@/components/admin/ActionError";
import { useActionRunner } from "@/components/admin/useActionRunner";

export function CategoryToggle({ categoryId, isActive }: { categoryId: string; isActive: boolean }) {
  const { run, isPending, error } = useActionRunner();

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        size="sm"
        variant={isActive ? "danger" : "secondary"}
        isLoading={isPending}
        onClick={() => run(() => toggleCategoryActive(categoryId, !isActive))}
      >
        {isActive ? "Desativar" : "Ativar"}
      </Button>
      <ActionError error={error} />
    </div>
  );
}
