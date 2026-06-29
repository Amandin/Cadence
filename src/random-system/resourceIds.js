export function createResourceId(prefix, label = '') {
  const slug = String(label || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 36);
  const suffix = Date.now().toString(36);
  return `${prefix}-${slug || 'nouveau'}-${suffix}`;
}
