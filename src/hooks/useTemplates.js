import { clone, newTracker, uid } from '../logic.js';
import { mergeRulePresetCatalog } from '../rulePresets.js';
import { t } from '../i18n/index.js';
import {
  categoryExists,
  createBlankParticipant,
  instantiateSceneCounterTemplate,
  instantiateSceneStatusTemplate,
  instantiateStatusTemplate,
  instantiateTemplate,
  instantiateTrackerTemplate,
  makeRuleTemplateFromRules,
  makeSceneCounterTemplateFromCounter,
  makeSceneStatusTemplateFromStatus,
  makeStatusTemplateFromStatus,
  makeTemplateFromParticipant,
  makeTrackerTemplateFromTracker,
  mergeTemplateStores,
  normalizeTemplateStore,
  numberedCopyName,
  templateNameExists,
} from '../templates.js';

function templateCategoryFromName(value) {
  return value?.trim();
}

function sameCategory(left, right) {
  return templateCategoryFromName(left)?.toLocaleLowerCase() === templateCategoryFromName(right)?.toLocaleLowerCase();
}

function uniqueTemplateName(templates, category, baseName = t('templates.fallback.newTemplate')) {
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

function uniqueFlatTemplateName(templates, baseName = t('templates.fallback.newTemplate')) {
  const existingNames = new Set(templates.map((template) => template.name.toLocaleLowerCase()));
  if (!existingNames.has(baseName.toLocaleLowerCase())) return baseName;
  let index = 2;
  while (existingNames.has(`${baseName} ${index}`.toLocaleLowerCase())) index += 1;
  return `${baseName} ${index}`;
}

function duplicateTemplateName(templates, category, sourceName, fallback = t('templates.fallback.unnamed')) {
  const cleanCategory = templateCategoryFromName(category) || 'PNJ';
  return numberedCopyName(
    templates.filter((template) => template.category === cleanCategory).map((template) => template.name),
    sourceName,
    fallback,
  );
}

function duplicateFlatTemplateName(templates, sourceName, fallback = t('templates.fallback.unnamed')) {
  return numberedCopyName(templates.map((template) => template.name), sourceName, fallback);
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
  const updateStore = (updater) => setStore((current) => normalizeTemplateStore(updater(normalizeTemplateStore(current))));

  const saveParticipantAsTemplate = (participant, { name, category, newCategory, overwrite = false }) => {
    const targetCategory = newCategory?.trim() || category;
    const cleanName = name?.trim();
    if (!cleanName) return { ok: false, kind: 'missing-name', message: t('templates.error.missingName') };
    if (!targetCategory?.trim()) return { ok: false, kind: 'missing-category', message: t('templates.error.missingCategory') };
    const duplicate = templateNameExists(templateStore.templates, targetCategory, cleanName);
    if (duplicate && !overwrite) return { ok: false, kind: 'duplicate', message: t('templates.error.duplicateNameInCategory') };

    const template = makeTemplateFromParticipant(participant, { name: cleanName, category: targetCategory });
    updateStore((currentStore) => ({
        ...currentStore,
        categories: categoryExists(currentStore.categories, targetCategory) ? currentStore.categories : [...currentStore.categories, targetCategory],
        templates: duplicate
          ? currentStore.templates.map((item) => item.category === targetCategory && item.name.toLocaleLowerCase() === cleanName.toLocaleLowerCase() ? { ...template, id: item.id, createdAt: item.createdAt, updatedAt: new Date().toISOString() } : item)
          : [...currentStore.templates, template],
      }));
    return { ok: true, template, overwritten: duplicate };
  };

  const createParticipantFromTemplate = (templateId) => {
    const template = templateStore.templates.find((item) => item.id === templateId);
    return instantiateTemplate(template);
  };

  const getTemplate = (templateId) => templateStore.templates.find((template) => template.id === templateId) || null;

  const addCategory = (category) => {
    const cleanCategory = templateCategoryFromName(category);
    if (!cleanCategory) return { ok: false, message: t('templates.error.categoryName') };
    if (categoryExists(templateStore.categories, cleanCategory)) return { ok: false, message: t('templates.error.categoryExists') };
    updateStore((currentStore) => ({
        ...currentStore,
        categories: [...currentStore.categories, cleanCategory],
      }));
    return { ok: true, category: cleanCategory };
  };

  const renameCategory = (category, nextName) => {
    const cleanCurrent = templateCategoryFromName(category);
    const cleanNext = templateCategoryFromName(nextName);
    if (!cleanCurrent || !cleanNext) return { ok: false, message: t('templates.error.categoryName') };
    if (!sameCategory(cleanCurrent, cleanNext) && categoryExists(templateStore.categories, cleanNext)) return { ok: false, message: t('templates.error.categoryExists') };

    updateStore((currentStore) => ({
        ...currentStore,
        categories: currentStore.categories.map((item) => sameCategory(item, cleanCurrent) ? cleanNext : item),
        templates: currentStore.templates.map((template) => sameCategory(template.category, cleanCurrent) ? { ...template, category: cleanNext, updatedAt: new Date().toISOString() } : template),
      }));
    return { ok: true, category: cleanNext };
  };

  const deleteCategory = (category) => {
    const cleanCategory = templateCategoryFromName(category);
    if (!cleanCategory) return { ok: false, message: t('templates.error.categoryNotFound') };
    const containsTemplates = templateStore.templates.some((template) => sameCategory(template.category, cleanCategory));
    if (containsTemplates) return { ok: false, message: t('templates.error.categoryNotEmpty') };

    updateStore((currentStore) => ({
        ...currentStore,
        categories: currentStore.categories.filter((item) => !sameCategory(item, cleanCategory)),
      }));
    return { ok: true };
  };

  const moveCategory = (category, delta) => {
    const cleanCategory = templateCategoryFromName(category);
    const index = templateStore.categories.findIndex((item) => sameCategory(item, cleanCategory));
    if (index < 0) return;
    updateStore((currentStore) => ({
        ...currentStore,
        categories: moveItem(currentStore.categories, currentStore.categories.findIndex((item) => sameCategory(item, cleanCategory)), delta),
      }));
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
    updateStore((currentStore) => ({
        ...currentStore,
        categories: categoryExists(currentStore.categories, cleanCategory) ? currentStore.categories : [...currentStore.categories, cleanCategory],
        templates: [...currentStore.templates, template],
      }));
    return template;
  };

  const updateTemplateParticipant = (templateId, participant, category) => {
    const cleanParticipant = { ...clone(participant), id: 'template-participant', statuses: [] };
    const cleanName = cleanParticipant.name?.trim() || t('templates.fallback.unnamed');
    const cleanCategory = templateCategoryFromName(category);
    updateStore((currentStore) => ({
        ...currentStore,
        categories: cleanCategory && !categoryExists(currentStore.categories, cleanCategory) ? [...currentStore.categories, cleanCategory] : currentStore.categories,
        templates: currentStore.templates.map((template) => template.id === templateId
          ? { ...template, category: cleanCategory || template.category, name: cleanName, updatedAt: new Date().toISOString(), participant: { ...cleanParticipant, name: cleanName } }
          : template),
      }));
  };

  const setTemplateCategory = (templateId, category) => {
    const cleanCategory = templateCategoryFromName(category);
    if (!cleanCategory) return { ok: false, message: t('templates.fallback.chooseCategory') };
    updateStore((currentStore) => ({
        ...currentStore,
        categories: categoryExists(currentStore.categories, cleanCategory) ? currentStore.categories : [...currentStore.categories, cleanCategory],
        templates: currentStore.templates.map((template) => template.id === templateId ? { ...template, category: cleanCategory, updatedAt: new Date().toISOString() } : template),
      }));
    return { ok: true };
  };

  const duplicateTemplate = (templateId) => {
    const source = getTemplate(templateId);
    if (!source) return null;
    const baseName = duplicateTemplateName(templateStore.templates, source.category, source.name || source.participant?.name, t('templates.fallback.unnamed'));
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
    updateStore((currentStore) => ({
        ...currentStore,
        templates: [...currentStore.templates, duplicate],
      }));
    return duplicate;
  };

  const deleteTemplate = (templateId) => {
    updateStore((currentStore) => ({
        ...currentStore,
        templates: currentStore.templates.filter((template) => template.id !== templateId),
      }));
  };

  const getTrackerTemplate = (templateId) => templateStore.trackerTemplates.find((template) => template.id === templateId) || null;
  const createTrackerTemplate = (type = 'bar') => {
    const tracker = newTracker(type);
    const template = makeTrackerTemplateFromTracker(tracker, { name: uniqueFlatTemplateName(templateStore.trackerTemplates, tracker.name || t('templates.fallback.tracker')) });
    updateStore((currentStore) => ({ ...currentStore, trackerTemplates: [...currentStore.trackerTemplates, template] }));
    return template;
  };
  const updateTrackerTemplate = (templateId, tracker, name) => {
    const cleanName = templateCategoryFromName(name || tracker?.name) || t('templates.fallback.tracker');
    updateStore((currentStore) => ({
      ...currentStore,
      trackerTemplates: currentStore.trackerTemplates.map((template) => template.id === templateId
        ? { ...template, name: cleanName, updatedAt: new Date().toISOString(), tracker: { ...clone(tracker), id: 'template-tracker', name: tracker?.name || cleanName } }
        : template),
    }));
  };
  const duplicateTrackerTemplate = (templateId) => {
    const source = getTrackerTemplate(templateId);
    if (!source) return null;
    const duplicate = { ...clone(source), id: uid('ttpl'), name: duplicateFlatTemplateName(templateStore.trackerTemplates, source.name, t('templates.fallback.tracker')), createdAt: new Date().toISOString(), updatedAt: undefined };
    updateStore((currentStore) => ({ ...currentStore, trackerTemplates: [...currentStore.trackerTemplates, duplicate] }));
    return duplicate;
  };
  const deleteTrackerTemplate = (templateId) => updateStore((currentStore) => ({ ...currentStore, trackerTemplates: currentStore.trackerTemplates.filter((template) => template.id !== templateId) }));
  const createTrackerFromTemplate = (templateId) => instantiateTrackerTemplate(getTrackerTemplate(templateId));
  const saveTrackerAsTemplate = (tracker, name) => {
    const cleanName = templateCategoryFromName(name || tracker?.name) || t('templates.fallback.tracker');
    const template = makeTrackerTemplateFromTracker(tracker, { name: uniqueFlatTemplateName(templateStore.trackerTemplates, cleanName) });
    updateStore((currentStore) => ({ ...currentStore, trackerTemplates: [...currentStore.trackerTemplates, template] }));
    return template;
  };

  const getStatusTemplate = (templateId) => templateStore.statusTemplates.find((template) => template.id === templateId) || null;
  const createStatusTemplate = () => {
    const status = { id: 'template-status', name: t('templates.fallback.newStatus'), duration: null, remaining: null, loop: false, inactive: false, advanceOn: 'activation', expired: false };
    const template = makeStatusTemplateFromStatus(status, { name: uniqueFlatTemplateName(templateStore.statusTemplates, status.name) });
    updateStore((currentStore) => ({ ...currentStore, statusTemplates: [...currentStore.statusTemplates, template] }));
    return template;
  };
  const updateStatusTemplate = (templateId, status, name) => {
    const cleanName = templateCategoryFromName(name || status?.name) || t('templates.fallback.status');
    const duration = status.duration == null ? null : Math.max(1, Number(status.duration) || 1);
    updateStore((currentStore) => ({
      ...currentStore,
      statusTemplates: currentStore.statusTemplates.map((template) => template.id === templateId
        ? { ...template, name: cleanName, updatedAt: new Date().toISOString(), status: { ...clone(status), id: 'template-status', name: status?.name || cleanName, duration, remaining: duration, expired: false } }
        : template),
    }));
  };
  const duplicateStatusTemplate = (templateId) => {
    const source = getStatusTemplate(templateId);
    if (!source) return null;
    const duplicate = { ...clone(source), id: uid('stpl'), name: duplicateFlatTemplateName(templateStore.statusTemplates, source.name, t('templates.fallback.status')), createdAt: new Date().toISOString(), updatedAt: undefined };
    updateStore((currentStore) => ({ ...currentStore, statusTemplates: [...currentStore.statusTemplates, duplicate] }));
    return duplicate;
  };
  const deleteStatusTemplate = (templateId) => updateStore((currentStore) => ({ ...currentStore, statusTemplates: currentStore.statusTemplates.filter((template) => template.id !== templateId) }));
  const createStatusFromTemplate = (templateId) => instantiateStatusTemplate(getStatusTemplate(templateId));
  const saveStatusAsTemplate = (status, name) => {
    const cleanName = templateCategoryFromName(name || status?.name) || t('templates.fallback.status');
    const template = makeStatusTemplateFromStatus(status, { name: uniqueFlatTemplateName(templateStore.statusTemplates, cleanName) });
    updateStore((currentStore) => ({ ...currentStore, statusTemplates: [...currentStore.statusTemplates, template] }));
    return template;
  };

  const getSceneStatusTemplate = (templateId) => templateStore.sceneStatusTemplates.find((template) => template.id === templateId) || null;
  const createSceneStatusTemplate = () => {
    const status = { id: 'template-status', name: t('templates.fallback.newSceneStatus'), duration: null, remaining: null, loop: false, inactive: false, advanceOn: 'round', expired: false };
    const template = makeSceneStatusTemplateFromStatus(status, { name: uniqueFlatTemplateName(templateStore.sceneStatusTemplates, status.name) });
    updateStore((currentStore) => ({ ...currentStore, sceneStatusTemplates: [...currentStore.sceneStatusTemplates, template] }));
    return template;
  };
  const updateSceneStatusTemplate = (templateId, status, name) => {
    const cleanName = templateCategoryFromName(name || status?.name) || t('templates.fallback.sceneStatus');
    const duration = status.duration == null ? null : Math.max(1, Number(status.duration) || 1);
    updateStore((currentStore) => ({
      ...currentStore,
      sceneStatusTemplates: currentStore.sceneStatusTemplates.map((template) => template.id === templateId
        ? { ...template, name: cleanName, updatedAt: new Date().toISOString(), status: { ...clone(status), id: 'template-status', name: status?.name || cleanName, duration, remaining: duration, inactive: false, advanceOn: 'round', expired: false } }
        : template),
    }));
  };
  const duplicateSceneStatusTemplate = (templateId) => {
    const source = getSceneStatusTemplate(templateId);
    if (!source) return null;
    const duplicate = { ...clone(source), id: uid('sstpl'), name: duplicateFlatTemplateName(templateStore.sceneStatusTemplates, source.name, t('templates.fallback.sceneStatus')), createdAt: new Date().toISOString(), updatedAt: undefined };
    updateStore((currentStore) => ({ ...currentStore, sceneStatusTemplates: [...currentStore.sceneStatusTemplates, duplicate] }));
    return duplicate;
  };
  const deleteSceneStatusTemplate = (templateId) => updateStore((currentStore) => ({ ...currentStore, sceneStatusTemplates: currentStore.sceneStatusTemplates.filter((template) => template.id !== templateId) }));
  const createSceneStatusFromTemplate = (templateId) => instantiateSceneStatusTemplate(getSceneStatusTemplate(templateId));
  const saveSceneStatusAsTemplate = (status, name) => {
    const cleanName = templateCategoryFromName(name || status?.name) || t('templates.fallback.sceneStatus');
    const template = makeSceneStatusTemplateFromStatus(status, { name: uniqueFlatTemplateName(templateStore.sceneStatusTemplates, cleanName) });
    updateStore((currentStore) => ({ ...currentStore, sceneStatusTemplates: [...currentStore.sceneStatusTemplates, template] }));
    return template;
  };

  const getSceneCounterTemplate = (templateId) => templateStore.sceneCounterTemplates.find((template) => template.id === templateId) || null;
  const createSceneCounterTemplate = () => {
    const counter = { enabled: true, name: t('templates.fallback.newSceneCounter'), mode: 'clock', current: 0, max: 6, direction: 'progression', trigger: 'manual', limitMode: 'clamp', total: 0, loops: 0, auto: false, thresholds: [] };
    const template = makeSceneCounterTemplateFromCounter(counter, { name: uniqueFlatTemplateName(templateStore.sceneCounterTemplates, counter.name) });
    updateStore((currentStore) => ({ ...currentStore, sceneCounterTemplates: [...currentStore.sceneCounterTemplates, template] }));
    return template;
  };
  const updateSceneCounterTemplate = (templateId, counter, name) => {
    const cleanName = templateCategoryFromName(name || counter?.name) || t('templates.fallback.sceneCounter');
    updateStore((currentStore) => ({
      ...currentStore,
      sceneCounterTemplates: currentStore.sceneCounterTemplates.map((template) => template.id === templateId
        ? { ...makeSceneCounterTemplateFromCounter(counter, { name: cleanName }), id: template.id, createdAt: template.createdAt, updatedAt: new Date().toISOString() }
        : template),
    }));
  };
  const duplicateSceneCounterTemplate = (templateId) => {
    const source = getSceneCounterTemplate(templateId);
    if (!source) return null;
    const duplicate = { ...clone(source), id: uid('sctpl'), name: duplicateFlatTemplateName(templateStore.sceneCounterTemplates, source.name, t('templates.fallback.sceneCounter')), createdAt: new Date().toISOString(), updatedAt: undefined };
    updateStore((currentStore) => ({ ...currentStore, sceneCounterTemplates: [...currentStore.sceneCounterTemplates, duplicate] }));
    return duplicate;
  };
  const deleteSceneCounterTemplate = (templateId) => updateStore((currentStore) => ({ ...currentStore, sceneCounterTemplates: currentStore.sceneCounterTemplates.filter((template) => template.id !== templateId) }));
  const createSceneCounterFromTemplate = (templateId) => instantiateSceneCounterTemplate(getSceneCounterTemplate(templateId));
  const saveSceneCounterAsTemplate = (counter, name) => {
    const cleanName = templateCategoryFromName(name || counter?.name) || t('templates.fallback.sceneCounter');
    const template = makeSceneCounterTemplateFromCounter(counter, { name: uniqueFlatTemplateName(templateStore.sceneCounterTemplates, cleanName) });
    updateStore((currentStore) => ({ ...currentStore, sceneCounterTemplates: [...currentStore.sceneCounterTemplates, template] }));
    return template;
  };

  const getRuleTemplate = (templateId) => templateStore.ruleTemplates.find((template) => template.id === templateId) || null;
  const saveRuleTemplate = (rules, options) => {
    const config = typeof options === 'string' ? { name: options } : (options || {});
    const cleanName = templateCategoryFromName(config.name) || t('templates.fallback.rules');
    const sameName = (template) => template.name.toLocaleLowerCase() === cleanName.toLocaleLowerCase();
    const targetId = config.overwriteExistingId || config.templateId;
    const conflict = templateStore.ruleTemplates.find((template) => sameName(template) && template.id !== targetId);
    if (conflict && !config.confirmDuplicate) {
      return { ok: false, kind: 'duplicate', message: t('templates.rules.duplicateName'), conflict };
    }

    const source = makeRuleTemplateFromRules(rules, { name: cleanName });
    let saved = source;
    updateStore((currentStore) => {
      const existingTarget = currentStore.ruleTemplates.find((template) => template.id === targetId);
      const duplicateTarget = currentStore.ruleTemplates.find((template) => sameName(template) && template.id !== targetId);
      const idToOverwrite = config.overwriteExistingId || (config.mode === 'overwrite' && existingTarget ? existingTarget.id : duplicateTarget?.id);
      if (idToOverwrite) {
        saved = { ...source, id: idToOverwrite, createdAt: currentStore.ruleTemplates.find((template) => template.id === idToOverwrite)?.createdAt || source.createdAt, updatedAt: new Date().toISOString() };
        return {
          ...currentStore,
          ruleTemplates: currentStore.ruleTemplates
            .filter((template) => template.id === idToOverwrite || !sameName(template))
            .map((template) => template.id === idToOverwrite ? saved : template),
        };
      }
      saved = source;
      return { ...currentStore, ruleTemplates: [...currentStore.ruleTemplates, saved] };
    });
    return { ok: true, template: saved, overwritten: !!(config.overwriteExistingId || config.mode === 'overwrite') };
  };
  const duplicateRuleTemplate = (templateId) => {
    const source = getRuleTemplate(templateId);
    if (!source) return null;
    const duplicate = { ...clone(source), id: uid('rtpl'), name: duplicateFlatTemplateName(templateStore.ruleTemplates, source.name, t('templates.fallback.rules')), createdAt: new Date().toISOString(), updatedAt: undefined };
    updateStore((currentStore) => ({ ...currentStore, ruleTemplates: [...currentStore.ruleTemplates, duplicate] }));
    return duplicate;
  };
  const deleteRuleTemplate = (templateId) => updateStore((currentStore) => ({ ...currentStore, ruleTemplates: currentStore.ruleTemplates.filter((template) => template.id !== templateId) }));

  const importTemplates = (incomingStore) => {
    const result = mergeTemplateStores(templateStore, incomingStore);
    setStore(result.store);
    return result;
  };

  return {
    categories: templateStore.categories,
    templates: templateStore.templates,
    trackerTemplates: templateStore.trackerTemplates,
    statusTemplates: templateStore.statusTemplates,
    sceneStatusTemplates: templateStore.sceneStatusTemplates,
    sceneCounterTemplates: templateStore.sceneCounterTemplates,
    ruleTemplates: templateStore.ruleTemplates,
    rulePresets: mergeRulePresetCatalog(templateStore.ruleTemplates),
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
    getTrackerTemplate,
    createTrackerTemplate,
    updateTrackerTemplate,
    duplicateTrackerTemplate,
    deleteTrackerTemplate,
    createTrackerFromTemplate,
    saveTrackerAsTemplate,
    getStatusTemplate,
    createStatusTemplate,
    updateStatusTemplate,
    duplicateStatusTemplate,
    deleteStatusTemplate,
    createStatusFromTemplate,
    saveStatusAsTemplate,
    getSceneStatusTemplate,
    createSceneStatusTemplate,
    updateSceneStatusTemplate,
    duplicateSceneStatusTemplate,
    deleteSceneStatusTemplate,
    createSceneStatusFromTemplate,
    saveSceneStatusAsTemplate,
    getSceneCounterTemplate,
    createSceneCounterTemplate,
    updateSceneCounterTemplate,
    duplicateSceneCounterTemplate,
    deleteSceneCounterTemplate,
    createSceneCounterFromTemplate,
    saveSceneCounterAsTemplate,
    getRuleTemplate,
    saveRuleTemplate,
    duplicateRuleTemplate,
    deleteRuleTemplate,
    importTemplates,
  };
}
