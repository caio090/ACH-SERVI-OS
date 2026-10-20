import { createClient } from "@/lib/supabase/server";

const SIGNED_URL_TTL_SECONDS = 60 * 60;

/**
 * Fotos de um pedido (bucket privado request-photos). As URLs são assinadas
 * com a sessão de quem está vendo, então a policy de Storage decide quem
 * enxerga: cliente dono, profissionais notificados e admin.
 */
export async function RequestPhotos({ paths }: { paths: string[] }) {
  if (paths.length === 0) return null;

  const supabase = await createClient();
  const { data } = await supabase.storage.from("request-photos").createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
  const urls = (data ?? []).flatMap((item) => (item.signedUrl ? [item.signedUrl] : []));
  if (urls.length === 0) return null;

  return (
    <div className="grid grid-cols-3 gap-2">
      {urls.map((url, index) => (
        <a key={url} href={url} target="_blank" rel="noreferrer" className="overflow-hidden rounded-lg border border-neutral-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={`Foto ${index + 1} do pedido`} className="aspect-square w-full object-cover" />
        </a>
      ))}
    </div>
  );
}
