type SearchQuerySyncInput = {
  localValue: string;
  requestedQuery: string;
  urlQuery: string;
};

export function shouldSyncSearchValueFromUrl({
  localValue,
  requestedQuery,
  urlQuery,
}: SearchQuerySyncInput) {
  const normalizedLocalValue = localValue.trim();
  const normalizedRequestedQuery = requestedQuery.trim();
  const normalizedUrlQuery = urlQuery.trim();

  if (normalizedUrlQuery === normalizedLocalValue) {
    return true;
  }

  return normalizedUrlQuery !== normalizedRequestedQuery;
}
