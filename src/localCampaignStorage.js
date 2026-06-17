export function readLocalCampaignPayload(storageKey) {
  const raw = localStorage.getItem(storageKey);
  if (!raw) return null;
  return JSON.parse(raw);
}

export function writeLocalCampaignPayload(storageKey, payload) {
  localStorage.setItem(storageKey, JSON.stringify(payload));
}

export function removeLocalCampaignPayload(storageKey) {
  localStorage.removeItem(storageKey);
}
