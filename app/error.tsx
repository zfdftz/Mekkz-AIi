"use client";

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="de">
      <body className="flex min-h-screen items-center justify-center bg-[#090014] p-6 text-violet-100">
        <div className="max-w-md rounded-2xl border border-violet-400/20 bg-black/40 p-6 text-center">
          <h2 className="text-xl font-semibold">Etwas ist schiefgelaufen</h2>
          <p className="mt-3 text-sm text-violet-200/80">{error.message}</p>
          <button
            onClick={() => reset()}
            className="mt-5 rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white"
          >
            Erneut versuchen
          </button>
        </div>
      </body>
    </html>
  );
}
