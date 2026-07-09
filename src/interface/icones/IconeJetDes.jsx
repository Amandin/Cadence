import './IconesCadence.css';
import { IconeCadence } from './IconeCadence.jsx';

export function IconeJetDes({ className = '' }) {
  return <IconeCadence name="dice" className={`cadence-vector-icon dice-roll-icon ${className}`.trim()} />;
}
