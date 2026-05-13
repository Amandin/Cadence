import { Sheet } from '../../components/common.jsx';

export function FenetreInformation({ titre = 'Information', message, onFermer }) {
  return (
    <Sheet title={titre} onClose={onFermer}>
      <p style={{ lineHeight: 1.45, marginTop: 0 }}>{message}</p>
      <button className="primary" style={{ width: '100%' }} onClick={onFermer}>OK</button>
    </Sheet>
  );
}
