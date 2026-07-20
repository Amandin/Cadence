function cleanText(value) {
  return String(value ?? '').trim();
}

function quantity(value) {
  return Math.max(0, Math.floor(Number(value) || 0));
}

export function createTokenId(prefix = 'token') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function normalizeTokenContents(contents, types = []) {
  const allowed = new Set(types.map((type) => type.id));
  return Object.fromEntries(Object.entries(contents && typeof contents === 'object' ? contents : {})
    .filter(([id, value]) => allowed.has(id) && quantity(value) > 0)
    .map(([id, value]) => [id, quantity(value)]));
}

export function normalizeTokenType(type = {}, index = 0) {
  return {
    id: cleanText(type.id) || createTokenId('type'),
    name: cleanText(type.name) || `Jeton ${index + 1}`,
    appearance: {
      color: cleanText(type.appearance?.color),
      symbol: cleanText(type.appearance?.symbol),
      image: cleanText(type.appearance?.image),
    },
    value: type.value ?? '',
    tags: Array.isArray(type.tags) ? type.tags.map(cleanText).filter(Boolean) : cleanText(type.tags).split(',').map(cleanText).filter(Boolean),
    description: cleanText(type.description),
  };
}

export function normalizeTokenContainer(container = {}, types = [], index = 0) {
  const reference = normalizeTokenContents(container.referenceContents, types);
  const exposed = container.exposed !== false;
  return {
    id: cleanText(container.id) || createTokenId('container'),
    name: cleanText(container.name) || `Conteneur ${index + 1}`,
    contents: normalizeTokenContents(container.contents, types),
    referenceContents: Object.keys(reference).length ? reference : null,
    exposed,
    quickAccess: exposed && (container.quickAccess !== undefined ? container.quickAccess !== false : true),
  };
}

export function normalizeTokenSystem(state = {}) {
  const tokenTypes = (Array.isArray(state.tokenTypes) ? state.tokenTypes : []).map(normalizeTokenType);
  const tokenContainers = (Array.isArray(state.tokenContainers) ? state.tokenContainers : [])
    .map((container, index) => normalizeTokenContainer(container, tokenTypes, index));
  return { tokenTypes, tokenContainers };
}

export function changeTokenContents(containers, containerId, changes, types) {
  return containers.map((container) => container.id !== containerId ? container : ({
    ...container,
    contents: normalizeTokenContents({ ...container.contents, ...changes }, types),
  }));
}

export function adjustTokenContents(containers, containerId, deltas, types) {
  const container = containers.find((item) => item.id === containerId);
  if (!container) return containers;
  const contents = { ...container.contents };
  Object.entries(deltas || {}).forEach(([typeId, delta]) => {
    contents[typeId] = quantity((contents[typeId] || 0) + (Number(delta) || 0));
  });
  return changeTokenContents(containers, containerId, contents, types);
}

export function moveTokenContents(containers, sourceId, destinationId, quantities, types) {
  const source = containers.find((item) => item.id === sourceId);
  if (!source || sourceId === destinationId) return containers;
  const moved = Object.fromEntries(Object.entries(quantities || {})
    .map(([typeId, count]) => [typeId, Math.min(quantity(count), quantity(source.contents[typeId]))])
    .filter(([, count]) => count > 0));
  let next = adjustTokenContents(containers, sourceId, Object.fromEntries(Object.entries(moved).map(([typeId, count]) => [typeId, -count])), types);
  if (destinationId) next = adjustTokenContents(next, destinationId, moved, types);
  return next;
}

export function selectTokenIndex(selectedIndexes, index, limit) {
  const selected = (selectedIndexes || []).filter((item) => item !== index);
  if ((selectedIndexes || []).includes(index)) return selected;
  const selectionLimit = quantity(limit);
  if (selectionLimit === 0) return [];
  return [...selected.slice(Math.max(0, selected.length - (selectionLimit - 1))), index];
}

export function drawTokenTypes(container, count, random = Math.random) {
  const pool = Object.entries(container?.contents || {}).flatMap(([typeId, countInPool]) => Array.from({ length: quantity(countInPool) }, () => typeId));
  const draws = [];
  const drawCount = Math.min(quantity(count), pool.length);
  for (let index = 0; index < drawCount; index += 1) {
    const selectedIndex = Math.floor(random() * pool.length);
    draws.push(pool.splice(selectedIndex, 1)[0]);
  }
  return draws;
}

export function applyTokenDraw(containers, draw, selectedIndexes, types, random = Math.random, drawnTokens = null) {
  const source = containers.find((container) => container.id === draw.sourceId);
  if (!source) return { containers, drawn: [] };
  const drawn = Array.isArray(drawnTokens) ? drawnTokens : drawTokenTypes(source, draw.count, random);
  const selected = new Set(selectedIndexes || []);
  const changesByContainer = new Map();
  const add = (containerId, typeId, delta) => {
    if (!containerId || !typeId) return;
    const changes = changesByContainer.get(containerId) || {};
    changes[typeId] = (changes[typeId] || 0) + delta;
    changesByContainer.set(containerId, changes);
  };
  drawn.forEach((typeId) => add(source.id, typeId, -1));
  drawn.forEach((typeId, index) => add(selected.has(index) ? draw.selectedDestinationId : draw.otherDestinationId, typeId, 1));
  let next = containers;
  changesByContainer.forEach((changes, id) => {
    const target = next.find((container) => container.id === id);
    if (!target) return;
    const contents = { ...target.contents };
    Object.entries(changes).forEach(([typeId, delta]) => { contents[typeId] = quantity((contents[typeId] || 0) + delta); });
    next = changeTokenContents(next, id, contents, types);
  });
  return { containers: next, drawn };
}
