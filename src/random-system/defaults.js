import { createUniformSource } from './engine.js';
import { createStarterCardSources } from './cardSourceDefaults.js';

export const standardSourceIds = {
  D3: 'standard-d3',
  D4: 'standard-d4',
  D6: 'standard-d6',
  D8: 'standard-d8',
  D10: 'standard-d10',
  D12: 'standard-d12',
  D20: 'standard-d20',
  D100: 'standard-d100',
  WEATHER_D10: 'example-weather-d10',
};

export function createWeatherD10Source() {
  return createUniformSource({
    id: standardSourceIds.WEATHER_D10,
    name: 'd10 Météo',
    min: 1,
    max: 10,
    labels: {
      1: 'Grand soleil',
      2: 'Éclaircies',
      3: 'Nuageux',
      4: 'Couvert',
      5: 'Bruine',
      6: 'Pluie',
      7: 'Forte pluie',
      8: 'Orage',
      9: 'Brouillard',
      10: 'Vent violent',
    },
    symbols: {
      1: '☀️',
      2: '🌤️',
      3: '⛅',
      4: '☁️',
      5: '☔',
      6: '🌧️',
      7: '🌧️☔',
      8: '⛈️',
      9: '🌫️',
      10: '💨',
    },
  });
}

export function createStandardSources() {
  return [
    ...[3, 4, 6, 8, 10, 12, 20, 100].map((max) => createUniformSource({
      id: `standard-d${max}`,
      name: `d${max}`,
      min: 1,
      max,
    })),
    createWeatherD10Source(),
    ...createStarterCardSources(),
  ];
}

export function createStarterDefinitions() {
  return [];
}
