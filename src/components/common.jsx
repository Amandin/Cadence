import {
  Fenetre,
  EtiquetteEtat,
  BadgeRound,
  AvatarParticipant,
  couleurVersAccent,
} from '../interface/commun/ComposantsCommuns.jsx';

export function Sheet(props) {
  return <Fenetre {...props} />;
}

export function Status({ status, onRemove }) {
  return <EtiquetteEtat etat={status} onRetirer={onRemove} />;
}

export function RoundBadge(props) {
  return <BadgeRound {...props} />;
}

export function Avatar(props) {
  return <AvatarParticipant {...props} />;
}

export function colorToAccent(color) {
  return couleurVersAccent(color);
}
