import PptxGenJS from 'pptxgenjs';
import { DeckSpec } from '../../../types';
import { defineMasters } from './masters';

export const renderPptx = async (spec: DeckSpec) => {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_16x9';
  
  pptx.title = spec.deck_title || 'Aceverse Salford Pitch';
  pptx.author = 'Aceverse AI';

  defineMasters(pptx);

  if (spec.slides && Array.isArray(spec.slides)) {
    spec.slides.forEach((slide) => {
      let masterName = 'SALFORD_CONTENT';
      
      // Safety check for layout_id
      const id = (slide?.layout_id || '').toUpperCase();

      if (id.includes('TITLE')) masterName = 'SALFORD_TITLE';
      else if (id.includes('THANK')) masterName = 'SALFORD_THANK_YOU';
      else masterName = 'SALFORD_CONTENT'; 

      const s = pptx.addSlide({ masterName });
      
      if (slide.title) {
        s.addText(slide.title, { placeholder: 'title' });
      }

      // Handle Salford-specific fields for the PPTX export
      let bodyText = "";
      
      if (slide.problems) {
        bodyText = slide.problems.map(p => `${p.title.toUpperCase()}\n${p.body}`).join('\n\n');
      } else if (slide.solutions) {
        bodyText = slide.solutions.map(s => `${s.title.toUpperCase()}\n${s.body}`).join('\n\n');
      } else if (slide.narrative) {
        bodyText = slide.narrative;
      } else if (slide.agenda_items) {
        bodyText = slide.agenda_items.join('\n');
      } else if (slide.team) {
        bodyText = slide.team.map(m => `${m.name} (${m.role}): ${m.bio}`).join('\n\n');
      } else if (slide.bullets) {
        bodyText = slide.bullets.join('\n');
      }

      if (bodyText) {
        s.addText(bodyText, { placeholder: 'body' });
      }

      if (slide.subtitle) {
        s.addText(slide.subtitle, { placeholder: 'subtitle' });
      }
    });
  }

  return pptx;
};