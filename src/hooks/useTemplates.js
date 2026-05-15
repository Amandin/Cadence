import { clone, uid } from '../logic.js';
import { categoryExists, instantiateTemplate, makeTemplateFromParticipant, mergeTemplateStores, normalizeTemplateStore, templateNameExists } from '../templates.js';

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

  const updateTemplateParticipant = (templateId, participant) => {
    const cleanParticipant = { ...clone(participant), id: 'template-participant', statuses: [] };
    const cleanName = cleanParticipant.name?.trim() || 'Template sans nom';
    setStore((current) => {
      const currentStore = normalizeTemplateStore(current);
      return normalizeTemplateStore({
        ...currentStore,
        templates: currentStore.templates.map((template) => template.id === templateId
          ? { ...template, name: cleanName, updatedAt: new Date().toISOString(), participant: { ...cleanParticipant, name: cleanName } }
          : template),
      });
    });
  };

  const duplicateTemplate = (templateId) => {
    const source = getTemplate(templateId);
    if (!source) return null;
    const baseName = `${source.name || source.participant?.name || 'Template'} — copie`;
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
    updateTemplateParticipant,
    duplicateTemplate,
    deleteTemplate,
    importTemplates,
  };
}
