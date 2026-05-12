import { Sheet } from './common.jsx';

export function NoticeModal({ title = 'Information', message, onClose }) {
  return <Sheet title={title} onClose={onClose}><p style={{ lineHeight: 1.45, marginTop: 0 }}>{message}</p><button className="primary" style={{ width: '100%' }} onClick={onClose}>OK</button></Sheet>;
}
