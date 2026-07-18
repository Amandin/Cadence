import { colorAccents } from '../constants.js';

export function couleurVersAccent(couleur) {
  return colorAccents[couleur] || colorAccents.default;
}

export function teinteEtats(statuses, surface = 'var(--ui-surface)', intensity = 34) {
  const accents = (statuses || [])
    .filter((status) => status?.tintParticipant && status?.color && !status.expired)
    .map((status) => couleurVersAccent(status.color));
  const accentsUniques = [...new Set(accents)];
  if (!accentsUniques.length) return null;
  if (accentsUniques.length === 1) {
    const accent = accentsUniques[0];
    const strong = Math.min(94, intensity);
    const middle = Math.max(18, Math.round(intensity * 0.68));
    const quiet = Math.max(10, Math.round(intensity * 0.28));
    const tail = Math.max(22, Math.round(intensity * 0.78));
    return {
      accents: accentsUniques,
      gradient: `linear-gradient(115deg, color-mix(in srgb, ${accent} ${strong}%, ${surface}) 0%, color-mix(in srgb, ${accent} ${middle}%, ${surface}) 34%, color-mix(in srgb, ${accent} ${quiet}%, ${surface}) 62%, ${surface} 78%, color-mix(in srgb, ${accent} ${tail}%, ${surface}) 100%)`,
    };
  }
  const stops = accentsUniques.map((accent, index) => {
    const position = Math.round((index / (accentsUniques.length - 1)) * 100);
    return `color-mix(in srgb, ${accent} ${Math.min(92, intensity)}%, ${surface}) ${position}%`;
  });
  return {
    accents: accentsUniques,
    gradient: `linear-gradient(115deg, ${stops.join(', ')})`,
  };
}

export function teinteEtatParticipant(participant) {
  return teinteEtats(participant?.statuses);
}
