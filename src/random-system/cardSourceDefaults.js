import { randomSourceKinds } from './core/constants.js';
import { uiSymbols } from '../uiAssets.js';

const standardSuits = [
  { id: 'pique', rankLabel: 'Pique', label: 'pique', symbol: uiSymbols.spades, color: 'noir' },
  { id: 'coeur', rankLabel: 'Coeur', label: 'coeur', symbol: uiSymbols.hearts, color: 'rouge' },
  { id: 'carreau', rankLabel: 'Carreau', label: 'carreau', symbol: uiSymbols.diamonds, color: 'rouge' },
  { id: 'trefle', rankLabel: 'Trefle', label: 'trefle', symbol: uiSymbols.clubs, color: 'noir' },
];

const standardRanks = [
  { id: 'as', rank: 'A', label: 'As', value: 14 },
  { id: 'roi', rank: 'R', label: 'Roi', value: 13, figure: true },
  { id: 'dame', rank: 'D', label: 'Dame', value: 12, figure: true },
  { id: 'valet', rank: 'V', label: 'Valet', value: 11, figure: true },
  ...Array.from({ length: 9 }, (_, index) => {
    const value = 10 - index;
    return { id: String(value), rank: String(value), label: String(value), value };
  }),
];

const tarotRanks = [
  { id: 'roi', rank: 'R', label: 'Roi', value: 14, figure: true },
  { id: 'dame', rank: 'D', label: 'Dame', value: 13, figure: true },
  { id: 'cavalier', rank: 'C', label: 'Cavalier', value: 12, figure: true },
  { id: 'valet', rank: 'V', label: 'Valet', value: 11, figure: true },
  ...Array.from({ length: 10 }, (_, index) => {
    const value = 10 - index;
    return { id: String(value), rank: String(value), label: String(value), value };
  }),
];

function suitedCards(ranks) {
  return standardSuits.flatMap((suit) => ranks.map((rank) => ({
    id: `${rank.id}-${suit.id}`,
    label: `${rank.rank}${suit.symbol}`,
    comment: `${rank.label} de ${suit.label}`,
    value: rank.value,
    rank: rank.rank,
    suit: suit.symbol,
    color: suit.color,
    symbol: suit.symbol,
    markers: [
      `rank:${rank.rank}`,
      `suit:${suit.id}`,
      suit.id,
      suit.symbol,
      suit.color,
      ...(rank.figure ? ['figure'] : []),
    ],
  })));
}

function joker(color) {
  return {
    id: `joker-${color}`,
    label: uiSymbols.joker,
    comment: `Joker ${color}`,
    value: 'joker',
    rank: uiSymbols.joker,
    suit: '',
    color,
    symbol: uiSymbols.joker,
    markers: ['joker', color],
  };
}

export function createStandard54CardSource() {
  return {
    id: 'standard-54-cards',
    name: 'Jeu de 54 cartes',
    kind: randomSourceKinds.CARDS,
    cards: [
      ...suitedCards(standardRanks),
      joker('rouge'),
      joker('noir'),
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
        const value = 21 - index;
        return {
          id: `atout-${value}`,
          label: `${value}${uiSymbols.tarotTrump}`,
          comment: `Atout ${value}`,
          value,
          rank: String(value),
          suit: uiSymbols.tarotTrump,
          color: 'atout',
          symbol: uiSymbols.tarotTrump,
          markers: [`rank:${value}`, 'suit:atout', 'atout', uiSymbols.tarotTrump],
        };
      }),
      {
        id: 'excuse',
        label: `${uiSymbols.joker}${uiSymbols.tarotTrump}`,
        comment: "L'Excuse",
        value: 'excuse',
        rank: uiSymbols.joker,
        suit: uiSymbols.tarotTrump,
        color: 'atout',
        symbol: uiSymbols.joker,
        markers: ['excuse', 'joker', 'suit:atout', 'atout', uiSymbols.tarotTrump],
      },
    ],
  };
}

export function createStarterCardSources() {
  return [createStandard54CardSource(), createFrenchTarotCardSource()];
}
