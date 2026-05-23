const clean=(v)=>String(v??'').trim();
const key=(v)=>clean(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const arr=(v)=>Array.isArray(v)?v:[];
const uniq=(v)=>{const seen=new Set();return arr(v).map(clean).filter(Boolean).filter((x)=>{const k=key(x);if(seen.has(k))return false;seen.add(k);return true;});};

export const initiativeTextOrderPresetIds={CARDS:'cards',TAROT:'tarot',POSTURES:'postures'};
export const initiativeTextOrderPresets={
  cards:{label:'Jeu de cartes classique',separator:' de ',parts:[{label:'Valeur',values:['Joker','As','Roi','Dame','Valet','10','9','8','7','6','5','4','3','2']},{label:'Couleur',values:['Pique','Cœur','Carreau','Trèfle']}]},
  tarot:{label:'Tarot',separator:' de ',parts:[{label:'Valeur',values:['Excuse','21','20','19','18','17','16','15','14','13','12','11','10','9','8','7','6','5','4','3','2','1','Roi','Dame','Cavalier','Valet']},{label:'Famille',values:['Atout','Pique','Cœur','Carreau','Trèfle']}]},
  postures:{label:'Postures / attitudes',separator:' - ',parts:[{label:'Posture',values:['Foudroyante','Agressive','Équilibrée','Défensive','Prudente','Hésitante']},{label:'Priorité',values:['Haute','Normale','Basse']}]},
};

export function normalizeInitiativeTextOrder(config={}){
  const preset=config.preset&&initiativeTextOrderPresets[config.preset]?initiativeTextOrderPresets[config.preset]:null;
  const source=preset?{...preset,...config}:config;
  return {enabled:!!source.enabled,preset:clean(source.preset),separator:clean(source.separator)||' de ',unknown:source.unknown==='first'?'first':'last',parts:arr(source.parts).map((part,index)=>({label:clean(part?.label)||`Partie ${index+1}`,values:uniq(part?.values)})).filter((part)=>part.values.length).slice(0,2)};
}
export const initiativeTextOrderEnabled=(config)=>{const c=normalizeInitiativeTextOrder(config);return c.enabled&&c.parts.length>0;};
export const presetInitiativeTextOrder=(id)=>normalizeInitiativeTextOrder({...(initiativeTextOrderPresets[id]||initiativeTextOrderPresets.cards),preset:id,enabled:true});

export function splitInitiativeLabel(label,config={}){
  const c=normalizeInitiativeTextOrder(config),value=clean(label);if(!value)return [];
  if(c.separator&&value.includes(c.separator))return value.split(c.separator).map(clean).filter(Boolean).slice(0,2);
  const match=value.match(/^(.+?)\s+d[eu’']\s+(.+)$/i);return match?[clean(match[1]),clean(match[2])]:[value];
}
export function composeInitiativeLabel(parts=[],config={}){
  const c=normalizeInitiativeTextOrder(config);return arr(parts).map(clean).filter(Boolean).join(c.separator||' de ');
}
function indexInPart(value,part,unknown){const i=part.values.findIndex((candidate)=>key(candidate)===key(value));if(i>=0)return i;return unknown==='first'?-1:part.values.length;}
export function initiativeTextValue(label,config={}){
  const c=normalizeInitiativeTextOrder(config);if(!initiativeTextOrderEnabled(c))return null;
  const labels=splitInitiativeLabel(label,c);if(!labels.length)return null;
  let total=0,multiplier=1;
  const ranks=c.parts.map((part,index)=>Math.max(0,part.values.length-indexInPart(labels[index],part,c.unknown)));
  for(let index=ranks.length-1;index>=0;index-=1){total+=ranks[index]*multiplier;multiplier*=Math.max(1,c.parts[index].values.length+2);}return total;
}
export function initiativeToNumber(value,config={},fallback=0){const n=Number(value);if(Number.isFinite(n))return n;const ranked=initiativeTextValue(value,config);return Number.isFinite(ranked)?ranked:fallback;}
