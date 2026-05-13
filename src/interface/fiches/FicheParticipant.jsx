import { Status, Sheet } from '../../components/common.jsx';
import { Tracker } from '../../components/Tracker.jsx';
import { EyeMysticOpenIcon, EyeMysticClosedIcon } from '../../components/icons/EyeMysticIcons.jsx';

export function FicheParticipant({ participant, enInitiative, onFermer, onModifier, onRejoindreInitiative, onQuitterInitiative, onSuivi, onSupprimerSuivi, onAjouterEtat, onRetirerEtat, onNote }) {
  const basculerVisibilite = (suivi) => onSuivi(suivi.id, { ...suivi, visible: suivi.visible === false });
  const boutonOeil = (suivi) => {
    const visible = suivi.visible !== false;
    return <button className={`eye-toggle ${visible ? 'active' : 'inactive'}`} onClick={(event) => { event.stopPropagation(); basculerVisibilite(suivi); }} aria-label={visible ? 'Masquer sur la fichette' : 'Afficher sur la fichette'} title={visible ? 'Visible sur la fichette' : 'Masqué sur la fichette'} type="button">{visible ? <EyeMysticOpenIcon /> : <EyeMysticClosedIcon />}</button>;
  };

  return <Sheet title={participant.name} onClose={onFermer}><p>{participant.description}</p><div className="grid2"><button className="primary" onClick={onModifier}>Modifier</button>{enInitiative ? <button className="small-btn" onClick={onQuitterInitiative}>Quitter l’init</button> : <button className="small-btn" onClick={onRejoindreInitiative}>Rejoindre init</button>}</div><button className="small-btn" style={{ width: '100%', marginTop: 8 }} onClick={onFermer}>Fermer</button><h3>Suivis</h3><div className="stack">{participant.trackers.map((suivi) => <div className="tracker-sheet-row" key={suivi.id}><Tracker tracker={suivi} beforeTitle={boutonOeil(suivi)} onChange={(suivant) => onSuivi(suivi.id, suivant)} onDelete={() => onSupprimerSuivi(suivi.id)} /></div>)}</div><h3>États</h3><div className="statuses">{participant.statuses?.map((etat) => <Status key={etat.id} status={etat} onRemove={() => onRetirerEtat(etat.id)} />)}<button className="small-btn" onClick={onAjouterEtat}>+ état</button></div><label className="field">Note<textarea value={participant.note || ''} onChange={(event) => onNote(event.target.value)} /></label></Sheet>;
}
