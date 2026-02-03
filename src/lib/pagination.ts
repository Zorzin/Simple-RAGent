export const DEFAULT_PAGE_SIZE = 10;

export function getPageParams(pageParam: string | undefined, pageSize: number = DEFAULT_PAGE_SIZE) {
  const page = Math.max(Number(pageParam ?? "1"), 1);
  const limit = pageSize;
  const offset = (page - 1) * pageSize;

  return { page, limit, offset };
}

export function getTotalPages(total: number, pageSize: number = DEFAULT_PAGE_SIZE) {
  return Math.max(Math.ceil(total / pageSize), 1);
}

export function buildPageHref(basePath: string, params: Record<string, string | undefined>) {
  const url = new URL(basePath, "http://localhost");
  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      url.searchParams.set(key, value);
    }
  });
  return `${url.pathname}?${url.searchParams.toString()}`;
}
