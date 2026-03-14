export function formatLocationText(
  localities: string[],
  secondaryAreas: string[],
  adminAreas: string[],
) {
  let locationLabel = "Kein Ort gefunden";

  if (localities.length === 1) {
    locationLabel = localities[0];
  } else if (localities.length === 2) {
    locationLabel = localities.join(", ");
  } else if (localities.length > 2) {
    locationLabel = secondaryAreas[0]
      ? `Mehrere Orte im Raum ${secondaryAreas[0]}`
      : `Mehrere Orte (${localities.length})`;
  }

  if (!adminAreas.length) {
    return locationLabel;
  }

  return `${locationLabel} | ${adminAreas[0]}`;
}
