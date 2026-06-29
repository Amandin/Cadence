const standardSuits = [
  { id: 'coeur', label: 'cœur', color: 'rouge' },
  { id: 'carreau', label: 'carreau', color: 'rouge' },
  { id: 'trefle', label: 'trèfle', color: 'noir' },
  { id: 'pique', label: 'pique', color: 'noir' },
];

const standardRanks = [
  { id: 'as', label: 'As', value: 1 },
  ...Array.from({ length: 9 }, (_, index) => {
    const value = index + 2;
    return { id: String(value), label: String(value), value };
  }),
  { id: 'valet', label: 'Valet', value: 11, figure: true },
  { id: 'dame', label: 'Dame', value: 12, figure: true },
  { id: 'roi', label: 'Roi', value: 13, figure: true },
];

const tarotRanks = [
  ...standardRanks.slice(0, 10),
  { id: 'valet', label: 'Valet', value: 11, figure: true },
  { id: 'cavalier', label: 'Cavalier', value: 12, figure: true },
  { id: 'dame', label: 'Dame', value: 13, figure: true },
  { id: 'roi', label: 'Roi', value: 14, figure: true },
];

function suitedCards(ranks) {
  return standardSuits.flatMap((suit) => ranks.map((rank) => ({
    id: `${rank.id}-${suit.id}`,
    label: `${rank.label} de ${suit.label}`,
    value: rank.value,
    markers: [
      suit.id,
      suit.color,
      ...(rank.figure ? ['figure'] : []),
    ],
  })));
}

export function createStandard54CardSource() {
  return {
    id: 'standard-54-cards',
    name: 'Jeu de 54 cartes',
    kind: randomSourceKinds.CARDS,
    cards: [
      ...suitedCards(standardRanks),
      {
        id: 'joker-rouge',
        label: 'Joker rouge',
        value: 'joker',
        markers: ['joker', 'rouge'],
      },
      {
        id: 'joker-noir',
        label: 'Joker noir',
        value: 'joker',
        markers: ['joker', 'noir'],
      },
    ],
  };
}

export function createFrenchTarotCardSource() {
  return {
    id: 'french-tarot-78-cards',
    name: 'Tarot français',
    kind: randomSourceKinds.CARDS,
    cards: [
      ...suitedCards(tarotRanks),
      ...Array.from({ length: 21 }, (_, index) => {
        const value = index + 1;
        return {
          id: `atout-${value}`,
          label: `Atout ${value}`,
          value,
          markers: ['atout'],
        };
      }),
      {
        id: 'excuse',
        label: 'L’Excuse',
        value: 'excuse',
        markers: ['atout', 'excuse'],
      },
    ],
  };
}

export function createStarterCardSources() {
  return [createStandard54CardSource(), createFrenchTarotCardSource()];
}
import { randomSourceKinds } from './core/constants.js';
