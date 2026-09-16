"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleCategoryActive } from "@/lib/actions/admin";
import { Button } from "@/components/ui/Button";

export function CategoryToggle({ categoryId, isActive }: { categoryId: string; isActive: boolean }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      size="sm"
      variant={isActive ? "danger" : "secondary"}
      isLoading={isPending}
      onClick={() =>
        startTransition(async () => {
          await toggleCategoryActive(categoryId, !isActive);
          router.refresh();
        })
      }
    >
      {isActive ? "Desativar" : "Ativar"}
    </Button>
  );
}
