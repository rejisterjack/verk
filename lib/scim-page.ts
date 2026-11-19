export function paginateScim<T>(
  items: T[],
  startIndexRaw: string | null,
  countRaw: string | null,
) {
  const startIndex = Math.max(1, Number(startIndexRaw ?? "1") || 1);
  const count = Math.min(100, Math.max(1, Number(countRaw ?? "100") || 100));
  const Resources = items.slice(startIndex - 1, startIndex - 1 + count);

  return {
    schemas: ["urn:ietf:params:scim:api:messages:2.0:ListResponse"],
    totalResults: items.length,
    startIndex,
    itemsPerPage: Resources.length,
    Resources,
  };
}
