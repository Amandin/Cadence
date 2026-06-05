import { Fenetre } from '../commun/ComposantsCommuns.jsx';

export function FenetreInformation({ titre = 'Information', message, onFermer }) {
  return (
    <Fenetre title={titre} onClose={onFermer}>
      {message && <p style={{ lineHeight: 1.45, marginTop: 0 }}>{message}</p>}
      <button className="primary" style={{ width: '100%' }} onClick={onFermer}>OK</button>
    </Fenetre>
  );
}
