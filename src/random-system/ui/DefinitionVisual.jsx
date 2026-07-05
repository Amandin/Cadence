import { getRandomDefinitionVisual } from '../definitionVisuals.js';
import '../styles/definition-visuals.css';

export function DefinitionVisual({ visualId, className = '', decorative = false }) {
  const visual = getRandomDefinitionVisual(visualId);
  return (
    <span
      className={`rs-definition-visual visual-${visual.id} ${className}`.trim()}
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative ? 'true' : undefined}
      aria-label={decorative ? undefined : visual.label}
      title={decorative ? undefined : visual.label}
    >
      <span>{visual.mark}</span>
    </span>
  );
}
