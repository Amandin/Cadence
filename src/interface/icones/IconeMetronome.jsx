import './IconesCadence.css';

export function IconeMetronome({ fige = false }) {
  return (
    <svg viewBox="0 0 9.2521963 15.951361" aria-hidden="true" className={`cadence-vector-icon metronome-icon ${fige ? 'is-stopped' : 'is-running'}`}>
      <g id="metronome-structure" transform="translate(-196.474168,-78.155034)">
        <path d="m 200.64917,83.241078 v 6.541685" fill="none" stroke="currentColor" strokeWidth=".4" strokeLinecap="round" />
        <path d="m 197.0119,90.8915 7.72576,0.06506" fill="none" stroke="currentColor" strokeWidth=".4" strokeLinecap="round" />
        <path d="m 200.74622,85.539123 h 0.44295" fill="none" stroke="currentColor" strokeWidth=".4" strokeLinecap="round" />
        <path d="m 200.79223,87.222123 h 0.39694" fill="none" stroke="currentColor" strokeWidth=".4" strokeLinecap="round" />
        <path d="m 199.99917,89.783777 h 1.35" fill="none" stroke="currentColor" strokeWidth=".4" strokeLinecap="round" />
        <path d="m 199.32738,81.506419 1.32179,1.641465 1.51122,-1.606223" fill="none" stroke="currentColor" strokeWidth=".4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="m 198.28055,93.376524 v 0.670346 h -1.30118 v -0.670346 l -0.39478,0.01951 c -0.25674,-1.71e-4 -0.11681,-0.401468 0.009,-0.908794 0.69857,-2.796008 1.74498,-7.455986 2.67865,-10.961461 0.21238,-0.639703 0.84146,-0.955851 1.41174,-0.966983 0.57325,-0.01119 1.24541,0.21507 1.45594,0.915902 1.3496,4.310758 2.08294,7.389115 3.15649,11.300645 0.0419,0.152626 0.0766,0.622206 -0.13607,0.620932 l -0.5632,0.01927 v 0.65132 h -1.08684 v -0.65132 z" fill="none" stroke="currentColor" strokeWidth=".4" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <g id="metronome-bras">
        <path d="M 4.1822932,13.720064 C 4.1859272,13.144643 4.1557382,2.0494156 4.1557382,2.0494156 M 3.4552132,1.2793536 4.1351171,0.01672955 4.8549662,1.2526836 4.1672822,2.0303186 Z" fill="none" stroke="currentColor" strokeWidth=".418" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}
