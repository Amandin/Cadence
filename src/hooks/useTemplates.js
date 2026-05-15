import { clone, uid } from '../logic.js';
import { categoryExists, createBlankParticipant, instantiateTemplate, makeTemplateFromParticipant, mergeTemplateStores, normalizeTemplateStore, templateNameExists } from '../templates.js';

function templateCategoryFromName(value) {
  return value?.trim();
}

function sameCategory(left, right) {
  return templateCategoryFromName(left)?.toLocaleLowerCase() === templateCategoryFromName(right)?.toLocaleLowerCase();
}

function uniqueTemplateName(templates, category, baseName = 'Nouveau template') {
  const cleanCategory = templateCategoryFromName(category) || 'PNJ';
  const existingNames = new Set(
    templates
      .filter((template) => template.category === cleanCategory)
      .map((template) => template.name.toLocaleLowerCase()),
  );
  if (!existingNames.has(baseName.toLocaleLowerCase())) return baseName;
  let index = 2;
  while (existingNames.has(`${baseName} ${index}`.toLocaleLowerCase())) index += 1;
  return `${baseName} ${index}`;
}

function defaultKindForTemplateCategory(category) {
  if (category === 'PJ') return 'PJ';
  if (category === 'Horloge') return 'Environnement';
  return 'Opposant';
}

function moveItem(list, index, delta) {
  const target = index + delta;
  if (index < 0 || target < 0 || target >= list.length) return list;
  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export function useTemplates(store, setStore) {
  const templateStore = normalizeTemplateStore(store);

  const saveParticipantAsTemplate = (participant, { name, category, newCategory, overwrite = false }) => {
    const targetCategory = newCategory?.trim() || category;
    const cleanName = name?.trim();
    if (!cleanName) return { ok: false, kind: 'missing-name', message: 'Donne un nom au template.' };
    if (!targetCategory?.trim()) return { ok: false, kind: 'missing-category', message: 'Choisis ou crée une catégorie.' };
    const duplicate = templateNameExists(templateStore.templates, targetCategory, cleanName);
    if (duplicate && !overwrite) return { ok: false, kind: 'duplicate', message: 'Un template porte déjà ce nom dans cette catégorie. Tu peux l’écraser ou modifier le nom.' };

    const template = makeTemplateFromParticipant(participant, { name: cleanName, category: targetCategory });
    setStore((current) => {
      const currentStore = normalizeTemplateStore(current);
      return normalizeTemplateStore({
        ...currentStore,
        categories: categoryExists(currentStore.categories, targetCategory) ? currentStore.categories : [...currentStore.categories, targetCategory],
        templates: duplicate
          ? currentStore.templates.map((item) => item.category === targetCategory && item.name.toLocaleLowerCase() === cleanName.toLocaleLowerCase() ? { ...template, id: item.id, createdAt: item.createdAt, updatedAt: new Date().toISOString() } : item)
          : [...currentStore.templates, template],
      });
    });
    return { ok: true, template, overwritten: duplicate };
  };

  const createParticipantFromTemplate = (templateId) => {
    const template = templateStore.templates.find((item) => item.id === templateId);
    return instantiateTemplate(template);
  };

  const getTemplate = (templateId) => templateStore.templates.find((template) => template.id === templateId) || null;

  const addCategory = (category) => {
    const cleanCategory = templateCategoryFromName(category);
    if (!cleanCategory) return { ok: false, message: 'Donne un nom à la catégorie.' };
    if (categoryExists(templateStore.categories, cleanCategory)) return { ok: false, message: 'Cette catégorie existe déjà.' };
    setStore((current) => {
      const currentStore = normalizeTemplateStore(current);
      return normalizeTemplateStore({
        ...currentStore,
        categories: [...currentStore.categories, cleanCategory],
      });
    });
    return { ok: true, category: cleanCategory };
  };

  const renameCategory = (category, nextName) => {
    const cleanCurrent = templateCategoryFromName(category);
    const cleanNext = templateCategoryFromName(nextName);
    if (!cleanCurrent || !cleanNext) return { ok: false, message: 'Donne un nom à la catégorie.' };
    if (!sameCategory(cleanCurrent, cleanNext) && categoryExists(templateStore.categories, cleanNext)) return { ok: false, message: 'Cette catégorie existe déjà.' };

    setStore((current) => {
      const currentStore = normalizeTemplateStore(current);
      return normalizeTemplateStore({
        ...currentStore,
        categories: currentStore.categories.map((item) => sameCategory(item, cleanCurrent) ? cleanNext : item),
        templates: currentStore.templates.map((template) => sameCategory(template.category, cleanCurrent) ? { ...template, category: cleanNext, updatedAt: new Date().toISOString() } : template),
      });
    });
    return { ok: true, category: cleanNext };
  };

  const deleteCategory = (category) => {
    const cleanCategory = templateCategoryFromName(category);
    if (!cleanCategory) return { ok: false, message: 'Catégorie introuvable.' };
    const containsTemplates = templateStore.templates.some((template) => sameCategory(template.category, cleanCategory));
    if (containsTemplates) return { ok: false, message: 'Cette catégorie contient encore des templates.' };

    setStore((current) => {
      const currentStore = normalizeTemplateStore(current);
      return normalizeTemplateStore({
        ...currentStore,
        categories: currentStore.categories.filter((item) => !sameCategory(item, cleanCategory)),
      });
    });
    return { ok: true };
  };

  const moveCategory = (category, delta) => {
    const cleanCategory = templateCategoryFromName(category);
    const index = templateStore.categories.findIndex((item) => sameCategory(item, cleanCategory));
    if (index < 0) return;
    setStore((current) => {
      const currentStore = normalizeTemplateStore(current);
      return normalizeTemplateStore({
        ...currentStore,
        categories: moveItem(currentStore.categories, currentStore.categories.findIndex((item) => sameCategory(item, cleanCategory)), delta),
      });
    });
  };

  const createTemplateInCategory = (category) => {
    const cleanCategory = templateCategoryFromName(category) || 'PNJ';
    const name = uniqueTemplateName(templateStore.templates, cleanCategory);
    const participant = {
      ...createBlankParticipant(),
      id: 'template-participant',
      name,
      kind: defaultKindForTemplateCategory(cleanCategory),
      statuses: [],
    };
    const template = makeTemplateFromParticipant(participant, { name, category: cleanCategory });
    setStore((current) => {
      const currentStore = normalizeTemplateStore(current);
      return normalizeTemplateStore({
        ...currentStore,
        categories: categoryExists(currentStore.categories, cleanCategory) ? currentStore.categories : [...currentStore.categories, cleanCategory],
        templates: [...currentStore.templates, template],
      });
    });
    return template;
  };

  const updateTemplateParticipant = (templateId, participant, category) => {
    const cleanParticipant = { ...clone(participant), id: 'template-participant', statuses: [] };
    const cleanName = cleanParticipant.name?.trim() || 'Template sans nom';
    const cleanCategory = templateCategoryFromName(category);
    setStore((current) => {
      const currentStore = normalizeTemplateStore(current);
      return normalizeTemplateStore({
        ...currentStore,
        categories: cleanCategory && !categoryExists(currentStore.categories, cleanCategory) ? [...currentStore.categories, cleanCategory] : currentStore.categories,
        templates: currentStore.templates.map((template) => template.id === templateId
          ? { ...template, category: cleanCategory || template.category, name: cleanName, updatedAt: new Date().toISOString(), participant: { ...cleanParticipant, name: cleanName } }
          : template),
      });
    });
  };

  const setTemplateCategory = (templateId, category) => {
    const cleanCategory = templateCategoryFromName(category);
    if (!cleanCategory) return { ok: false, message: 'Choisis une catégorie.' };
    setStore((current) => {
      const currentStore = normalizeTemplateStore(current);
      return normalizeTemplateStore({
        ...currentStore,
        categories: categoryExists(currentStore.categories, cleanCategory) ? currentStore.categories : [...currentStore.categories, cleanCategory],
        templates: currentStore.templates.map((template) => template.id === templateId ? { ...template, category: cleanCategory, updatedAt: new Date().toISOString() } : template),
      });
    });
    return { ok: true };
  };

  const duplicateTemplate = (templateId) => {
    const source = getTemplate(templateId);
    if (!source) return null;
    const baseName = uniqueTemplateName(templateStore.templates, source.category, `${source.name || source.participant?.name || 'Template'} — copie`);
    const duplicate = {
      ...clone(source),
      id: uid('tpl'),
      name: baseName,
      createdAt: new Date().toISOString(),
      updatedAt: undefined,
      participant: {
        ...clone(source.participant),
        id: 'template-participant',
        name: baseName,
        statuses: [],
      },
    };
    setStore((current) => {
      const currentStore = normalizeTemplateStore(current);
      return normalizeTemplateStore({
        ...currentStore,
        templates: [...currentStore.templates, duplicate],
      });
    });
    return duplicate;
  };

  const deleteTemplate = (templateId) => {
    setStore((current) => {
      const currentStore = normalizeTemplateStore(current);
      return normalizeTemplateStore({
        ...currentStore,
        templates: currentStore.templates.filter((template) => template.id !== templateId),
      });
    });
  };

  const importTemplates = (incomingStore) => {
    const result = mergeTemplateStores(templateStore, incomingStore);
    setStore(result.store);
    return result;
  };

  return {
    categories: templateStore.categories,
    templates: templateStore.templates,
    saveParticipantAsTemplate,
    createParticipantFromTemplate,
    getTemplate,
    addCategory,
    renameCategory,
    deleteCategory,
    moveCategory,
    createTemplateInCategory,
    updateTemplateParticipant,
    setTemplateCategory,
    duplicateTemplate,
    deleteTemplate,
    importTemplates,
  };
}
