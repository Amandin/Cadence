import { IconeCadence } from '../icones/IconeCadence.jsx';
import { cadenceAuditSummary, cadenceIconReferences, cadenceReplacementReferences, cadenceStatusLabels, participantSymbolGroups, participantSymbolReferences, redesignCandidateReferences, unusedCadenceIconReferences } from './styleReferenceData.js';

function ReferenceTag({ children }) {
  return <code className="style-reference-tag">{children}</code>;
}

export function SymbolSamples() {
  return (
    <>
      <div className="style-reference-symbol-sections">
        <section className="style-reference-symbol-block style-reference-audit-summary">
          <div className="style-reference-symbol-block-head">
            <ReferenceTag>ICON-AUDIT</ReferenceTag>
            <strong>État d’avancement des remplacements</strong>
          </div>
          <p className="muted style-reference-symbol-help">Lecture rapide : OK = remplacé dans l’interface, Partiel = icône proche utilisée mais sujet encore ouvert, À retravailler = ancien symbole visible ou famille encore trop générique.</p>
          <div className="style-reference-audit-grid">
            {cadenceAuditSummary.map((item) => (
              <article key={item.label}>
                <strong>{item.value}</strong>
                <span>{item.label}</span>
              </article>
            ))}
          </div>
        </section>
        <section className="style-reference-symbol-block style-reference-symbol-block-applied">
          <div className="style-reference-symbol-block-head">
            <ReferenceTag>SYM-MAP</ReferenceTag>
            <strong>Correspondances appliquées</strong>
          </div>
          <p className="muted style-reference-symbol-help">Anciens glyphes et usages branchés sur la famille SVG Cadence. Les lignes “Partiel” restent volontairement visibles dans la dette.</p>
          <div className="style-reference-symbol-grid style-reference-mapping-grid">
            {cadenceReplacementReferences.map((item) => (
              <article className={`style-reference-map-${item.status}`} key={`${item.source}-${item.newIcon}`}>
                <span className="style-reference-symbol style-reference-svg-symbol" aria-hidden="true"><IconeCadence name={item.newIcon.split(' / ')[0]} /></span>
                <div>
                  <span className="style-reference-map-head"><ReferenceTag>{item.oldRef}</ReferenceTag><em>{cadenceStatusLabels[item.status] || item.status}</em></span>
                  <strong>{item.source} → IconeCadence.{item.newIcon}</strong>
                  <small>{item.usage}</small>
                </div>
              </article>
            ))}
          </div>
        </section>
        <section className="style-reference-symbol-block style-reference-symbol-block-flagged">
          <div className="style-reference-symbol-block-head">
            <ReferenceTag>SYM-GRP-06</ReferenceTag>
            <strong>Reste à retravailler visuellement</strong>
          </div>
          <p className="muted style-reference-symbol-help">Dette visuelle restante : signes encore fonctionnels, mais sans remplacement satisfaisant dans la famille SVG actuelle.</p>
          <div className="style-reference-symbol-grid">
            {redesignCandidateReferences.map((item) => (
              <article key={item.ref}>
                <span className="style-reference-symbol" aria-hidden="true">{item.symbol}</span>
                <div><ReferenceTag>{item.ref}</ReferenceTag><strong>{item.label}</strong><small>{item.note}</small></div>
              </article>
            ))}
          </div>
        </section>
        {/* Section supprimée de la page rendue : doublon de la galerie SVG Cadence. */}
        {false && <section className="style-reference-symbol-block">
          <div className="style-reference-symbol-block-head">
            <ReferenceTag>SYM-GRP-04</ReferenceTag>
            <strong>Icônes Cadence</strong>
          </div>
          <p className="muted style-reference-symbol-help">Symboles de l’interface, plutôt clairs et cohérents avec le thème actuel.</p>
          <div className="style-reference-symbol-grid">
            {filteredUiSymbolReferences.map((item) => (
              <article key={item.ref}>
                <span className="style-reference-symbol" aria-hidden="true">{item.symbol}</span>
                <div><ReferenceTag>{item.ref}</ReferenceTag><strong>{item.label}</strong><small>{item.source}</small></div>
              </article>
            ))}
          </div>
        </section>}
        {false && <section className="style-reference-symbol-block">
          <div className="style-reference-symbol-block-head">
            <ReferenceTag>SYM-GRP-05</ReferenceTag>
            <strong>Symboles techniques</strong>
          </div>
          <p className="muted style-reference-symbol-help">Littéraux et marqueurs plus utilitaires, pas toujours jolis mais souvent efficaces.</p>
          <div className="style-reference-symbol-grid">
            {filteredLiteralSymbolReferences.map((item) => (
              <article key={item.ref}>
                <span className="style-reference-symbol" aria-hidden="true">{item.symbol}</span>
                <div><ReferenceTag>{item.ref}</ReferenceTag><strong>{item.label}</strong><small>{item.source}</small></div>
              </article>
            ))}
          </div>
        </section>}
      </div>
      {false && <div className="style-reference-grid style-reference-vector-grid">
        <Sample refId="ICON-01" title="Œil ouvert"><span className="style-reference-vector"><IconeOeilMystiqueOuvert /></span></Sample>
        <Sample refId="ICON-02" title="Œil fermé"><span className="style-reference-vector"><IconeOeilMystiqueFerme /></span></Sample>
        <Sample refId="ICON-03" title="Replier / déplier"><span className="style-reference-vector"><IconeRepliFichette /></span><span className="style-reference-vector"><IconeRepliFichette repliee /></span></Sample>
        <Sample refId="ICON-04" title="Métronome animé / arrêté"><span className="style-reference-vector"><IconeMetronome /></span><span className="style-reference-vector"><IconeMetronome fige /></span></Sample>
        <Sample refId="ICON-05" title="Flèche Cadence avant"><span className="style-reference-vector"><span className="cadence-arrow-icon forward" /></span></Sample>
        <Sample refId="ICON-06" title="Flèche Cadence retour"><span className="style-reference-vector"><span className="cadence-arrow-icon back" /></span></Sample>
        <Sample refId="ICON-07" title="Jet de dés"><span className="style-reference-vector"><IconeJetDes /></span></Sample>
      </div>}
      <section className="style-reference-symbol-block style-reference-new-icons">
        <div className="style-reference-symbol-block-head">
          <ReferenceTag>ICON-NEW</ReferenceTag>
          <strong>Nouvelle famille SVG Cadence</strong>
        </div>
        <p className="muted style-reference-symbol-help">Chaque symbole importé est exposé ici avec le même rendu que dans l’interface : masque SVG, couleur héritée, tailles normalisées.</p>
        <div className="style-reference-symbol-grid style-reference-icon-grid">
          {cadenceIconReferences.map((item) => (
            <article key={item.ref}>
              <span className="style-reference-symbol style-reference-svg-symbol" aria-hidden="true"><IconeCadence name={item.name} /></span>
              <div><ReferenceTag>{item.ref}</ReferenceTag><strong>{item.label}</strong><small>IconeCadence.{item.name}</small></div>
            </article>
          ))}
        </div>
      </section>
      {unusedCadenceIconReferences.length > 0 && <section className="style-reference-symbol-block style-reference-unused-icons">
        <div className="style-reference-symbol-block-head">
          <ReferenceTag>ICON-UNUSED</ReferenceTag>
          <strong>Nouvelles icônes non utilisées en production</strong>
        </div>
        <p className="muted style-reference-symbol-help">Icônes importées mais pas encore branchées dans l’interface. Certaines sont des variantes volontaires, d’autres signalent une opportunité de remplacement future.</p>
        <div className="style-reference-symbol-grid style-reference-icon-grid">
          {unusedCadenceIconReferences.length === 0 && (
            <article>
              <span className="style-reference-symbol" aria-hidden="true">✓</span>
              <div><ReferenceTag>ICON-UNUSED-00</ReferenceTag><strong>Aucune icône importée inutilisée</strong><small>Toute la famille SVG Cadence est actuellement branchée ou documentée dans l’interface.</small></div>
            </article>
          )}
          {unusedCadenceIconReferences.map((item) => (
            <article key={item.ref}>
              <span className="style-reference-symbol style-reference-svg-symbol" aria-hidden="true"><IconeCadence name={item.name} /></span>
              <div><ReferenceTag>{item.ref}</ReferenceTag><strong>{item.label}</strong><small>IconeCadence.{item.name}</small></div>
            </article>
          ))}
        </div>
      </section>}
      {false && <section className="style-reference-symbol-block style-reference-variant-icons">
        <div className="style-reference-symbol-block-head">
          <ReferenceTag>ICON-VAR</ReferenceTag>
          <strong>Variantes à arbitrer</strong>
        </div>
        <p className="muted style-reference-symbol-help">Différences explicites entre les anciens composants et les SVG importés pour les yeux, métronomes et dés.</p>
        <div className="style-reference-symbol-grid style-reference-mapping-grid">
          {cadenceVariantNotes.map((item) => (
            <article key={item.ref}>
              <span className="style-reference-symbol" aria-hidden="true">{item.status === 'Remplacé' ? '✓' : '…'}</span>
              <div>
                <ReferenceTag>{item.ref}</ReferenceTag>
                <strong>{item.title} · {item.status}</strong>
                <small>Actuel : {item.current}</small>
                <small>Importé : {item.imported}</small>
                <small>{item.note}</small>
              </div>
            </article>
          ))}
        </div>
      </section>}
      <section className="style-reference-symbol-block style-reference-character-symbols">
        <div className="style-reference-symbol-block-head">
          <ReferenceTag>SYM-CHAR</ReferenceTag>
          <strong>Symboles de personnages</strong>
        </div>
        <p className="muted style-reference-symbol-help">Bloc séparé : ces symboles servent aux fiches et à la personnalisation, pas au langage visuel général de l’interface.</p>
        {participantSymbolGroups.map((group) => (
          <section className="style-reference-symbol-subgroup" key={group.ref}>
            <div className="style-reference-symbol-block-head">
              <ReferenceTag>{group.ref}</ReferenceTag>
              <strong>{group.title}</strong>
            </div>
            <p className="muted style-reference-symbol-help">{group.help}</p>
            <div className="style-reference-symbol-grid">
              {group.symbols.map((symbol) => {
                const item = participantSymbolReferences.find((reference) => reference.symbol === symbol);
                if (!item) return null;
                return (
                  <article key={`${group.ref}-${item.ref}`}>
                    <span className="style-reference-symbol" aria-hidden="true">{item.symbol}</span>
                    <div><ReferenceTag>{item.ref}</ReferenceTag><strong>{item.label}</strong><small>{item.source}</small></div>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </section>
    </>
  );
}
