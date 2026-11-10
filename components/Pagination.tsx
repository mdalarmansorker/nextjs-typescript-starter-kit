import Link from 'next/link';

interface PaginationProps {
  page: number;
  lastPage: number;
  /** The URL of a page, e.g. `page => \`/projects?page=${page}\``. */
  href: (page: number) => string;
}

const linkClass = 'rounded-full border border-zinc-300 px-4 py-1.5 font-medium dark:border-zinc-700';

/** Previous / next links with "Page 2 of 5". Renders nothing when everything fits on one page. */
export default function Pagination({ page, lastPage, href }: PaginationProps) {
  if (lastPage <= 1) return null;

  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-4 text-sm">
      {page > 1 ? (
        <Link href={href(page - 1)} className={linkClass}>
          Previous
        </Link>
      ) : (
        <span />
      )}
      <span aria-current="page">
        Page {page} of {lastPage}
      </span>
      {page < lastPage ? (
        <Link href={href(page + 1)} className={linkClass}>
          Next
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
