export function Spinner() {
  return (
    <div role="status" className="py-8 text-center text-slate-500">
      Loading…
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div
      role="alert"
      className="rounded border border-red-200 bg-red-50 p-4 text-red-800"
    >
      <p>{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-2 rounded bg-red-600 px-3 py-1 text-sm text-white"
      >
        Retry
      </button>
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return <div className="py-8 text-center text-slate-500">{message}</div>;
}
