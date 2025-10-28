const Pagination = ({ page, pageSize, totalItems, onPageChange }) => {
  const totalPages = Math.ceil(totalItems / pageSize);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) onPageChange(newPage);
  };

  if (totalPages <= 1) return null; // hide if only 1 page

  const getPageNumbers = () => {
    const delta = 1;
    const range = [];

    for (
      let i = Math.max(1, page - delta);
      i <= Math.min(totalPages, page + delta);
      i++
    ) {
      range.push(i);
    }
    return range;
  };

  return (
    <div className="flex justify-center items-center mt-8 space-x-2">
      {/* Previous */}
      <button
        onClick={() => handlePageChange(page - 1)}
        disabled={page === 1}
        className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition
          ${
            page === 1
              ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
              : "bg-white text-gray-700 border-gray-300 hover:bg-blue-50 hover:text-stsDarkHiglight"
          }`}
      >
        ← Previous
      </button>

      {/* Page Numbers */}
      <div className="flex items-center space-x-1">
        {getPageNumbers().map((num) => (
          <button
            key={num}
            onClick={() => handlePageChange(num)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition
              ${
                num === page
                  ? "surface-sts text-white shadow-sm"
                  : "bg-white border border-gray-300 text-gray-700 hover:bg-blue-50 hover:text-stsDarkHiglight"
              }`}
          >
            {num}
          </button>
        ))}
      </div>

      {/* Next */}
      <button
        onClick={() => handlePageChange(page + 1)}
        disabled={page === totalPages}
        className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition
          ${
            page === totalPages
              ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
              : "bg-white text-gray-700 border-gray-300 hover:bg-blue-50 hover:text-stsDarkHiglight"
          }`}
      >
        Next →
      </button>
    </div>
  );
};

export default Pagination;