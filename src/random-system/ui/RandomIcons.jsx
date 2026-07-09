import { IconeCadence } from '../../interface/icones/IconeCadence.jsx';
import { randomSourceKinds } from '../engine.js';

const randomIconNames = {
  add: 'add',
  back: 'return',
  cards: 'cardStack',
  configure: 'settings',
  history: 'return',
  roll: 'dice',
  rules: 'settings',
  source: 'dice',
  statistics: 'timer',
  table: 'cardStack',
};

export function RandomIcon({ name, className = '' }) {
  return <IconeCadence name={randomIconNames[name] || name} className={className} />;
}

export function RandomSourceIcon({ kind, className = '' }) {
  if (kind === randomSourceKinds.CARDS) return <RandomIcon name="cards" className={className} />;
  if (kind === randomSourceKinds.WEIGHTED) return <RandomIcon name="table" className={className} />;
  return <RandomIcon name="roll" className={className} />;
}
