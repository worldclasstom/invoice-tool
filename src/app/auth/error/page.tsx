export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error: string }>
}) {
  const params = await searchParams

  return (
    <div className="flex min-h-svh w-full items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h1 className="mb-2 text-xl font-bold text-foreground">
            Something went wrong
          </h1>
          {params?.error ? (
            <p className="text-sm text-muted-foreground">
              Error: {params.error}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              An unspecified error occurred.
            </p>
          )}
          <a
            href="/auth/login"
            className="mt-4 inline-block rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            Back to Login
          </a>
        </div>
      </div>
    </div>
  )
}
