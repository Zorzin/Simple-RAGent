export type SortDir = "asc" | "desc";

export function getSortParams<T extends string>(
  sortParam: string | undefined,
  dirParam: string | undefined,
  fallback: T,
) {
  const sort = (sortParam || fallback) as T;
  const dir = dirParam === "desc" ? "desc" : "asc";
  return { sort, dir } as { sort: T; dir: SortDir };
}

export function toggleDir(current: SortDir) {
  return current === "asc" ? "desc" : "asc";
}
