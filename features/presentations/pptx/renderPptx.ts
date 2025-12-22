
import PptxGenJS from 'pptxgenjs';
import { DeckSpec, SlideSpec } from '../../../types';
import { defineMasters } from './masters';

export const renderPptx = async (spec: DeckSpec) => {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_16x9';
  
  // Sätt metadata
  pptx.title = spec.deck.title;
  pptx.author = 'Aceverse AI';

  // Definiera mallar
  defineMasters(pptx, spec.theme);

  spec.slides.forEach((slide, idx) => {
    let masterName = 'MASTER_BULLETS'; // Default
    
    switch (slide.type) {
      case 'title': masterName = 'MASTER_TITLE_HERO'; break;
      case 'section': masterName = 'MASTER_SECTION_DIVIDER'; break;
      case 'twoColumn': masterName = 'MASTER_TWO_COLUMN'; break;
      case 'kpi': masterName = 'MASTER_KPI_3UP'; break;
      case 'timeline': masterName = 'MASTER_BULLETS'; break; // Fallback
      case 'closing': masterName = 'MASTER_TITLE_HERO'; break;
    }

    const s = pptx.addSlide({ masterName });
    
    // Hantera standard placeholders
    if (slide.title) s.addText(slide.title, { placeholder: 'title' });
    if (slide.subtitle) s.addText(slide.subtitle, { placeholder: 'subtitle' });

    // Hantera bullets med dynamisk text-storlek
    if (slide.bullets && slide.bullets.length > 0) {
      const fontSize = slide.bullets.length > 4 ? 14 : 18;
      s.addText(
        slide.bullets.map(b => ({ text: b, options: { bullet: true, breakLine: true } })),
        { placeholder: 'body', fontSize }
      );
    }

    // Hantera två kolumner
    if (slide.type === 'twoColumn') {
        if (slide.left?.bullets) s.addText(slide.left.bullets.map(b => ({ text: b, options: { bullet: true, breakLine: true } })), { placeholder: 'left', fontSize: 14 });
        if (slide.right?.bullets) s.addText(slide.right.bullets.map(b => ({ text: b, options: { bullet: true, breakLine: true } })), { placeholder: 'right', fontSize: 14 });
    }

    // Hantera KPI
    if (slide.type === 'kpi' && slide.kpis) {
        slide.kpis.slice(0, 3).forEach((kpi, i) => {
            const xPos = 0.5 + (i * 3.2);
            s.addShape(pptx.ShapeType.rect, { x: xPos, y: 2, w: 2.8, h: 2.5, fill: { color: 'F9F9F9' }, line: { color: 'EEEEEE', width: 1 } });
            s.addText(kpi.value, { x: xPos, y: 2.5, w: 2.8, fontSize: 36, bold: true, align: 'center', color: spec.theme.palette.primary });
            s.addText(kpi.label, { x: xPos, y: 3.5, w: 2.8, fontSize: 12, align: 'center', color: '666666', bold: true });
        });
    }

    // Speaker Notes
    if (slide.speakerNotes) {
        s.addNotes(slide.speakerNotes.join('\n'));
    }
  });

  return pptx;
};
