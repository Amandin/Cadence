import { normalizeCampaignName } from './storage.js';

function slugifyFilePart(value) {
  const normalized = normalizeCampaignName(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return normalized || 'campagne-cadence';
}

function dateFrPourFichier(date = new Date()) {
  return `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
}

export function campaignExportFileName(campaignName) {
  return `${slugifyFilePart(campaignName)}-${dateFrPourFichier()}.cad`;
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.rel = 'noopener';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  window.setTimeout(() => {
    URL.revokeObjectURL(url);
    link.remove();
  }, 1000);
}

async function saveWithPicker(blob, fileName) {
  if (!window.showSaveFilePicker) return false;
  const handle = await window.showSaveFilePicker({ suggestedName: fileName, types: [{ description: 'Campagne Cadence', accept: { 'application/json': ['.cad'] } }] });
  const writable = await handle.createWritable();
  await writable.write(blob);
  await writable.close();
  return true;
}

export async function shareOrDownloadCampaign(content, campaignName) {
  const fileName = campaignExportFileName(campaignName);
  const blob = new Blob([content], { type: 'application/json;charset=utf-8' });

  try {
    if (await saveWithPicker(blob, fileName)) return { ok: true, method: 'picker' };
  } catch (error) {
    if (error?.name === 'AbortError') return { ok: false, cancelled: true };
    console.warn('Enregistrement direct impossible, fallback utilisé.', error);
  }

  if (typeof File !== 'undefined' && navigator.canShare && navigator.share) {
    const files = [
      new File([blob], fileName, { type: 'application/json' }),
      new File([blob], fileName, { type: 'text/plain' }),
      new File([blob], fileName, { type: 'application/octet-stream' }),
    ];
    const file = files.find((candidate) => navigator.canShare({ files: [candidate] }));
    if (file) {
      try {
        await navigator.share({ files: [file], title: normalizeCampaignName(campaignName), text: 'Export de campagne Cadence' });
        return { ok: true, method: 'share' };
      } catch (error) {
        if (error?.name === 'AbortError') return { ok: false, cancelled: true };
        console.warn('Partage impossible, téléchargement direct utilisé.', error);
      }
    }
  }

  downloadBlob(blob, fileName);
  return { ok: true, method: 'download' };
}

export async function readJsonCadenceFile(file) {
  const raw = await file.text();
  const text = raw.replace(/^\uFEFF/, '').trim();
  return JSON.parse(text);
}
