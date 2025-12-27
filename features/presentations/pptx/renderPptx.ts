
import PptxGenJS from 'pptxgenjs';
import { DeckSpec, SlideSpec } from '../../../types';
import { defineMasters } from './masters';

export const renderPptx = async (spec: DeckSpec) => {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_16x9';
  
  pptx.title = spec?.deck?.title || 'Aceverse Presentation';
  pptx.author = 'Aceverse AI';

  // Editorial Theme Constants
  const lightBeige = 'ECE3D0';
  const darkGreen = '1A1C18';
  const sageAccent = '5E6D5E';

  const theme = spec?.theme || {
    palette: { primary: darkGreen, background: lightBeige, accent: sageAccent },
    fonts: { heading: 'Playfair Display', body: 'Inter' }
  };
  
  defineMasters(pptx, theme);

  if (spec?.slides && Array.isArray(spec.slides)) {
    spec.slides.forEach((slide, idx) => {
      let masterName = 'MASTER_BULLETS';
      
      switch (slide.type) {
        case 'title': masterName = 'MASTER_TITLE_HERO'; break;
        case 'section': masterName = 'MASTER_SECTION_DIVIDER'; break;
        case 'twoColumn': masterName = 'MASTER_TWO_COLUMN'; break;
        case 'kpi': masterName = 'MASTER_KPI_3UP'; break;
        case 'closing': masterName = 'MASTER_TITLE_HERO'; break;
      }

      const s = pptx.addSlide({ masterName });
      
      if (slide.title) s.addText(slide.title.toUpperCase(), { placeholder: 'title' });
      if (slide.subtitle) s.addText(slide.subtitle, { placeholder: 'subtitle' });

      if (slide.bullets && slide.bullets.length > 0) {
        const fontSize = slide.bullets.length > 4 ? 14 : 18;
        s.addText(
          slide.bullets.map(b => ({ text: b, options: { bullet: { type: 'dash' }, breakLine: true } })),
          { placeholder: 'body', fontSize, color: lightBeige, fontFace: 'Inter' }
        );
      }

      if (slide.type === 'twoColumn') {
          if (slide.left?.bullets) s.addText(slide.left.bullets.map(b => ({ text: b, options: { bullet: true, breakLine: true } })), { placeholder: 'left', fontSize: 14, color: lightBeige });
          if (slide.right?.bullets) s.addText(slide.right.bullets.map(b => ({ text: b, options: { bullet: true, breakLine: true } })), { placeholder: 'right', fontSize: 14, color: lightBeige });
      }

      if (slide.type === 'kpi' && slide.kpis) {
          slide.kpis.slice(0, 3).forEach((kpi, i) => {
              const xPos = 0.5 + (i * 3.2);
              // Circular Callout Style from screenshots
              s.addShape(pptx.ShapeType.ellipse, { x: xPos + 0.5, y: 1.8, w: 2.2, h: 2.2, fill: { color: sageAccent }, transparency: 80 });
              s.addText(kpi.value, { x: xPos, y: 2.5, w: 3.2, fontSize: 48, bold: true, align: 'center', color: lightBeige, fontFace: 'Playfair Display' });
              s.addText(kpi.label.toUpperCase(), { x: xPos, y: 3.5, w: 3.2, fontSize: 10, align: 'center', color: lightBeige, fontFace: 'Inter', bold: true, charSpacing: 2 });
              
              // Bottom label box
              s.addShape(pptx.ShapeType.rect, { x: xPos + 0.4, y: 3.8, w: 2.4, h: 0.4, line: { color: lightBeige, width: 1 } });
          });
      }

      if (slide.speakerNotes) {
          s.addNotes(slide.speakerNotes.join('\n'));
      }
    });
  }

  return pptx;
};
