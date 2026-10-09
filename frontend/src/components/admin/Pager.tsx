import type { Pagination } from '../../api/types';

export default function Pager({ pagination, onPage }: { pagination: Pagination; onPage: (page: number) => void }) {
  const { page, pages, total } = pagination;
  return (
    <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-600">
      <span>
        {total} result{total === 1 ? '' : 's'} · page {page} of {pages}
      </span>
      <div className="flex gap-2">
        <button className="btn-secondary btn-sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Previous
        </button>
        <button className="btn-secondary btn-sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          Next
        </button>
      </div>
    </div>
  );
}
