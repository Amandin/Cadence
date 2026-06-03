import { describe, expect, it } from 'vitest';
import { getAvailableLocales, t } from './index.js';

describe('i18n', () => {
  it('lit les textes depuis le CSV', () => {
    expect(getAvailableLocales()).toContain('fr');
    expect(t('common.add')).toBe('Ajouter');
  });

  it('remplace les paramètres dans les textes', () => {
    expect(t('status.add.title', { name: 'Mira' })).toBe('Ajouter un état · Mira');
  });
});
