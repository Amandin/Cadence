import './IconesCadence.css';

export const cadenceIconPaths = {
  add: '/icons/cadence/ajouter.svg',
  avatarDefault: '/icons/cadence/avatar_defaut.svg',
  avatarSubtle: '/icons/cadence/avatar_discret.svg',
  cardBack: '/icons/cadence/dos_carte.svg',
  cardStack: '/icons/cadence/dos_cartes_multiple.svg',
  close: '/icons/cadence/croix.svg',
  dice: '/icons/cadence/jet_des.svg',
  duplicate: '/icons/cadence/dupliquer.svg',
  edit: '/icons/cadence/edit.svg',
  menu: '/icons/cadence/menu.svg',
  metronome: '/icons/cadence/metronome.svg',
  nextSoft: '/icons/cadence/fleche_N1.svg',
  nextMedium: '/icons/cadence/fleche_N2.svg',
  nextStrong: '/icons/cadence/fleche_N3.svg',
  remove: '/icons/cadence/supprimer.svg',
  return: '/icons/cadence/retour.svg',
  save: '/icons/cadence/sauvegarde.svg',
  settings: '/icons/cadence/rouage.svg',
  switchOff: '/icons/cadence/switch_off.svg',
  switchOn: '/icons/cadence/switch_on.svg',
  timer: '/icons/cadence/sablier.svg',
  valid: '/icons/cadence/valid.svg',
  eyeOpen: '/icons/cadence/oeil_ouvert.svg',
  eyeClosed: '/icons/cadence/oeil_ferme.svg',
  extraAction: '/icons/cadence/action_sup.svg',
  cosmereBoon: '/icons/cadence/special-dice/Cosmere_Aubaine.svg',
  cosmereComplication2: '/icons/cadence/special-dice/Cosmere_Complication_2.svg',
  cosmereComplication4: '/icons/cadence/special-dice/Cosmere_Complication_4.svg',
};

export function IconeCadence({ name, label, className = '', title, style }) {
  const src = cadenceIconPaths[name];
  if (!src) return null;
  const accessible = !!label;

  return (
    <span
      className={`cadence-mask-icon cadence-mask-icon-${name} ${className}`.trim()}
      style={{ '--cadence-icon-url': `url("${src}")`, ...style }}
      role={accessible ? 'img' : undefined}
      aria-label={accessible ? label : undefined}
      aria-hidden={accessible ? undefined : 'true'}
      title={title}
    />
  );
}
