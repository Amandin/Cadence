export const randomDefinitionVisuals = Object.freeze([
  { id: 'dice', label: 'Dé générique', mark: 'D' },
  { id: 'd4', label: 'Dé à 4 faces', mark: '4' },
  { id: 'd6', label: 'Dé à 6 faces', mark: '6' },
  { id: 'd8', label: 'Dé à 8 faces', mark: '8' },
  { id: 'd10', label: 'Dé à 10 faces', mark: '10' },
  { id: 'd12', label: 'Dé à 12 faces', mark: '12' },
  { id: 'd20', label: 'Dé à 20 faces', mark: '20' },
  { id: 'percentile', label: 'Dés de pourcentage', mark: '%' },
  { id: 'dice-pool', label: 'Réserve de dés', mark: '3D' },
  { id: 'cards', label: 'Cartes', mark: '♢' },
]);

export const defaultRandomDefinitionVisualId = 'dice';

const visualIds = new Set(randomDefinitionVisuals.map(({ id }) => id));

export function inferRandomDefinitionVisualId(definition = {}) {
  const searchable = `${definition.name || ''} ${JSON.stringify(definition.components || [])}`.toLocaleLowerCase('fr');
  if (/(carte|card|deck|paquet)/.test(searchable)) return 'cards';
  if (/(percentile|d100|pourcentage)/.test(searchable)) return 'percentile';
  if (/(pool|réserve de dés|reserve de des)/.test(searchable)) return 'dice-pool';
  for (const sides of [20, 12, 10, 8, 6, 4]) {
    if (new RegExp(`(?:^|[^a-z0-9])d${sides}(?:[^0-9]|$)`).test(searchable)) return `d${sides}`;
  }
  return defaultRandomDefinitionVisualId;
}

export function normalizeRandomDefinitionVisualId(visualId, definition = {}) {
  const candidate = String(visualId || '').trim();
  return visualIds.has(candidate) ? candidate : inferRandomDefinitionVisualId(definition);
}

export function getRandomDefinitionVisual(visualId) {
  return randomDefinitionVisuals.find((visual) => visual.id === visualId)
    || randomDefinitionVisuals[0];
}
