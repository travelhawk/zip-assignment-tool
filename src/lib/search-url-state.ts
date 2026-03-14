export function normalizeSearchQuery(value: string | null | undefined) {
  return value?.trim() ?? "";
}

export function buildSearchApiPath(query: string) {
  const params = new URLSearchParams({
    q: normalizeSearchQuery(query),
  });

  return `/api/search?${params.toString()}`;
}

export function buildSearchLocation(currentHref: string, query: string) {
  const url = new URL(currentHref);
  const normalizedQuery = normalizeSearchQuery(query);

  if (normalizedQuery) {
    url.searchParams.set("q", normalizedQuery);
  } else {
    url.searchParams.delete("q");
  }

  return `${url.pathname}${url.search}${url.hash}`;
}

export function readSearchQueryFromUrl(currentHref: string) {
  const url = new URL(currentHref);
  return normalizeSearchQuery(url.searchParams.get("q"));
}
