import { useEffect, useState } from 'react';
import { instantiateTemplate, loadTemplates, makeTemplateFromParticipant, saveTemplates } from '../templates.js';

export function useTemplates() {
  const [templates, setTemplates] = useState(loadTemplates);

  useEffect(() => {
    saveTemplates(templates);
  }, [templates]);

  const saveParticipantAsTemplate = (participant, category) => {
    const template = makeTemplateFromParticipant(participant, category);
    setTemplates((current) => [...current, template]);
    return template;
  };

  const createParticipantFromTemplate = (templateId) => {
    const template = templates.find((item) => item.id === templateId);
    return instantiateTemplate(template);
  };

  return {
    templates,
    saveParticipantAsTemplate,
    createParticipantFromTemplate,
  };
}
