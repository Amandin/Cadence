import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { FichetteInitiative } from './FichetteInitiative.jsx';

const handlers = {
  onMarquerAJoue: () => {},
  onAnnulerAJoue: () => {},
  onOuvrir: () => {},
  onSuivi: () => {},
  onSupprimerSuivi: () => {},
  onAjouterEtat: () => {},
  onModifierEtat: () => {},
  onRetirerEtat: () => {},
  onQuitterInitiative: () => {},
};

function renderCard(patch = {}) {
  const participant = {
    id: 'participant',
    name: 'Participant',
    kind: 'Opposant',
    initiative: 10,
    trackers: [],
    statuses: [],
    stats: [],
    ...patch,
  };
  return renderToStaticMarkup(
    <FichetteInitiative
      participant={participant}
      temporaliteSouple={false}
      {...handlers}
    />,
  );
}

describe('FichetteInitiative reserve action', () => {
  it('shows the reserve action for a non-PJ without visible indicators', () => {
    const html = renderCard();
    expect(html).toContain('Mettre Participant en réserve');
    expect(html.indexOf('Mettre Participant en réserve')).toBeGreaterThan(html.indexOf('+ état'));
    expect(html.indexOf('Mettre Participant en réserve')).toBeLessThan(html.indexOf('Replier'));
  });

  it('hides the reserve action for PJs and participants with operational content', () => {
    expect(renderCard({ kind: 'PJ' })).not.toContain('Mettre Participant en réserve');
    expect(renderCard({ statuses: [{ id: 'status', label: 'Blessé' }] })).not.toContain('Mettre Participant en réserve');
    expect(renderCard({ trackers: [{ id: 'tracker', type: 'clock', visible: true }] })).not.toContain('Mettre Participant en réserve');
  });
});
