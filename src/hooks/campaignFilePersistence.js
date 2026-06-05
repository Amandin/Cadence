import { makeDemoCampaigns } from '../logic.js';
import { campaignMetaFromPayload, isValidCampaign, normalizeCampaignName, normalizeCampaignPayload } from '../storage.js';

function slugifyCampaignPart(value) {
  return String(value || 'campagne-cadence')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'campagne-cadence';
}

export function copiedCampaignNames(campaignName) {
  const base = slugifyCampaignPart(`${campaignName}-copie`);
  return {
    base,
    copyName: `${normalizeCampaignName(campaignName)} - copie`,
    folderName: `${base}-${Date.now().toString(36)}`,
    fileName: `${base}.cad`,
  };
}

export function campaignEntryFromPayload(payload, options = {}) {
  const campaign = normalizeCampaignPayload(payload);
  const meta = campaignMetaFromPayload(campaign);
  return {
    id: options.id || meta.id,
    name: options.name || meta.name,
    fileName: options.fileName || meta.fileName,
    folderName: options.folderName || meta.folderName,
    source: options.source || 'memoire',
    autosave: !!options.autosave,
    updatedAt: new Date().toISOString(),
    snapshot: campaign,
  };
}

export function demoCampaignEntries() {
  return makeDemoCampaigns().map((campaign) => campaignEntryFromPayload(campaign, { source: 'demo' }));
}

export async function readCadenceFile(file) {
  const raw = await file.text();
  const data = JSON.parse(raw.replace(/^\uFEFF/, '').trim());
  if (!isValidCampaign(data)) {
    return { ok: false, message: `Le fichier choisi n'est pas une campagne Cadence v2 valide. Fichier : ${file?.name || 'sans nom'}.` };
  }
  return { ok: true, campaign: normalizeCampaignPayload(data) };
}

async function ensureWritePermission(handle) {
  if (!handle?.queryPermission || !handle?.requestPermission) return true;
  const current = await handle.queryPermission({ mode: 'readwrite' });
  if (current === 'granted') return true;
  return await handle.requestPermission({ mode: 'readwrite' }) === 'granted';
}

export async function writeCadenceFile(handle, content) {
  if (!handle) return false;
  if (!await ensureWritePermission(handle)) return false;
  const writable = await handle.createWritable();
  await writable.write(new Blob([content], { type: 'application/json;charset=utf-8' }));
  await writable.close();
  return true;
}

export async function scanCampaignDirectory(directoryHandle) {
  const found = [];
  for await (const [name, handle] of directoryHandle.entries()) {
    if (handle.kind === 'directory') {
      for await (const [fileName, fileHandle] of handle.entries()) {
        if (fileHandle.kind === 'file' && fileName.toLowerCase().endsWith('.cad')) {
          found.push({ folderName: name, fileName, handle: fileHandle });
          break;
        }
      }
    } else if (handle.kind === 'file' && name.toLowerCase().endsWith('.cad')) {
      found.push({ folderName: name.replace(/\.cad$/i, ''), fileName: name, handle });
    }
  }
  return found;
}
