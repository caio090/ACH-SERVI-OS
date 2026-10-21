export function ActionError({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p role="alert" className="text-xs text-red-600">
      {error}
    </p>
  );
}
