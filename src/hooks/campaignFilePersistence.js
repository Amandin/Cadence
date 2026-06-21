import { campaignMetaFromPayload, isValidCampaign, normalizeCampaignName, normalizeCampaignPayload } from '../storage.js';
import { t } from '../i18n/index.js';

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
    copyName: t('campaign.copyName', { name: normalizeCampaignName(campaignName) }),
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

export async function readCadenceFile(file) {
  const raw = await file.text();
  const data = JSON.parse(raw.replace(/^\uFEFF/, '').trim());
  if (!isValidCampaign(data)) {
    return { ok: false, message: t('campaign.error.invalidCadenceV2File', { fileName: file?.name || t('campaign.file.unnamed') }) };
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
