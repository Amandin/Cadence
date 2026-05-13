import { EtiquetteEtat, Fenetre } from '../commun/ComposantsCommuns.jsx';
import { Suivi } from '../suivis/Suivi.jsx';
import { IconeOeilMystiqueOuvert, IconeOeilMystiqueFerme } from '../icones/IconesOeilMystique.jsx';

export function FicheParticipant({ participant, enInitiative, onFermer, onModifier, onRejoindreInitiative, onQuitterInitiative, onSuivi, onSupprimerSuivi, onAjouterEtat, onRetirerEtat, onNote }) {
  const basculerVisibilite = (suivi) => onSuivi(suivi.id, { ...suivi, visible: suivi.visible === false });
  const boutonOeil = (suivi) => {
    const visible = suivi.visible !== false;
    return <button className={`eye-toggle ${visible ? 'active' : 'inactive'}`} onClick={(event) => { event.stopPropagation(); basculerVisibilite(suivi); }} aria-label={visible ? 'Masquer sur la fichette' : 'Afficher sur la fichette'} title={visible ? 'Visible sur la fichette' : 'Masqué sur la fichette'} type="button">{visible ? <IconeOeilMystiqueOuvert /> : <IconeOeilMystiqueFerme />}</button>;
  };

  return <Fenetre title={participant.name} onClose={onFermer}><p>{participant.description}</p><div className="grid2"><button className="primary" onClick={onModifier}>Modifier</button>{enInitiative ? <button className="small-btn" onClick={onQuitterInitiative}>Quitter l’init</button> : <button className="small-btn" onClick={onRejoindreInitiative}>Rejoindre init</button>}</div><button className="small-btn" style={{ width: '100%', marginTop: 8 }} onClick={onFermer}>Fermer</button><h3>Suivis</h3><div className="stack">{participant.trackers.map((suivi) => <div className="tracker-sheet-row" key={suivi.id}><Suivi suivi={suivi} avantTitre={boutonOeil(suivi)} onModifier={(suivant) => onSuivi(suivi.id, suivant)} onSupprimer={() => onSupprimerSuivi(suivi.id)} /></div>)}</div><h3>États</h3><div className="statuses">{participant.statuses?.map((etat) => <EtiquetteEtat key={etat.id} etat={etat} onRetirer={() => onRetirerEtat(etat.id)} />)}<button className="small-btn" onClick={onAjouterEtat}>+ état</button></div><label className="field">Note<textarea value={participant.note || ''} onChange={(event) => onNote(event.target.value)} /></label></Fenetre>;
}
