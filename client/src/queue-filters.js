// The staff queue's search, filters and sort (FR-014), kept in the page address so a filtered queue can
// be bookmarked, shared and reloaded, and so the back button returns to the previous filter.
//
// The names match the query parameters of GET /api/queue (#114). The server validates each one and always
// combines them with the actor's scope (FR-013); the client only carries them.

export const FILTER_KEYS = Object.freeze(["q", "status", "categoryId", "assigneeId", "from", "to", "sort", "page"]);
export const SORTS = Object.freeze([
  { value: "submitted_desc", label: "Newest first" },
  { value: "submitted_asc", label: "Oldest first" },
]);
export const DEFAULT_SORT = "submitted_desc";

// From the address bar's query string to the filter form's values. Unknown keys are dropped.
export function filtersFromSearch(search) {
  const params = new URLSearchParams(search ?? "");
  const filters = {};
  for (const key of FILTER_KEYS) filters[key] = params.get(key) ?? "";
  if (!SORTS.some((s) => s.value === filters.sort)) filters.sort = DEFAULT_SORT;
  if (!/^[1-9]\d*$/.test(filters.page)) filters.page = "1";
  return filters;
}

// From the form back to a query string: empty filters and the defaults are left out, so the address stays
// short and two equal filters give the same address.
export function searchFromFilters(filters) {
  const params = new URLSearchParams();
  for (const key of FILTER_KEYS) {
    const value = String(filters[key] ?? "").trim();
    if (!value) continue;
    if (key === "sort" && value === DEFAULT_SORT) continue;
    if (key === "page" && value === "1") continue;
    params.set(key, value);
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

// A date-range filter whose end is before its start is reported here, before the request is sent.
export function rangeProblem(filters) {
  return filters.from && filters.to && filters.to < filters.from ? "The end date must be on or after the start date." : null;
}
