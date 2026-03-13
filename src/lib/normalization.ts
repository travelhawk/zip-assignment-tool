function collapseWhitespace(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function sanitizePostalCode(value: string) {
  return collapseWhitespace(value).replace(/\s+/g, "").toUpperCase();
}

export function normalizeImportedPostalCode(value: string) {
  const cleaned = sanitizePostalCode(value);

  if (/^\d{1,5}$/.test(cleaned)) {
    return cleaned.padStart(5, "0");
  }

  return cleaned;
}

function baseNormalizeLocality(value: string) {
  return collapseWhitespace(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function normalizeLocalityStrict(value: string) {
  return baseNormalizeLocality(
    collapseWhitespace(value)
      .replace(/\u00e4/gi, "ae")
      .replace(/\u00f6/gi, "oe")
      .replace(/\u00fc/gi, "ue")
      .replace(/\u00df/gi, "ss"),
  );
}

export function normalizeLocalityLoose(value: string) {
  return baseNormalizeLocality(value);
}

export function looksLikePostalCode(value: string) {
  return /\d/.test(value);
}
