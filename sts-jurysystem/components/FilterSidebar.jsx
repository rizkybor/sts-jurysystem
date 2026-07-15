"use client";

export default function FilterSidebar({ title = "Filters", open, onClose, children }) {
  return (
    <>
      {/* Backdrop (mobile only, saat drawer terbuka) */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-[85vw] max-w-xs bg-white shadow-2xl overflow-y-auto
          transform transition-transform duration-300 ease-out
          lg:static lg:z-auto lg:w-72 lg:flex-shrink-0 lg:shadow-none lg:transform-none lg:overflow-visible lg:bg-transparent
          ${open ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0
        `}
      >
        {/* Header khusus mobile (tombol tutup) */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 lg:hidden">
          <h3 className="text-base font-bold text-gray-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
            aria-label="Tutup filter"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 lg:p-0">
          <div className="lg:sticky lg:top-24 lg:rounded-2xl lg:bg-white lg:ring-1 lg:ring-gray-200/70 lg:shadow-sm lg:p-5">
            <h3 className="hidden lg:block text-xs font-bold text-gray-900 uppercase tracking-wider mb-4">
              {title}
            </h3>
            {children}
          </div>
        </div>
      </aside>
    </>
  );
}
