import { redirect } from "next/navigation";

export default function SearchEntryPage({
  searchParams,
}: {
  searchParams: { q?: string; categoria?: string };
}) {
  const params = new URLSearchParams();
  if (searchParams.q) params.set("q", searchParams.q);
  if (searchParams.categoria) params.set("categoria", searchParams.categoria);
  const query = params.toString();

  redirect(query ? `/pedir?${query}` : "/pedir");
}
