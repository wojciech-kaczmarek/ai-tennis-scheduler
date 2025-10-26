import { Button } from "@/components/ui/button";
import type { PaginationDTO } from "@/types";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";

interface PaginationControlsProps {
  pagination: PaginationDTO;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

/**
 * Pagination controls component for navigating pages and selecting page size
 */
export function PaginationControls({ pagination, onPageChange, onPageSizeChange }: PaginationControlsProps) {
  const { page, page_size, total_items, total_pages } = pagination;

  const pageSizeOptions = [5, 10, 20, 50];

  const handlePrevious = () => {
    if (page > 1) {
      onPageChange(page - 1);
    }
  };

  const handleNext = () => {
    if (page < total_pages) {
      onPageChange(page + 1);
    }
  };

  const handlePageSizeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newSize = Number(event.target.value);
    onPageSizeChange(newSize);
  };

  // Calculate range of items currently displayed
  const startItem = total_items === 0 ? 0 : (page - 1) * page_size + 1;
  const endItem = Math.min(page * page_size, total_items);

  return (
    <div className="flex flex-col items-center justify-between gap-4 border-t border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800 sm:flex-row sm:px-6">
      {/* Items info and page size selector */}
      <div className="flex flex-1 items-center gap-4">
        <div className="text-sm text-gray-700 dark:text-gray-300">
          Showing <span className="font-medium">{startItem}</span> to <span className="font-medium">{endItem}</span> of{" "}
          <span className="font-medium">{total_items}</span> results
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="page-size-select" className="text-sm text-gray-700 dark:text-gray-300">
            Per page:
          </label>
          <select
            id="page-size-select"
            value={page_size}
            onChange={handlePageSizeChange}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            aria-label="Select number of items per page"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Pagination buttons */}
      <nav className="flex items-center gap-2" aria-label="Pagination navigation" role="navigation">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrevious}
          disabled={page === 1}
          aria-label="Go to previous page"
          aria-disabled={page === 1}
        >
          <ChevronLeftIcon className="mr-1 h-4 w-4" aria-hidden="true" />
          Previous
        </Button>

        <div className="flex items-center gap-2 px-2">
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Page <span className="font-medium">{page}</span> of <span className="font-medium">{total_pages}</span>
          </span>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleNext}
          disabled={page === total_pages || total_pages === 0}
          aria-label="Go to next page"
          aria-disabled={page === total_pages || total_pages === 0}
        >
          Next
          <ChevronRightIcon className="ml-1 h-4 w-4" aria-hidden="true" />
        </Button>
      </nav>
    </div>
  );
}
