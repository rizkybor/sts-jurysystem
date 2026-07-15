export default function LegalPageLayout({ title, updatedAt, children }) {
  return (
    <section className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-sts via-stsDark to-stsDarkHiglight py-12 sm:py-14">
        <div className="pointer-events-none absolute -top-24 -left-16 w-72 h-72 rounded-full bg-stsHighlight/25 blur-[100px]" />
        <div className="pointer-events-none absolute bottom-0 right-0 w-72 h-72 rounded-full bg-cyan-400/15 blur-[100px]" />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            {title}
          </h1>
          {updatedAt && (
            <p className="mt-1.5 text-xs text-white/70">
              Terakhir diperbarui: {updatedAt}
            </p>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <article className="bg-white rounded-2xl ring-1 ring-gray-200/70 shadow-sm p-6 sm:p-10 space-y-6">
          {children}
        </article>
      </div>
    </section>
  );
}

export function LegalSection({ heading, children }) {
  return (
    <section>
      {heading && (
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2.5">
          {heading}
        </h2>
      )}
      <div className="text-sm sm:text-base text-gray-600 leading-relaxed space-y-3">
        {children}
      </div>
    </section>
  );
}
