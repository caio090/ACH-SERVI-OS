"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addPortfolioItem } from "@/lib/actions/professional";
import { compressImageForUpload } from "@/lib/imageCompression";
import { InputField } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

export function AddPortfolioItemForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  return (
    <form
      ref={formRef}
      className="flex flex-col gap-3 rounded-xl border border-neutral-200 p-3"
      encType="multipart/form-data"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        const formData = new FormData(e.currentTarget);
        startTransition(async () => {
          const photo = formData.get("photo");
          if (photo instanceof File && photo.size > 0) {
            try {
              formData.set("photo", await compressImageForUpload(photo));
            } catch (err) {
              setError(err instanceof Error ? err.message : "Não foi possível processar a foto.");
              return;
            }
          }
          const result = await addPortfolioItem(formData);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          formRef.current?.reset();
          router.refresh();
        });
      }}
    >
      {error && <Alert tone="error">{error}</Alert>}
      <InputField id="photo" name="photo" type="file" label="Foto" accept="image/jpeg,image/png,image/webp" required />
      <InputField id="title" name="title" label="Título (opcional)" maxLength={120} />
      <Button type="submit" size="sm" isLoading={isPending} className="w-fit">
        Adicionar
      </Button>
    </form>
  );
}
