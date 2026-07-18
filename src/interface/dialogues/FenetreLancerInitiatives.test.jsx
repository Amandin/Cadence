import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { initiativeTextOrderFromCardSource, normalizeInitiativeTextOrder } from '../../domain/initiativeTextOrder.js';
import { buildRandomDefinition } from '../../random-system/definitionBuilder.js';
import { createStandardSources } from '../../random-system/defaults.js';
import { createNoCodeExampleDraft } from '../../random-system/noCodeExamples.js';
import { initiativeApproachOption } from '../../random-system/initiativeRoll.js';
import {
  affectationsCartesInitiative,
  FenetreLancerInitiatives,
  ordreParticipantsAffiches,
} from './FenetreLancerInitiatives.jsx';

const participants = [
  { id: 'bob', name: 'Bob', kind: 'Opposant', initiative: '' },
  { id: 'alice', name: 'Alice', kind: 'PJ', initiative: '' },
  { id: 'zoe', name: 'Zoé', kind: 'Allié', initiative: '' },
];

const deck = {
  id: 'initiative-deck',
  name: 'Paquet d’initiative',
  kind: 'cards',
  cards: [
    { id: 'as-pique', label: 'As de Pique', rank: 'As', suit: 'Pique', value: 14 },
    { id: 'roi-coeur', label: 'Roi de Cœur', rank: 'Roi', suit: 'Cœur', value: 13 },
    { id: 'dame-trefle', label: 'Dame de Trèfle', rank: 'Dame', suit: 'Trèfle', value: 12 },
  ],
};

describe('card initiative distribution', () => {
  it('uses the exact order currently displayed', () => {
    expect(ordreParticipantsAffiches(participants, {
      categoryOrder: ['PJ', 'Allié', 'Opposant'],
      triSaisie: 'type',
    }).map((participant) => participant.id)).toEqual(['alice', 'zoe', 'bob']);

    expect(ordreParticipantsAffiches(participants, {
      triSaisie: 'name',
    }).map((participant) => participant.id)).toEqual(['alice', 'bob', 'zoe']);
  });

  it('assigns drawn cards to participants without changing their order', () => {
    const config = normalizeInitiativeTextOrder({
      enabled: true,
      separators: [' de '],
      parts: [
        { label: 'Valeur', values: ['As', 'Roi', 'Dame'] },
        { label: 'Couleur', values: ['Pique', 'Cœur', 'Trèfle'] },
      ],
    });
    const ordered = ordreParticipantsAffiches(participants, {
      categoryOrder: ['PJ', 'Allié', 'Opposant'],
      triSaisie: 'type',
    });
    const assignments = affectationsCartesInitiative(ordered, { cards: deck.cards }, config);

    expect(assignments.map(({ participant, value }) => [participant.id, value])).toEqual([
      ['alice', 'As de Pique'],
      ['zoe', 'Roi de Cœur'],
      ['bob', 'Dame de Trèfle'],
    ]);
  });

  it('shows one action that distributes cards to everyone', () => {
    const html = renderToStaticMarkup(
      <FenetreLancerInitiatives
        participants={participants}
        initiativeTextOrder={initiativeTextOrderFromCardSource(deck)}
        randomSystem={{ state: { definitions: [], sources: [deck] }, actions: { drawCards: () => null } }}
        onFermer={() => {}}
        onValider={() => {}}
        onPasserHorsInitiative={() => {}}
      />,
    );

    expect(html).toContain('Distribuer à tous');
    expect(html).toContain('Tirer une carte pour chaque personnage dans l’ordre actuellement affiché');
  });

  it('offers the contextual initiative approach without exposing the whole roll form', () => {
    const sources = createStandardSources();
    const definition = buildRandomDefinition(createNoCodeExampleDraft('d20-advantage', sources));
    const approach = initiativeApproachOption(definition);
    const html = renderToStaticMarkup(
      <FenetreLancerInitiatives
        participants={participants.slice(0, 1)}
        initiativeBonusRollDefinitionId={definition.id}
        randomSystem={{ state: { definitions: [definition], sources }, actions: { runDefinition: () => null } }}
        onFermer={() => {}}
        onValider={() => {}}
        onPasserHorsInitiative={() => {}}
      />,
    );

    expect(approach).toMatchObject({ id: 'approach', defaultValue: 'normal' });
    expect(html).toContain('Mode du jet d’initiative de Bob');
    expect(html).toContain('<option value="disadvantage">Désavantage</option>');
    expect(html).toContain('<option value="normal" selected="">Normal</option>');
    expect(html).toContain('<option value="advantage">Avantage</option>');
    expect(html).not.toContain('Modificateur');
  });
});
